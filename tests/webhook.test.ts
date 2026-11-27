import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import { WebhookStore, normalizeChannelId } from '../src/server/tools/webhook.ts';

describe('Webhook / Payload Inspector', () => {
  it('validates and normalizes channel names', () => {
    expect(normalizeChannelId('Demo-1_test')).toBe('demo-1_test');
    expect(normalizeChannelId('ab')).toBe('ab');
    expect(normalizeChannelId('a')).toBeNull();
    expect(normalizeChannelId('../etc')).toBeNull();
    expect(normalizeChannelId('bad space')).toBeNull();
    expect(normalizeChannelId('a'.repeat(49))).toBeNull();
  });

  it('captures requests, parses JSON, truncates oversized bodies, and enforces ring buffer', async () => {
    const store = new WebhookStore({ maxEventsPerChannel: 2, maxBodyBytes: 16 });
    const req1 = new Request('http://localhost/hook/demo/orders?env=prod&tag=a&tag=b', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-custom': '42' },
      body: JSON.stringify({ ok: true }),
    });
    const { event: ev1 } = await store.captureRequest(
      'demo',
      req1,
      new URL(req1.url),
      '/orders',
      '203.0.113.5',
    );
    expect(ev1.method).toBe('POST');
    expect(ev1.subpath).toBe('/orders');
    expect(ev1.query).toEqual({ env: 'prod', tag: ['a', 'b'] });
    expect(ev1.headers['x-custom']).toBe('42');
    expect(ev1.bodyJson).toEqual({ ok: true });
    expect(ev1.bodyTruncated).toBe(false);

    const req2 = new Request('http://localhost/hook/demo', {
      method: 'PUT',
      body: '0123456789abcdefghijklmnopqrstuvwxyz',
    });
    const { event: ev2 } = await store.captureRequest('demo', req2, new URL(req2.url), '', '203.0.113.6');
    expect(ev2.bodyTruncated).toBe(true);
    expect(ev2.bodyText).toBe('0123456789abcdef');
    expect(ev2.bodyBytes).toBe(36);

    const req3 = new Request('http://localhost/hook/demo', { method: 'DELETE' });
    await store.captureRequest('demo', req3, new URL(req3.url), '', '203.0.113.7');

    const events = store.getEvents('demo');
    expect(events).toHaveLength(2);
    expect(events[0].method).toBe('DELETE');
    expect(events[1].method).toBe('PUT');
  });

  it('handles /hook, /api/hook events, config, clear, and live SSE stream through createApp', async () => {
    const app = createApp();

    // Configure custom 201 response status
    const cfgRes = await app.fetch(
      new Request('http://localhost/api/hook/my-hook/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 201 }),
      }),
    );
    expect(cfgRes.status).toBe(200);

    // Open SSE stream before sending a webhook
    const abortController = new AbortController();
    const streamRes = await app.fetch(
      new Request('http://localhost/api/hook/my-hook/stream', { signal: abortController.signal }),
    );
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get('content-type')).toContain('text/event-stream');

    const reader = streamRes.body!.getReader();
    const decoder = new TextDecoder();

    // First chunk should be init event
    const initChunk = await reader.read();
    expect(decoder.decode(initChunk.value)).toContain('event: init');

    // Send a POST payload to /hook/my-hook/stripe
    const hookRes = await app.fetch(
      new Request('http://localhost/hook/my-hook/stripe?mode=live', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-sig': 'abc123' },
        body: JSON.stringify({ event: 'charge.succeeded', amount: 1500 }),
      }),
    );
    expect(hookRes.status).toBe(201);
    expect(hookRes.headers.get('access-control-allow-origin')).toBe('*');

    // SSE stream should immediately receive the live request event
    const liveChunk = await reader.read();
    const liveText = decoder.decode(liveChunk.value);
    expect(liveText).toContain('event: request');
    expect(liveText).toContain('charge.succeeded');

    // REST events endpoint should list the captured event
    const listRes = await app.fetch(new Request('http://localhost/api/hook/my-hook/events'));
    const listData = (await listRes.json()) as { events: Array<{ subpath: string; bodyJson: { amount: number } }> };
    expect(listData.events).toHaveLength(1);
    expect(listData.events[0].subpath).toBe('/stripe');
    expect(listData.events[0].bodyJson.amount).toBe(1500);

    // Clear events
    const clearRes = await app.fetch(
      new Request('http://localhost/api/hook/my-hook/events', { method: 'DELETE' }),
    );
    expect(clearRes.status).toBe(200);
    const clearedChunk = await reader.read();
    expect(decoder.decode(clearedChunk.value)).toContain('event: cleared');

    abortController.abort();
    await reader.cancel();
  });
});
