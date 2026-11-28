import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import { parseTagList } from '../src/server/tools/emailauth.ts';
import { auditSecurityHeaders } from '../src/server/tools/headers.ts';
import {
  buildChmodCommands,
  buildSetfaclCommands,
  formatChmod,
  parseChmodOctal,
  parseChmodSymbolic,
} from '../src/shared/chmod.ts';
import { convertDataFormat } from '../src/shared/dataconvert.ts';
import { computeLineDiff } from '../src/shared/diff.ts';
import {
  decodeHexUtf8,
  decodeHtmlEntities,
  encodeHexUtf8,
  encodeHtmlEntities,
} from '../src/shared/encoders.ts';
import { decodeIdTimestamp, generateIds, generateUlid, generateUuidV7 } from '../src/shared/idgen.ts';
import { decodeJwt, verifyJwtHmac } from '../src/shared/jwt.ts';
import { buildMarkdownTable, renderMarkdownToHtml } from '../src/shared/markdown.ts';

describe('JWT decoder & HMAC verifier', () => {
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('decodes header, payload, and claims', () => {
    const decoded = decodeJwt(token);
    expect(decoded.alg).toBe('HS256');
    expect(decoded.payload.sub).toBe('1234567890');
    expect(decoded.claims.issuedAt).toBe('2018-01-18T01:30:22.000Z');
  });

  it('verifies HS256 signatures accurately', async () => {
    const ok = await verifyJwtHmac(token, 'your-256-bit-secret');
    expect(ok.supported).toBe(true);
    expect(ok.valid).toBe(true);

    const bad = await verifyJwtHmac(token, 'wrong-secret');
    expect(bad.valid).toBe(false);
  });
});

describe('diff checker', () => {
  it('computes line diffs and supports JSON key sorting', () => {
    const res = computeLineDiff('{"b":1,"a":2}', '{"a":2,"b":1}', { jsonMode: true });
    expect(res.identical).toBe(true);

    const res2 = computeLineDiff('a\nb\nc', 'a\nx\nc');
    expect(res2.added).toBe(1);
    expect(res2.removed).toBe(1);
    expect(res2.unchanged).toBe(2);
  });
});

describe('UUID / ULID / NanoID generator', () => {
  it('generates valid formats and decodes UUIDv7 & ULID timestamps', () => {
    const ts = 1730000000000;
    const v7 = generateUuidV7(ts);
    const decodedV7 = decodeIdTimestamp(v7);
    expect(decodedV7?.kind).toBe('uuidv7');
    expect(decodedV7?.timestampMs).toBe(ts);

    const ulid = generateUlid(ts);
    const decodedUlid = decodeIdTimestamp(ulid);
    expect(decodedUlid?.kind).toBe('ulid');
    expect(decodedUlid?.timestampMs).toBe(ts);

    const nanos = generateIds('nanoid', 3, 16);
    expect(nanos).toHaveLength(3);
    expect(nanos[0]).toHaveLength(16);
  });

  it('exposes /api/id endpoint', async () => {
    const app = createApp();
    const res = await app.fetch(new Request('http://localhost/api/id?type=uuidv7&count=3'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { type: string; count: number; ids: string[] };
    expect(body.type).toBe('uuidv7');
    expect(body.ids).toHaveLength(3);
  });
});

describe('chmod calculator', () => {
  it('converts octal and symbolic modes bidirectionally', () => {
    const state = parseChmodOctal('4755');
    expect(state).not.toBeNull();
    const summary = formatChmod(state!);
    expect(summary.octal4).toBe('4755');
    expect(summary.symbolic).toBe('rwsr-xr-x');
    expect(summary.command).toBe('chmod 4755 <file>');

    const fromSym = parseChmodSymbolic('-rwxr-xr-x');
    expect(formatChmod(fromSym!).octal3).toBe('755');

    const cmds = buildChmodCommands(fromSym!, { path: 'app/', recursive: true, smartX: true });
    expect(cmds.octalCommand).toBe('chmod -R 755 app/');
    expect(cmds.symbolicCommand).toBe('chmod -R u=rwX,g=rX,o=rX app/');

    const acl = buildSetfaclCommands({
      path: '/var/www',
      recursive: true,
      defaultAcl: true,
      rules: [{ scope: 'u', name: 'www-data', read: true, write: true, execute: false }],
    });
    expect(acl.apply).toBe('setfacl -R -d -m u:www-data:rw- /var/www');
    expect(acl.inspect).toBe('getfacl /var/www');
    expect(acl.removeAll).toBe('setfacl -R -b /var/www');
  });
});

describe('data format converter & extra encoders', () => {
  it('converts between JSON, YAML, TOML, XML, and CSV', () => {
    const json = '{"name":"tools","port":3000}';
    const yaml = convertDataFormat(json, 'json', 'yaml');
    expect(yaml).toContain('name: tools');
    expect(JSON.parse(convertDataFormat(yaml, 'yaml', 'json'))).toEqual({ name: 'tools', port: 3000 });

    const toml = convertDataFormat(json, 'json', 'toml');
    expect(toml).toContain('port = 3000');
    expect(JSON.parse(convertDataFormat(toml, 'toml', 'json'))).toEqual({ name: 'tools', port: 3000 });

    const xml = convertDataFormat(json, 'json', 'xml');
    expect(xml).toContain('<name>tools</name>');

    const csv = convertDataFormat('[{"a":1,"b":"x"},{"a":2,"b":"y"}]', 'json', 'csv');
    expect(csv).toBe('a,b\n1,x\n2,y');
    expect(JSON.parse(convertDataFormat(csv, 'csv', 'json'))).toEqual([
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
    ]);
  });

  it('encodes & decodes HTML entities and Hex', () => {
    expect(encodeHtmlEntities('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    expect(decodeHtmlEntities('&lt;hi&gt; &#65; &#x42;')).toBe('<hi> A B');
    expect(encodeHexUtf8('Hi', true)).toBe('48 69');
    expect(decodeHexUtf8('48 69').text).toBe('Hi');
  });
});

describe('markdown preview & table builder', () => {
  it('renders GFM safely (escaping raw HTML) and builds aligned tables', () => {
    const html = renderMarkdownToHtml('# Hello\n\n<script>alert(1)</script>\n\n**bold**');
    expect(html).toContain('<h1');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<strong');

    const tbl = buildMarkdownTable(['A', 'B'], [['1', '2']], ['left', 'right']);
    expect(tbl).toContain('| A   |   B |');
    expect(tbl).toContain('| --- | --: |');
  });
});

describe('security audit & email auth helpers', () => {
  it('audits security headers and parses DMARC/DKIM tag lists', () => {
    const strong = auditSecurityHeaders(
      {
        'strict-transport-security': 'max-age=31536000',
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=()',
      },
      true,
    );
    expect(strong.grade).toBe('A+');

    const tags = parseTagList('v=DMARC1; p=reject; rua=mailto:dmarc@example.com; pct=100');
    expect(tags.p).toBe('reject');
    expect(tags.pct).toBe('100');
  });

  it('blocks SSRF private targets on /api/tls and /api/headers', async () => {
    const app = createApp();
    const r1 = await app.fetch(new Request('http://localhost/api/tls?host=127.0.0.1'));
    expect(r1.status).toBe(400);

    const r2 = await app.fetch(new Request('http://localhost/api/headers?url=http://169.254.169.254/latest'));
    expect(r2.status).toBe(400);
  });
});
