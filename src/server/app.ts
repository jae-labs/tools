import { detectRegionFromHost, getRegionDefinition, resolveRegionNodes } from '../shared/regions.ts';
import {
  convertDateStringToEpoch,
  convertEpochToDate,
  type EpochPrecision,
} from '../shared/epoch.ts';
import {
  calculateReverseSla,
  calculateSlaBreakdown,
  compareSlas,
  parseDurationString,
  type SlaPeriodId,
} from '../shared/sla.ts';
import {
  DEFAULT_TAX_INPUTS,
  calculateIrishTax2026,
  type FilingStatus,
} from '../shared/irishtax.ts';
import {
  BCRYPT_ROUNDS_DEFAULT,
  BCRYPT_ROUNDS_MIN,
  HASH_ALGORITHMS,
  computeAllHashes,
  computeBcryptHash,
  isBcryptHash,
  parseBcryptRounds,
  verifyBcryptHash,
  type HashAlgorithm,
  type HashEncoding,
} from '../shared/hash.ts';
import { generateIds, type IdKind } from '../shared/idgen.ts';
import {
  DEFAULT_MEMORABLE_OPTIONS,
  DEFAULT_PIN_OPTIONS,
  DEFAULT_RANDOM_OPTIONS,
  generatePassword,
  type MemorableSeparator,
  type PasswordType,
} from '../shared/password.ts';
import { calculateSubnet } from '../shared/subnet.ts';
import { createGeoLookup, type GeoInfo } from './geo.ts';
import { extractClientIp, normalizeIp, resolvePublicTarget } from './ip.ts';
import { performDnsLookup, performReverseLookup } from './tools/dns.ts';
import { performPing, performSingleTracerouteHop, performTraceroute } from './tools/ping.ts';
import { performPortCheck, performProxyCheck } from './tools/port.ts';
import { performLocalPropagationLookup, performPropagationCheck } from './tools/propagation.ts';
import { performRblLookup } from './tools/rbl.ts';
import { performSpfTest } from './tools/spf.ts';
import {
  WebhookStore,
  isAllowedResponseStatus,
  normalizeChannelId,
} from './tools/webhook.ts';
import { performDkimLookup, performDmarcLookup } from './tools/emailauth.ts';
import { performHttpHeaderInspect } from './tools/headers.ts';
import {
  bulkLookupMacs,
  looksLikeMacInput,
  lookupMacVendor,
  searchMacByVendor,
} from './tools/mac.ts';
import { performSmtpProbe } from './tools/smtp.ts';
import { performTlsInspect } from './tools/tls.ts';
import { performWhoisLookup } from './tools/whois.ts';

export interface StaticAssetResult {
  body: BodyInit | null;
  contentType: string;
  cacheControl: string;
}

export interface AppOptions {
  lookupGeo?: (ip: string) => Promise<GeoInfo | null>;
  serveStatic?: (pathname: string, method: string) => Promise<StaticAssetResult | null>;
  fetchImpl?: typeof fetch;
  webhookStore?: WebhookStore;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const JSON_HEADERS = { ...NO_STORE, ...SECURITY_HEADERS };

const BANDWIDTH_CHUNK_SIZE = 256 * 1024; // 256 KiB incompressible block
const MIN_BANDWIDTH_BYTES = 1024;
const MAX_BANDWIDTH_BYTES = 64 * 1024 * 1024; // 64 MiB cap
const BANDWIDTH_CHUNK = (() => {
  const block = new Uint8Array(BANDWIDTH_CHUNK_SIZE);
  let state = 0x9e3779b9;
  for (let i = 0; i < block.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    block[i] = state & 0xff;
  }
  return block;
})();

const SPEED_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Speed-Seq, X-Client-Region',
  'Access-Control-Expose-Headers': 'X-Server-Region, X-Server-Timestamp, X-Payload-Bytes',
  'Timing-Allow-Origin': '*',
};

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  const redacted = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    result[lower] = redacted.has(lower) ? '[REDACTED]' : value;
  });
  return result;
}

function buildConnectionInfo(request: Request, client: ReturnType<typeof extractClientIp>) {
  const headers = request.headers;
  return {
    ip: client.ip,
    family: client.family,
    userAgent: headers.get('user-agent') ?? '',
    port: client.port ?? '',
    language: headers.get('accept-language') ?? '',
    method: request.method,
    encoding: headers.get('accept-encoding') ?? '',
    mime: headers.get('accept') ?? '',
    via: headers.get('via') ?? '',
    forwarded: headers.get('x-forwarded-for') ?? headers.get('forwarded') ?? '',
    host: headers.get('host') ?? '',
  };
}

function errorJson(message: string, status = 400): Response {
  return Response.json({ error: message }, { status, headers: JSON_HEADERS });
}

function parsePortsParam(raw: string | null): number[] {
  if (!raw) return [80, 443];
  return raw
    .split(/[\s,;]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 65535);
}

function createBandwidthStream(totalBytes: number): ReadableStream<Uint8Array> {
  let remaining = totalBytes;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (remaining <= 0) {
        controller.close();
        return;
      }
      if (remaining >= BANDWIDTH_CHUNK_SIZE) {
        controller.enqueue(BANDWIDTH_CHUNK);
        remaining -= BANDWIDTH_CHUNK_SIZE;
      } else {
        controller.enqueue(BANDWIDTH_CHUNK.subarray(0, remaining));
        remaining = 0;
      }
    },
  });
}

const HOOK_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

export function createApp(options: AppOptions = {}) {
  const fetchFn = options.fetchImpl ?? fetch;
  const lookupGeo = options.lookupGeo ?? createGeoLookup({ fetchImpl: fetchFn });
  const webhookStore = options.webhookStore ?? new WebhookStore();

  return {
    async fetch(
      request: Request,
      socketInfo?: { address?: string | null; port?: number | null } | null,
    ): Promise<Response> {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const client = extractClientIp(request.headers, socketInfo);

      // Live Webhook / Payload Catch endpoint: /hook/<channel>[/subpath...]
      if (pathname.startsWith('/hook/')) {
        const rest = pathname.slice('/hook/'.length);
        const slashIdx = rest.indexOf('/');
        const rawChannel = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
        const subpath = slashIdx === -1 ? '' : rest.slice(slashIdx);
        const channel = normalizeChannelId(rawChannel);
        if (!channel) {
          return Response.json(
            { error: 'Invalid channel name. Use 2-48 lowercase letters, digits, hyphens, or underscores.' },
            { status: 400, headers: { ...JSON_HEADERS, ...HOOK_CORS_HEADERS } },
          );
        }

        if (request.method === 'OPTIONS' && request.headers.has('access-control-request-method')) {
          return new Response(null, { status: 204, headers: { ...HOOK_CORS_HEADERS, ...SECURITY_HEADERS } });
        }

        const capture = await webhookStore.captureRequest(
          channel,
          request,
          url,
          subpath,
          client.ip,
        );

        if (!capture.captured) {
          return Response.json(
            {
              ok: false,
              channel,
              limitReached: true,
              maxEvents: webhookStore.getMaxEvents(),
              error: `Channel reached its ${webhookStore.getMaxEvents()} request limit. Clear the channel to resume capturing.`,
            },
            {
              status: 429,
              headers: {
                ...NO_STORE,
                ...SECURITY_HEADERS,
                ...HOOK_CORS_HEADERS,
                'X-Hook-Channel': channel,
                'X-Hook-Limit-Reached': 'true',
              },
            },
          );
        }

        const { event, config } = capture;

        const responseHeaders: Record<string, string> = {
          ...NO_STORE,
          ...SECURITY_HEADERS,
          ...HOOK_CORS_HEADERS,
          'X-Hook-Channel': channel,
          'X-Hook-Event-Id': event.id,
        };

        if (config.status === 204 || request.method === 'HEAD') {
          return new Response(null, { status: config.status, headers: responseHeaders });
        }

        if (config.body.length > 0) {
          return new Response(config.body, {
            status: config.status,
            headers: {
              ...responseHeaders,
              'Content-Type': config.contentType || 'text/plain; charset=utf-8',
            },
          });
        }

        return Response.json(
          {
            ok: config.status >= 200 && config.status < 400,
            channel,
            eventId: event.id,
            method: event.method,
            receivedAt: event.receivedAt,
            bytes: event.bodyBytes,
          },
          { status: config.status, headers: responseHeaders },
        );
      }

      if (pathname.startsWith('/api/hook/')) {
        const parts = pathname.slice('/api/hook/'.length).split('/').filter(Boolean);
        const rawChannel = parts[0] ?? '';
        const action = parts[1] ?? 'events';
        const channel = normalizeChannelId(rawChannel);
        if (!channel) {
          return errorJson('Invalid channel name. Use 2-48 letters, digits, hyphens, or underscores.', 400);
        }

        if (action === 'stream') {
          if (request.method !== 'GET') {
            return new Response(null, { status: 405, headers: { Allow: 'GET', ...SECURITY_HEADERS } });
          }
          const encoder = new TextEncoder();
          let cleanup: (() => void) | null = null;
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const send = (eventName: string, payload: unknown) => {
                try {
                  controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`));
                } catch {
                  // Stream closed
                }
              };

              const initialEvents = webhookStore.getEvents(channel);
              send('init', {
                channel,
                events: initialEvents,
                config: webhookStore.getConfig(channel),
                maxEvents: webhookStore.getMaxEvents(),
                limitReached: initialEvents.length >= webhookStore.getMaxEvents(),
              });

              const unsubscribe = webhookStore.subscribe(channel, (msg) => {
                if ('type' in msg && msg.type === 'cleared') {
                  send('cleared', { channel });
                } else {
                  send('request', msg);
                }
              });

              const heartbeat = setInterval(() => {
                try {
                  controller.enqueue(encoder.encode(': ping\n\n'));
                } catch {
                  // Stream closed
                }
              }, 15_000);

              cleanup = () => {
                clearInterval(heartbeat);
                unsubscribe();
              };

              request.signal.addEventListener(
                'abort',
                () => {
                  cleanup?.();
                  cleanup = null;
                  try {
                    controller.close();
                  } catch {
                    // Already closed
                  }
                },
                { once: true },
              );
            },
            cancel() {
              cleanup?.();
              cleanup = null;
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
              'X-Accel-Buffering': 'no',
              ...SECURITY_HEADERS,
            },
          });
        }

        if (action === 'events') {
          if (request.method === 'GET') {
            const events = webhookStore.getEvents(channel);
            return Response.json(
              {
                channel,
                events,
                config: webhookStore.getConfig(channel),
                maxEvents: webhookStore.getMaxEvents(),
                limitReached: events.length >= webhookStore.getMaxEvents(),
              },
              { headers: JSON_HEADERS },
            );
          }
          if (request.method === 'DELETE') {
            webhookStore.clearChannel(channel);
            return Response.json({ ok: true, channel }, { headers: JSON_HEADERS });
          }
          return new Response(null, { status: 405, headers: { Allow: 'GET, DELETE', ...SECURITY_HEADERS } });
        }

        if (action === 'config') {
          if (request.method !== 'POST') {
            return new Response(null, { status: 405, headers: { Allow: 'POST', ...SECURITY_HEADERS } });
          }
          try {
            const payload = (await request.json()) as {
              status?: number;
              contentType?: string;
              body?: string;
            };
            if (payload.status !== undefined && !isAllowedResponseStatus(Number(payload.status))) {
              return errorJson('Unsupported HTTP status code.', 400);
            }
            const config = webhookStore.updateConfig(channel, {
              status: payload.status !== undefined ? Number(payload.status) : undefined,
              contentType: payload.contentType,
              body: payload.body,
            });
            return Response.json({ ok: true, channel, config }, { headers: JSON_HEADERS });
          } catch {
            return errorJson('Invalid JSON config payload.', 400);
          }
        }

        return errorJson(`Unknown hook API action: ${action}`, 404);
      }

      if (pathname.startsWith('/api/')) {
        const hostHeader = request.headers.get('host');
        const currentRegion = detectRegionFromHost(hostHeader);
        const regionCorsHeaders = {
          ...SPEED_CORS_HEADERS,
          'X-Server-Region': currentRegion,
          'X-Server-Timestamp': String(Date.now()),
        };

        if (
          request.method === 'OPTIONS' &&
          (pathname === '/api/ping' ||
            pathname === '/api/download' ||
            pathname === '/api/upload' ||
            pathname === '/api/node' ||
            pathname === '/api/nodes')
        ) {
          return new Response(null, {
            status: 204,
            headers: { ...regionCorsHeaders, 'Access-Control-Max-Age': '86400' },
          });
        }

        if (pathname === '/api/node') {
          if (request.method !== 'GET') {
            return new Response(null, {
              status: 405,
              headers: { Allow: 'GET, OPTIONS', ...regionCorsHeaders, ...SECURITY_HEADERS },
            });
          }
          const def = currentRegion === 'local' ? null : getRegionDefinition(currentRegion);
          return Response.json(
            { region: currentRegion, regionInfo: def, runtime: 'bun', serverTime: Date.now() },
            { headers: { ...JSON_HEADERS, ...regionCorsHeaders } },
          );
        }

        if (pathname === '/api/nodes') {
          if (request.method !== 'GET') {
            return new Response(null, {
              status: 405,
              headers: { Allow: 'GET, OPTIONS', ...regionCorsHeaders, ...SECURITY_HEADERS },
            });
          }
          const forwardedProto = request.headers
            .get('x-forwarded-proto')
            ?.split(',')[0]
            ?.trim()
            .toLowerCase();
          const effectiveProto =
            forwardedProto === 'https' || forwardedProto === 'http'
              ? `${forwardedProto}:`
              : url.protocol;
          const effectiveHost = hostHeader?.trim() || url.host;
          const nodes = resolveRegionNodes({
            currentOrigin: `${effectiveProto}//${effectiveHost}`,
            currentRegion,
          });
          return Response.json(
            { currentRegion, nodes },
            { headers: { ...JSON_HEADERS, ...regionCorsHeaders } },
          );
        }

        if (pathname === '/api/upload') {
          if (request.method !== 'POST') {
            return new Response(null, {
              status: 405,
              headers: { Allow: 'POST, OPTIONS', ...regionCorsHeaders, ...SECURITY_HEADERS },
            });
          }
          const startedAt = performance.now();
          let bytesReceived = 0;
          if (request.body) {
            const reader = request.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) bytesReceived += value.byteLength;
              }
            } finally {
              reader.releaseLock();
            }
          }
          const durationMs = Math.max(0.1, performance.now() - startedAt);
          const mbps = (bytesReceived * 8) / (durationMs / 1000) / 1_000_000;
          return Response.json(
            {
              ok: true,
              bytesReceived,
              durationMs: Number(durationMs.toFixed(2)),
              mbps: Number(mbps.toFixed(2)),
              region: currentRegion,
              ts: Date.now(),
            },
            { headers: { ...JSON_HEADERS, ...regionCorsHeaders } },
          );
        }

        if (pathname === '/api/download' || pathname === '/api/bandwidth') {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response(null, {
              status: 405,
              headers: { Allow: 'GET, HEAD, OPTIONS', ...regionCorsHeaders, ...SECURITY_HEADERS },
            });
          }
          const rawBytes = Number(url.searchParams.get('bytes') ?? String(8 * 1024 * 1024));
          const totalBytes = Number.isFinite(rawBytes)
            ? Math.min(Math.max(Math.trunc(rawBytes), MIN_BANDWIDTH_BYTES), MAX_BANDWIDTH_BYTES)
            : 8 * 1024 * 1024;
          const headers = {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(totalBytes),
            'Cache-Control': 'no-store, no-transform',
            'X-Payload-Bytes': String(totalBytes),
            ...regionCorsHeaders,
            ...SECURITY_HEADERS,
          };
          if (request.method === 'HEAD') {
            return new Response(null, { status: 200, headers });
          }
          return new Response(createBandwidthStream(totalBytes), { headers });
        }

        if (pathname === '/api/ping' && !url.searchParams.has('host')) {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response(null, {
              status: 405,
              headers: { Allow: 'GET, HEAD, OPTIONS', ...regionCorsHeaders, ...SECURITY_HEADERS },
            });
          }
          const headers = {
            'Cache-Control': 'no-store, no-transform',
            ...regionCorsHeaders,
            ...SECURITY_HEADERS,
          };
          if (request.method === 'HEAD') {
            return new Response(null, { status: 200, headers });
          }
          return Response.json(
            { ok: true, seq: url.searchParams.get('seq') ?? '0', region: currentRegion, ts: Date.now() },
            { headers },
          );
        }

        if (pathname === '/api/spf' && (request.method === 'GET' || request.method === 'POST')) {
          try {
            let domain = url.searchParams.get('domain') ?? '';
            let senderIp = url.searchParams.get('ip') ?? undefined;
            let sender = url.searchParams.get('sender') ?? undefined;
            let helo = url.searchParams.get('helo') ?? undefined;
            let customRecord = url.searchParams.get('record') ?? undefined;

            if (request.method === 'POST') {
              const body = (await request.json()) as {
                domain?: string;
                senderIp?: string;
                ip?: string;
                sender?: string;
                helo?: string;
                customRecord?: string;
                record?: string;
              };
              domain = body.domain ?? domain;
              senderIp = body.senderIp ?? body.ip ?? senderIp;
              sender = body.sender ?? sender;
              helo = body.helo ?? helo;
              customRecord = body.customRecord ?? body.record ?? customRecord;
            }

            const result = await performSpfTest({
              domain,
              senderIp,
              sender,
              helo,
              customRecord,
              fetchFn,
            });
            return Response.json(result, { headers: JSON_HEADERS });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'SPF test failed.';
            return errorJson(message, 400);
          }
        }

        if (request.method !== 'GET') {
          return new Response(null, { status: 405, headers: { Allow: 'GET', ...SECURITY_HEADERS } });
        }

        try {
          if (pathname === '/api/me') {
            const geo = await lookupGeo(client.ip);
            return Response.json({ client, geo }, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/info') {
            const geo = await lookupGeo(client.ip);
            const connection = buildConnectionInfo(request, client);
            return Response.json(
              {
                client,
                geo,
                connection,
                headers: sanitizeHeaders(request.headers),
              },
              { headers: JSON_HEADERS },
            );
          }

          if (pathname === '/api/ping') {
            const host = url.searchParams.get('host') ?? '';
            const count = Number(url.searchParams.get('count') ?? '4');
            const modeParam = (url.searchParams.get('mode') ?? 'auto').toLowerCase();
            const mode = modeParam === 'icmp' || modeParam === 'tcp' ? modeParam : 'auto';
            const portParam = url.searchParams.get('port');
            const port = portParam ? Number(portParam) : undefined;
            const seqParam = url.searchParams.get('seq');
            const seq = seqParam ? Number(seqParam) : undefined;
            const result = await performPing(host, {
              count: Number.isFinite(count) ? count : 4,
              mode,
              port: port && Number.isFinite(port) ? port : undefined,
              seq: seq && Number.isFinite(seq) ? seq : undefined,
            });
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/traceroute') {
            const host = url.searchParams.get('host') ?? '';
            const hopParam = url.searchParams.get('hop');
            if (hopParam !== null) {
              const hop = Number(hopParam);
              if (!Number.isInteger(hop) || hop < 1 || hop > 30) {
                return errorJson('Hop number must be an integer between 1 and 30.', 400);
              }
              const result = await performSingleTracerouteHop(host, hop);
              return Response.json(result, { headers: JSON_HEADERS });
            }
            const maxHops = Number(url.searchParams.get('maxHops') ?? '18');
            const result = await performTraceroute(host, Number.isFinite(maxHops) ? maxHops : 18);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/dns') {
            const host = url.searchParams.get('host') ?? '';
            const type = url.searchParams.get('type') ?? 'ALL';
            const result = await performDnsLookup(host, type, fetchFn);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/whois') {
            const query = url.searchParams.get('query') ?? url.searchParams.get('host') ?? '';
            const result = await performWhoisLookup(query, fetchFn);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/port') {
            const host = url.searchParams.get('host') ?? '';
            const ports = parsePortsParam(url.searchParams.get('ports') ?? url.searchParams.get('port'));
            const result = await performPortCheck(host, ports);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/reverse') {
            const ip = url.searchParams.get('ip') ?? client.ip;
            const result = await performReverseLookup(ip, fetchFn);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/proxy') {
            const requestedIp = url.searchParams.get('ip')?.trim();
            const targetIp = requestedIp || client.ip;
            const isSelf = !requestedIp || normalizeIp(requestedIp) === client.ip;
            const result = await performProxyCheck(targetIp, {
              requestHeaders: request.headers,
              isSelf,
              lookupGeo,
            });
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/geo') {
            const rawTarget = url.searchParams.get('target')?.trim() || url.searchParams.get('ip')?.trim();
            if (!rawTarget) {
              const geo = await lookupGeo(client.ip);
              return Response.json({ target: client.ip, resolvedIp: client.ip, geo }, { headers: JSON_HEADERS });
            }
            const directIp = normalizeIp(rawTarget);
            if (directIp) {
              const geo = await lookupGeo(directIp);
              return Response.json({ target: directIp, resolvedIp: directIp, geo }, { headers: JSON_HEADERS });
            }
            const resolved = await resolvePublicTarget(rawTarget);
            const geo = await lookupGeo(resolved.ip);
            return Response.json(
              { target: resolved.input, resolvedIp: resolved.ip, geo },
              { headers: JSON_HEADERS },
            );
          }

          if (pathname === '/api/subnet') {
            const cidr = url.searchParams.get('cidr') ?? url.searchParams.get('ip') ?? '';
            const mask = url.searchParams.get('mask') ?? undefined;
            const result = calculateSubnet(cidr, mask);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/rbl') {
            const target = url.searchParams.get('target') ?? url.searchParams.get('ip') ?? '';
            const offsetParam = url.searchParams.get('offset');
            const limitParam = url.searchParams.get('limit');
            const offset = offsetParam !== null ? Number.parseInt(offsetParam, 10) : undefined;
            const limit = limitParam !== null ? Number.parseInt(limitParam, 10) : undefined;
            const result = await performRblLookup(target, {
              offset: Number.isFinite(offset) ? offset : undefined,
              limit: Number.isFinite(limit) ? limit : undefined,
              fetchFn,
            });
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/propagation') {
            const host = url.searchParams.get('host') ?? url.searchParams.get('domain') ?? '';
            const type = url.searchParams.get('type') ?? 'A';
            const localOnly = url.searchParams.get('local') === '1' || url.searchParams.get('local') === 'true';

            if (localOnly) {
              const result = await performLocalPropagationLookup(host, type, fetchFn);
              return Response.json(result, { headers: { ...JSON_HEADERS, ...regionCorsHeaders } });
            }

            const expected = url.searchParams.get('expected') ?? undefined;
            const offsetParam = url.searchParams.get('offset');
            const limitParam = url.searchParams.get('limit');
            const offset = offsetParam !== null ? Number.parseInt(offsetParam, 10) : undefined;
            const limit = limitParam !== null ? Number.parseInt(limitParam, 10) : undefined;

            const forwardedProto = request.headers
              .get('x-forwarded-proto')
              ?.split(',')[0]
              ?.trim()
              .toLowerCase();
            const effectiveProto =
              forwardedProto === 'https' || forwardedProto === 'http' ? `${forwardedProto}:` : url.protocol;
            const effectiveHost = hostHeader?.trim() || url.host;

            const result = await performPropagationCheck(host, type, {
              expected,
              offset: Number.isFinite(offset) ? offset : undefined,
              limit: Number.isFinite(limit) ? limit : undefined,
              currentOrigin: `${effectiveProto}//${effectiveHost}`,
              currentRegion,
              fetchFn,
            });
            return Response.json(result, { headers: { ...JSON_HEADERS, ...regionCorsHeaders } });
          }

          if (pathname === '/api/sla') {
            const downParam = url.searchParams.get('down');
            if (downParam !== null && downParam.trim() !== '') {
              const downSeconds = parseDurationString(downParam);
              const daysParam = url.searchParams.get('days');
              const periodParam = (url.searchParams.get('period') ?? 'monthly').toLowerCase();
              const period: SlaPeriodId | { customDays: number } =
                daysParam !== null && Number.isFinite(Number(daysParam))
                  ? { customDays: Number(daysParam) }
                  : (['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(periodParam)
                      ? (periodParam as SlaPeriodId)
                      : 'monthly');
              return Response.json(calculateReverseSla(downSeconds, period), { headers: JSON_HEADERS });
            }

            const pctA = Number(url.searchParams.get('pct') ?? url.searchParams.get('sla') ?? '99.9');
            const compareParam = url.searchParams.get('compare');
            if (compareParam !== null && compareParam.trim() !== '') {
              const pctB = Number(compareParam);
              return Response.json(compareSlas(pctA, pctB), { headers: JSON_HEADERS });
            }

            return Response.json(calculateSlaBreakdown(pctA), { headers: JSON_HEADERS });
          }

          if (pathname === '/api/epoch') {
            const tsParam = url.searchParams.get('ts');
            const dateParam = url.searchParams.get('date');
            if (dateParam !== null && dateParam.trim() !== '') {
              return Response.json(convertDateStringToEpoch(dateParam), { headers: JSON_HEADERS });
            }
            const precisionRaw = (url.searchParams.get('unit') ?? 'auto').toLowerCase() as EpochPrecision;
            const validPrecisions = new Set<EpochPrecision>([
              'auto',
              'seconds',
              'milliseconds',
              'microseconds',
              'nanoseconds',
            ]);
            const precision = validPrecisions.has(precisionRaw) ? precisionRaw : 'auto';
            const rawTs = tsParam !== null && tsParam.trim() !== '' ? tsParam : String(Math.floor(Date.now() / 1000));
            return Response.json(convertEpochToDate(rawTs, precision), { headers: JSON_HEADERS });
          }

          if (pathname === '/api/irishtax') {
            const num = (key: string, fallback: number) => {
              const raw = url.searchParams.get(key);
              if (raw === null || raw.trim() === '') return fallback;
              const parsed = Number(raw);
              return Number.isFinite(parsed) ? parsed : fallback;
            };
            const filingRaw = url.searchParams.get('filing') ?? 'single';
            const filingStatus: FilingStatus =
              filingRaw === 'marriedJoint' || filingRaw === 'marriedSeparate' ? filingRaw : 'single';
            const inputs = {
              ...DEFAULT_TAX_INPUTS,
              employmentIncome: num('salary', num('employmentIncome', DEFAULT_TAX_INPUTS.employmentIncome)),
              bonus: num('bonus', 0),
              taxableBenefits: num('benefits', 0),
              stockGains: num('stockGains', 0),
              otherIncome: num('otherIncome', 0),
              rentalIncome: num('rentalIncome', 0),
              age: Math.min(99, Math.max(18, Math.round(num('age', DEFAULT_TAX_INPUTS.age)))),
              partnerAge: Math.min(99, Math.max(18, Math.round(num('partnerAge', DEFAULT_TAX_INPUTS.partnerAge)))),
              pensionContribution: num('pension', 0),
              partnerPensionContribution: num('partnerPension', 0),
              filingStatus,
              partnerEmploymentIncome: num('partnerSalary', 0),
              partnerPaye: url.searchParams.get('partnerPaye') !== 'false',
              selfEmployed: url.searchParams.get('selfEmployed') === 'true',
            };
            return Response.json(
              { year: 2026, inputs, result: calculateIrishTax2026(inputs) },
              { headers: JSON_HEADERS },
            );
          }

          if (pathname === '/api/password') {
            const typeRaw = (url.searchParams.get('type') ?? 'random').toLowerCase();
            const type: PasswordType =
              typeRaw === 'memorable' || typeRaw === 'pin' ? typeRaw : 'random';
            const parseBool = (key: string, fallback: boolean): boolean => {
              const raw = url.searchParams.get(key);
              if (raw === null) return fallback;
              const lower = raw.trim().toLowerCase();
              if (lower === 'true' || lower === '1' || lower === 'yes') return true;
              if (lower === 'false' || lower === '0' || lower === 'no') return false;
              return fallback;
            };
            const parseNum = (key: string, fallback: number): number => {
              const raw = url.searchParams.get(key);
              if (raw === null || raw.trim() === '') return fallback;
              const parsed = Number(raw);
              return Number.isFinite(parsed) ? parsed : fallback;
            };

            const sepRaw = (url.searchParams.get('separator') ?? DEFAULT_MEMORABLE_OPTIONS.separator).toLowerCase();
            const validSeps = new Set<MemorableSeparator>(['hyphen', 'space', 'period', 'underscore', 'none']);
            const separator: MemorableSeparator = validSeps.has(sepRaw as MemorableSeparator)
              ? (sepRaw as MemorableSeparator)
              : DEFAULT_MEMORABLE_OPTIONS.separator;

            const result = generatePassword({
              type,
              random: {
                length: parseNum('length', DEFAULT_RANDOM_OPTIONS.length),
                numbers: parseBool('numbers', DEFAULT_RANDOM_OPTIONS.numbers),
                symbols: parseBool('symbols', DEFAULT_RANDOM_OPTIONS.symbols),
              },
              memorable: {
                words: parseNum('words', DEFAULT_MEMORABLE_OPTIONS.words),
                separator,
                capitalize: parseBool('capitalize', DEFAULT_MEMORABLE_OPTIONS.capitalize),
                includeNumber: parseBool('includeNumber', DEFAULT_MEMORABLE_OPTIONS.includeNumber),
              },
              pin: {
                length: parseNum('length', DEFAULT_PIN_OPTIONS.length),
              },
            });

            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/hash') {
            const text = url.searchParams.get('text') ?? '';
            const key = url.searchParams.get('key') ?? undefined;
            const formatRaw = url.searchParams.get('format') ?? 'hex';
            const encoding: HashEncoding =
              formatRaw === 'HEX' || formatRaw === 'base64' ? formatRaw : 'hex';
            const algoRaw = (url.searchParams.get('algo') ?? 'all').toLowerCase();

            if (algoRaw === 'bcrypt') {
              const verifyParam = url.searchParams.get('verify');
              if (verifyParam !== null && verifyParam.trim() !== '') {
                const validFormat = isBcryptHash(verifyParam);
                const match = validFormat ? await verifyBcryptHash(text, verifyParam) : false;
                return Response.json(
                  {
                    algorithm: 'bcrypt',
                    validFormat,
                    match,
                    rounds: parseBcryptRounds(verifyParam),
                  },
                  { headers: JSON_HEADERS },
                );
              }

              const roundsRaw = url.searchParams.get('rounds');
              const parsedRounds = roundsRaw !== null && roundsRaw.trim() !== '' ? Number(roundsRaw) : BCRYPT_ROUNDS_DEFAULT;
              // Cap server-side bcrypt cost at 12 to prevent CPU exhaustion
              const serverRounds = Number.isFinite(parsedRounds)
                ? Math.min(12, Math.max(BCRYPT_ROUNDS_MIN, Math.round(parsedRounds)))
                : BCRYPT_ROUNDS_DEFAULT;
              const bcryptRes = await computeBcryptHash(text, serverRounds);
              return Response.json(bcryptRes, { headers: JSON_HEADERS });
            }

            const result = await computeAllHashes(text, { encoding, key });
            if (algoRaw !== 'all') {
              const validAlgos = new Set<HashAlgorithm>(HASH_ALGORITHMS.map((a) => a.id));
              if (!validAlgos.has(algoRaw as HashAlgorithm)) {
                return errorJson(
                  `Unsupported algorithm "${algoRaw}". Use one of: all, md5, sha1, sha256, sha384, sha512, bcrypt.`,
                  400,
                );
              }
              const match = result.digests.find((d) => d.algorithm === algoRaw);
              return Response.json(
                {
                  byteLength: result.byteLength,
                  encoding: result.encoding,
                  hmac: result.hmac,
                  ...match,
                },
                { headers: JSON_HEADERS },
              );
            }

            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/tls') {
            const host = url.searchParams.get('host') ?? '';
            const portRaw = url.searchParams.get('port');
            const port = portRaw && Number.isFinite(Number(portRaw)) ? Number(portRaw) : 443;
            const result = await performTlsInspect(host, port);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/headers') {
            const targetUrl = url.searchParams.get('url') ?? '';
            const result = await performHttpHeaderInspect(targetUrl, fetchFn);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/dmarc') {
            const domain = url.searchParams.get('domain') ?? '';
            const result = await performDmarcLookup(domain);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/dkim') {
            const domain = url.searchParams.get('domain') ?? '';
            const selector = url.searchParams.get('selector') ?? 'default';
            const result = await performDkimLookup(domain, selector);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/smtp') {
            const host = url.searchParams.get('host') ?? '';
            const portRaw = url.searchParams.get('port');
            const port = portRaw && Number.isFinite(Number(portRaw)) ? Number(portRaw) : 587;
            const result = await performSmtpProbe(host, port);
            return Response.json(result, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/id') {
            const typeRaw = (url.searchParams.get('type') ?? 'uuidv4').toLowerCase();
            const kind: IdKind =
              typeRaw === 'uuidv7' || typeRaw === 'ulid' || typeRaw === 'nanoid' ? typeRaw : 'uuidv4';
            const countRaw = Number(url.searchParams.get('count') ?? '5');
            const lengthRaw = Number(url.searchParams.get('length') ?? '21');
            const ids = generateIds(kind, countRaw, lengthRaw);
            return Response.json({ type: kind, count: ids.length, ids }, { headers: JSON_HEADERS });
          }

          if (pathname === '/api/mac') {
            const bulkParam = url.searchParams.get('bulk');
            if (bulkParam !== null && bulkParam.trim() !== '') {
              const results = bulkLookupMacs(bulkParam);
              return Response.json({ count: results.length, results }, { headers: JSON_HEADERS });
            }

            const vendorParam = url.searchParams.get('vendor');
            const limitParam = Number(url.searchParams.get('limit') ?? '50');
            if (vendorParam !== null && vendorParam.trim() !== '') {
              return Response.json(searchMacByVendor(vendorParam, limitParam), { headers: JSON_HEADERS });
            }

            const macParam = url.searchParams.get('mac');
            if (macParam !== null && macParam.trim() !== '') {
              return Response.json(lookupMacVendor(macParam), { headers: JSON_HEADERS });
            }

            const q = url.searchParams.get('q') ?? '';
            if (!q.trim()) {
              return errorJson('Provide ?mac=..., ?vendor=..., ?bulk=..., or ?q=...', 400);
            }
            if (looksLikeMacInput(q)) {
              return Response.json(lookupMacVendor(q), { headers: JSON_HEADERS });
            }
            return Response.json(searchMacByVendor(q, limitParam), { headers: JSON_HEADERS });
          }

          return errorJson(`Unknown API endpoint: ${pathname}`, 404);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Request failed.';
          return errorJson(message, 400);
        }
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', ...SECURITY_HEADERS } });
      }

      if (options.serveStatic) {
        const asset = await options.serveStatic(pathname, request.method);
        if (asset) {
          return new Response(asset.body, {
            headers: {
              'Content-Type': asset.contentType,
              'Cache-Control': asset.cacheControl,
              ...SECURITY_HEADERS,
            },
          });
        }
      }

      return new Response('Not Found', { status: 404, headers: SECURITY_HEADERS });
    },
  };
}
