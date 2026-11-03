import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderCell } from './render.mjs';

test('failed native attempts retain diagnostics and cannot be overwritten', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'diagram-eval-'));
  try {
    const sourcePath = path.join(dir, 'source.txt');
    const outputDir = path.join(dir, 'attempt');
    await fs.writeFile(sourcePath, 'example\n');
    const result = await renderCell({ tool: 'unknown', sourcePath, outputDir });
    assert.equal(result.status, 'failed');
    assert.match(result.error, /Unknown tool/);
    assert.equal(result.sourceBytes, 8);
    assert.equal(result.sourceLines, 1);
    const before = await fs.readFile(path.join(outputDir, 'render.json'), 'utf8');
    await assert.rejects(
      renderCell({ tool: 'unknown', sourcePath, outputDir }),
      /Attempt already exists/,
    );
    assert.equal(await fs.readFile(path.join(outputDir, 'render.json'), 'utf8'), before);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
