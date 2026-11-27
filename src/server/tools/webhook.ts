export interface WebhookEvent {
  id: string;
  channel: string;
  receivedAt: string;
  receivedAtMs: number;
  method: string;
  path: string;
  subpath: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  contentType: string;
  bodyText: string;
  bodyJson: unknown | null;
  bodyBytes: number;
  bodyTruncated: boolean;
  sourceIp: string;
}

export interface WebhookChannelConfig {
  status: number;
  contentType: string;
  body: string;
}

type ChannelListener = (event: WebhookEvent | { type: 'cleared'; channel: string }) => void;

interface ChannelState {
  events: WebhookEvent[];
  listeners: Set<ChannelListener>;
  lastActiveMs: number;
  config: WebhookChannelConfig;
}

export interface WebhookStoreOptions {
  maxChannels?: number;
  maxEventsPerChannel?: number;
  maxBodyBytes?: number;
  channelTtlMs?: number;
}

const CHANNEL_RE = /^[a-z0-9][a-z0-9_-]{1,47}$/;
const ALLOWED_STATUS_CODES = new Set([200, 201, 202, 204, 400, 401, 403, 404, 422, 429, 500, 503]);

export function normalizeChannelId(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();
  if (!CHANNEL_RE.test(cleaned)) return null;
  return cleaned;
}

export function isAllowedResponseStatus(status: number): boolean {
  return Number.isInteger(status) && ALLOWED_STATUS_CODES.has(status);
}

async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; totalBytes: number; truncated: boolean }> {
  if (!request.body) {
    return { bytes: new Uint8Array(0), totalBytes: 0, truncated: false };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let keptBytes = 0;
  let totalBytes = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      totalBytes += value.byteLength;
      if (keptBytes < maxBytes) {
        const remaining = maxBytes - keptBytes;
        const slice = value.byteLength <= remaining ? value : value.subarray(0, remaining);
        chunks.push(slice);
        keptBytes += slice.byteLength;
        if (value.byteLength > remaining) {
          truncated = true;
        }
      } else {
        truncated = true;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(keptBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes: combined, totalBytes, truncated };
}

function parseQueryParams(searchParams: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of searchParams.entries()) {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }
  return result;
}

function collectHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

function decodeBody(bytes: Uint8Array, contentType: string): { text: string; json: unknown | null } {
  if (bytes.byteLength === 0) {
    return { text: '', json: null };
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(bytes);
  let json: unknown | null = null;

  const trimmed = text.trim();
  const looksJson =
    contentType.toLowerCase().includes('json') ||
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (looksJson) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { text, json };
}

export class WebhookStore {
  private readonly channels = new Map<string, ChannelState>();
  private readonly maxChannels: number;
  private readonly maxEventsPerChannel: number;
  private readonly maxBodyBytes: number;
  private readonly channelTtlMs: number;
  private seq = 0;

  constructor(options: WebhookStoreOptions = {}) {
    this.maxChannels = options.maxChannels ?? 200;
    this.maxEventsPerChannel = options.maxEventsPerChannel ?? 500;
    this.maxBodyBytes = options.maxBodyBytes ?? 256 * 1024;
    this.channelTtlMs = options.channelTtlMs ?? 2 * 60 * 60 * 1000;
  }

  getMaxEvents(): number {
    return this.maxEventsPerChannel;
  }

  private pruneExpired(now = Date.now()): void {
    for (const [id, state] of this.channels.entries()) {
      if (state.listeners.size === 0 && now - state.lastActiveMs > this.channelTtlMs) {
        this.channels.delete(id);
      }
    }

    if (this.channels.size >= this.maxChannels) {
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      for (const [id, state] of this.channels.entries()) {
        if (state.listeners.size === 0 && state.lastActiveMs < oldestTime) {
          oldestTime = state.lastActiveMs;
          oldestId = id;
        }
      }
      if (oldestId) {
        this.channels.delete(oldestId);
      }
    }
  }

  private getOrCreateChannel(channel: string): ChannelState {
    const now = Date.now();
    let state = this.channels.get(channel);
    if (!state) {
      this.pruneExpired(now);
      state = {
        events: [],
        listeners: new Set(),
        lastActiveMs: now,
        config: {
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: '',
        },
      };
      this.channels.set(channel, state);
    } else {
      state.lastActiveMs = now;
    }
    return state;
  }

  async captureRequest(
    channel: string,
    request: Request,
    url: URL,
    subpath: string,
    sourceIp: string,
  ): Promise<
    | { captured: true; limitReached: boolean; event: WebhookEvent; config: WebhookChannelConfig }
    | { captured: false; limitReached: true; event: null; config: WebhookChannelConfig }
  > {
    const state = this.getOrCreateChannel(channel);
    if (state.events.length >= this.maxEventsPerChannel) {
      state.lastActiveMs = Date.now();
      return { captured: false, limitReached: true, event: null, config: { ...state.config } };
    }

    const contentType = request.headers.get('content-type') ?? '';
    const { bytes, totalBytes, truncated } = await readBoundedBody(request, this.maxBodyBytes);
    const { text, json } = decodeBody(bytes, contentType);

    const nowMs = Date.now();
    this.seq += 1;
    const event: WebhookEvent = {
      id: `${nowMs.toString(36)}-${this.seq.toString(36)}`,
      channel,
      receivedAt: new Date(nowMs).toISOString(),
      receivedAtMs: nowMs,
      method: request.method.toUpperCase(),
      path: url.pathname,
      subpath,
      query: parseQueryParams(url.searchParams),
      headers: collectHeaders(request.headers),
      contentType,
      bodyText: text,
      bodyJson: json,
      bodyBytes: totalBytes,
      bodyTruncated: truncated,
      sourceIp,
    };

    state.events.unshift(event);
    state.lastActiveMs = nowMs;

    for (const listener of state.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore broken subscriber callbacks
      }
    }

    return {
      captured: true,
      limitReached: state.events.length >= this.maxEventsPerChannel,
      event,
      config: { ...state.config },
    };
  }

  getEvents(channel: string): WebhookEvent[] {
    const state = this.channels.get(channel);
    if (!state) return [];
    state.lastActiveMs = Date.now();
    return [...state.events];
  }

  getConfig(channel: string): WebhookChannelConfig {
    const state = this.channels.get(channel);
    if (!state) {
      return { status: 200, contentType: 'application/json; charset=utf-8', body: '' };
    }
    return { ...state.config };
  }

  updateConfig(channel: string, partial: Partial<WebhookChannelConfig>): WebhookChannelConfig {
    const state = this.getOrCreateChannel(channel);
    if (partial.status !== undefined && isAllowedResponseStatus(partial.status)) {
      state.config.status = partial.status;
    }
    if (typeof partial.contentType === 'string' && partial.contentType.trim().length > 0) {
      state.config.contentType = partial.contentType.trim().slice(0, 128);
    }
    if (typeof partial.body === 'string') {
      state.config.body = partial.body.slice(0, 16 * 1024);
    }
    return { ...state.config };
  }

  clearChannel(channel: string): void {
    const state = this.channels.get(channel);
    if (!state) return;
    state.events = [];
    state.lastActiveMs = Date.now();
    for (const listener of state.listeners) {
      try {
        listener({ type: 'cleared', channel });
      } catch {
        // Ignore broken subscriber callbacks
      }
    }
  }

  subscribe(channel: string, listener: ChannelListener): () => void {
    const state = this.getOrCreateChannel(channel);
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
      state.lastActiveMs = Date.now();
    };
  }
}
