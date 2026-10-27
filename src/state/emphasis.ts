/**
 * Which emphasis state the viewer draws, and whether it shows all of them as a grid. Both are
 * view state, like the camera: they live in the URL (`?state=write`), never in the file.
 */
import { createRoot, createSignal } from 'solid-js';
import { withState } from '../model/status';
import { doc } from './document';

const state = createRoot(() => {
  const [active, setActive] = createSignal<string | null>(
    new URLSearchParams(location.search).get('state'),
  );
  const [grid, setGrid] = createSignal(false);
  return { active, setActive, grid, setGrid };
});

/** The file's states, in file order. */
export const states = () => doc.appearance.states ?? [];

/** The drawn state's ID, or null for none; a stale ID from the URL counts as none. */
export const activeState = () => {
  const id = state.active();
  return id && states().some(s => s.id === id) ? id : null;
};

export const gridOpen = state.grid;
export const setGridOpen = state.setGrid;

export function showState(id: string | null) {
  state.setActive(id);
  const url = new URL(location.href);
  if (id) url.searchParams.set('state', id);
  else url.searchParams.delete('state');
  history.replaceState(history.state, '', url);
}

/** Step through None and each state in file order; false when the file has none. */
export function stepState(by: 1 | -1) {
  const ids = [null, ...states().map(s => s.id)];
  if (ids.length < 2) return false;
  showState(ids[(ids.indexOf(activeState()) + by + ids.length) % ids.length]);
  return true;
}

/** The document as the canvas draws it: in the active state, or as it is. */
export const drawnDoc = () => {
  const id = activeState();
  return id ? withState(doc, id) : doc;
};
