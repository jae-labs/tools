export type IdKind = 'uuidv4' | 'uuidv7' | 'ulid' | 'nanoid';

export interface DecodedIdTimestamp {
  kind: 'uuidv7' | 'ulid';
  timestampMs: number;
  iso: string;
}

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const NANOID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function generateUuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  return formatUuid(bytes);
}

/**
 * RFC 9562 UUIDv7 (48-bit Unix epoch ms timestamp + random bits).
 */
export function generateUuidV7(nowMs = Date.now()): string {
  const bytes = randomBytes(16);
  const ts = Math.max(0, Math.floor(nowMs));
  bytes[0] = Math.floor(ts / 0x10000000000) & 0xff;
  bytes[1] = Math.floor(ts / 0x100000000) & 0xff;
  bytes[2] = (ts >>> 24) & 0xff;
  bytes[3] = (ts >>> 16) & 0xff;
  bytes[4] = (ts >>> 8) & 0xff;
  bytes[5] = ts & 0xff;
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10xx
  return formatUuid(bytes);
}

/**
 * ULID (48-bit timestamp encoded as 10 Crockford Base32 chars + 80-bit randomness as 16 chars).
 */
export function generateUlid(nowMs = Date.now()): string {
  let ts = Math.max(0, Math.floor(nowMs));
  const timeChars = new Array<string>(10);
  for (let i = 9; i >= 0; i--) {
    timeChars[i] = CROCKFORD_BASE32[ts % 32]!;
    ts = Math.floor(ts / 32);
  }

  const rand = randomBytes(16);
  const randChars = new Array<string>(16);
  for (let i = 0; i < 16; i++) {
    randChars[i] = CROCKFORD_BASE32[rand[i]! & 31]!;
  }

  return timeChars.join('') + randChars.join('');
}

export function generateNanoId(length = 21): string {
  const safeLen = Math.min(64, Math.max(4, Math.round(Number.isFinite(length) ? length : 21)));
  const bytes = randomBytes(safeLen);
  let out = '';
  for (let i = 0; i < safeLen; i++) {
    out += NANOID_ALPHABET[bytes[i]! & 63]!;
  }
  return out;
}

export function generateIds(kind: IdKind, count = 5, nanoLength = 21): string[] {
  const safeCount = Math.min(100, Math.max(1, Math.round(Number.isFinite(count) ? count : 5)));
  const ids: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    if (kind === 'uuidv4') ids.push(generateUuidV4());
    else if (kind === 'uuidv7') ids.push(generateUuidV7());
    else if (kind === 'ulid') ids.push(generateUlid());
    else ids.push(generateNanoId(nanoLength));
  }
  return ids;
}

const UUIDV7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ULID_RE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

export function decodeIdTimestamp(id: string): DecodedIdTimestamp | null {
  const trimmed = id.trim();
  if (UUIDV7_RE.test(trimmed)) {
    const hex = trimmed.replaceAll('-', '').slice(0, 12);
    const timestampMs = parseInt(hex, 16);
    return {
      kind: 'uuidv7',
      timestampMs,
      iso: new Date(timestampMs).toISOString(),
    };
  }
  if (ULID_RE.test(trimmed)) {
    const upper = trimmed.toUpperCase().slice(0, 10);
    let ts = 0;
    for (let i = 0; i < upper.length; i++) {
      const idx = CROCKFORD_BASE32.indexOf(upper[i]!);
      if (idx === -1) return null;
      ts = ts * 32 + idx;
    }
    return {
      kind: 'ulid',
      timestampMs: ts,
      iso: new Date(ts).toISOString(),
    };
  }
  return null;
}
