import { describe, expect, it } from 'vitest';
import { buildAsciiArt } from '../src/shared/ascii.ts';
import {
  REGEX_QUICK_REFERENCE,
  evaluateRegex,
  explainRegexTokens,
  generateRegexCode,
  normalizeRegexFlags,
  runRegexUnitTests,
} from '../src/shared/regex.ts';

describe('regex tester & explainer', () => {
  it('normalizes flags, finds all matches, capture groups, named groups, and replacement', () => {
    expect(normalizeRegexFlags('gigxm')).toBe('gim');

    const res = evaluateRegex(
      '(?<proto>https?)://(?<host>[a-z.]+)',
      'gi',
      'Visit https://justanother.engineer and http://example.org.',
      '$<proto>->$1:$<host>',
    );

    expect(res.matchCount).toBe(2);
    expect(res.truncated).toBe(false);
    expect(res.matches[0]?.value).toBe('https://justanother.engineer');
    expect(res.matches[0]?.groups).toEqual([
      { index: 1, name: 'proto', value: 'https' },
      { index: 2, name: 'host', value: 'justanother.engineer' },
    ]);
    expect(res.replaced).toBe('Visit https->https:justanother.engineer and http->http:example.org.');
  });

  it('prevents infinite loops on zero-length matches and reports invalid syntax', () => {
    const res = evaluateRegex('a*', 'g', 'aba');
    expect(res.matchCount).toBeGreaterThan(0);
    expect(res.matchCount).toBeLessThanOrEqual(10);

    expect(() => evaluateRegex('[unclosed', 'g', 'test')).toThrow(/Invalid RegExp/i);
  });

  it('explains anchors, classes, groups, quantifiers, escapes, and alternation', () => {
    const tokens = explainRegexTokens('^(?:\\d{1,3}\\.)+(?<last>[0-9]+)|end$');
    expect(tokens.some((t) => t.token === '^' && t.category === 'anchor')).toBe(true);
    expect(tokens.some((t) => t.token === '(?:' && t.category === 'group')).toBe(true);
    expect(tokens.some((t) => t.token === '\\d' && t.category === 'class')).toBe(true);
    expect(tokens.some((t) => t.token === '{1,3}' && t.category === 'quantifier')).toBe(true);
    expect(tokens.some((t) => t.token === '(?<last>' && t.description.includes('last'))).toBe(true);
    expect(tokens.some((t) => t.token === '|' && t.category === 'alternation')).toBe(true);
  });

  it('generates multi-language code snippets, runs unit tests, and exposes quick reference', () => {
    expect(generateRegexCode('javascript', '(?<id>\\d+)', 'gi')).toContain('matchAll');
    expect(generateRegexCode('python', '(?<id>\\d+)', 'gi')).toContain('(?P<id>');
    expect(generateRegexCode('go', '(?<id>\\d+)', 'i')).toContain('regexp.MustCompile');
    expect(generateRegexCode('rust', '\\d+', 'i')).toContain('Regex::new');
    expect(generateRegexCode('ripgrep', '\\d+', 'i')).toContain('rg -n --pcre2 -i');

    const results = runRegexUnitTests('^\\d{3}$', 'g', [
      { id: '1', input: '123', expect: 'should_match' },
      { id: '2', input: 'abc', expect: 'should_not_match' },
      { id: '3', input: '1234', expect: 'should_match' },
    ]);
    expect(results[0]?.passed).toBe(true);
    expect(results[1]?.passed).toBe(true);
    expect(results[2]?.passed).toBe(false);
    expect(REGEX_QUICK_REFERENCE.length).toBeGreaterThan(15);
  });
});

describe('ascii art builder', () => {
  it('builds block, shadow, banner, dot, and braille styles with optional frames & comments', () => {
    const block = buildAsciiArt('HI', { style: 'block' });
    expect(block.lines).toBe(5);
    expect(block.art).toContain('██');
    expect(block.columns).toBeGreaterThan(10);

    const framed = buildAsciiArt('OK', { style: 'banner', fillChar: '*', frame: 'double', commentPrefix: '//' });
    const lines = framed.art.split('\n');
    expect(lines[0]).toMatch(/^\/\/ ╔═+╗$/);
    expect(lines[lines.length - 1]).toMatch(/^\/\/ ╚═+╝$/);
    expect(framed.art).toContain('*');

    const braille = buildAsciiArt('AB', { style: 'braille' });
    expect(braille.lines).toBe(2);

    const shadow = buildAsciiArt('A', { style: 'shadow' });
    expect(shadow.art).toContain('░');
    expect(shadow.art).toContain('█');
  });
});
