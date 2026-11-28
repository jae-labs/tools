import tls from 'node:tls';
import { resolvePublicTarget } from '../ip.ts';

export interface TlsCertSummary {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  expired: boolean;
  serialNumber: string;
  fingerprint256: string;
  subjectAltNames: string[];
}

export interface TlsInspectResult {
  host: string;
  ip: string;
  port: number;
  protocol: string | null;
  cipher: { name: string; version: string } | null;
  authorized: boolean;
  authorizationError: string | null;
  handshakeMs: number;
  certificate: TlsCertSummary;
  chain: Array<{ subjectCN: string; issuerCN: string; validTo: string; fingerprint256: string }>;
}

function normalizeDistinguishedName(dn: tls.Certificate | Record<string, string | string[]> | undefined): Record<string, string> {
  if (!dn) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(dn)) {
    if (Array.isArray(v)) out[k] = v.join(', ');
    else if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function parseSanList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function performTlsInspect(hostInput: string, port = 443): Promise<TlsInspectResult> {
  const safePort = Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 443;
  const resolved = await resolvePublicTarget(hostInput);
  const servername = resolved.hostname ?? undefined;

  const startedAt = performance.now();

  return new Promise<TlsInspectResult>((resolve, reject) => {
    const socket = tls.connect(
      {
        host: resolved.ip,
        port: safePort,
        servername,
        rejectUnauthorized: false,
        timeout: 6500,
      },
      () => {
        try {
          const handshakeMs = Math.round((performance.now() - startedAt) * 10) / 10;
          const peer = socket.getPeerCertificate(true);
          if (!peer || Object.keys(peer).length === 0) {
            socket.destroy();
            reject(new Error('Remote host did not present a TLS certificate.'));
            return;
          }

          const validToDate = new Date(peer.valid_to);
          const daysRemaining = Math.floor((validToDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const cipherInfo = socket.getCipher();

          const chain: TlsInspectResult['chain'] = [];
          const seen = new Set<string>();
          let cursor: tls.DetailedPeerCertificate | undefined = peer;
          while (cursor && cursor.fingerprint256 && !seen.has(cursor.fingerprint256) && chain.length < 8) {
            seen.add(cursor.fingerprint256);
            const subj = normalizeDistinguishedName(cursor.subject as unknown as Record<string, string>);
            const iss = normalizeDistinguishedName(cursor.issuer as unknown as Record<string, string>);
            chain.push({
              subjectCN: subj.CN ?? subj.O ?? 'Unknown',
              issuerCN: iss.CN ?? iss.O ?? 'Unknown',
              validTo: cursor.valid_to ?? '',
              fingerprint256: cursor.fingerprint256,
            });
            cursor = cursor.issuerCertificate;
          }

          const result: TlsInspectResult = {
            host: resolved.hostname ?? resolved.ip,
            ip: resolved.ip,
            port: safePort,
            protocol: socket.getProtocol(),
            cipher: cipherInfo ? { name: cipherInfo.name, version: cipherInfo.version } : null,
            authorized: socket.authorized,
            authorizationError: socket.authorizationError ? String(socket.authorizationError) : null,
            handshakeMs,
            certificate: {
              subject: normalizeDistinguishedName(peer.subject as unknown as Record<string, string>),
              issuer: normalizeDistinguishedName(peer.issuer as unknown as Record<string, string>),
              validFrom: peer.valid_from,
              validTo: peer.valid_to,
              daysRemaining,
              expired: daysRemaining < 0,
              serialNumber: peer.serialNumber ?? '',
              fingerprint256: peer.fingerprint256 ?? '',
              subjectAltNames: parseSanList(peer.subjectaltname),
            },
            chain,
          };

          socket.end();
          resolve(result);
        } catch (err) {
          socket.destroy();
          reject(err instanceof Error ? err : new Error('Failed to parse TLS certificate.'));
        }
      },
    );

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`TLS handshake timed out connecting to ${resolved.hostname ?? resolved.ip}:${safePort}.`));
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(new Error(`TLS connection failed: ${err.message}`));
    });
  });
}
