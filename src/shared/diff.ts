import { sortJsonString } from './jsonsort.ts';

export type DiffLineKind = 'equal' | 'add' | 'remove';

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  unchanged: number;
  identical: boolean;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  jsonMode?: boolean;
}

function normalizeForCompare(line: string, ignoreWhitespace: boolean): string {
  return ignoreWhitespace ? line.trim().replace(/\s+/g, ' ') : line;
}

export function computeLineDiff(leftRaw: string, rightRaw: string, options: DiffOptions = {}): DiffResult {
  let left = leftRaw;
  let right = rightRaw;

  if (options.jsonMode) {
    const sortedLeft = sortJsonString(leftRaw, { indent: 2 });
    const sortedRight = sortJsonString(rightRaw, { indent: 2 });
    left = sortedLeft.formatted;
    right = sortedRight.formatted;
  }

  const a = left.replace(/\r\n/g, '\n').split('\n');
  const b = right.replace(/\r\n/g, '\n').split('\n');
  const ignoreWs = Boolean(options.ignoreWhitespace);

  // LCS DP table (capped cleanly for typical text/JSON inputs)
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = n - 1; i >= 0; i--) {
    const aNorm = normalizeForCompare(a[i]!, ignoreWs);
    const row = dp[i]!;
    const nextRow = dp[i + 1]!;
    for (let j = m - 1; j >= 0; j--) {
      if (aNorm === normalizeForCompare(b[j]!, ignoreWs)) {
        row[j] = nextRow[j + 1]! + 1;
      } else {
        row[j] = Math.max(nextRow[j]!, row[j + 1]!);
      }
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNum = 1;
  let newNum = 1;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  while (i < n && j < m) {
    if (normalizeForCompare(a[i]!, ignoreWs) === normalizeForCompare(b[j]!, ignoreWs)) {
      lines.push({ kind: 'equal', text: b[j]!, oldLine: oldNum++, newLine: newNum++ });
      unchanged++;
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      lines.push({ kind: 'remove', text: a[i]!, oldLine: oldNum++, newLine: null });
      removed++;
      i++;
    } else {
      lines.push({ kind: 'add', text: b[j]!, oldLine: null, newLine: newNum++ });
      added++;
      j++;
    }
  }

  while (i < n) {
    lines.push({ kind: 'remove', text: a[i]!, oldLine: oldNum++, newLine: null });
    removed++;
    i++;
  }
  while (j < m) {
    lines.push({ kind: 'add', text: b[j]!, oldLine: null, newLine: newNum++ });
    added++;
    j++;
  }

  return {
    lines,
    added,
    removed,
    unchanged,
    identical: added === 0 && removed === 0,
  };
}
