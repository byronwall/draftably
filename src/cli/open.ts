/** `draftably open`: serve the built editor plus one file session on localhost. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFileSession } from '../server/file-session';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

export async function openSession(file: string, options: { port: number; launch: boolean }) {
  let project = path.dirname(fileURLToPath(import.meta.url));
  while (!fs.existsSync(path.join(project, 'package.json')) && path.dirname(project) !== project)
    project = path.dirname(project);
  const root = path.join(project, 'dist');
  if (!fs.existsSync(path.join(root, 'index.html')))
    throw Error('The viewer is not built. Run `pnpm build` first.');
  const session = createFileSession(file);
  const server = http.createServer((req, res) => {
    if (session.handle(req, res)) return;
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const target = path.join(root, url === '/' ? 'index.html' : url);
    if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
    });
    fs.createReadStream(target).pipe(res);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${options.port}/`;
  console.log(`Editing ${session.file}\nViewer: ${url}\nPress Ctrl+C to stop.`);
  if (options.launch && process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore' });
  const stop = () => {
    session.close();
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
