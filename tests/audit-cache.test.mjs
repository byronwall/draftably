import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { baselineCache, clearReports } from '../scripts/lib/audit-cache.mjs';

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
    clearReports(dir);
    assert.equal(fs.existsSync(path.join(dir, 'compare.md')), false);
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
