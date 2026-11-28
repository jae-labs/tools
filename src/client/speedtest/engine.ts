import type { PrismaRegion } from '../../shared/regions.ts';

export type TestDirection = 'download' | 'upload';
export type TestSequenceMode = 'auto' | 'download' | 'upload';
export type NodeStatus =
  | 'idle'
  | 'probing'
  | 'downloading'
  | 'uploading'
  | 'completed'
  | 'stopped'
  | 'error';

export interface SpeedTargetNode {
  regionId: PrismaRegion;
  label: string;
  shortCode: string;
  endpointUrl: string;
  isLocalFallback: boolean;
}

export interface NodeMetrics {
  regionId: PrismaRegion;
  label: string;
  shortCode: string;
  endpointUrl: string;
  isLocalFallback: boolean;
  status: NodeStatus;
  latencyMinMs: number | null;
  latencyAvgMs: number | null;
  latencyMaxMs: number | null;
  jitterMinMs: number | null;
  jitterMs: number | null;
  jitterMaxMs: number | null;
  probesSent: number;
  probesLost: number;
  packetLossPct: number;
  downloadCurrentMbps: number;
  downloadMinMbps: number;
  downloadAvgMbps: number;
  downloadPeakMbps: number;
  downloadBytes: number;
  uploadCurrentMbps: number;
  uploadMinMbps: number;
  uploadAvgMbps: number;
  uploadPeakMbps: number;
  uploadBytes: number;
  errorMessage: string | null;
}

export interface TimeSeriesPoint {
  tSec: number;
  downloadMbps: number;
  uploadMbps: number;
}

export interface AggregateMetrics {
  avgLatencyMs: number | null;
  jitterMs: number | null;
  packetLossPct: number;
  downloadCurrentMbps: number;
  downloadAvgMbps: number;
  uploadCurrentMbps: number;
  uploadAvgMbps: number;
}

export interface SpeedTestSnapshot {
  running: boolean;
  phase: 'idle' | 'probing' | 'downloading' | 'uploading' | 'completed' | 'stopped';
  configuredDurationSec: number | null;
  elapsedSec: number;
  nodes: NodeMetrics[];
  aggregate: AggregateMetrics;
  timeline: TimeSeriesPoint[];
}

export interface SpeedTestReport {
  nodes: NodeMetrics[];
}

interface ByteSample {
  tMs: number;
  bytes: number;
}

interface InternalNodeState {
  target: SpeedTargetNode;
  metrics: NodeMetrics;
  dlSamples: ByteSample[];
  ulSamples: ByteSample[];
  dlStartedAtMs: number | null;
  dlAccumulatedMs: number;
  ulStartedAtMs: number | null;
  ulAccumulatedMs: number;
  phaseAbort: AbortController | null;
}

const SLIDING_WINDOW_MS = 1200;
const STREAM_CONCURRENCY = 4;
const MIN_RAMP_MS = 1500;
const PING_BURST_COUNT = 8;
const PING_TIMEOUT_MS = 3500;

let cachedUploadPayload: Uint8Array<ArrayBuffer> | null = null;

function getUploadBuffer(sizeBytes: number): Uint8Array<ArrayBuffer> {
  const maxSize = 4 * 1024 * 1024;
  if (!cachedUploadPayload) {
    const buffer = new ArrayBuffer(maxSize);
    const bytes = new Uint8Array(buffer);
    const step = 65536;
    for (let offset = 0; offset < maxSize; offset += step) {
      const slice = bytes.subarray(offset, Math.min(offset + step, maxSize));
      crypto.getRandomValues(slice);
    }
    cachedUploadPayload = bytes;
  }
  const clamped = Math.max(65536, Math.min(maxSize, sizeBytes));
  return clamped === maxSize ? cachedUploadPayload : cachedUploadPayload.subarray(0, clamped);
}

function computeWindowMbps(samples: ByteSample[], nowMs: number): number {
  const cutoff = nowMs - SLIDING_WINDOW_MS;
  while (samples.length > 0 && samples[0].tMs < cutoff) {
    samples.shift();
  }
  if (samples.length === 0) return 0;
  let totalBytes = 0;
  for (const sample of samples) {
    totalBytes += sample.bytes;
  }
  const spanSec = Math.max(0.25, (nowMs - Math.min(samples[0].tMs, nowMs - 100)) / 1000);
  return (totalBytes * 8) / spanSec / 1_000_000;
}

function createInitialNodeMetrics(target: SpeedTargetNode): NodeMetrics {
  return {
    regionId: target.regionId,
    label: target.label,
    shortCode: target.shortCode,
    endpointUrl: target.endpointUrl,
    isLocalFallback: target.isLocalFallback,
    status: 'idle',
    latencyMinMs: null,
    latencyAvgMs: null,
    latencyMaxMs: null,
    jitterMinMs: null,
    jitterMs: null,
    jitterMaxMs: null,
    probesSent: 0,
    probesLost: 0,
    packetLossPct: 0,
    downloadCurrentMbps: 0,
    downloadMinMbps: 0,
    downloadAvgMbps: 0,
    downloadPeakMbps: 0,
    downloadBytes: 0,
    uploadCurrentMbps: 0,
    uploadMinMbps: 0,
    uploadAvgMbps: 0,
    uploadPeakMbps: 0,
    uploadBytes: 0,
    errorMessage: null,
  };
}

async function probeNodeLatency(
  endpointUrl: string,
  count = 5,
  signal?: AbortSignal,
): Promise<{
  minMs: number | null;
  avgMs: number | null;
  maxMs: number | null;
  jitterMinMs: number | null;
  jitterMs: number | null;
  jitterMaxMs: number | null;
  sent: number;
  lost: number;
  lossPct: number;
  reachable: boolean;
}> {
  const rtts: number[] = [];
  let sent = 0;
  let lost = 0;

  // Warm up TCP/TLS keep-alive socket once before measuring RTT & jitter
  if (!signal?.aborted) {
    const warmController = new AbortController();
    const warmTimer = setTimeout(() => warmController.abort(), PING_TIMEOUT_MS);
    const onParentAbort = () => warmController.abort();
    signal?.addEventListener('abort', onParentAbort, { once: true });
    try {
      const warmRes = await fetch(`${endpointUrl}/api/ping?seq=warmup&_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: warmController.signal,
      });
      await warmRes.arrayBuffer();
    } catch {
      // Proceed to measured probes even if warm-up fails.
    } finally {
      clearTimeout(warmTimer);
      signal?.removeEventListener('abort', onParentAbort);
    }
  }

  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    sent++;
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), PING_TIMEOUT_MS);
    const onParentAbort = () => timeoutController.abort();
    signal?.addEventListener('abort', onParentAbort, { once: true });

    const start = performance.now();
    try {
      const res = await fetch(`${endpointUrl}/api/ping?seq=${i}&_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: timeoutController.signal,
      });
      if (!res.ok) {
        lost++;
      } else {
        await res.arrayBuffer();
        const rtt = performance.now() - start;
        rtts.push(rtt);
      }
    } catch {
      if (signal?.aborted) {
        sent--;
        break;
      }
      lost++;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onParentAbort);
    }
  }

  if (rtts.length === 0) {
    return {
      minMs: null,
      avgMs: null,
      maxMs: null,
      jitterMinMs: null,
      jitterMs: null,
      jitterMaxMs: null,
      sent,
      lost,
      lossPct: sent > 0 ? Number(((lost / sent) * 100).toFixed(1)) : 100,
      reachable: false,
    };
  }

  const minMs = Math.min(...rtts);
  const maxMs = Math.max(...rtts);
  const avgMs = rtts.reduce((acc, v) => acc + v, 0) / rtts.length;

  const jitterDeltas: number[] = [];
  for (let i = 1; i < rtts.length; i++) {
    jitterDeltas.push(Math.abs(rtts[i] - rtts[i - 1]));
  }
  const jitterMinMs = jitterDeltas.length > 0 ? Math.min(...jitterDeltas) : 0;
  const jitterMaxMs = jitterDeltas.length > 0 ? Math.max(...jitterDeltas) : 0;
  const jitterMs =
    jitterDeltas.length > 0
      ? jitterDeltas.reduce((acc, v) => acc + v, 0) / jitterDeltas.length
      : 0;

  return {
    minMs: Number(minMs.toFixed(1)),
    avgMs: Number(avgMs.toFixed(1)),
    maxMs: Number(maxMs.toFixed(1)),
    jitterMinMs: Number(jitterMinMs.toFixed(1)),
    jitterMs: Number(jitterMs.toFixed(1)),
    jitterMaxMs: Number(jitterMaxMs.toFixed(1)),
    sent,
    lost,
    lossPct: sent > 0 ? Number(((lost / sent) * 100).toFixed(1)) : 0,
    reachable: true,
  };
}

export interface StartTestOptions {
  targets: SpeedTargetNode[];
  mode: TestSequenceMode;
  durationSec: number | null;
  onUpdate: (snapshot: SpeedTestSnapshot) => void;
  onComplete: (report: SpeedTestReport) => void;
}

export class SpeedTestController {
  private running = false;
  private phase: SpeedTestSnapshot['phase'] = 'idle';
  private mode: TestSequenceMode = 'auto';
  private configuredDurationSec: number | null = null;
  private startPerfMs = 0;
  private states: InternalNodeState[] = [];
  private timeline: TimeSeriesPoint[] = [];
  private globalAbort: AbortController | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private phaseEndTimer: ReturnType<typeof setTimeout> | null = null;
  private phaseStopResolver: (() => void) | null = null;
  private onUpdateCallback: ((snapshot: SpeedTestSnapshot) => void) | null = null;
  private onCompleteCallback: ((report: SpeedTestReport) => void) | null = null;
  private stopReason: 'completed' | 'stopped_by_user' | 'error' = 'completed';

  isRunning(): boolean {
    return this.running;
  }

  start(options: StartTestOptions): void {
    if (this.running) {
      this.stop('stopped_by_user');
    }
    if (options.targets.length === 0) return;

    this.running = true;
    this.mode = options.mode;
    this.configuredDurationSec = options.durationSec;
    this.startPerfMs = performance.now();
    this.timeline = [];
    this.stopReason = 'completed';
    this.onUpdateCallback = options.onUpdate;
    this.onCompleteCallback = options.onComplete;
    this.globalAbort = new AbortController();

    this.states = options.targets.map((target) => ({
      target,
      metrics: createInitialNodeMetrics(target),
      dlSamples: [],
      ulSamples: [],
      dlStartedAtMs: null,
      dlAccumulatedMs: 0,
      ulStartedAtMs: null,
      ulAccumulatedMs: 0,
      phaseAbort: null,
    }));

    this.tickTimer = setInterval(() => {
      this.sampleAndEmit(true);
    }, 120);

    void this.executeRun();
  }

  stop(reason: 'completed' | 'stopped_by_user' | 'error' = 'stopped_by_user'): void {
    if (!this.running) return;
    this.stopReason = reason;
    this.running = false;
    this.globalAbort?.abort();
    for (const state of this.states) {
      state.phaseAbort?.abort();
    }
    if (this.phaseEndTimer) {
      clearTimeout(this.phaseEndTimer);
      this.phaseEndTimer = null;
    }
    this.phaseStopResolver?.();
    this.phaseStopResolver = null;
  }

  private async executeRun(): Promise<void> {
    const signal = this.globalAbort!.signal;

    try {
      // Phase 1: Latency & Packet Loss Probe
      this.phase = 'probing';
      for (const state of this.states) {
        state.metrics.status = 'probing';
      }
      this.sampleAndEmit(false);

      await Promise.all(
        this.states.map(async (state) => {
          const res = await probeNodeLatency(
            state.target.endpointUrl,
            PING_BURST_COUNT,
            signal,
          );
          if (signal.aborted) return;
          state.metrics.probesSent = res.sent;
          state.metrics.probesLost = res.lost;
          state.metrics.packetLossPct = res.lossPct;
          state.metrics.latencyMinMs = res.minMs;
          state.metrics.latencyAvgMs = res.avgMs;
          state.metrics.latencyMaxMs = res.maxMs;
          state.metrics.jitterMinMs = res.jitterMinMs;
          state.metrics.jitterMs = res.jitterMs;
          state.metrics.jitterMaxMs = res.jitterMaxMs;
          if (!res.reachable) {
            state.metrics.status = 'error';
            state.metrics.errorMessage = 'Endpoint unreachable';
          }
        }),
      );

      if (signal.aborted) {
        return;
      }

      const elapsedAfterProbeSec = (performance.now() - this.startPerfMs) / 1000;
      const transferBudgetMs =
        this.configuredDurationSec !== null
          ? Math.max(2000, (this.configuredDurationSec - elapsedAfterProbeSec) * 1000)
          : null;

      if (this.mode === 'auto') {
        const halfMs = transferBudgetMs !== null ? Math.max(1500, transferBudgetMs / 2) : null;
        await this.runTransferPhase('download', halfMs, signal);

        const remainingMs = this.computeRemainingBudgetMs() ?? halfMs;
        if (this.running && !signal.aborted && (remainingMs === null || remainingMs > 200)) {
          await this.runTransferPhase('upload', remainingMs, signal);
        }
      } else {
        const remainingMs = this.computeRemainingBudgetMs();
        if (remainingMs === null || remainingMs > 200) {
          await this.runTransferPhase(this.mode, remainingMs, signal);
        }
      }
    } catch {
      if (!signal.aborted) {
        this.stopReason = 'error';
      }
    } finally {
      this.finalize();
    }
  }

  private computeRemainingBudgetMs(): number | null {
    if (this.configuredDurationSec === null) return null;
    const elapsedMs = performance.now() - this.startPerfMs;
    return Math.max(0, this.configuredDurationSec * 1000 - elapsedMs);
  }

  private async runTransferPhase(
    direction: TestDirection,
    durationMs: number | null,
    globalSignal: AbortSignal,
  ): Promise<void> {
    if (globalSignal.aborted || !this.running) return;

    this.phase = direction === 'download' ? 'downloading' : 'uploading';

    const phaseAbort = new AbortController();
    const onGlobalAbort = () => phaseAbort.abort();
    globalSignal.addEventListener('abort', onGlobalAbort, { once: true });

    const now = performance.now();
    for (const state of this.states) {
      if (state.metrics.status === 'error') continue;
      state.phaseAbort = phaseAbort;
      state.metrics.status = direction === 'download' ? 'downloading' : 'uploading';
      if (direction === 'download') {
        state.dlStartedAtMs = now;
      } else {
        state.ulStartedAtMs = now;
      }
    }

    const timerPromise = new Promise<void>((resolve) => {
      this.phaseStopResolver = resolve;
      if (durationMs !== null) {
        this.phaseEndTimer = setTimeout(() => {
          phaseAbort.abort();
          resolve();
        }, durationMs);
      }
    });

    const workersPromise = Promise.all(
      this.states.map(async (state) => {
        if (state.metrics.status === 'error') return;
        if (direction === 'download') {
          await this.runDownloadNode(state, phaseAbort.signal);
        } else {
          await this.runUploadNode(state, phaseAbort.signal);
        }
      }),
    );

    await Promise.race([workersPromise, timerPromise]);
    phaseAbort.abort();
    await workersPromise.catch(() => undefined);

    const finishedAt = performance.now();
    for (const state of this.states) {
      if (direction === 'download' && state.dlStartedAtMs !== null) {
        state.dlAccumulatedMs += Math.max(0, finishedAt - state.dlStartedAtMs);
        state.dlStartedAtMs = null;
        state.metrics.downloadCurrentMbps = 0;
      }
      if (direction === 'upload' && state.ulStartedAtMs !== null) {
        state.ulAccumulatedMs += Math.max(0, finishedAt - state.ulStartedAtMs);
        state.ulStartedAtMs = null;
        state.metrics.uploadCurrentMbps = 0;
      }
      state.phaseAbort = null;
    }

    if (this.phaseEndTimer) {
      clearTimeout(this.phaseEndTimer);
      this.phaseEndTimer = null;
    }
    this.phaseStopResolver = null;
    globalSignal.removeEventListener('abort', onGlobalAbort);
  }

  private async runDownloadNode(state: InternalNodeState, signal: AbortSignal): Promise<void> {
    const runStream = async () => {
      while (!signal.aborted) {
        const curMbps = state.metrics.downloadCurrentMbps;
        const chunkBytes =
          curMbps > 150
            ? 32 * 1024 * 1024
            : curMbps > 40
              ? 16 * 1024 * 1024
              : 8 * 1024 * 1024;

        try {
          const url = `${state.target.endpointUrl}/api/download?bytes=${chunkBytes}&r=${Math.random().toString(36).slice(2)}`;
          const res = await fetch(url, { cache: 'no-store', signal });
          if (!res.ok || !res.body) {
            state.metrics.status = 'error';
            state.metrics.errorMessage = `HTTP ${res.status} on download`;
            break;
          }
          const reader = res.body.getReader();
          try {
            while (!signal.aborted) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value && value.byteLength > 0) {
                const nowMs = performance.now();
                state.metrics.downloadBytes += value.byteLength;
                state.dlSamples.push({ tMs: nowMs, bytes: value.byteLength });
              }
            }
          } finally {
            reader.releaseLock();
          }
        } catch {
          if (signal.aborted) break;
          state.metrics.status = 'error';
          state.metrics.errorMessage = 'Download stream failed';
          break;
        }
      }
    };

    const streams = Array.from({ length: STREAM_CONCURRENCY }, () => runStream());
    await Promise.all(streams);
  }

  private async runUploadNode(state: InternalNodeState, signal: AbortSignal): Promise<void> {
    const runStream = async () => {
      while (!signal.aborted) {
        const curMbps = state.metrics.uploadCurrentMbps;
        const chunkBytes =
          curMbps > 40 ? 4 * 1024 * 1024 : 2 * 1024 * 1024;
        const payload = getUploadBuffer(chunkBytes);

        const ok = await new Promise<boolean>((resolve) => {
          const xhr = new XMLHttpRequest();
          let lastLoaded = 0;

          const onAbort = () => {
            xhr.abort();
            resolve(false);
          };
          signal.addEventListener('abort', onAbort, { once: true });

          xhr.open(
            'POST',
            `${state.target.endpointUrl}/api/upload?r=${Math.random().toString(36).slice(2)}`,
            true,
          );
          // text/plain is CORS-safelisted so cross-origin uploads skip extra OPTIONS preflights
          xhr.setRequestHeader('Content-Type', 'text/plain');

          xhr.upload.onprogress = (evt) => {
            if (signal.aborted) return;
            const delta = evt.loaded - lastLoaded;
            if (delta > 0) {
              lastLoaded = evt.loaded;
              const nowMs = performance.now();
              state.metrics.uploadBytes += delta;
              state.ulSamples.push({ tMs: nowMs, bytes: delta });
            }
          };

          xhr.onload = () => {
            signal.removeEventListener('abort', onAbort);
            if (xhr.status >= 200 && xhr.status < 300) {
              const remainingDelta = payload.byteLength - lastLoaded;
              if (remainingDelta > 0) {
                const nowMs = performance.now();
                state.metrics.uploadBytes += remainingDelta;
                state.ulSamples.push({ tMs: nowMs, bytes: remainingDelta });
              }
              resolve(true);
            } else {
              state.metrics.status = 'error';
              state.metrics.errorMessage = `HTTP ${xhr.status} on upload`;
              resolve(false);
            }
          };

          xhr.onerror = () => {
            signal.removeEventListener('abort', onAbort);
            if (!signal.aborted) {
              state.metrics.status = 'error';
              state.metrics.errorMessage = 'Upload stream failed';
            }
            resolve(false);
          };

          xhr.onabort = () => {
            signal.removeEventListener('abort', onAbort);
            resolve(false);
          };

          xhr.send(payload);
        });

        if (!ok || signal.aborted) break;
      }
    };

    const streams = Array.from({ length: STREAM_CONCURRENCY }, () => runStream());
    await Promise.all(streams);
  }

  private updateNodeDirectionStats(
    state: InternalNodeState,
    dir: TestDirection,
    nowMs: number,
  ): void {
    const m = state.metrics;
    const active = dir === 'download' ? m.status === 'downloading' : m.status === 'uploading';
    const samples = dir === 'download' ? state.dlSamples : state.ulSamples;
    const accumulatedMs = dir === 'download' ? state.dlAccumulatedMs : state.ulAccumulatedMs;
    const startedAtMs = dir === 'download' ? state.dlStartedAtMs : state.ulStartedAtMs;
    const totalBytes = dir === 'download' ? m.downloadBytes : m.uploadBytes;
    const elapsedMs = accumulatedMs + (startedAtMs !== null ? nowMs - startedAtMs : 0);

    let currentMbps = dir === 'download' ? m.downloadCurrentMbps : m.uploadCurrentMbps;
    let peakMbps = dir === 'download' ? m.downloadPeakMbps : m.uploadPeakMbps;
    let minMbps = dir === 'download' ? m.downloadMinMbps : m.uploadMinMbps;
    let avgMbps = dir === 'download' ? m.downloadAvgMbps : m.uploadAvgMbps;

    if (active) {
      currentMbps = Number(computeWindowMbps(samples, nowMs).toFixed(2));
      if (currentMbps > peakMbps) peakMbps = currentMbps;
      if (elapsedMs > MIN_RAMP_MS && currentMbps > 0) {
        minMbps = minMbps === 0 ? currentMbps : Math.min(minMbps, currentMbps);
      }
      if (elapsedMs > 150) {
        avgMbps = Number(((totalBytes * 8) / (elapsedMs / 1000) / 1e6).toFixed(2));
        if (minMbps === 0 && avgMbps > 0) minMbps = avgMbps;
      }
    } else if (accumulatedMs > 150 && totalBytes > 0) {
      avgMbps = Number(((totalBytes * 8) / (accumulatedMs / 1000) / 1e6).toFixed(2));
      if (minMbps === 0) minMbps = avgMbps;
    }

    if (dir === 'download') {
      m.downloadCurrentMbps = currentMbps;
      m.downloadPeakMbps = peakMbps;
      m.downloadMinMbps = minMbps;
      m.downloadAvgMbps = avgMbps;
    } else {
      m.uploadCurrentMbps = currentMbps;
      m.uploadPeakMbps = peakMbps;
      m.uploadMinMbps = minMbps;
      m.uploadAvgMbps = avgMbps;
    }
  }

  private sampleAndEmit(recordTimeline: boolean): void {
    const nowMs = performance.now();
    const elapsedSec = Math.max(0, (nowMs - this.startPerfMs) / 1000);

    for (const state of this.states) {
      this.updateNodeDirectionStats(state, 'download', nowMs);
      this.updateNodeDirectionStats(state, 'upload', nowMs);
    }

    const aggregate = this.computeAggregate();

    if (recordTimeline && (this.phase === 'downloading' || this.phase === 'uploading')) {
      this.timeline.push({
        tSec: Number(elapsedSec.toFixed(2)),
        downloadMbps: aggregate.downloadCurrentMbps,
        uploadMbps: aggregate.uploadCurrentMbps,
      });
      if (this.timeline.length > 500) {
        this.timeline.shift();
      }
    }

    this.onUpdateCallback?.({
      running: this.running,
      phase: this.phase,
      configuredDurationSec: this.configuredDurationSec,
      elapsedSec: Number(elapsedSec.toFixed(1)),
      nodes: this.states.map((s) => ({ ...s.metrics })),
      aggregate,
      timeline: [...this.timeline],
    });
  }

  private computeAggregate(): AggregateMetrics {
    const nodes = this.states.map((s) => s.metrics);
    const nums = (pick: (n: NodeMetrics) => number | null) =>
      nodes.map(pick).filter((v): v is number => typeof v === 'number');
    const meanOf = (values: number[]) =>
      values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0;
    const sumOf = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

    const latAvgs = nums((n) => n.latencyAvgMs);
    const jitAvgs = nums((n) => n.jitterMs);
    const totalSent = sumOf(nodes.map((n) => n.probesSent));
    const totalLost = sumOf(nodes.map((n) => n.probesLost));
    const activeNodes = nodes.filter((n) => n.status !== 'error');

    return {
      avgLatencyMs: latAvgs.length > 0 ? Number(meanOf(latAvgs).toFixed(1)) : null,
      jitterMs: jitAvgs.length > 0 ? Number(meanOf(jitAvgs).toFixed(1)) : null,
      packetLossPct: totalSent > 0 ? Number(((totalLost / totalSent) * 100).toFixed(1)) : 0,
      downloadCurrentMbps: Number(sumOf(activeNodes.map((n) => n.downloadCurrentMbps)).toFixed(2)),
      downloadAvgMbps: Number(sumOf(activeNodes.map((n) => n.downloadAvgMbps)).toFixed(2)),
      uploadCurrentMbps: Number(sumOf(activeNodes.map((n) => n.uploadCurrentMbps)).toFixed(2)),
      uploadAvgMbps: Number(sumOf(activeNodes.map((n) => n.uploadAvgMbps)).toFixed(2)),
    };
  }

  private finalize(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.phaseEndTimer) {
      clearTimeout(this.phaseEndTimer);
      this.phaseEndTimer = null;
    }

    this.running = false;
    const finalStatus = this.stopReason === 'stopped_by_user' ? 'stopped' : 'completed';
    this.phase = finalStatus;

    for (const state of this.states) {
      if (state.metrics.status !== 'error') {
        state.metrics.status = finalStatus;
      }
      state.metrics.downloadCurrentMbps = 0;
      state.metrics.uploadCurrentMbps = 0;
    }

    this.sampleAndEmit(false);

    this.onCompleteCallback?.({
      nodes: this.states.map((s) => ({ ...s.metrics })),
    });
  }
}
