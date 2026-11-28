import { describe, expect, it } from 'vitest';
import { parseCronExpression } from '../src/shared/cron.ts';
import {
  decodeBase64Utf8,
  decodeUrlValue,
  encodeBase64Utf8,
  encodeUrlValue,
  inspectUrlQuery,
} from '../src/shared/encoders.ts';
import { convertXmlToJson } from '../src/shared/xml2json.ts';

describe('url encode / decode utilities', () => {
  it('encodes, decodes, and inspects query parameters', () => {
    const raw = 'https://tools.justanother.engineer/?q=hello world&env=prod';
    expect(encodeUrlValue('hello world & tools')).toBe('hello%20world%20%26%20tools');
    expect(encodeUrlValue('hello world', { formSpace: true })).toBe('hello+world');
    expect(decodeUrlValue('hello+world', { formSpace: true })).toBe('hello world');
    expect(encodeUrlValue(raw, { mode: 'uri' })).toBe('https://tools.justanother.engineer/?q=hello%20world&env=prod');

    const parsed = inspectUrlQuery(raw);
    expect(parsed.isFullUrl).toBe(true);
    expect(parsed.params).toEqual([
      { key: 'q', value: 'hello world' },
      { key: 'env', value: 'prod' },
    ]);

    expect(() => decodeUrlValue('%E0%A4%A')).toThrow(/Malformed URL-encoded/i);
  });
});

describe('base64 utf-8 utilities', () => {
  it('handles UTF-8 strings, URL-safe encoding, padding stripping, and invalid inputs', () => {
    const original = 'justanother.engineer ⚡ café';
    const b64 = encodeBase64Utf8(original);
    expect(decodeBase64Utf8(b64).text).toBe(original);

    const urlSafe = encodeBase64Utf8('a+b/c?==', { urlSafe: true, stripPadding: true });
    expect(urlSafe).not.toContain('+');
    expect(urlSafe).not.toContain('/');
    expect(urlSafe).not.toContain('=');
    expect(decodeBase64Utf8(urlSafe).text).toBe('a+b/c?==');

    expect(() => decodeBase64Utf8('!invalid!')).toThrow(/invalid Base64/i);
  });
});

describe('xml to json converter', () => {
  it('converts XML attributes, CDATA, repeated elements, and primitives accurately', () => {
    const xml = `
      <?xml version="1.0"?>
      <service env="prod" port="3000">
        <!-- comment -->
        <region code="fra" primary="true">eu-central-1</region>
        <region code="iad" primary="false">us-east-1</region>
        <notes><![CDATA[Fast & clean <edge>]]></notes>
      </service>
    `;
    const res = convertXmlToJson(xml, { attributePrefix: '@', parsePrimitives: true });
    expect(res.json).toEqual({
      service: {
        '@env': 'prod',
        '@port': 3000,
        region: [
          { '@code': 'fra', '@primary': true, '#text': 'eu-central-1' },
          { '@code': 'iad', '@primary': false, '#text': 'us-east-1' },
        ],
        notes: 'Fast & clean <edge>',
      },
    });
    expect(res.stats.elements).toBe(4);
    expect(res.stats.attributes).toBe(6);

    expect(() => convertXmlToJson('<a><b></a>')).toThrow(/Mismatched closing tag/i);
  });
});

describe('crontab converter', () => {
  it('parses cron expressions, macros, weekday ranges, and computes next runs', () => {
    const from = new Date('2026-11-19T12:00:00Z'); // Thursday

    const every5 = parseCronExpression('*/5 * * * *', 3, from);
    expect(every5.summary).toBe('Every 5 minutes.');
    expect(every5.nextRuns).toEqual([
      '2026-11-19T12:05:00.000Z',
      '2026-11-19T12:10:00.000Z',
      '2026-11-19T12:15:00.000Z',
    ]);

    const weekdays = parseCronExpression('15 14 * * MON-FRI', 2, from);
    expect(weekdays.summary).toContain('At 14:15');
    expect(weekdays.summary).toContain('Monday, Tuesday, Wednesday, Thursday, Friday');
    expect(weekdays.nextRuns[0]).toBe('2026-11-19T14:15:00.000Z');

    const macro = parseCronExpression('@daily', 1, from);
    expect(macro.normalized).toBe('0 0 * * *');
    expect(macro.nextRuns[0]).toBe('2026-11-20T00:00:00.000Z');

    expect(() => parseCronExpression('* * *')).toThrow(/Expected 5 cron fields/i);
  });
});
