import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { main } from '../src/cli/main';
import { checkSource } from '../src/dsl/compile';

it('imports DOT to a new native file without changing or overwriting the input', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-import-'));
  try {
    const input = path.join(dir, 'graph.dot');
    const output = path.join(dir, 'graph.draft');
    const source = 'graph G { node [shape=box]; a -- b [label="shared"]; }';
    fs.writeFileSync(input, source);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await main(['import', input, '--output', output])).toBe(0);
    const result = checkSource(fs.readFileSync(output, 'utf8'));
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].directed).toBe(false);
    expect(fs.readFileSync(input, 'utf8')).toBe(source);
    expect(await main(['import', input, '--output', output])).toBe(1);
    expect(await main(['import', input, '--output', input])).toBe(1);
    expect(fs.readFileSync(input, 'utf8')).toBe(source);
  } finally {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

it('requires acceptance of losses and leaves no output after a failed conversion', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-import-'));
  try {
    const input = path.join(dir, 'graph.dot');
    const output = path.join(dir, 'graph.draft');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fs.writeFileSync(input, 'digraph { a -> b }'); // Default ellipses become native pills.
    expect(await main(['import', input, '--output', output])).toBe(1);
    expect(fs.existsSync(output)).toBe(false);
    expect(await main(['import', input, '--output', output, '--accept-lossy'])).toBe(0);
    fs.unlinkSync(output);
    fs.writeFileSync(input, 'digraph { a -> }');
    expect(await main(['import', input, '--output', output, '--accept-lossy'])).toBe(1);
    expect(fs.existsSync(output)).toBe(false);
  } finally {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
