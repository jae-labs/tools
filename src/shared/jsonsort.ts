export interface JsonSortOptions {
  sortArrays?: boolean;
  descending?: boolean;
  caseInsensitive?: boolean;
  indent?: number | 'tab';
}

export interface JsonSortStats {
  objectKeys: number;
  arrayCount: number;
  maxDepth: number;
  inputBytes: number;
  outputBytes: number;
}

export interface JsonSortResult {
  formatted: string;
  stats: JsonSortStats;
}

function compareStrings(a: string, b: string, descending: boolean, caseInsensitive: boolean): number {
  const left = caseInsensitive ? a.toLowerCase() : a;
  const right = caseInsensitive ? b.toLowerCase() : b;
  const cmp = left < right ? -1 : left > right ? 1 : a < b ? -1 : a > b ? 1 : 0;
  return descending ? -cmp : cmp;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortValueRecursive(
  value: unknown,
  opts: Required<Omit<JsonSortOptions, 'indent'>>,
  depth: number,
  stats: Pick<JsonSortStats, 'objectKeys' | 'arrayCount' | 'maxDepth'>,
): unknown {
  if (depth > stats.maxDepth) {
    stats.maxDepth = depth;
  }

  if (Array.isArray(value)) {
    stats.arrayCount += 1;
    const mapped = value.map((item) => sortValueRecursive(item, opts, depth + 1, stats));
    if (!opts.sortArrays) {
      return mapped;
    }

    // Separate primitive sort vs mixed arrays cleanly
    const allPrimitives = mapped.every(
      (item) => item === null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    );
    if (allPrimitives) {
      return [...mapped].sort((a, b) => compareStrings(String(a), String(b), opts.descending, opts.caseInsensitive));
    }

    return [...mapped].sort((a, b) =>
      compareStrings(JSON.stringify(a), JSON.stringify(b), opts.descending, opts.caseInsensitive),
    );
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    stats.objectKeys += keys.length;
    const sortedKeys = [...keys].sort((a, b) => compareStrings(a, b, opts.descending, opts.caseInsensitive));
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      out[key] = sortValueRecursive(value[key], opts, depth + 1, stats);
    }
    return out;
  }

  return value;
}

export function sortJsonString(rawJson: string, options: JsonSortOptions = {}): JsonSortResult {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    throw new Error('Paste JSON input to sort.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : 'parse failed'}`, { cause: err });
  }

  const sortOpts = {
    sortArrays: Boolean(options.sortArrays ?? false),
    descending: Boolean(options.descending ?? false),
    caseInsensitive: Boolean(options.caseInsensitive ?? true),
  };

  const statsCounter = { objectKeys: 0, arrayCount: 0, maxDepth: 0 };
  const sorted = sortValueRecursive(parsed, sortOpts, 0, statsCounter);

  const spaceArg: string | number | undefined =
    options.indent === 'tab'
      ? '\t'
      : options.indent === 0
        ? undefined
        : typeof options.indent === 'number'
          ? Math.max(0, Math.min(8, Math.trunc(options.indent)))
          : 2;

  const formatted = JSON.stringify(sorted, null, spaceArg);
  const encoder = new TextEncoder();

  return {
    formatted,
    stats: {
      objectKeys: statsCounter.objectKeys,
      arrayCount: statsCounter.arrayCount,
      maxDepth: statsCounter.maxDepth,
      inputBytes: encoder.encode(rawJson).length,
      outputBytes: encoder.encode(formatted).length,
    },
  };
}
