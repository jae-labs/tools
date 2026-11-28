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

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_UNESCAPE_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

export function encodeHtmlEntities(raw: string): string {
  return raw.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

export function decodeHtmlEntities(raw: string): string {
  return raw.replace(/&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));/g, (full, hex?: string, dec?: string, named?: string) => {
    if (hex) {
      const cp = parseInt(hex, 16);
      return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
    }
    if (dec) {
      const cp = parseInt(dec, 10);
      return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
    }
    if (named) {
      return HTML_UNESCAPE_MAP[named.toLowerCase()] ?? full;
    }
    return full;
  });
}

export function encodeHexUtf8(raw: string, spaced = false): string {
  const bytes = new TextEncoder().encode(raw);
  const parts = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return parts.join(spaced ? ' ' : '');
}

export function decodeHexUtf8(raw: string): { text: string; byteLength: number } {
  const cleaned = raw.trim().replace(/^0x/i, '').replace(/[\s:,-]+/g, '');
  if (!cleaned) return { text: '', byteLength: 0 };
  if (cleaned.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new Error('Invalid hex string (must contain an even number of 0-9 / a-f characters).');
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return {
    text: new TextDecoder('utf-8', { fatal: false }).decode(bytes),
    byteLength: bytes.length,
  };
}
