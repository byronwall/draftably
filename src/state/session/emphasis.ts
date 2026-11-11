/**
 * Which emphasis state the viewer draws, and whether it shows all of them as a grid. Both are
 * view state, like the camera: they live in the URL (`?state=write`), never in the file.
 */
import { createSignal } from 'solid-js';
import { forScheme } from '../../model/appearance';
import { withState } from '../../model/status';
import type { DocumentPart } from './document';

export function createEmphasis(s: DocumentPart) {
  const state = (() => {
    const [active, setActive] = createSignal<string | null>(
      s.options.urlState ? new URLSearchParams(location.search).get('state') : null,
    );
    const [grid, setGrid] = createSignal(false);
    return { active, setActive, grid, setGrid };
  })();

  /** The file's states, in file order. */
  const states = () => s.doc.appearance.states ?? [];

  /** The drawn state's ID, or null for none; a stale ID from the URL counts as none. */
  const activeState = () => {
    const id = state.active();
    return id && states().some(s => s.id === id) ? id : null;
  };

  const gridOpen = state.grid;
  const setGridOpen = state.setGrid;

  function showState(id: string | null) {
    state.setActive(id);
    if (!s.options.urlState) return;
    const url = new URL(location.href);
    if (id) url.searchParams.set('state', id);
    else url.searchParams.delete('state');
    history.replaceState(history.state, '', url);
  }

  /** Step through None and each state in file order; false when the file has none. */
  function stepState(by: 1 | -1) {
    const ids = [null, ...states().map(s => s.id)];
    if (ids.length < 2) return false;
    showState(ids[(ids.indexOf(activeState()) + by + ids.length) % ids.length]);
    return true;
  }

  /** The page around the editor is dark: a file without a theme line draws dark too. */
  const [dark, setDark] = createSignal(false);
  /** The appearance the canvas draws: the file's own, or its dark variant on a dark page. */
  const drawnAppearance = () => forScheme(s.doc.appearance, dark());
  /** The document as the canvas draws it: in the active state, or as it is, in the page's scheme. */
  const drawnDoc = () => {
    const id = activeState(),
      doc = id ? withState(s.doc, id) : s.doc,
      appearance = forScheme(doc.appearance, dark());
    return appearance === doc.appearance ? doc : { ...doc, appearance };
  };
  return {
    states,
    activeState,
    gridOpen,
    setGridOpen,
    showState,
    stepState,
    drawnDoc,
    dark,
    setDark,
    drawnAppearance,
  };
}

export type EmphasisPart = ReturnType<typeof createEmphasis>;
