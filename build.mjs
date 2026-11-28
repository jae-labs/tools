import { build } from 'esbuild';

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  external: ['bun', 'bun:*'],
  format: 'esm',
  outfile: 'dist/server.mjs',
  target: 'es2022',
});
