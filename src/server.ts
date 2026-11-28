import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from 'bun';
import service from '../service.ts';
import { createApp, type StaticAssetResult } from './server/app.ts';

const CLIENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'client');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveStatic(pathname: string, method: string): Promise<StaticAssetResult | null> {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!relative || relative.includes('..') || relative.includes('\0')) {
    return null;
  }

  const resolved = path.resolve(CLIENT_DIR, relative);
  if (!resolved.startsWith(`${CLIENT_DIR}${path.sep}`)) {
    return null;
  }

  const file = Bun.file(resolved);
  if (!(await file.exists())) {
    return null;
  }

  const ext = path.extname(resolved).toLowerCase();
  const isImmutable = pathname.startsWith('/assets/');

  return {
    body: method === 'HEAD' ? null : file,
    contentType: MIME_TYPES[ext] ?? 'application/octet-stream',
    cacheControl: isImmutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
}

process.on('uncaughtException', (error) => {
  console.error('uncaughtException', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
});

const app = createApp({ serveStatic });

serve({
  hostname: '0.0.0.0',
  port: service.port(),
  idleTimeout: 30,
  fetch(request, server) {
    const socketAddress = server.requestIP(request);
    return app.fetch(request, socketAddress);
  },
});
