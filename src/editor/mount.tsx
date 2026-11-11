import { createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { registerFonts } from '../lib/font-data';
import { resolveAppearance } from '../model/appearance';
import { hasActiveSession, releaseActiveSession, setActiveSession } from '../state/active-session';
import { eventTarget } from '../state/dom-root';
import { copyShapes, handleCanvasKey, handleKeyUp, pasteShapes } from '../state/canvas-keyboard';
import { createDiagramSession, type DiagramSession, type SessionOptions } from '../state/session';
import { Editor } from './Editor';
import '../styles/app.css';

/**
 * Shortcuts act on the session the user last pointed at. Clicking a shape leaves focus on the
 * page, so they listen on the document, once for all editors, and skip keys meant for the host's
 * own controls. A key on the page body reaches an editor only while the user's last pointer press
 * was inside one; a press on the page outside every editor ends that.
 */
let engaged = false;
const inEditor = (e: Event) =>
  e.composedPath().some(n => n instanceof Element && n.classList.contains('draft-editor'));
const forEditor =
  <E extends Event>(handle: (e: E) => unknown) =>
  (e: Event) => {
    if (!hasActiveSession()) return;
    const target = eventTarget(e) as Element;
    if ((target === document.body && engaged) || target.closest?.('.draft-editor'))
      void handle(e as E);
  };
const KEYS: Array<[string, (e: Event) => void, boolean?]> = [
  ['pointerdown', (e: Event) => (engaged = inEditor(e)), true],
  ['keydown', forEditor(handleCanvasKey)],
  ['keyup', forEditor(handleKeyUp)],
  ['copy', forEditor(copyShapes)],
  ['paste', forEditor(pasteShapes)],
];
let mounted = 0;

/** The options a host sets on `<draft-editor>`: every mount option but the text and `onChange`. */
export type EditorOptions = Pick<
  SessionOptions,
  'storageKey' | 'openLink' | 'confirm' | 'onInteract'
>;

export interface MountOptions extends EditorOptions {
  /** The `.draft` text to edit. */
  source: string;
  /** Receives the new text after every kept edit, undo and redo. */
  onChange?: (source: string) => void;
}

export interface MountedEditor {
  session: DiagramSession;
  /** Resolves once the first text is drawn. */
  readonly ready: Promise<void>;
  /** The text as the editor holds it now. */
  source(): string;
  /** Show text the host changed. Resolves once it is drawn. */
  update(source: string): Promise<void>;
  /** Remove the editor and stop its session. */
  destroy(): void;
}

/**
 * Edit one diagram inside `host`: the canvas with selection, dragging, inline editing and its
 * shortcuts. Each edit is written back to the source and reported through `onChange`. Give the
 * host a size; the canvas fills it.
 */
export function mountEditor(host: HTMLElement, options: MountOptions): MountedEditor {
  // The session reads options when it needs them, so getters on `options` stay live.
  const session = createDiagramSession(options);
  registerFonts();
  let destroyed = false,
    firstFit = 0;
  const ready = session.openSource(options.source, options.onChange).then(() => {
    if (!destroyed) firstFit = requestAnimationFrame(session.fitView);
  });
  // The first editor on a page is active until another one is used.
  if (!hasActiveSession()) setActiveSession(session);

  const dispose = render(() => {
    createEffect(() =>
      host.style.setProperty('--diagram-canvas', resolveAppearance(session.doc.appearance).canvas),
    );
    return <Editor session={session} />;
  }, host);
  host.classList.add('draft-editor');
  if (!mounted++)
    for (const [type, fn, capture] of KEYS) document.addEventListener(type, fn, capture);

  return {
    session,
    ready,
    source: session.currentSource,
    update: async next => void (await session.receiveSource(next)),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(firstFit);
      if (!--mounted)
        for (const [type, fn, capture] of KEYS) document.removeEventListener(type, fn, capture);
      releaseActiveSession(session);
      session.cancelLayout();
      session.closeFileSession();
      dispose();
      session.dispose();
      host.classList.remove('draft-editor');
    },
  };
}
