export const MAX_PORTS_PER_SCAN = 64;

export interface PortPresetSet {
  id: string;
  label: string;
  ports: number[];
  expr: string;
}

export const PORT_PRESET_SETS: PortPresetSet[] = [
  {
    id: 'web',
    label: 'Web',
    ports: [80, 443, 8080, 8443],
    expr: '80,443,8080,8443',
  },
  {
    id: 'mail',
    label: 'Mail',
    ports: [25, 110, 143, 465, 587, 993, 995],
    expr: '25,110,143,465,587,993,995',
  },
  {
    id: 'remote',
    label: 'Remote / Admin',
    ports: [21, 22, 23, 3389, 5900],
    expr: '21-23,3389,5900',
  },
  {
    id: 'db',
    label: 'Databases',
    ports: [1433, 3306, 5432, 6379, 27017],
    expr: '1433,3306,5432,6379,27017',
  },
  {
    id: 'dns-proxy',
    label: 'DNS & Proxy',
    ports: [53, 853, 1080, 3128, 8888],
    expr: '53,853,1080,3128,8888',
  },
  {
    id: 'dev',
    label: 'Dev & Containers',
    ports: [2375, 2376, 3000, 5173, 8000, 9000, 9090],
    expr: '2375-2376,3000,5173,8000,9000,9090',
  },
  {
    id: 'top20',
    label: 'Top 20 Common',
    ports: [21, 22, 23, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 1433, 3306, 3389, 5432, 6379, 8080, 8443],
    expr: '21-23,25,53,80,110,143,443,465,587,993,995,1433,3306,3389,5432,6379,8080,8443',
  },
];

export interface ParsedPortsResult {
  ports: number[];
  error?: string;
}

/**
 * Parses a port expression supporting single ports and inclusive ranges,
 * e.g. "80, 443", "1,2,5-20", "20-25, 80, 8000-8005".
 */
export function parsePortExpression(
  raw: string,
  maxPorts = MAX_PORTS_PER_SCAN,
): ParsedPortsResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ports: [], error: 'Provide at least one TCP port or range (e.g. 80, 443, 8000-8010).' };
  }

  const tokens = trimmed
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<number>();
  const ports: number[] = [];

  for (const token of tokens) {
    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
        return { ports: [], error: `Invalid port range "${token}". Use start-end (e.g. 5-20).` };
      }
      const start = Number(parts[0]);
      const end = Number(parts[1]);
      if (start < 1 || start > 65535 || end < 1 || end > 65535) {
        return { ports: [], error: `Port range "${token}" must be between 1 and 65535.` };
      }
      if (start > end) {
        return { ports: [], error: `Port range "${token}" has start greater than end.` };
      }
      if (end - start + 1 > maxPorts) {
        return {
          ports: [],
          error: `Range "${token}" spans ${end - start + 1} ports (max ${maxPorts} ports per scan).`,
        };
      }
      for (let p = start; p <= end; p++) {
        if (!seen.has(p)) {
          seen.add(p);
          ports.push(p);
          if (ports.length > maxPorts) {
            return {
              ports: [],
              error: `Too many ports requested (max ${maxPorts} ports per scan).`,
            };
          }
        }
      }
    } else {
      if (!/^\d+$/.test(token)) {
        return { ports: [], error: `Invalid port "${token}". Use numbers or ranges like 1,2,5-20.` };
      }
      const p = Number(token);
      if (p < 1 || p > 65535) {
        return { ports: [], error: `Port "${token}" must be between 1 and 65535.` };
      }
      if (!seen.has(p)) {
        seen.add(p);
        ports.push(p);
        if (ports.length > maxPorts) {
          return {
            ports: [],
            error: `Too many ports requested (max ${maxPorts} ports per scan).`,
          };
        }
      }
    }
  }

  if (ports.length === 0) {
    return { ports: [], error: 'Provide at least one valid TCP port (1–65535).' };
  }

  return { ports };
}

/**
 * Formats a list of ports compactly using ranges for 3+ consecutive numbers,
 * e.g. [1, 2, 5, 6, 7, 8, 80] -> "1, 2, 5-8, 80".
 */
export function formatPortExpression(ports: number[]): string {
  const sorted = Array.from(
    new Set(ports.filter((p) => Number.isInteger(p) && p >= 1 && p <= 65535)),
  ).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const groups: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  const flush = () => {
    if (prev - start >= 2) {
      groups.push(`${start}-${prev}`);
    } else if (prev > start) {
      groups.push(`${start}`, `${prev}`);
    } else {
      groups.push(`${start}`);
    }
  };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      flush();
      start = sorted[i];
      prev = sorted[i];
    }
  }
  flush();

  return groups.join(', ');
}
