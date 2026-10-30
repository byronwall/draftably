import { expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { findExample } from '../src/model/examples';
import { moveObject } from '../site/live/move';

// The landing page's live diagram saves a drag into the source; the redrawn object must sit where
// it was dropped, or the drag was not faithful.
it.each([
  ['checkout', 'db', 120, 160],
  ['checkout', 'services', 60, 90],
  ['support-triage', 'outage', 40, -30],
])('%s: moving %s draws it where it was dropped', async (example, id, dx, dy) => {
  const source = findExample(example)!.source;
  const scene = await compile(source);
  const was = scene.byId.get(id)!;
  const next = await moveObject(source, scene, id, dx, dy);
  expect(next).not.toBeNull();
  expect(next).not.toBe(source);
  const drawn = (await compile(next!)).byId.get(id)!;
  expect(Math.abs(drawn.x - (was.x + dx))).toBeLessThanOrEqual(1);
  expect(Math.abs(drawn.y - (was.y + dy))).toBeLessThanOrEqual(1);
});
