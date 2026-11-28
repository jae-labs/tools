export interface JwtDecoded {
  rawHeader: string;
  rawPayload: string;
  signature: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  alg: string;
  typ: string;
  claims: {
    issuedAt: string | null;
    notBefore: string | null;
    expiresAt: string | null;
    isExpired: boolean | null;
    isNotYetValid: boolean | null;
    ttlSeconds: number | null;
  };
}

export interface JwtVerifyResult {
  supported: boolean;
  valid: boolean;
  alg: string;
  message: string;
}

const HMAC_ALG_MAP: Record<string, 'SHA-256' | 'SHA-384' | 'SHA-512'> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
};

function base64UrlToBytes(segment: string): Uint8Array {
  const padded = segment.replaceAll('-', '+').replaceAll('_', '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeJsonSegment(segment: string, label: string): Record<string, unknown> {
  let text: string;
  try {
    text = new TextDecoder().decode(base64UrlToBytes(segment));
  } catch {
    throw new Error(`Invalid Base64URL in JWT ${label}.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`JWT ${label} is not valid JSON.`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`JWT ${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

export function decodeJwt(token: string, nowMs = Date.now()): JwtDecoded {
  const cleaned = token.trim().replace(/^Bearer\s+/i, '');
  const parts = cleaned.split('.');
  if (parts.length !== 3) {
    throw new Error('JWT must have exactly 3 dot-separated segments (header.payload.signature).');
  }

  const [rawHeader, rawPayload, signature] = parts as [string, string, string];
  const header = decodeJsonSegment(rawHeader, 'header');
  const payload = decodeJsonSegment(rawPayload, 'payload');

  const alg = typeof header.alg === 'string' ? header.alg : 'unknown';
  const typ = typeof header.typ === 'string' ? header.typ : 'JWT';

  const nowSec = Math.floor(nowMs / 1000);
  const numClaim = (k: string): number | null => {
    const v = payload[k];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };

  const iat = numClaim('iat');
  const nbf = numClaim('nbf');
  const exp = numClaim('exp');

  return {
    rawHeader,
    rawPayload,
    signature,
    header,
    payload,
    alg,
    typ,
    claims: {
      issuedAt: iat !== null ? new Date(iat * 1000).toISOString() : null,
      notBefore: nbf !== null ? new Date(nbf * 1000).toISOString() : null,
      expiresAt: exp !== null ? new Date(exp * 1000).toISOString() : null,
      isExpired: exp !== null ? nowSec >= exp : null,
      isNotYetValid: nbf !== null ? nowSec < nbf : null,
      ttlSeconds: exp !== null ? exp - nowSec : null,
    },
  };
}

export async function verifyJwtHmac(token: string, secret: string): Promise<JwtVerifyResult> {
  const decoded = decodeJwt(token);
  const hashName = HMAC_ALG_MAP[decoded.alg.toUpperCase()];
  if (!hashName) {
    return {
      supported: false,
      valid: false,
      alg: decoded.alg,
      message: `Client-side HMAC verification supports HS256/HS384/HS512 (token uses ${decoded.alg}).`,
    };
  }

  if (!secret) {
    return {
      supported: true,
      valid: false,
      alg: decoded.alg,
      message: 'Enter a secret key to verify the HMAC signature.',
    };
  }

  const enc = new TextEncoder();
  const keyBytes = enc.encode(secret);
  const dataBytes = enc.encode(`${decoded.rawHeader}.${decoded.rawPayload}`);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength),
    { name: 'HMAC', hash: { name: hashName } },
    false,
    ['sign'],
  );
  const sigBuf = await globalThis.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    dataBytes.buffer.slice(dataBytes.byteOffset, dataBytes.byteOffset + dataBytes.byteLength),
  );
  const expectedSig = bytesToBase64Url(new Uint8Array(sigBuf));

  // Constant-time string comparison
  const a = expectedSig;
  const b = decoded.signature;
  let diff = a.length ^ b.length;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  const valid = diff === 0;

  return {
    supported: true,
    valid,
    alg: decoded.alg,
    message: valid ? `Valid ${decoded.alg} signature.` : `Invalid ${decoded.alg} signature.`,
  };
}
