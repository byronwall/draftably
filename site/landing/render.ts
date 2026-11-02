import { renderSvg } from '../../src/cli/svg';
import { compile } from '../../src/dsl/compile';
import { projectScene } from '../../src/dsl/project';
import { withState } from '../../src/model/status';

/** Draw `.draft` source as an SVG, in emphasis state `state` when given. Null on errors. */
export async function drawSvg(source: string, state?: string) {
  const scene = await compile(source);
  if (scene.diagnostics.some(d => d.level === 'error')) return null;
  const doc = projectScene(scene);
  return renderSvg(state ? withState(doc, state) : doc);
}

/** Drawings run one at a time, so the hero's first drawing never waits behind them. */
let queue: Promise<unknown> = Promise.resolve();
export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job);
  queue = next.catch(() => undefined);
  return next;
}

/** Run `fn` once, the first time `el` scrolls into view. */
export function whenSeen(el: Element, fn: () => void) {
  const seen = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    seen.disconnect();
    fn();
  });
  seen.observe(el);
  return () => seen.disconnect();
}
