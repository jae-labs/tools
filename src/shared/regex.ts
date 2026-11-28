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

export type RegexCodeLanguage = 'javascript' | 'python' | 'go' | 'rust' | 'ripgrep';

export function generateRegexCode(
  language: RegexCodeLanguage,
  pattern: string,
  rawFlags: string,
  replacement = '',
): string {
  const flags = normalizeRegexFlags(rawFlags);
  const escapedJs = pattern.replace(/(?<!\\)\//g, '\\/');
  const escapedSingle = pattern.replaceAll("'", "'\\''");

  switch (language) {
    case 'javascript': {
      const lines = [
        `const regex = /${escapedJs || '(?:)'}/${flags};`,
        `const matches = [...input.matchAll(/${escapedJs || '(?:)'}/${flags.includes('g') ? flags : `${flags}g`})];`,
        `for (const m of matches) console.log(m[0], m.groups ?? m.slice(1));`,
      ];
      if (replacement) {
        lines.push(`const replaced = input.replace(regex, ${JSON.stringify(replacement)});`);
      }
      return lines.join('\n');
    }
    case 'python': {
      const pyFlags: string[] = [];
      if (flags.includes('i')) pyFlags.push('re.IGNORECASE');
      if (flags.includes('m')) pyFlags.push('re.MULTILINE');
      if (flags.includes('s')) pyFlags.push('re.DOTALL');
      const flagArg = pyFlags.length > 0 ? `, ${pyFlags.join(' | ')}` : '';
      const pyPattern = pattern.replaceAll('(?<', '(?P<');
      const lines = [
        `import re`,
        ``,
        `pattern = re.compile(r${JSON.stringify(pyPattern)}${flagArg})`,
        `for match in pattern.finditer(text):`,
        `    print(match.group(0), match.groupdict() or match.groups())`,
      ];
      if (replacement) {
        lines.push(`replaced = pattern.sub(${JSON.stringify(replacement)}, text)`);
      }
      return lines.join('\n');
    }
    case 'go': {
      const inlineFlags = [
        flags.includes('i') ? 'i' : '',
        flags.includes('m') ? 'm' : '',
        flags.includes('s') ? 's' : '',
      ].join('');
      const goPattern = (inlineFlags ? `(?${inlineFlags})` : '') + pattern.replaceAll('(?<', '(?P<');
      const rawLit = goPattern.includes('`') ? JSON.stringify(goPattern) : `\`${goPattern}\``;
      return [
        `package main`,
        ``,
        `import (`,
        `\t"fmt"`,
        `\t"regexp"`,
        `)`,
        ``,
        `func main() {`,
        `\tre := regexp.MustCompile(${rawLit})`,
        `\tmatches := re.FindAllStringSubmatch(input, -1)`,
        `\tfmt.Println(matches)`,
        `}`,
      ].join('\n');
    }
    case 'rust': {
      const inlineFlags = [
        flags.includes('i') ? 'i' : '',
        flags.includes('m') ? 'm' : '',
        flags.includes('s') ? 's' : '',
      ].join('');
      const rustPattern = (inlineFlags ? `(?${inlineFlags})` : '') + pattern;
      return [
        `use regex::Regex;`,
        ``,
        `let re = Regex::new(r#"${rustPattern}"#).unwrap();`,
        `for caps in re.captures_iter(input) {`,
        `    println!("{:?}", &caps[0]);`,
        `}`,
      ].join('\n');
    }
    case 'ripgrep': {
      const rgFlags = [
        '-n',
        '--pcre2',
        flags.includes('i') ? '-i' : '',
        flags.includes('s') ? '-U' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `rg ${rgFlags} '${escapedSingle}' file.txt`;
    }
  }
}

export type RegexAssertionMode = 'should_match' | 'should_not_match';

export interface RegexUnitTestCase {
  id: string;
  input: string;
  expect: RegexAssertionMode;
}

export interface RegexUnitTestResult {
  id: string;
  input: string;
  expect: RegexAssertionMode;
  matched: boolean;
  passed: boolean;
}

export function runRegexUnitTests(
  pattern: string,
  rawFlags: string,
  cases: readonly RegexUnitTestCase[],
): RegexUnitTestResult[] {
  const flags = normalizeRegexFlags(rawFlags).replace(/[gy]/g, '');
  const regex = new RegExp(pattern, flags);
  return cases.map((c) => {
    const matched = regex.test(c.input);
    const passed = c.expect === 'should_match' ? matched : !matched;
    return {
      id: c.id,
      input: c.input,
      expect: c.expect,
      matched,
      passed,
    };
  });
}

export interface RegexQuickRefItem {
  category: 'Classes' | 'Anchors' | 'Quantifiers' | 'Groups & Lookaround';
  token: string;
  description: string;
}

export const REGEX_QUICK_REFERENCE: readonly RegexQuickRefItem[] = [
  { category: 'Classes', token: '.', description: 'Any character except newline' },
  { category: 'Classes', token: '\\d', description: 'Digit (0-9)' },
  { category: 'Classes', token: '\\D', description: 'Non-digit' },
  { category: 'Classes', token: '\\w', description: 'Word char (a-z, A-Z, 0-9, _)' },
  { category: 'Classes', token: '\\W', description: 'Non-word character' },
  { category: 'Classes', token: '\\s', description: 'Whitespace (space, tab, newline)' },
  { category: 'Classes', token: '[a-z]', description: 'Character range' },
  { category: 'Classes', token: '[^a-z]', description: 'Negated character class' },
  { category: 'Anchors', token: '^', description: 'Start of string / line' },
  { category: 'Anchors', token: '$', description: 'End of string / line' },
  { category: 'Anchors', token: '\\b', description: 'Word boundary' },
  { category: 'Anchors', token: '\\B', description: 'Non-word boundary' },
  { category: 'Quantifiers', token: '*', description: '0 or more (greedy)' },
  { category: 'Quantifiers', token: '+', description: '1 or more (greedy)' },
  { category: 'Quantifiers', token: '?', description: '0 or 1 (optional)' },
  { category: 'Quantifiers', token: '+?', description: '1 or more (lazy)' },
  { category: 'Quantifiers', token: '{2,5}', description: 'Between 2 and 5 times' },
  { category: 'Groups & Lookaround', token: '(abc)', description: 'Capturing group' },
  { category: 'Groups & Lookaround', token: '(?:abc)', description: 'Non-capturing group' },
  { category: 'Groups & Lookaround', token: '(?<name>abc)', description: 'Named capturing group' },
  { category: 'Groups & Lookaround', token: '(?=abc)', description: 'Positive lookahead' },
  { category: 'Groups & Lookaround', token: '(?!abc)', description: 'Negative lookahead' },
  { category: 'Groups & Lookaround', token: '(?<=abc)', description: 'Positive lookbehind' },
  { category: 'Groups & Lookaround', token: '(?<!abc)', description: 'Negative lookbehind' },
];
