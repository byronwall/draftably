/**
 * Portable validation of emitted native fixture source against a chosen draftably checkout.
 * It reads .expected.json and .draft only; it never invokes Mermaid, DOT, D2, or resource loaders.
 *
 * DRAFTABLY_ROOT=/absolute/path/to/draftably node --import tsx native-validation.ts
 * DRAFTABLY_ROOT=/path/to/patched-copy DRAFTABLY_APPLIED_REQUIREMENTS=IMP-02-native-undirected \
 *   node --import tsx native-validation.ts
 *
 * Default uses checkSource + projectScene. DRAFTABLY_FULL_LAYOUT=1 runs compile + projectScene.
 * A declared prerequisite is not assumed installed: mismatched native facts still fail validation.
 */
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ImportResult, NativePlan } from './import-core.js';

interface Scene {
  diagnostics: Array<{ level: string; code?: string; message: string }>;
  model: { layouts: Array<{ scope: string; algorithm: string; direction?: string }> };
}
interface DocumentFacts {
  graph: {
    nodes: Array<{ id: string; title: string; parentId?: string }>;
    groups: Array<{ id: string; title: string; parentId?: string }>;
    edges: Array<{ id: string; from: string; to: string; label: string; directed: boolean; dashed: boolean }>;
  };
  styles: Record<string, { shape: string; color: string; shade?: number }>;
  appearance: { colors: Array<{ family: string; shade: number; fill?: string; stroke?: string; ink?: string }> };
}
interface CompilerModule {
  checkSource: (source: string) => Scene;
  compile: (source: string) => Promise<Scene>;
}
interface ProjectModule { projectScene: (scene: Scene) => DocumentFacts; }

const selectedRoot = process.env.DRAFTABLY_ROOT;
if (!selectedRoot) throw new Error('Set DRAFTABLY_ROOT to the draftably checkout or source copy to validate. See this file\'s run-sheet comment.');
const root = resolve(selectedRoot);
const compiler = await import(pathToFileURL(join(root, 'src/dsl/compile.ts')).href) as CompilerModule;
const projector = await import(pathToFileURL(join(root, 'src/dsl/project.ts')).href) as ProjectModule;
if (typeof compiler.checkSource !== 'function' || typeof projector.projectScene !== 'function') {
  throw new Error('The selected checkout does not expose checkSource and projectScene at the expected native integration boundary.');
}
const applied = new Set((process.env.DRAFTABLY_APPLIED_REQUIREMENTS ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const fullLayout = process.env.DRAFTABLY_FULL_LAYOUT === '1';
const directory = dirname(fileURLToPath(import.meta.url));
const kit = basename(directory) === 'dist' ? dirname(directory) : directory;
const fixtures = join(kit, 'fixtures');
async function expectedFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await expectedFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.expected.json')) files.push(path);
  }
  return files;
}
async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

function compareFacts(scene: Scene, diagram: DocumentFacts, facts: NativePlan) {
  assert.deepEqual(scene.diagnostics.filter((d) => d.level === 'error'), [], 'Native compiler reported errors.');
  const nodes = new Map(diagram.graph.nodes.map((n) => [n.id, n]));
  const groups = new Map(diagram.graph.groups.map((g) => [g.id, g]));
  const objects = new Map([...nodes, ...groups]);
  assert.equal(objects.size, facts.objects.length, 'Native object count changed.');
  assert.equal(diagram.graph.nodes.length, facts.objects.filter((o) => o.kind === 'node').length);
  assert.equal(diagram.graph.groups.length, facts.objects.filter((o) => o.kind === 'group').length);
  for (const object of facts.objects) {
    const got = (object.kind === 'node' ? nodes : groups).get(object.id);
    assert.ok(got, 'Missing or wrong-kind object ' + object.id);
    assert.equal(got.title, object.label, object.id + ' label');
    assert.equal(got.parentId, object.parent, object.id + ' parent');
    if (object.kind === 'node') assert.equal(diagram.styles[object.id]?.shape, object.shape ?? 'box', object.id + ' shape');
    if (object.color) {
      assert.equal(diagram.styles[object.id]?.color, object.color, object.id + ' color');
      assert.equal(diagram.styles[object.id]?.shade, object.shade ?? 500, object.id + ' shade');
    }
  }
  assert.equal(diagram.graph.edges.length, facts.edges.length, 'Native edge occurrence count changed.');
  const edges = new Map(diagram.graph.edges.map((e) => [e.id, e]));
  assert.equal(edges.size, facts.edges.length, 'Native edge identities collapsed.');
  for (const edge of facts.edges) {
    const got = edges.get(edge.id);
    assert.ok(got, 'Missing edge ' + edge.id);
    assert.deepEqual([got.from, got.to, got.label, got.directed, got.dashed],
      [edge.from, edge.to, edge.label, edge.directed, edge.dashed ?? false], edge.id + ' graph facts');
  }
  for (const color of facts.colors) {
    const got = diagram.appearance.colors.find((c) => c.family === color.name && c.shade === 500);
    assert.ok(got, 'Missing theme color ' + color.name);
    // Native parsing canonicalizes hex case; compare color values, not lexical spelling.
    assert.deepEqual([got.fill, got.stroke, got.ink].map((value) => value?.toLowerCase()),
      [color.fill, color.stroke, color.ink].map((value) => value.toLowerCase()));
  }
  for (const layout of facts.layouts) {
    const got = scene.model.layouts.find((l) => l.scope === layout.scope);
    assert.ok(got, 'Missing layout scope ' + layout.scope);
    assert.equal(got.algorithm, layout.kind, layout.scope + ' layout algorithm');
    if (layout.direction) assert.equal(got.direction, layout.direction, layout.scope + ' layout direction');
  }
}

const files = await expectedFiles(fixtures);
assert.ok(files.length, 'No checked-in expected fixture JSON was found.');
let passed = 0, rejected = 0, skipped = 0, failed = 0;
console.log('[native validation]', JSON.stringify({ root, fullLayout, applied: [...applied], expectedFiles: files.length }));
for (const file of files) {
  const name = relative(fixtures, file).replace(/\.expected\.json$/, '');
  try {
    const expected = JSON.parse(await readFile(file, 'utf8')) as Partial<ImportResult>;
    const draftPath = file.replace(/\.expected\.json$/, '.draft');
    if (expected.status === 'failed') {
      assert.equal(expected.nativeSource, undefined, 'Failed fixture contains native source.');
      assert.equal(expected.facts, undefined, 'Failed fixture contains graph facts.');
      assert.equal(await exists(draftPath), false, 'Failed fixture has a stale .draft file.');
      assert.ok(expected.diagnostics?.some((d) => d.severity === 'error'), 'Failed fixture has no error diagnostic.');
      rejected++;
      console.log('[PASS rejection]', name);
      continue;
    }
    assert.ok(['ready', 'needs-review'].includes(expected.status ?? ''), 'Unknown fixture status.');
    assert.ok(expected.nativeSource && expected.facts, 'Successful fixture lacks source/facts.');
    const source = await readFile(draftPath, 'utf8');
    assert.equal(source, expected.nativeSource, 'Native .draft and expected JSON differ.');
    const missing = (expected.requires ?? []).filter((r) => !applied.has(r));
    if (missing.length) {
      skipped++;
      console.log('[SKIP prerequisite]', name, missing.join(', '));
      continue;
    }
    const scene = fullLayout ? await compiler.compile(source) : compiler.checkSource(source);
    compareFacts(scene, projector.projectScene(scene), expected.facts);
    passed++;
    console.log('[PASS native facts]', name);
  } catch (error) {
    failed++;
    console.error('[FAIL]', name, error instanceof Error ? error.stack : String(error));
  }
}
console.log('[native validation summary]', JSON.stringify({ passed, rejected, skipped, failed, total: files.length }));
if (failed) process.exitCode = 1;
