export interface JsonTreeStats {
  totalNodes: number;
  objects: number;
  arrays: number;
  primitives: number;
  maxDepth: number;
}

export type JsonPathSegment = string | number;

const SIMPLE_KEY_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function formatJsonPath(segments: JsonPathSegment[]): string {
  let out = '$';
  for (const seg of segments) {
    if (typeof seg === 'number') {
      out += `[${seg}]`;
    } else if (SIMPLE_KEY_RE.test(seg)) {
      out += `.${seg}`;
    } else {
      out += `[${JSON.stringify(seg)}]`;
    }
  }
  return out;
}

export function analyzeJsonTree(root: unknown): JsonTreeStats {
  const stats: JsonTreeStats = {
    totalNodes: 0,
    objects: 0,
    arrays: 0,
    primitives: 0,
    maxDepth: 0,
  };

  const walk = (val: unknown, depth: number) => {
    stats.totalNodes += 1;
    if (depth > stats.maxDepth) stats.maxDepth = depth;
    if (Array.isArray(val)) {
      stats.arrays += 1;
      for (const item of val) {
        walk(item, depth + 1);
      }
    } else if (val !== null && typeof val === 'object') {
      stats.objects += 1;
      for (const child of Object.values(val as Record<string, unknown>)) {
        walk(child, depth + 1);
      }
    } else {
      stats.primitives += 1;
    }
  };

  walk(root, 0);
  return stats;
}

export interface JsonSearchMatches {
  matchedPaths: Set<string>;
  ancestorPaths: Set<string>;
}

export function searchJsonTree(root: unknown, rawQuery: string): JsonSearchMatches {
  const query = rawQuery.trim().toLowerCase();
  const matchedPaths = new Set<string>();
  const ancestorPaths = new Set<string>();
  if (!query) return { matchedPaths, ancestorPaths };

  const walk = (val: unknown, segments: JsonPathSegment[], keyLabel: string | null) => {
    const path = formatJsonPath(segments);
    let selfMatched = false;

    if (keyLabel !== null && keyLabel.toLowerCase().includes(query)) {
      selfMatched = true;
    }

    if (Array.isArray(val)) {
      let childMatched = false;
      for (let i = 0; i < val.length; i++) {
        if (walk(val[i], [...segments, i], null)) {
          childMatched = true;
        }
      }
      if (selfMatched) matchedPaths.add(path);
      if (childMatched) ancestorPaths.add(path);
      return selfMatched || childMatched;
    }

    if (val !== null && typeof val === 'object') {
      let childMatched = false;
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (walk(v, [...segments, k], k)) {
          childMatched = true;
        }
      }
      if (selfMatched) matchedPaths.add(path);
      if (childMatched) ancestorPaths.add(path);
      return selfMatched || childMatched;
    }

    const primitiveStr = val === null ? 'null' : String(val);
    if (primitiveStr.toLowerCase().includes(query)) {
      selfMatched = true;
    }
    if (selfMatched) {
      matchedPaths.add(path);
    }
    return selfMatched;
  };

  walk(root, [], null);
  return { matchedPaths, ancestorPaths };
}
