export interface RegexCaptureGroup {
  index: number;
  name?: string;
  value: string | undefined;
}

export interface RegexMatchEntry {
  matchIndex: number;
  start: number;
  end: number;
  value: string;
  groups: RegexCaptureGroup[];
}

export interface RegexTokenExplanation {
  token: string;
  category: 'anchor' | 'class' | 'group' | 'quantifier' | 'alternation' | 'escape' | 'literal';
  description: string;
}

export interface RegexEvalResult {
  pattern: string;
  flags: string;
  matchCount: number;
  truncated: boolean;
  matches: RegexMatchEntry[];
  replaced: string;
  tokens: RegexTokenExplanation[];
}

const VALID_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y', 'd', 'v']);

export function normalizeRegexFlags(rawFlags: string): string {
  const seen = new Set<string>();
  let out = '';
  for (const ch of rawFlags) {
    if (VALID_FLAGS.has(ch) && !seen.has(ch)) {
      seen.add(ch);
      out += ch;
    }
  }
  return out;
}

const ESCAPE_DESCRIPTIONS: Record<string, string> = {
  d: 'Matches any digit (0-9)',
  D: 'Matches any non-digit character',
  w: 'Matches any word character (letter, digit, underscore)',
  W: 'Matches any non-word character',
  s: 'Matches any whitespace character (space, tab, newline)',
  S: 'Matches any non-whitespace character',
  b: 'Matches a word boundary position',
  B: 'Matches a non-word boundary position',
  n: 'Matches a newline (LF)',
  r: 'Matches a carriage return (CR)',
  t: 'Matches a tab character',
  0: 'Matches a NUL character',
};

function readBracketGroup(pattern: string, start: number): { token: string; nextIdx: number } {
  let i = start + 1;
  if (pattern[i] === '^') i += 1;
  if (pattern[i] === ']') i += 1;
  while (i < pattern.length) {
    if (pattern[i] === '\\' && i + 1 < pattern.length) {
      i += 2;
      continue;
    }
    if (pattern[i] === ']') {
      return { token: pattern.slice(start, i + 1), nextIdx: i + 1 };
    }
    i += 1;
  }
  return { token: pattern.slice(start), nextIdx: pattern.length };
}

function readBraceQuantifier(pattern: string, start: number): { token: string; nextIdx: number } | null {
  const match = /^\{\d+(?:,\d*)?\}\??/.exec(pattern.slice(start));
  if (!match) return null;
  return { token: match[0], nextIdx: start + match[0].length };
}

export function explainRegexTokens(pattern: string): RegexTokenExplanation[] {
  const tokens: RegexTokenExplanation[] = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i]!;

    if (ch === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1]!;
      const tok = pattern.slice(i, i + 2);
      const isBoundary = next === 'b' || next === 'B';
      tokens.push({
        token: tok,
        category: isBoundary ? 'anchor' : ESCAPE_DESCRIPTIONS[next] ? 'class' : 'escape',
        description: ESCAPE_DESCRIPTIONS[next] ?? `Matches literal "${next}"`,
      });
      i += 2;
      continue;
    }

    if (ch === '[') {
      const { token, nextIdx } = readBracketGroup(pattern, i);
      const negated = token.startsWith('[^');
      const inner = negated ? token.slice(2, -1) : token.slice(1, -1);
      tokens.push({
        token,
        category: 'class',
        description: negated
          ? `Negated character class: matches any character NOT in "${inner}"`
          : `Character class: matches any character in "${inner}"`,
      });
      i = nextIdx;
      continue;
    }

    if (ch === '(') {
      const rest = pattern.slice(i);
      if (rest.startsWith('(?:')) {
        tokens.push({ token: '(?:', category: 'group', description: 'Non-capturing group start' });
        i += 3;
      } else if (rest.startsWith('(?=')) {
        tokens.push({ token: '(?=', category: 'group', description: 'Positive lookahead assertion' });
        i += 3;
      } else if (rest.startsWith('(?!')) {
        tokens.push({ token: '(?!', category: 'group', description: 'Negative lookahead assertion' });
        i += 3;
      } else if (rest.startsWith('(?<=')) {
        tokens.push({ token: '(?<=', category: 'group', description: 'Positive lookbehind assertion' });
        i += 4;
      } else if (rest.startsWith('(?<!')) {
        tokens.push({ token: '(?<!', category: 'group', description: 'Negative lookbehind assertion' });
        i += 4;
      } else {
        const named = /^\(\?<([A-Za-z_]\w*)>/.exec(rest);
        if (named) {
          tokens.push({
            token: named[0],
            category: 'group',
            description: `Named capturing group "${named[1]}"`,
          });
          i += named[0].length;
        } else {
          tokens.push({ token: '(', category: 'group', description: 'Capturing group start' });
          i += 1;
        }
      }
      continue;
    }

    if (ch === ')') {
      tokens.push({ token: ')', category: 'group', description: 'End of group' });
      i += 1;
      continue;
    }

    if (ch === '^' || ch === '$') {
      tokens.push({
        token: ch,
        category: 'anchor',
        description: ch === '^' ? 'Asserts position at start of string/line' : 'Asserts position at end of string/line',
      });
      i += 1;
      continue;
    }

    if (ch === '.') {
      tokens.push({ token: '.', category: 'class', description: 'Matches any character (except newline unless /s)' });
      i += 1;
      continue;
    }

    if (ch === '|') {
      tokens.push({ token: '|', category: 'alternation', description: 'OR: matches expression before or after' });
      i += 1;
      continue;
    }

    if (ch === '*' || ch === '+' || ch === '?') {
      const lazy = pattern[i + 1] === '?';
      const tok = lazy ? `${ch}?` : ch;
      const baseDesc =
        ch === '*'
          ? 'Matches 0 or more of preceding token'
          : ch === '+'
            ? 'Matches 1 or more of preceding token'
            : 'Matches 0 or 1 of preceding token (optional)';
      tokens.push({
        token: tok,
        category: 'quantifier',
        description: lazy ? `${baseDesc} (lazy)` : baseDesc,
      });
      i += lazy ? 2 : 1;
      continue;
    }

    if (ch === '{') {
      const brace = readBraceQuantifier(pattern, i);
      if (brace) {
        const isLazy = brace.token.endsWith('?');
        const body = isLazy ? brace.token.slice(1, -2) : brace.token.slice(1, -1);
        const [minPart, maxPart] = body.split(',');
        let desc = `Matches preceding token exactly ${minPart} times`;
        if (maxPart === '') desc = `Matches preceding token ${minPart} or more times`;
        else if (maxPart !== undefined) desc = `Matches preceding token between ${minPart} and ${maxPart} times`;
        tokens.push({
          token: brace.token,
          category: 'quantifier',
          description: isLazy ? `${desc} (lazy)` : desc,
        });
        i = brace.nextIdx;
        continue;
      }
    }

    tokens.push({ token: ch, category: 'literal', description: `Matches literal "${ch}"` });
    i += 1;
  }

  return tokens;
}

export function evaluateRegex(
  pattern: string,
  rawFlags: string,
  testText: string,
  replacement = '',
  maxMatches = 500,
): RegexEvalResult {
  if (!pattern) {
    throw new Error('Enter a regular expression pattern.');
  }

  const flags = normalizeRegexFlags(rawFlags);
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (err) {
    throw new Error(`Invalid RegExp: ${err instanceof Error ? err.message : 'syntax error'}`, { cause: err });
  }

  const matches: RegexMatchEntry[] = [];
  let truncated = false;

  if (flags.includes('g') || flags.includes('y')) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(testText)) !== null) {
      matches.push(buildMatchEntry(matches.length, m));
      if (matches.length >= maxMatches) {
        truncated = true;
        break;
      }
      if (m[0].length === 0) {
        if (regex.lastIndex >= testText.length) break;
        regex.lastIndex += 1;
      }
    }
  } else {
    const m = regex.exec(testText);
    if (m) {
      matches.push(buildMatchEntry(0, m));
    }
  }

  const replaced = testText.replace(new RegExp(pattern, flags), replacement);

  return {
    pattern,
    flags,
    matchCount: matches.length,
    truncated,
    matches,
    replaced,
    tokens: explainRegexTokens(pattern),
  };
}

function buildMatchEntry(matchIndex: number, m: RegExpExecArray): RegexMatchEntry {
  const groups: RegexCaptureGroup[] = [];
  const namedEntries = Object.entries(m.groups ?? {});

  for (let idx = 1; idx < m.length; idx += 1) {
    const val = m[idx];
    const matchedName = namedEntries.find(([, nVal]) => nVal === val)?.[0];
    groups.push({
      index: idx,
      name: matchedName,
      value: val,
    });
  }

  return {
    matchIndex,
    start: m.index,
    end: m.index + m[0].length,
    value: m[0],
    groups,
  };
}
