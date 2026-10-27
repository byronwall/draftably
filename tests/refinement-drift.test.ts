import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli/main';
import { checkSource, compile } from '../src/dsl/compile';

afterEach(() => vi.restoreAllMocks());

const flow = (extra: string[]) =>
  [
    'diagram "Drift" version=1',
    'node a "Collect the inputs"',
    'node b "Build the package"',
    'node c "Publish"',
    'edge e1 a -> b',
    'edge e2 b -> c',
    'layout root flow direction=right gap=48',
    ...extra,
  ].join('\n');

// Written for narrower boxes: the size line widens a, so c and b no longer fit where they were put.
const drifted = ['near c a side=below gap=4', 'stay b x=60 y=0', 'size a width=120 height=auto'];

describe('refinements that drift', () => {
  it('warns when a refinement gives way by more than a few pixels', async () => {
    const notes = (await compile(flow(drifted))).diagnostics.filter(d => d.code === 'relaxed');
    expect(notes.map(d => [d.line, d.level])).toEqual([
      [9, 'warning'],
      [8, 'warning'],
    ]);
    expect(notes[0].message).toContain('format --drop-stale');
    // A few pixels of settling stays a note.
    const small = (await compile(flow(['stay b x=60 y=0']))).diagnostics.find(
      d => d.code === 'relaxed',
    );
    expect(small?.level).toBe('info');
  });

  it('format --drop-stale removes those lines and keeps the rest', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-drift-')), 'd.draft');
    fs.writeFileSync(file, flow(drifted));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await main(['format', file, '--drop-stale', '--write'])).toBe(0);
    const kept = fs.readFileSync(file, 'utf8');
    expect(kept).not.toMatch(/near c|stay b/);
    expect(kept).toContain('size a width=120 height=auto');
    expect((await compile(kept)).diagnostics.filter(d => d.level === 'warning')).toEqual([]);
  });

  it('size height=auto fits the title at the given width', () => {
    const long = 'node a "Collect the inputs from every upstream service"';
    const at = (size: string) =>
      checkSource(flow([size]).replace('node a "Collect the inputs"', long)).byId.get('a')!;
    const auto = at('size a width=120 height=auto'),
      fixed = at('size a width=120 height=40');
    expect(auto.w).toBe(120);
    expect(auto.h).toBeGreaterThan(fixed.h);
    expect(
      checkSource(flow(['size a width=120 height=auto'])).diagnostics.some(
        d => d.code === 'text-overflow',
      ),
    ).toBe(false);
  });
});
