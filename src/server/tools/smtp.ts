import net from 'node:net';
import tls from 'node:tls';
import { resolvePublicTarget } from '../ip.ts';

export const ALLOWED_SMTP_PORTS = new Set([25, 465, 587, 2525]);

export interface SmtpProbeResult {
  host: string;
  ip: string;
  port: number;
  implicitTls: boolean;
  banner: string;
  ehloLines: string[];
  capabilities: string[];
  supportsStartTls: boolean;
  authMechanisms: string[];
  maxMessageBytes: number | null;
  tlsMode: 'implicit-tls' | 'starttls-advertised' | 'plaintext-only';
  connectMs: number;
  totalMs: number;
  transcript: string[];
}

export function isAllowedSmtpPort(port: number): boolean {
  return Number.isInteger(port) && ALLOWED_SMTP_PORTS.has(port);
}

export function parseEhloCapabilities(ehloLines: readonly string[]): {
  capabilities: string[];
  supportsStartTls: boolean;
  authMechanisms: string[];
  maxMessageBytes: number | null;
} {
  const capabilities: string[] = [];
  let supportsStartTls = false;
  const authMechanisms: string[] = [];
  let maxMessageBytes: number | null = null;

  // Skip line 0 (server greeting / domain line)
  for (let i = 1; i < ehloLines.length; i++) {
    const raw = ehloLines[i]!.replace(/^250[-\s]/, '').trim();
    if (!raw) continue;
    capabilities.push(raw);
    const upper = raw.toUpperCase();
    if (upper === 'STARTTLS') {
      supportsStartTls = true;
    } else if (upper.startsWith('AUTH ') || upper.startsWith('AUTH=')) {
      const rest = upper.slice(5).trim();
      for (const mech of rest.split(/\s+/)) {
        if (mech && !authMechanisms.includes(mech)) authMechanisms.push(mech);
      }
    } else if (upper.startsWith('SIZE ')) {
      const sizeVal = Number(upper.slice(5).trim());
      if (Number.isFinite(sizeVal) && sizeVal > 0) {
        maxMessageBytes = sizeVal;
      }
    }
  }

  return { capabilities, supportsStartTls, authMechanisms, maxMessageBytes };
}

function readSmtpReply(socket: net.Socket, timeoutMs: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const lines: string[] = [];
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for SMTP server response.'));
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      let nlIdx: number;
      while ((nlIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nlIdx).replace(/\r$/, '');
        buffer = buffer.slice(nlIdx + 1);
        if (!line) continue;
        lines.push(line);
        // Final line of SMTP reply has space after 3-digit status code (e.g. "220 " or "250 ")
        if (/^\d{3}(?:\s|$)/.test(line)) {
          cleanup();
          resolve(lines);
          return;
        }
      }
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onClose = () => {
      cleanup();
      if (lines.length > 0) resolve(lines);
      else reject(new Error('SMTP server closed connection unexpectedly.'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
}

export async function performSmtpProbe(hostInput: string, port = 587): Promise<SmtpProbeResult> {
  if (!isAllowedSmtpPort(port)) {
    throw new Error('Only standard SMTP ports (25, 465, 587, 2525) are permitted.');
  }

  const resolved = await resolvePublicTarget(hostInput);
  const implicitTls = port === 465;
  const startedAt = performance.now();

  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = implicitTls
      ? tls.connect({
          host: resolved.ip,
          port,
          servername: resolved.hostname ?? undefined,
          rejectUnauthorized: false,
          timeout: 6500,
        })
      : net.connect({
          host: resolved.ip,
          port,
          timeout: 6500,
        });

    const connectEvent = implicitTls ? 'secureConnect' : 'connect';
    const onConnect = () => {
      s.off('error', onError);
      s.off('timeout', onTimeout);
      resolve(s);
    };
    const onTimeout = () => {
      s.destroy();
      reject(
        new Error(
          `Connection to ${resolved.hostname ?? resolved.ip}:${port} timed out.${port === 25 ? ' (Note: outbound port 25 is often blocked by cloud providers; try port 587 or 465.)' : ''}`,
        ),
      );
    };
    const onError = (err: Error) => {
      s.destroy();
      reject(new Error(`SMTP connection failed: ${err.message}`));
    };

    s.once(connectEvent, onConnect);
    s.once('timeout', onTimeout);
    s.once('error', onError);
  });

  const connectMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const transcript: string[] = [];

  try {
    const bannerLines = await readSmtpReply(socket, 5000);
    for (const l of bannerLines) transcript.push(`S: ${l}`);

    const ehloCmd = 'EHLO tools.lui.z';
    transcript.push(`C: ${ehloCmd}`);
    socket.write(`${ehloCmd}\r\n`);

    const ehloLines = await readSmtpReply(socket, 5000);
    for (const l of ehloLines) transcript.push(`S: ${l}`);

    transcript.push('C: QUIT');
    socket.write('QUIT\r\n');
    socket.end();

    const parsed = parseEhloCapabilities(ehloLines);
    const tlsMode: SmtpProbeResult['tlsMode'] = implicitTls
      ? 'implicit-tls'
      : parsed.supportsStartTls
        ? 'starttls-advertised'
        : 'plaintext-only';

    return {
      host: resolved.hostname ?? resolved.ip,
      ip: resolved.ip,
      port,
      implicitTls,
      banner: bannerLines.join('\n'),
      ehloLines,
      capabilities: parsed.capabilities,
      supportsStartTls: parsed.supportsStartTls,
      authMechanisms: parsed.authMechanisms,
      maxMessageBytes: parsed.maxMessageBytes,
      tlsMode,
      connectMs,
      totalMs: Math.round((performance.now() - startedAt) * 10) / 10,
      transcript,
    };
  } catch (err) {
    socket.destroy();
    throw err instanceof Error ? err : new Error('SMTP probe failed.');
  }
}
