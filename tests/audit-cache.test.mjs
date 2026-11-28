import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertResults,
  baselineCache,
  clearReports,
  selectedInputs,
} from '../scripts/lib/audit-cache.mjs';

test('failed base removes stale reports and invalid cache; retry rerenders', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cache-test-'));
  const cache = path.join(dir, 'cache');
  const load = at => JSON.parse(fs.readFileSync(path.join(at, 'metrics.json'), 'utf8'));
  const write = metrics => {
    fs.mkdirSync(cache, { recursive: true });
    fs.writeFileSync(path.join(cache, 'summary.md'), 'summary');
    fs.writeFileSync(path.join(cache, 'metrics.json'), JSON.stringify(metrics));
  };
  try {
    fs.writeFileSync(path.join(dir, 'compare.md'), 'old success');
    fs.writeFileSync(path.join(dir, 'coverage.md'), 'old coverage');
    clearReports(dir);
    assert.equal(fs.existsSync(path.join(dir, 'compare.md')), false);
    assert.equal(fs.existsSync(path.join(dir, 'coverage.md')), false);
    await assert.rejects(
      baselineCache(cache, async () => write([{ error: 'SVG failed' }]), load),
      /Baseline contains render errors/,
    );
    assert.equal(fs.existsSync(cache), false);
    let calls = 0;
    assert.equal(
      await baselineCache(
        cache,
        async () => {
          calls++;
          write([{ defectIndex: 1 }]);
        },
        load,
      ),
      false,
    );
    assert.equal(calls, 1);
    assert.equal(
      await baselineCache(
        cache,
        async () => {
          calls++;
        },
        load,
      ),
      true,
    );
    assert.equal(calls, 1);
    write([{ error: 'cached failure' }]);
    assert.equal(
      await baselineCache(
        cache,
        async () => {
          calls++;
          write([{ defectIndex: 1 }]);
        },
        load,
      ),
      false,
    );
    assert.equal(calls, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects missing, duplicated, and partial results on either side', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-input-test-'));
  try {
    fs.mkdirSync(path.join(dir, 'input', 'sample'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'input/sample/v0.draft'), '');
    fs.writeFileSync(path.join(dir, 'input/sample/e1.draft'), '');
    const expected = selectedInputs(path.join(dir, 'input'));
    const complete = [
      { slug: 'sample', file: 'v0.draft' },
      { slug: 'sample', file: 'e1.draft' },
    ];
    assert.doesNotThrow(() => assertResults(complete, expected));
    assert.throws(() => assertResults(complete.slice(0, 1), expected), /selected inputs/);
    assert.throws(() => assertResults([complete[0], complete[0]], expected), /selected inputs/);
    const cache = path.join(dir, 'cache');
    fs.mkdirSync(cache);
    fs.writeFileSync(path.join(cache, 'summary.md'), 'old summary');
    let renders = 0;
    const load = () => assertResults(renders ? complete : complete.slice(0, 1), expected);
    assert.equal(
      await baselineCache(
        cache,
        async () => {
          renders++;
          fs.mkdirSync(cache);
          fs.writeFileSync(path.join(cache, 'summary.md'), 'new');
        },
        load,
      ),
      false,
    );
    assert.equal(renders, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
