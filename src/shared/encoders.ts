export type UrlEncodeMode = 'component' | 'uri';

export interface UrlTransformOptions {
  mode?: UrlEncodeMode;
  formSpace?: boolean;
}

export interface ParsedUrlBreakdown {
  isFullUrl: boolean;
  origin?: string;
  pathname?: string;
  hash?: string;
  params: Array<{ key: string; value: string }>;
}

export function encodeUrlValue(raw: string, options: UrlTransformOptions = {}): string {
  const mode = options.mode ?? 'component';
  if (mode === 'uri') {
    return encodeURI(raw);
  }
  const encoded = encodeURIComponent(raw);
  return options.formSpace ? encoded.replaceAll('%20', '+') : encoded;
}

export function decodeUrlValue(raw: string, options: UrlTransformOptions = {}): string {
  const prepared = options.formSpace ? raw.replaceAll('+', ' ') : raw;
  try {
    return options.mode === 'uri' ? decodeURI(prepared) : decodeURIComponent(prepared);
  } catch (err) {
    throw new Error(`Malformed URL-encoded sequence: ${err instanceof Error ? err.message : 'decode failed'}`, {
      cause: err,
    });
  }
}

export function inspectUrlQuery(raw: string): ParsedUrlBreakdown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { isFullUrl: false, params: [] };
  }
  try {
    const parsed = new URL(trimmed);
    const params: Array<{ key: string; value: string }> = [];
    parsed.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });
    return {
      isFullUrl: true,
      origin: parsed.origin,
      pathname: parsed.pathname,
      hash: parsed.hash || undefined,
      params,
    };
  } catch {
    if (trimmed.includes('=') && !trimmed.includes(' ')) {
      const qs = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
      const search = new URLSearchParams(qs);
      const params: Array<{ key: string; value: string }> = [];
      search.forEach((value, key) => {
        params.push({ key, value });
      });
      return { isFullUrl: false, params };
    }
    return { isFullUrl: false, params: [] };
  }
}

export interface Base64Options {
  urlSafe?: boolean;
  stripPadding?: boolean;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeBase64Utf8(raw: string, options: Base64Options = {}): string {
  const bytes = new TextEncoder().encode(raw);
  let encoded = bytesToBase64(bytes);
  if (options.urlSafe) {
    encoded = encoded.replaceAll('+', '-').replaceAll('/', '_');
  }
  if (options.stripPadding) {
    encoded = encoded.replace(/=+$/, '');
  }
  return encoded;
}

export function decodeBase64Utf8(raw: string): { text: string; byteLength: number } {
  const cleaned = raw.trim().replace(/\s+/g, '').replaceAll('-', '+').replaceAll('_', '/');
  if (!cleaned) {
    return { text: '', byteLength: 0 };
  }
  const padRemainder = cleaned.length % 4;
  if (padRemainder === 1) {
    throw new Error('Invalid Base64 string length.');
  }
  const padded = padRemainder === 0 ? cleaned : cleaned + '='.repeat(4 - padRemainder);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) {
    throw new Error('Input contains invalid Base64 characters.');
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(padded);
  } catch (err) {
    throw new Error(`Invalid Base64 input: ${err instanceof Error ? err.message : 'decode failed'}`, {
      cause: err,
    });
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return { text, byteLength: bytes.length };
}
