import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { EXAMPLES } from '../src/model/examples';
import { createWorkspace, type Workspace } from '../src/server/workspace';

describe('examples', () => {
  it('bundles every examples/*.draft file', () => {
    const files = fs
      .readdirSync(path.join(__dirname, '../examples'))
      .filter(f => f.endsWith('.draft'));
    expect(EXAMPLES.map(e => e.id).sort()).toEqual(files.map(f => f.replace('.draft', '')).sort());
  });

  it('compiles each example without errors and describes it', () => {
    for (const example of EXAMPLES) {
      const scene = compile(example.source);
      expect(
        scene.diagnostics.filter(d => d.level === 'error'),
        example.id,
      ).toEqual([]);
      expect(example.title, example.id).not.toBe(example.id);
      expect(example.summary, example.id).not.toBe('');
    }
  });

  it('covers flat diagrams through deep nesting', () => {
    const depths = new Set(EXAMPLES.map(e => e.depth));
    for (const depth of [0, 1, 2, 3]) expect(depths.has(depth), `depth ${depth}`).toBe(true);
    expect(Math.max(...depths)).toBeGreaterThanOrEqual(5);
  });
});

describe('workspace server', () => {
  let root: string, workspace: Workspace, server: http.Server, base: string;

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-workspace-'));
    fs.mkdirSync(path.join(root, 'docs'));
    fs.mkdirSync(path.join(root, 'node_modules'));
    fs.writeFileSync(path.join(root, 'docs/flow.draft'), 'diagram "Flow" version=1\nnode a "A"\n');
    fs.writeFileSync(path.join(root, 'node_modules/skip.draft'), 'node a "A"\n');
    workspace = createWorkspace(root);
    server = http.createServer((req, res) => {
      if (!workspace.handle(req, res)) res.writeHead(404).end();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterAll(() => {
    workspace.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const create = (body: unknown) =>
    fetch(`${base}/api/workspace/files`, { method: 'POST', body: JSON.stringify(body) });

  it('lists diagrams with titles and skips dependency folders', async () => {
    const info = await (await fetch(`${base}/api/workspace`)).json();
    expect(info.files.map((f: { path: string; title: string }) => [f.path, f.title])).toEqual([
      ['docs/flow.draft', 'Flow'],
    ]);
  });

  it('serves one file session per ?file=', async () => {
    const res = await fetch(`${base}/api/session?file=docs/flow.draft`);
    expect(res.status).toBe(200);
    expect((await res.json()).source).toContain('node a');
    expect((await fetch(`${base}/api/session?file=missing.draft`)).status).toBe(404);
  });

  it('creates new files and refuses to overwrite or leave the folder', async () => {
    const source = 'diagram "New" version=1\nnode start "Start"\n';
    const made = await create({ path: 'new/one.draft', source });
    expect(made.status).toBe(201);
    expect(fs.readFileSync(path.join(root, 'new/one.draft'), 'utf8')).toBe(source);
    expect((await create({ path: 'new/one.draft', source })).status).toBe(409);
    expect((await create({ path: '../escape.draft', source })).status).toBe(400);
    expect((await create({ path: 'notes.txt', source })).status).toBe(400);
    expect((await create({ path: 'bad.draft', source: 'node' })).status).toBe(422);
    expect((await fetch(`${base}/api/session?file=../escape.draft`)).status).toBe(404);
  });
});
