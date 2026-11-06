import path from 'node:path';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const proofDir = path.join(root, 'tmp/markdown-package-proof');
const manifest = JSON.parse(readFileSync(path.join(proofDir, 'consumer.json'), 'utf8')) as {
  consumer: string;
};
const consumer = realpathSync(manifest.consumer);
const server = await createServer({
  root: consumer,
  configFile: false,
  publicDir: path.join(consumer, 'out'),
  optimizeDeps: { exclude: ['@draftably/runtime'] },
  server: { host: '127.0.0.1', port: 4188, strictPort: true },
});
await server.listen();
console.log(`Markdown review page: http://127.0.0.1:4188/interactive.html`);
const close = () => void server.close();
process.once('SIGINT', close);
process.once('SIGTERM', close);
await new Promise(() => {});
