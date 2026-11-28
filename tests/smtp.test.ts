import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import { isAllowedSmtpPort, parseEhloCapabilities } from '../src/server/tools/smtp.ts';

describe('SMTP banner / EHLO tester', () => {
  it('parses EHLO capabilities, STARTTLS, AUTH mechanisms, and SIZE', () => {
    const parsed = parseEhloCapabilities([
      '250-smtp.gmail.com at your service',
      '250-SIZE 35882577',
      '250-8BITMIME',
      '250-STARTTLS',
      '250-AUTH LOGIN PLAIN XOAUTH2',
      '250 SMTPUTF8',
    ]);

    expect(parsed.supportsStartTls).toBe(true);
    expect(parsed.maxMessageBytes).toBe(35882577);
    expect(parsed.authMechanisms).toEqual(['LOGIN', 'PLAIN', 'XOAUTH2']);
    expect(parsed.capabilities).toContain('8BITMIME');
    expect(parsed.capabilities).toContain('SMTPUTF8');
  });

  it('restricts SMTP probe ports and blocks SSRF targets on /api/smtp', async () => {
    expect(isAllowedSmtpPort(25)).toBe(true);
    expect(isAllowedSmtpPort(465)).toBe(true);
    expect(isAllowedSmtpPort(587)).toBe(true);
    expect(isAllowedSmtpPort(2525)).toBe(true);
    expect(isAllowedSmtpPort(22)).toBe(false);
    expect(isAllowedSmtpPort(80)).toBe(false);

    const app = createApp();
    const r1 = await app.fetch(new Request('http://localhost/api/smtp?host=127.0.0.1&port=587'));
    expect(r1.status).toBe(400);

    const r2 = await app.fetch(new Request('http://localhost/api/smtp?host=smtp.gmail.com&port=22'));
    expect(r2.status).toBe(400);
  });
});
