import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import {
  computeAllHashes,
  computeBcryptHash,
  computeHash,
  isBcryptHash,
  matchExpectedHash,
  parseBcryptRounds,
  verifyBcryptHash,
} from '../src/shared/hash.ts';

describe('hash generator', () => {
  it('matches RFC 1321 MD5 test vectors', async () => {
    expect(await computeHash('md5', '')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(await computeHash('md5', 'a')).toBe('0cc175b9c0f1b6a831c399e269772661');
    expect(await computeHash('md5', 'abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(await computeHash('md5', 'hello world')).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
    expect(await computeHash('md5', 'message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0');
  });

  it('matches NIST SHA-1, SHA-256, SHA-384, and SHA-512 test vectors for "abc"', async () => {
    expect(await computeHash('sha1', 'abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(await computeHash('sha256', 'abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await computeHash('sha384', 'abc')).toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    );
    expect(await computeHash('sha512', 'abc')).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    );
  });

  it('matches RFC 2202 HMAC-MD5 and RFC 4231 HMAC-SHA256 test vectors', async () => {
    // RFC 2202 Test Case 2: key = "Jefe", data = "what do ya want for nothing?"
    expect(
      await computeHash('md5', 'what do ya want for nothing?', { key: 'Jefe' }),
    ).toBe('750c783e6ab0b503eaa86e310a5db738');

    // RFC 4231 Test Case 2: key = "Jefe", data = "what do ya want for nothing?"
    expect(
      await computeHash('sha256', 'what do ya want for nothing?', { key: 'Jefe' }),
    ).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });

  it('supports hex, HEX, and base64 encodings and UTF-8 bytes', async () => {
    const upper = await computeHash('sha256', 'hello world', { encoding: 'HEX' });
    expect(upper).toBe('B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9');

    const b64 = await computeHash('sha256', 'hello world', { encoding: 'base64' });
    expect(b64).toBe('uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=');

    const all = await computeAllHashes('🚀', { encoding: 'hex' });
    expect(all.byteLength).toBe(4);
    expect(all.digests).toHaveLength(5);
  });

  it('matches expected hashes case-insensitively', async () => {
    const res = await computeAllHashes('hello world', { encoding: 'hex' });
    expect(matchExpectedHash('5EB63BBBE01EEED093CB22BB8F5ACDC3', res.digests)).toBe('md5');
    expect(
      matchExpectedHash('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', res.digests),
    ).toBe('sha256');
    expect(matchExpectedHash('deadbeef', res.digests)).toBeNull();
  });

  it('exposes /api/hash endpoint for all and single algorithms', async () => {
    const app = createApp();

    const r1 = await app.fetch(new Request('http://localhost/api/hash?text=abc&format=hex'));
    expect(r1.status).toBe(200);
    const body1 = (await r1.json()) as {
      byteLength: number;
      hmac: boolean;
      digests: Array<{ algorithm: string; digest: string }>;
    };
    expect(body1.byteLength).toBe(3);
    expect(body1.hmac).toBe(false);
    expect(body1.digests.find((d) => d.algorithm === 'md5')?.digest).toBe(
      '900150983cd24fb0d6963f7d28e17f72',
    );

    const r2 = await app.fetch(
      new Request('http://localhost/api/hash?text=what%20do%20ya%20want%20for%20nothing%3F&algo=sha256&key=Jefe'),
    );
    expect(r2.status).toBe(200);
    const body2 = (await r2.json()) as { algorithm: string; hmac: boolean; digest: string };
    expect(body2.algorithm).toBe('sha256');
    expect(body2.hmac).toBe(true);
    expect(body2.digest).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');

    const r3 = await app.fetch(new Request('http://localhost/api/hash?text=abc&algo=invalid'));
    expect(r3.status).toBe(400);

    const r4 = await app.fetch(new Request('http://localhost/api/hash?text=secret&algo=bcrypt&rounds=4'));
    expect(r4.status).toBe(200);
    const body4 = (await r4.json()) as { algorithm: string; hash: string; rounds: number; truncated: boolean };
    expect(body4.algorithm).toBe('bcrypt');
    expect(body4.rounds).toBe(4);
    expect(body4.truncated).toBe(false);
    expect(isBcryptHash(body4.hash)).toBe(true);

    const r5 = await app.fetch(
      new Request(
        `http://localhost/api/hash?text=secret&algo=bcrypt&verify=${encodeURIComponent(body4.hash)}`,
      ),
    );
    expect(r5.status).toBe(200);
    const body5 = (await r5.json()) as { match: boolean; validFormat: boolean; rounds: number };
    expect(body5.validFormat).toBe(true);
    expect(body5.match).toBe(true);
    expect(body5.rounds).toBe(4);
  });

  it('computes and verifies bcrypt hashes and detects 72-byte truncation', async () => {
    const res = await computeBcryptHash('correct horse battery staple', 4);
    expect(isBcryptHash(res.hash)).toBe(true);
    expect(parseBcryptRounds(res.hash)).toBe(4);
    expect(res.truncated).toBe(false);
    expect(await verifyBcryptHash('correct horse battery staple', res.hash)).toBe(true);
    expect(await verifyBcryptHash('wrong password', res.hash)).toBe(false);
    expect(await verifyBcryptHash('anything', 'not-a-bcrypt-hash')).toBe(false);

    const longRes = await computeBcryptHash('a'.repeat(80), 4);
    expect(longRes.truncated).toBe(true);
    expect(longRes.byteLength).toBe(80);
  });
});
