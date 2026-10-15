/**
 * One local `.draft` file shared by the viewer and anyone editing it on disk.
 *
 * The session owns the path: it serves the source with a content revision, watches the folder
 * (so editors that save by renaming a temporary file are seen), pushes changes to the viewer over
 * server-sent events, and writes viewer saves atomically. A save based on an older revision is
 * refused, so neither writer silently erases the other's work.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { compile } from '../dsl/compile';
import { DslError } from '../dsl/syntax';

export interface SessionInfo {
  name: string;
  path: string;
  source: string;
  revision: string;
}

export const revisionOf = (source: string) =>
  createHash('sha256').update(source).digest('hex').slice(0, 16);

export interface FileSession {
  readonly file: string;
  /** Handle `/api/...` requests. Returns false for anything else. */
  handle(req: IncomingMessage, res: ServerResponse): boolean;
  close(): void;
}

export function createFileSession(file: string): FileSession {
  file = path.resolve(file);
  if (!fs.existsSync(file)) throw Error(`No such file: ${file}`);
  const dir = path.dirname(file),
    name = path.basename(file);
  let source = fs.readFileSync(file, 'utf8'),
    revision = revisionOf(source);
  const clients = new Set<ServerResponse>();

  const broadcast = () => {
    const data = JSON.stringify({ source, revision });
    for (const res of clients) res.write(`event: source\ndata: ${data}\n\n`);
  };

  // Writes made here already updated `revision`, so their watcher events are ignored.
  let timer: NodeJS.Timeout | undefined;
  const check = () => {
    let next: string;
    try {
      next = fs.readFileSync(file, 'utf8');
    } catch {
      return; // Mid-replacement; the rename event follows.
    }
    const nextRevision = revisionOf(next);
    if (nextRevision === revision) return;
    source = next;
    revision = nextRevision;
    broadcast();
  };
  const watcher = fs.watch(dir, (_event, changed) => {
    if (changed && changed !== name) return;
    clearTimeout(timer);
    timer = setTimeout(check, 40);
  });
  const heartbeat = setInterval(() => {
    for (const res of clients) res.write(': keep-alive\n\n');
  }, 20_000);

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  const save = (body: string, res: ServerResponse) => {
    let request: { source?: unknown; base?: unknown };
    try {
      request = JSON.parse(body);
    } catch {
      return json(res, 400, { error: 'Expected JSON.' });
    }
    if (typeof request.source !== 'string' || typeof request.base !== 'string')
      return json(res, 400, { error: 'Expected { source, base }.' });
    check(); // Catch an external change the watcher has not reported yet.
    if (request.base !== revision)
      return json(res, 409, { error: 'The file changed on disk.', source, revision });
    try {
      compile(request.source);
    } catch (error) {
      if (error instanceof DslError)
        return json(res, 422, { error: error.message, line: error.line });
      throw error;
    }
    const temporary = path.join(dir, `.${name}.${process.pid}.tmp`);
    try {
      fs.writeFileSync(temporary, request.source);
      source = request.source;
      revision = revisionOf(source);
      fs.renameSync(temporary, file);
    } catch (error) {
      fs.rmSync(temporary, { force: true });
      source = fs.readFileSync(file, 'utf8');
      revision = revisionOf(source);
      return json(res, 500, { error: `Could not write ${name}: ${(error as Error).message}` });
    }
    json(res, 200, { revision });
  };

  return {
    file,
    handle(req, res) {
      const url = (req.url ?? '').split('?')[0];
      if (url === '/api/session' && req.method === 'GET') {
        check();
        json(res, 200, { name, path: file, source, revision } satisfies SessionInfo);
      } else if (url === '/api/source' && req.method === 'PUT') {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', chunk => (body += chunk));
        req.on('end', () => save(body, res));
      } else if (url === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-store',
          connection: 'keep-alive',
        });
        res.write(': connected\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
      } else return false;
      return true;
    },
    close() {
      watcher.close();
      clearInterval(heartbeat);
      clearTimeout(timer);
      for (const res of clients) res.end();
      clients.clear();
    },
  };
}
