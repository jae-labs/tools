import bcrypt from 'bcryptjs';

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512';

export type HashEncoding = 'hex' | 'HEX' | 'base64';

export const BCRYPT_ROUNDS_MIN = 4;
export const BCRYPT_ROUNDS_MAX = 14;
export const BCRYPT_ROUNDS_DEFAULT = 10;
export const BCRYPT_MAX_BYTES = 72;

export interface BcryptResult {
  algorithm: 'bcrypt';
  hash: string;
  rounds: number;
  byteLength: number;
  truncated: boolean;
}

export interface HashAlgorithmMeta {
  id: HashAlgorithm;
  label: string;
  bits: number;
  status: 'legacy' | 'recommended';
}

export const HASH_ALGORITHMS: readonly HashAlgorithmMeta[] = [
  { id: 'md5', label: 'MD5', bits: 128, status: 'legacy' },
  { id: 'sha1', label: 'SHA-1', bits: 160, status: 'legacy' },
  { id: 'sha256', label: 'SHA-256', bits: 256, status: 'recommended' },
  { id: 'sha384', label: 'SHA-384', bits: 384, status: 'recommended' },
  { id: 'sha512', label: 'SHA-512', bits: 512, status: 'recommended' },
];

export interface HashDigestEntry {
  algorithm: HashAlgorithm;
  label: string;
  bits: number;
  status: 'legacy' | 'recommended';
  digest: string;
  hex: string;
}

export interface HashAllResult {
  byteLength: number;
  encoding: HashEncoding;
  hmac: boolean;
  digests: HashDigestEntry[];
}

const SUBTLE_ALGO_MAP: Record<Exclude<HashAlgorithm, 'md5'>, string> = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
};

const TEXT_ENCODER = new TextEncoder();

// RFC 1321 MD5 constants
const MD5_S: readonly number[] = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K: readonly number[] = Array.from({ length: 64 }, (_, i) =>
  Math.floor(Math.abs(Math.sin(i + 1)) * 0x1_0000_0000) >>> 0,
);

function rotl32(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

/**
 * Pure TypeScript RFC 1321 MD5 implementation returning 16 raw digest bytes.
 */
export function md5Bytes(input: Uint8Array): Uint8Array {
  const len = input.length;
  const bitLen = len * 8;
  // Pad to 56 mod 64 bytes, plus 8-byte little-endian length
  const paddedLen = (((len + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(input);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLen >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x1_0000_0000) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const M = new Uint32Array(16);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      const sum = (F + A + MD5_K[i]! + M[g]!) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl32(sum, MD5_S[i]!)) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

/**
 * Pure TypeScript RFC 2104 HMAC-MD5 returning 16 raw digest bytes.
 */
function hmacMd5Bytes(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) {
    k = md5Bytes(k);
  }
  const keyBlock = new Uint8Array(blockSize);
  keyBlock.set(k);

  const oKeyPad = new Uint8Array(blockSize + 16);
  const iKeyPad = new Uint8Array(blockSize + data.length);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBlock[i]! ^ 0x5c;
    iKeyPad[i] = keyBlock[i]! ^ 0x36;
  }
  iKeyPad.set(data, blockSize);
  const innerHash = md5Bytes(iKeyPad);
  oKeyPad.set(innerHash, blockSize);
  return md5Bytes(oKeyPad);
}

export function bytesToHex(bytes: Uint8Array, uppercase = false): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return uppercase ? out.toUpperCase() : out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function encodeDigest(bytes: Uint8Array, encoding: HashEncoding): string {
  if (encoding === 'base64') return bytesToBase64(bytes);
  return bytesToHex(bytes, encoding === 'HEX');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function computeDigestBytes(
  algorithm: HashAlgorithm,
  data: Uint8Array,
  hmacKey?: Uint8Array,
): Promise<Uint8Array> {
  if (hmacKey && hmacKey.length > 0) {
    if (algorithm === 'md5') {
      return hmacMd5Bytes(hmacKey, data);
    }
    const subtleAlgo = SUBTLE_ALGO_MAP[algorithm];
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      toArrayBuffer(hmacKey),
      { name: 'HMAC', hash: { name: subtleAlgo } },
      false,
      ['sign'],
    );
    const sig = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, toArrayBuffer(data));
    return new Uint8Array(sig);
  }

  if (algorithm === 'md5') {
    return md5Bytes(data);
  }
  const subtleAlgo = SUBTLE_ALGO_MAP[algorithm];
  const digest = await globalThis.crypto.subtle.digest(subtleAlgo, toArrayBuffer(data));
  return new Uint8Array(digest);
}

export async function computeHash(
  algorithm: HashAlgorithm,
  input: string | Uint8Array,
  options: { encoding?: HashEncoding; key?: string | Uint8Array } = {},
): Promise<string> {
  const data = typeof input === 'string' ? TEXT_ENCODER.encode(input) : input;
  const keyBytes =
    options.key !== undefined
      ? typeof options.key === 'string'
        ? TEXT_ENCODER.encode(options.key)
        : options.key
      : undefined;
  const encoding = options.encoding ?? 'hex';
  const raw = await computeDigestBytes(algorithm, data, keyBytes);
  return encodeDigest(raw, encoding);
}

export async function computeAllHashes(
  input: string | Uint8Array,
  options: { encoding?: HashEncoding; key?: string | Uint8Array } = {},
): Promise<HashAllResult> {
  const data = typeof input === 'string' ? TEXT_ENCODER.encode(input) : input;
  const keyBytes =
    options.key !== undefined
      ? typeof options.key === 'string'
        ? TEXT_ENCODER.encode(options.key)
        : options.key
      : undefined;
  const encoding = options.encoding ?? 'hex';
  const isHmac = Boolean(keyBytes && keyBytes.length > 0);

  const digests = await Promise.all(
    HASH_ALGORITHMS.map(async (meta): Promise<HashDigestEntry> => {
      const raw = await computeDigestBytes(meta.id, data, isHmac ? keyBytes : undefined);
      return {
        algorithm: meta.id,
        label: isHmac ? `HMAC-${meta.label}` : meta.label,
        bits: meta.bits,
        status: meta.status,
        digest: encodeDigest(raw, encoding),
        hex: bytesToHex(raw, false),
      };
    }),
  );

  return {
    byteLength: data.byteLength,
    encoding,
    hmac: isHmac,
    digests,
  };
}

export function matchExpectedHash(
  expected: string,
  digests: readonly HashDigestEntry[],
): HashAlgorithm | null {
  const trimmed = expected.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  for (const entry of digests) {
    if (entry.hex === lower || entry.digest === trimmed || entry.digest.toLowerCase() === lower) {
      return entry.algorithm;
    }
  }
  return null;
}

const BCRYPT_HASH_RE = /^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_RE.test(value.trim());
}

export function parseBcryptRounds(hash: string): number | null {
  const trimmed = hash.trim();
  if (!isBcryptHash(trimmed)) return null;
  try {
    return bcrypt.getRounds(trimmed);
  } catch {
    return null;
  }
}

export async function computeBcryptHash(
  input: string,
  rounds = BCRYPT_ROUNDS_DEFAULT,
): Promise<BcryptResult> {
  const safeRounds = Number.isFinite(rounds)
    ? Math.min(BCRYPT_ROUNDS_MAX, Math.max(BCRYPT_ROUNDS_MIN, Math.round(rounds)))
    : BCRYPT_ROUNDS_DEFAULT;
  const byteLength = TEXT_ENCODER.encode(input).byteLength;
  const hash = await bcrypt.hash(input, safeRounds);
  return {
    algorithm: 'bcrypt',
    hash,
    rounds: safeRounds,
    byteLength,
    truncated: byteLength > BCRYPT_MAX_BYTES,
  };
}

export async function verifyBcryptHash(input: string, expectedHash: string): Promise<boolean> {
  const trimmed = expectedHash.trim();
  if (!isBcryptHash(trimmed)) return false;
  return bcrypt.compare(input, trimmed);
}
