/** `draftably open`: serve the built editor plus a folder of diagram files on localhost. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { createWorkspace } from '../server/workspace';
import { cliVersion } from './skill';

/** A running viewer, as it registers itself so `open` can find it again. */
export interface Viewer {
  pid: number;
  port: number;
  /** The folder it serves. */
  root: string;
  version: string;
  started: string;
}

/** Where running viewers register: `~/.draftably/viewers`, or `$DRAFTABLY_HOME/viewers`. */
const registry = () =>
  path.join(process.env.DRAFTABLY_HOME ?? path.join(os.homedir(), '.draftably'), 'viewers');

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/** Viewers still running; records of stopped ones are removed. */
export function runningViewers(): Viewer[] {
  const dir = registry();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    try {
      const v = JSON.parse(fs.readFileSync(file, 'utf8')) as Viewer;
      if (alive(v.pid)) return [v];
    } catch {
      // A half-written or foreign file: drop it.
    }
    fs.rmSync(file, { force: true });
    return [];
  });
}

export const viewerUrl = (v: Pick<Viewer, 'port'>, file = '') =>
  `http://127.0.0.1:${v.port}/${file ? `?file=${encodeURIComponent(file)}` : ''}`;

/** Where `target` is served from, and the file to open there (empty for a folder). */
export function servedAt(target: string) {
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat) throw Error(`No such file or folder: ${target}`);
  if (stat.isFile() && !target.endsWith('.draft')) throw Error('Open a .draft file or a folder.');
  const cwd = process.cwd();
  // A file inside the current folder keeps that folder as the workspace, so its neighbors show.
  const root = stat.isDirectory()
    ? target
    : target.startsWith(cwd + path.sep)
      ? cwd
      : path.dirname(target);
  return {
    root: path.resolve(root),
    file: stat.isFile() ? path.relative(root, target).split(path.sep).join('/') : '',
  };
}

/** Stop a registered viewer and wait for it to exit. */
export async function stopViewer(v: Viewer) {
  process.kill(v.pid, 'SIGTERM');
  for (let i = 0; i < 50 && alive(v.pid); i++) await new Promise(r => setTimeout(r, 100));
  fs.rmSync(path.join(registry(), `${v.pid}.json`), { force: true });
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

/**
 * Serve the folder `target` (or the folder around the file `target`). Without a file, the viewer
 * starts on the diagram picker; with one, it opens that file directly.
 */
/** Whether something already listens on this port on IPv4 or IPv6 loopback. */
async function taken(port: number) {
  for (const host of ['127.0.0.1', '::1']) {
    const busy = await new Promise<boolean>(resolve => {
      const probe = net.createServer();
      probe.once('error', (e: NodeJS.ErrnoException) => resolve(e.code === 'EADDRINUSE'));
      probe.listen(port, host, () => probe.close(() => resolve(false)));
    });
    if (busy) return true;
  }
  return false;
}

/**
 * Listen on 127.0.0.1 and return the port. Another server on `localhost` may hold the same port
 * on IPv6 without blocking an IPv4 listen, and a browser would then reach that server instead,
 * so both loopback addresses are checked first. Without `--port`, the first free port from the
 * default is used; an explicit port that is in use is an error; `--port 0` lets the OS choose.
 */
export async function listen(server: http.Server, options: { port: number; portGiven: boolean }) {
  let port = options.port;
  if (port !== 0) {
    if (options.portGiven && (await taken(port)))
      throw new Error(`Port ${port} is already in use. Pick another with --port, or use --port 0.`);
    if (!options.portGiven) {
      while (port < options.port + 20 && (await taken(port))) port++;
      if (await taken(port)) port = 0;
    }
  }
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return (server.address() as net.AddressInfo).port;
}

export async function openSession(
  target: string,
  options: { port: number; portGiven: boolean; launch: boolean },
) {
  let project = path.dirname(fileURLToPath(import.meta.url));
  while (!fs.existsSync(path.join(project, 'package.json')) && path.dirname(project) !== project)
    project = path.dirname(project);
  const root = path.join(project, 'dist');
  if (!fs.existsSync(path.join(root, 'index.html')))
    throw Error(
      'The viewer assets are missing. Reinstall draftably, or run `pnpm build` in a source checkout.',
    );
  const { root: rootDir, file } = servedAt(target);
  const workspace = createWorkspace(rootDir);
  const server = http.createServer((req, res) => {
    if (workspace.handle(req, res)) return;
    let url: string;
    try {
      url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    } catch {
      res.writeHead(400).end('Invalid URL');
      return;
    }
    const target = path.join(root, url === '/' ? 'index.html' : url);
    if (
      !target.startsWith(root + path.sep) ||
      !fs.existsSync(target) ||
      fs.statSync(target).isDirectory()
    ) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream',
    });
    fs.createReadStream(target).pipe(res);
  });
  let port: number;
  try {
    port = await listen(server, options);
  } catch (error) {
    workspace.close();
    throw error;
  }
  const url = viewerUrl({ port }, file);
  const record = path.join(registry(), `${process.pid}.json`);
  fs.mkdirSync(registry(), { recursive: true });
  fs.writeFileSync(
    record,
    JSON.stringify({
      pid: process.pid,
      port,
      root: workspace.root,
      version: cliVersion(),
      started: new Date().toISOString(),
    } satisfies Viewer),
  );
  process.on('exit', () => fs.rmSync(record, { force: true }));
  console.log(
    `${file ? `Editing ${file}` : 'Diagrams'} in ${workspace.root}\nViewer: ${url}\nPress Ctrl+C to stop.`,
  );
  if (options.launch && process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore' });
  const stop = () => {
    workspace.close();
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  stopWhenIdle(server, workspace.root, stop);
}

/**
 * Stop once the folder is gone, or after `DRAFTABLY_IDLE_MS` (2 hours by default) with no request
 * and no open connection. An open file keeps an event stream connected, so a viewer with a tab
 * open never counts as idle.
 */
function stopWhenIdle(server: http.Server, root: string, stop: () => void) {
  const idle = Number(process.env.DRAFTABLY_IDLE_MS) || 2 * 60 * 60 * 1000;
  const sockets = new Set<net.Socket>();
  let last = Date.now();
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('request', () => (last = Date.now()));
  setInterval(
    () => {
      if (!fs.existsSync(root)) console.log(`Stopping: ${root} no longer exists.`);
      else if (!sockets.size && Date.now() - last > idle)
        console.log(
          `Stopping: unused for ${idle < 60_000 ? `${idle / 1000} seconds` : `${Math.round(idle / 60_000)} minutes`}.`,
        );
      else return;
      stop();
    },
    Math.min(60_000, Math.max(50, idle / 4)),
  );
}
