import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';
import { resolvePublicTarget, type IpFamily } from '../ip.ts';

const execFileAsync = promisify(execFile);

export interface PingSample {
  seq: number;
  status: 'reply' | 'timeout' | 'error';
  rttMs: number | null;
  ttl: number | null;
  detail: string;
}

export interface PingResult {
  target: string;
  resolvedIp: string;
  family: IpFamily;
  method: 'icmp' | 'tcp';
  port: number | null;
  transmitted: number;
  received: number;
  lossPercent: number;
  minMs: number | null;
  avgMs: number | null;
  maxMs: number | null;
  jitterMs: number | null;
  samples: PingSample[];
  raw: string;
}

export interface TracerouteHop {
  hop: number;
  address: string | null;
  rttMs: number | null;
  timedOut: boolean;
  rawLine: string;
}

export interface TracerouteResult {
  target: string;
  resolvedIp: string;
  family: IpFamily;
  method: 'traceroute' | 'fallback';
  completed: boolean;
  note: string | null;
  hops: TracerouteHop[];
  raw: string;
  durationMs: number;
}

export interface SingleTracerouteHopResult {
  target: string;
  resolvedIp: string;
  family: IpFamily;
  method: 'traceroute' | 'fallback';
  hop: TracerouteHop;
  reached: boolean;
  note: string | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function tcpConnectProbe(
  ip: string,
  port: number,
  timeoutMs = 2500,
): Promise<{ ok: boolean; rttMs: number | null; detail: string }> {
  return new Promise((resolve) => {
    const started = performance.now();
    const socket = net.createConnection({ host: ip, port });
    let settled = false;

    const finish = (ok: boolean, detail: string, measure = true) => {
      if (settled) return;
      settled = true;
      const elapsed = measure ? round2(performance.now() - started) : null;
      socket.destroy();
      resolve({ ok, rttMs: elapsed, detail });
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true, `TCP:${port} connected`));
    socket.on('timeout', () => finish(false, `TCP:${port} timed out`, false));
    socket.on('error', (err: NodeJS.ErrnoException) => {
      // ECONNREFUSED still proves the host is reachable and replied with RST
      if (err.code === 'ECONNREFUSED') {
        finish(true, `TCP:${port} RST (host reachable)`);
      } else {
        finish(false, err.code ?? err.message, false);
      }
    });
  });
}

function computeStats(samples: PingSample[]) {
  const valid = samples.map((s) => s.rttMs).filter((v): v is number => v !== null);
  const transmitted = samples.length;
  const received = valid.length;
  const lossPercent = transmitted > 0 ? round2(((transmitted - received) / transmitted) * 100) : 100;

  if (valid.length === 0) {
    return { transmitted, received, lossPercent, minMs: null, avgMs: null, maxMs: null, jitterMs: null };
  }

  const minMs = round2(Math.min(...valid));
  const maxMs = round2(Math.max(...valid));
  const avgMs = round2(valid.reduce((acc, v) => acc + v, 0) / valid.length);

  let jitterMs: number | null = 0;
  if (valid.length > 1) {
    let diffSum = 0;
    for (let i = 1; i < valid.length; i++) {
      diffSum += Math.abs(valid[i] - valid[i - 1]);
    }
    jitterMs = round2(diffSum / (valid.length - 1));
  }

  return { transmitted, received, lossPercent, minMs, avgMs, maxMs, jitterMs };
}

function parseIcmpOutput(stdout: string, count: number): PingSample[] {
  const samples: PingSample[] = [];
  const lines = stdout.split(/\r?\n/);
  let seq = 0;

  for (const line of lines) {
    const timeMatch = /time[=<]\s*([\d.]+)\s*ms/i.exec(line);
    if (timeMatch) {
      seq += 1;
      const ttlMatch = /ttl=(\d+)/i.exec(line);
      samples.push({
        seq,
        status: 'reply',
        rttMs: round2(Number(timeMatch[1])),
        ttl: ttlMatch ? Number(ttlMatch[1]) : null,
        detail: line.trim(),
      });
    } else if (/Request timeout/i.test(line)) {
      seq += 1;
      samples.push({
        seq,
        status: 'timeout',
        rttMs: null,
        ttl: null,
        detail: line.trim(),
      });
    }
  }

  while (samples.length < count) {
    samples.push({
      seq: samples.length + 1,
      status: 'timeout',
      rttMs: null,
      ttl: null,
      detail: 'No reply received',
    });
  }

  return samples.slice(0, count);
}

export async function performPing(
  rawTarget: string,
  options: { count?: number; mode?: 'auto' | 'icmp' | 'tcp'; port?: number; seq?: number } = {},
): Promise<PingResult> {
  const target = await resolvePublicTarget(rawTarget);
  const count = Math.min(Math.max(Math.trunc(options.count ?? 4), 1), 6);
  const startSeq = options.seq && options.seq >= 1 ? Math.trunc(options.seq) : 1;
  const mode = options.mode ?? 'auto';
  const tcpPort = options.port && options.port >= 1 && options.port <= 65535 ? options.port : 443;

  if (mode !== 'tcp') {
    try {
      const bin = target.family === 'IPv6' && process.platform === 'darwin' ? 'ping6' : 'ping';
      const args =
        process.platform === 'darwin'
          ? ['-c', String(count), '-i', '0.25', '-W', '1500', target.ip]
          : ['-c', String(count), '-i', '0.25', '-W', '2', target.ip];

      const { stdout } = await execFileAsync(bin, args, { timeout: 10_000 });
      const samples = parseIcmpOutput(stdout, count).map((s, idx) => ({
        ...s,
        seq: startSeq + idx,
      }));
      const stats = computeStats(samples);

      if (stats.received > 0 || mode === 'icmp') {
        return {
          target: target.input,
          resolvedIp: target.ip,
          family: target.family,
          method: 'icmp',
          port: null,
          ...stats,
          samples,
          raw: stdout.trim(),
        };
      }
    } catch {
      if (mode === 'icmp') {
        throw new Error('ICMP ping is unavailable or restricted in this runtime. Switch mode to Auto or TCP.');
      }
      // Fall through to TCP connect latency ping
    }
  }

  // TCP connect-latency fallback
  const samples: PingSample[] = [];
  const rawLines = [
    `TCP PING ${target.input} (${target.ip}) port ${tcpPort} — ${count} probe${count === 1 ? '' : 's'}`,
  ];

  for (let i = 0; i < count; i++) {
    const seq = startSeq + i;
    const probe = await tcpConnectProbe(target.ip, tcpPort, 2500);
    samples.push({
      seq,
      status: probe.ok ? 'reply' : 'timeout',
      rttMs: probe.rttMs,
      ttl: null,
      detail: probe.detail,
    });
    rawLines.push(
      probe.ok && probe.rttMs !== null
        ? `seq=${seq} from ${target.ip}:${tcpPort} time=${probe.rttMs.toFixed(2)} ms (${probe.detail})`
        : `seq=${seq} ${target.ip}:${tcpPort} timeout (${probe.detail})`,
    );
  }

  const stats = computeStats(samples);
  rawLines.push(
    `--- ${target.input} tcp-ping statistics ---`,
    `${stats.transmitted} probes transmitted, ${stats.received} received, ${stats.lossPercent}% loss`,
  );
  if (stats.minMs !== null && stats.avgMs !== null && stats.maxMs !== null) {
    rawLines.push(
      `rtt min/avg/max/jitter = ${stats.minMs}/${stats.avgMs}/${stats.maxMs}/${stats.jitterMs ?? 0} ms`,
    );
  }

  return {
    target: target.input,
    resolvedIp: target.ip,
    family: target.family,
    method: 'tcp',
    port: tcpPort,
    ...stats,
    samples,
    raw: rawLines.join('\n'),
  };
}

export function parseTracerouteOutput(stdout: string): TracerouteHop[] {
  const hops: TracerouteHop[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    const hopMatch = /^(\d+)\s+(.*)$/.exec(trimmed);
    if (!hopMatch) continue;
    const hop = Number(hopMatch[1]);
    const rest = hopMatch[2].trim();
    if (rest.startsWith('*')) {
      hops.push({ hop, address: null, rttMs: null, timedOut: true, rawLine: trimmed });
      continue;
    }
    const ipMatch = /([0-9a-fA-F:.]{3,})/.exec(rest);
    const rttMatch = /([\d.]+)\s*ms/.exec(rest);
    hops.push({
      hop,
      address: ipMatch ? ipMatch[1] : null,
      rttMs: rttMatch ? round2(Number(rttMatch[1])) : null,
      timedOut: false,
      rawLine: trimmed,
    });
  }
  return hops;
}

export async function performTraceroute(
  rawTarget: string,
  maxHops = 18,
): Promise<TracerouteResult> {
  const started = performance.now();
  const target = await resolvePublicTarget(rawTarget);
  const clampedHops = Math.min(Math.max(Math.trunc(maxHops), 1), 24);

  const candidates: Array<{ bin: string; args: string[] }> =
    target.family === 'IPv6'
      ? [
          { bin: 'traceroute6', args: ['-n', '-q', '1', '-m', String(clampedHops), '-w', '1', target.ip] },
          { bin: 'traceroute', args: ['-6', '-n', '-q', '1', '-m', String(clampedHops), '-w', '1', target.ip] },
        ]
      : [
          { bin: 'traceroute', args: ['-n', '-q', '1', '-m', String(clampedHops), '-w', '1', target.ip] },
          { bin: 'tracepath', args: ['-n', '-m', String(clampedHops), target.ip] },
        ];

  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(candidate.bin, candidate.args, { timeout: 14_000 });
      const hops = parseTracerouteOutput(stdout);
      if (hops.length > 0) {
        const completed = hops.some((h) => h.address === target.ip);
        return {
          target: target.input,
          resolvedIp: target.ip,
          family: target.family,
          method: 'traceroute',
          completed,
          note: null,
          hops,
          raw: stdout.trim(),
          durationMs: Math.round(performance.now() - started),
        };
      }
    } catch {
      // Try next binary or fallback
    }
  }

  // Graceful fallback when raw UDP/ICMP traceroute is unavailable in serverless/container runtime
  const probe = await tcpConnectProbe(target.ip, 443, 2500);
  const fallbackHop: TracerouteHop = {
    hop: 1,
    address: target.ip,
    rttMs: probe.rttMs,
    timedOut: !probe.ok,
    rawLine: probe.ok
      ? `1  ${target.ip}  ${probe.rttMs?.toFixed(2)} ms  (direct TCP:443 reachability)`
      : `1  *  ${target.ip}  (TCP:443 timed out)`,
  };

  return {
    target: target.input,
    resolvedIp: target.ip,
    family: target.family,
    method: 'fallback',
    completed: probe.ok,
    note: 'Raw ICMP/UDP traceroute is restricted in this container runtime. Showing direct TCP reachability to the destination.',
    hops: [fallbackHop],
    raw: [
      `traceroute to ${target.input} (${target.ip}), ${clampedHops} hops max`,
      `[runtime notice] raw ICMP/UDP sockets unavailable; fell back to direct TCP:443 check`,
      fallbackHop.rawLine,
    ].join('\n'),
    durationMs: Math.round(performance.now() - started),
  };
}

export async function performSingleTracerouteHop(
  rawTarget: string,
  hopNumber: number,
): Promise<SingleTracerouteHopResult> {
  const target = await resolvePublicTarget(rawTarget);
  const hop = Math.min(Math.max(Math.trunc(hopNumber), 1), 30);

  const candidates: Array<{ bin: string; args: string[] }> =
    target.family === 'IPv6'
      ? [
          { bin: 'traceroute6', args: ['-n', '-q', '1', '-f', String(hop), '-m', String(hop), '-w', '1', target.ip] },
          { bin: 'traceroute', args: ['-6', '-n', '-q', '1', '-f', String(hop), '-m', String(hop), '-w', '1', target.ip] },
        ]
      : [
          { bin: 'traceroute', args: ['-n', '-q', '1', '-f', String(hop), '-m', String(hop), '-w', '1', target.ip] },
        ];

  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(candidate.bin, candidate.args, { timeout: 3500 });
      const hops = parseTracerouteOutput(stdout);
      const parsed = hops.find((h) => h.hop === hop) ?? hops[0];
      if (parsed) {
        return {
          target: target.input,
          resolvedIp: target.ip,
          family: target.family,
          method: 'traceroute',
          hop: { ...parsed, hop },
          reached: parsed.address === target.ip,
          note: null,
        };
      }
    } catch {
      // Try next binary or fallback
    }
  }

  // Graceful fallback when raw UDP/ICMP traceroute is unavailable in serverless/container runtime
  const probe = await tcpConnectProbe(target.ip, 443, 2500);
  const fallbackHop: TracerouteHop = {
    hop: 1,
    address: target.ip,
    rttMs: probe.rttMs,
    timedOut: !probe.ok,
    rawLine: probe.ok
      ? `1  ${target.ip}  ${probe.rttMs?.toFixed(2)} ms  (direct TCP:443 reachability)`
      : `1  *  ${target.ip}  (TCP:443 timed out)`,
  };

  return {
    target: target.input,
    resolvedIp: target.ip,
    family: target.family,
    method: 'fallback',
    hop: fallbackHop,
    reached: true,
    note: 'Raw ICMP/UDP traceroute is restricted in this container runtime. Showing direct TCP reachability to the destination.',
  };
}
