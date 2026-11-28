import { convertXmlToJson } from './xml2json.ts';

export type DataFormat = 'json' | 'yaml' | 'toml' | 'xml' | 'csv';

// --- Scalar helpers ---
function parseScalar(raw: string): unknown {
  const s = raw.trim();
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    if (s.startsWith('"')) {
      try {
        return JSON.parse(s);
      } catch {
        return s.slice(1, -1);
      }
    }
    return s.slice(1, -1).replaceAll("''", "'");
  }
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return s;
}

// --- YAML (subset supporting objects, nested indentation, arrays, inline arrays/objects, scalars) ---
function parseYaml(input: string): unknown {
  const rawLines = input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+#.*$/, ''))
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#') && line.trim() !== '---');

  if (rawLines.length === 0) return {};

  let idx = 0;

  const getIndent = (line: string): number => {
    let n = 0;
    while (n < line.length && line[n] === ' ') n++;
    return n;
  };

  const parseBlock = (minIndent: number): unknown => {
    const first = rawLines[idx];
    if (!first) return null;
    const baseIndent = getIndent(first);
    if (first.trim().startsWith('- ')) {
      const arr: unknown[] = [];
      while (idx < rawLines.length) {
        const line = rawLines[idx]!;
        const ind = getIndent(line);
        if (ind < baseIndent || !line.trim().startsWith('- ')) break;
        const rest = line.trim().slice(2).trim();
        idx++;
        if (rest === '') {
          arr.push(parseBlock(ind + 1));
        } else if (rest.includes(': ') || rest.endsWith(':')) {
          // Inline object item inside list
          const obj: Record<string, unknown> = {};
          const colon = rest.indexOf(':');
          const k = rest.slice(0, colon).trim().replace(/^["']|["']$/g, '');
          const v = rest.slice(colon + 1).trim();
          obj[k] = v === '' ? parseBlock(ind + 2) : parseScalar(v);
          while (idx < rawLines.length && getIndent(rawLines[idx]!) > ind) {
            const sub = rawLines[idx]!.trim();
            if (sub.startsWith('- ')) break;
            const c = sub.indexOf(':');
            if (c === -1) break;
            const sk = sub.slice(0, c).trim().replace(/^["']|["']$/g, '');
            const sv = sub.slice(c + 1).trim();
            idx++;
            obj[sk] = sv === '' ? parseBlock(getIndent(rawLines[idx - 1]!) + 1) : parseScalar(sv);
          }
          arr.push(obj);
        } else {
          arr.push(parseScalar(rest));
        }
      }
      return arr;
    }

    const obj: Record<string, unknown> = {};
    while (idx < rawLines.length) {
      const line = rawLines[idx]!;
      const ind = getIndent(line);
      if (ind < minIndent || ind < baseIndent) break;
      const trimmed = line.trim();
      const colon = trimmed.indexOf(':');
      if (colon === -1) {
        idx++;
        continue;
      }
      const key = trimmed.slice(0, colon).trim().replace(/^["']|["']$/g, '');
      const valStr = trimmed.slice(colon + 1).trim();
      idx++;
      if (valStr === '') {
        if (idx < rawLines.length && getIndent(rawLines[idx]!) > ind) {
          obj[key] = parseBlock(ind + 1);
        } else {
          obj[key] = null;
        }
      } else if (
        (valStr.startsWith('[') && valStr.endsWith(']')) ||
        (valStr.startsWith('{') && valStr.endsWith('}'))
      ) {
        try {
          obj[key] = JSON.parse(valStr);
        } catch {
          obj[key] = valStr
            .slice(1, -1)
            .split(',')
            .map((s) => parseScalar(s));
        }
      } else {
        obj[key] = parseScalar(valStr);
      }
    }
    return obj;
  };

  return parseBlock(0);
}

function formatYamlScalar(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  const str = String(val);
  if (
    str === '' ||
    /[:#{}[\],&*?|<>=!%@`]|^\s|\s$|^(true|false|null|~)$/i.test(str) ||
    /^-?\d+(\.\d+)?$/.test(str) ||
    str.includes('\n')
  ) {
    return JSON.stringify(str);
  }
  return str;
}

function toYaml(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const nested = toYaml(item, indent + 2);
          const lines = nested.split('\n');
          return `${pad}- ${lines[0]!.trimStart()}${lines.length > 1 ? '\n' + lines.slice(1).join('\n') : ''}`;
        }
        return `${pad}- ${formatYamlScalar(item)}`;
      })
      .join('\n');
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([k, v]) => {
        const keyStr = /[^a-zA-Z0-9_-]/.test(k) ? JSON.stringify(k) : k;
        if (v !== null && typeof v === 'object') {
          if (Array.isArray(v) && v.length === 0) return `${pad}${keyStr}: []`;
          if (!Array.isArray(v) && Object.keys(v as Record<string, unknown>).length === 0) {
            return `${pad}${keyStr}: {}`;
          }
          return `${pad}${keyStr}:\n${toYaml(v, indent + 2)}`;
        }
        return `${pad}${keyStr}: ${formatYamlScalar(v)}`;
      })
      .join('\n');
  }
  return `${pad}${formatYamlScalar(value)}`;
}

// --- TOML (sections, key=value, arrays, primitives) ---
function parseToml(input: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let current: Record<string, unknown> = root;

  const lines = input.replace(/\r\n/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      const section = line.slice(1, -1).trim();
      const parts = section.split('.').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      let target = root;
      for (const p of parts) {
        if (!target[p] || typeof target[p] !== 'object' || Array.isArray(target[p])) {
          target[p] = {};
        }
        target = target[p] as Record<string, unknown>;
      }
      current = target;
      continue;
    }

    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^["']|["']$/g, '');
    const valStr = line.slice(eq + 1).trim();

    if (valStr.startsWith('[') && valStr.endsWith(']')) {
      const inner = valStr.slice(1, -1).trim();
      current[key] = inner === '' ? [] : inner.split(',').map((item) => parseScalar(item));
    } else {
      current[key] = parseScalar(valStr);
    }
  }
  return root;
}

function formatTomlValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  if (typeof val === 'string') return JSON.stringify(val);
  if (Array.isArray(val)) {
    return `[${val.map((v) => formatTomlValue(v)).join(', ')}]`;
  }
  return JSON.stringify(val);
}

function toToml(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return `value = ${formatTomlValue(value)}`;
  }

  const lines: string[] = [];
  const sections: Array<{ path: string; obj: Record<string, unknown> }> = [];

  const emitObject = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const safeKey = /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        sections.push({ path: prefix ? `${prefix}.${safeKey}` : safeKey, obj: v as Record<string, unknown> });
      } else {
        lines.push(`${safeKey} = ${formatTomlValue(v)}`);
      }
    }
  };

  emitObject(value as Record<string, unknown>, '');
  while (sections.length > 0) {
    const sec = sections.shift()!;
    if (lines.length > 0) lines.push('');
    lines.push(`[${sec.path}]`);
    emitObject(sec.obj, sec.path);
  }
  return lines.join('\n');
}

// --- XML serializer ---
function escapeXml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sanitizeTag(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `item_${cleaned}`;
}

function toXmlNode(tag: string, value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  const safeTag = sanitizeTag(tag);

  if (value === null || value === undefined) {
    return `${pad}<${safeTag}/>`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toXmlNode(safeTag, item, indent)).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}<${safeTag}/>`;
    const children = entries.map(([k, v]) => toXmlNode(k, v, indent + 2)).join('\n');
    return `${pad}<${safeTag}>\n${children}\n${pad}</${safeTag}>`;
  }
  return `${pad}<${safeTag}>${escapeXml(String(value))}</${safeTag}>`;
}

function toXml(value: unknown): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 1) {
      const [rootKey, rootVal] = entries[0]!;
      return `<?xml version="1.0" encoding="UTF-8"?>\n${toXmlNode(rootKey, rootVal, 0)}`;
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXmlNode('root', value, 0)}`;
}

// --- CSV ---
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCsv(input: string): Array<Record<string, unknown>> {
  const lines = input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]!).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      row[h || `col_${i + 1}`] = parseScalar(values[i] ?? '');
    });
    return row;
  });
}

function csvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function toCsv(value: unknown): string {
  const rows: Array<Record<string, unknown>> = Array.isArray(value)
    ? value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : { value: item },
      )
    : value !== null && typeof value === 'object'
      ? [value as Record<string, unknown>]
      : [{ value }];

  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const headerLine = headers.map(csvCell).join(',');
  const dataLines = rows.map((r) => headers.map((h) => csvCell(r[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export function convertDataFormat(input: string, from: DataFormat, to: DataFormat): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  let parsed: unknown;
  switch (from) {
    case 'json':
      parsed = JSON.parse(trimmed);
      break;
    case 'yaml':
      parsed = parseYaml(trimmed);
      break;
    case 'toml':
      parsed = parseToml(trimmed);
      break;
    case 'xml':
      parsed = convertXmlToJson(trimmed).json;
      break;
    case 'csv':
      parsed = parseCsv(trimmed);
      break;
  }

  switch (to) {
    case 'json':
      return JSON.stringify(parsed, null, 2);
    case 'yaml':
      return toYaml(parsed);
    case 'toml':
      return toToml(parsed);
    case 'xml':
      return toXml(parsed);
    case 'csv':
      return toCsv(parsed);
  }
}
