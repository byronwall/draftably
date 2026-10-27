import { describe, expect, it } from 'vitest';
import { checkSource, compile } from '../src/dsl/compile';

// A twelve-step pipeline, long enough to fold into rows when it reads right.
const steps = Array.from({ length: 12 }, (_, i) => `s${i}`);
const source = (labels: Record<number, string> = {}) =>
  [
    'diagram "Pipeline" version=1',
    ...steps.map(id => `node ${id} "Step ${id}"`),
    ...steps
      .slice(1)
      .map((id, i) => `edge e${i} ${steps[i]} -> ${id}${labels[i] ? ` "${labels[i]}"` : ''}`),
    'layout root flow direction=right gap=48',
  ].join('\n');

/** Each node's row: the order of its distinct top edge among all rows. */
function rows(src: string) {
  const scene = checkSource(src);
  const ys = [...new Set(steps.map(id => scene.byId.get(id)!.y))].sort((a, b) => a - b);
  return Object.fromEntries(steps.map(id => [id, ys.indexOf(scene.byId.get(id)!.y)]));
}

describe('a relabel keeps the fold', () => {
  const plain = rows(source());

  it('folds the plain pipeline into rows', () => {
    expect(Math.max(...Object.values(plain))).toBeGreaterThan(0);
  });

  it('keeps every step in its row when edges gain labels', () => {
    // Eight labels widen the first rows past the render width; before, they took a fourth row
    // and every step moved.
    const labelled = rows(
      source(Object.fromEntries(steps.slice(1, 9).map((_, i) => [i, 'markdown + source id']))),
    );
    expect(labelled).toEqual(plain);
  });

  it('takes another row only when the labels no longer fit at all', () => {
    const long = 'a label far too long to share a row with its neighbours';
    const labelled = rows(source(Object.fromEntries(steps.slice(1).map((_, i) => [i, long]))));
    expect(Math.max(...Object.values(labelled))).toBeGreaterThan(Math.max(...Object.values(plain)));
  });
});

describe('a relabel keeps a run unfolded', () => {
  // Issue #127: the plan fits the render width, but its labels push the run just past it.
  const flow = [
    'diagram "Refresh" version=1',
    'node source "Source in this refresh"',
    'node listed "Source file listed?" shape=diamond',
    'node check "Check ETag"',
    'node failed "Check failed" shape=pill',
    'node changed "ETag changed?" shape=diamond',
    'node read "Read full version"',
    'node reuse "Reuse cached version"',
    'edge e_source source -> listed',
    'edge e_no listed -> read "no: missing"',
    'edge e_yes listed -> check "yes"',
    'edge e_fail check -> failed "error"',
    'edge e_log failed -> read "log source id"',
    'edge e_ok check -> changed "ETag"',
    'edge e_new changed -> read "yes, or first seen"',
    'edge e_same changed -> reuse "no"',
    'layout root engine=layered direction=right',
  ].join('\n');

  it('keeps a decision flow in one row', async () => {
    const scene = await compile(flow);
    const at = (id: string) => scene.byId.get(id)!;
    for (const [a, b] of [
      ['source', 'listed'],
      ['listed', 'check'],
      ['check', 'changed'],
      ['changed', 'read'],
    ])
      expect(at(b).x).toBeGreaterThan(at(a).x);
  });
});
