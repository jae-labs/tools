import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import {
  MEMORABLE_WORDLIST,
  PIN_LENGTH_MAX,
  PIN_LENGTH_MIN,
  RANDOM_LENGTH_MAX,
  RANDOM_LENGTH_MIN,
  classifyPasswordChar,
  classifyStrength,
  generateMemorablePassword,
  generatePassword,
  generatePinPassword,
  generateRandomPassword,
  secureRandomInt,
  tokenizePassword,
} from '../src/shared/password.ts';

describe('password generator', () => {
  it('generates a default 20-char random password with letters and numbers, no symbols', () => {
    const res = generateRandomPassword();
    expect(res.type).toBe('random');
    expect(res.length).toBe(20);
    expect(res.password).toHaveLength(20);
    expect(res.password).toMatch(/[a-z]/);
    expect(res.password).toMatch(/[A-Z]/);
    expect(res.password).toMatch(/[0-9]/);
    expect(res.password).toMatch(/^[a-zA-Z0-9]+$/);
    expect(res.entropyBits).toBeGreaterThan(100);
    expect(res.strength).toBe('Very Strong');
  });

  it('includes symbols when symbols=true and omits numbers when numbers=false', () => {
    const withSymbols = generateRandomPassword({ length: 24, numbers: false, symbols: true });
    expect(withSymbols.password).toHaveLength(24);
    expect(withSymbols.password).not.toMatch(/[0-9]/);
    expect(withSymbols.password).toMatch(/[^a-zA-Z0-9]/);
    expect(withSymbols.tokens.some((t) => t.kind === 'symbol')).toBe(true);
    expect(withSymbols.tokens.every((t) => t.kind !== 'number')).toBe(true);
  });

  it('clamps random length within allowed min/max bounds', () => {
    expect(generateRandomPassword({ length: 2 }).length).toBe(RANDOM_LENGTH_MIN);
    expect(generateRandomPassword({ length: 999 }).length).toBe(RANDOM_LENGTH_MAX);
  });

  it('generates memorable passphrases with configurable words, separator, capitalization, and number', () => {
    const plain = generateMemorablePassword({
      words: 4,
      separator: 'hyphen',
      capitalize: false,
      includeNumber: false,
    });
    const parts = plain.password.split('-');
    expect(parts).toHaveLength(4);
    for (const word of parts) {
      expect(MEMORABLE_WORDLIST).toContain(word);
    }

    const fancy = generateMemorablePassword({
      words: 5,
      separator: 'underscore',
      capitalize: true,
      includeNumber: true,
    });
    const fancyParts = fancy.password.split('_');
    expect(fancyParts).toHaveLength(5);
    for (const part of fancyParts) {
      expect(part[0]).toMatch(/[A-Z]/);
    }
    expect(fancy.password).toMatch(/[0-9]/);
  });

  it('generates numeric PINs within allowed bounds', () => {
    const pin = generatePinPassword({ length: 6 });
    expect(pin.type).toBe('pin');
    expect(pin.password).toMatch(/^\d{6}$/);
    expect(pin.tokens.every((t) => t.kind === 'number')).toBe(true);

    expect(generatePinPassword({ length: 1 }).length).toBe(PIN_LENGTH_MIN);
    expect(generatePinPassword({ length: 50 }).length).toBe(PIN_LENGTH_MAX);
  });

  it('classifies characters, tokens, and strength accurately', () => {
    expect(classifyPasswordChar('a')).toBe('letter');
    expect(classifyPasswordChar('Z')).toBe('letter');
    expect(classifyPasswordChar('7')).toBe('number');
    expect(classifyPasswordChar('!')).toBe('symbol');

    const tokens = tokenizePassword('a9!');
    expect(tokens).toEqual([
      { char: 'a', kind: 'letter' },
      { char: '9', kind: 'number' },
      { char: '!', kind: 'symbol' },
    ]);

    expect(classifyStrength(20)).toBe('Weak');
    expect(classifyStrength(45)).toBe('Fair');
    expect(classifyStrength(65)).toBe('Good');
    expect(classifyStrength(85)).toBe('Strong');
    expect(classifyStrength(120)).toBe('Very Strong');
  });

  it('dispatches via generatePassword and validates secureRandomInt', () => {
    expect(generatePassword({ type: 'pin', pin: { length: 4 } }).password).toMatch(/^\d{4}$/);
    expect(secureRandomInt(1)).toBe(0);
    expect(() => secureRandomInt(0)).toThrow(RangeError);
  });

  it('exposes /api/password endpoint for random, memorable, and pin modes', async () => {
    const app = createApp();

    const r1 = await app.fetch(
      new Request('http://localhost/api/password?type=random&length=16&numbers=true&symbols=true'),
    );
    expect(r1.status).toBe(200);
    const body1 = (await r1.json()) as { type: string; password: string; length: number };
    expect(body1.type).toBe('random');
    expect(body1.length).toBe(16);
    expect(body1.password).toMatch(/[0-9]/);
    expect(body1.password).toMatch(/[^a-zA-Z0-9]/);

    const r2 = await app.fetch(
      new Request('http://localhost/api/password?type=memorable&words=4&separator=period&capitalize=true'),
    );
    expect(r2.status).toBe(200);
    const body2 = (await r2.json()) as { type: string; password: string };
    expect(body2.type).toBe('memorable');
    expect(body2.password.split('.')).toHaveLength(4);

    const r3 = await app.fetch(new Request('http://localhost/api/password?type=pin&length=8'));
    expect(r3.status).toBe(200);
    const body3 = (await r3.json()) as { type: string; password: string };
    expect(body3.type).toBe('pin');
    expect(body3.password).toMatch(/^\d{8}$/);
  });
});
