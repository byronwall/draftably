import { createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { registerFonts } from '../lib/font-data';
import { resolveAppearance } from '../model/appearance';
import { hasActiveSession, releaseActiveSession, setActiveSession } from '../state/active-session';
import { eventTarget } from '../state/dom-root';
import { copyShapes, handleCanvasKey, handleKeyUp, pasteShapes } from '../state/canvas-keyboard';
import { createDiagramSession, type SessionOptions } from '../state/session';
import {
  clampZoom,
  fitCamera,
  revealCamera,
  sameCamera,
  unionBox,
  type Camera,
  type CameraReason,
  type FrameOptions,
  type MoveResult,
} from '../runtime/camera';
import { objectRect } from '../model/graph';
import { Editor } from './Editor';
import { sessions } from './internal';
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

/** What `on` reports. `camera` comes at most once per animation frame. */
export interface EditorEvents {
  camera: { camera: Camera; reason: CameraReason };
}

/** The editor's handle: the viewer's camera, plus editing. */
export interface MountedEditor {
  /** Resolves once the first text is drawn. */
  readonly ready: Promise<void>;
  /** The text as the editor holds it now. */
  source(): string;
  /** Show text the host changed. Resolves once it is drawn. */
  update(source: string): Promise<void>;
  getCamera(): Camera;
  /** Zoom is clamped to `ZOOM_MIN`–`ZOOM_MAX`, as in the viewer. */
  setCamera(camera: Camera): void;
  /** Frame these items, or the whole drawing without ids. At most actual size by default. */
  fit(ids?: readonly string[], options?: FrameOptions): MoveResult;
  /** The least move that shows the item; zooms out only if it does not fit. */
  reveal(id: string, options?: FrameOptions): MoveResult;
  on<K extends keyof EditorEvents>(type: K, listener: (event: EditorEvents[K]) => void): () => void;
  /** Remove the editor and stop its session. Safe to call twice. */
  destroy(): void;
}

type View = { width: number; height: number };
/** The editor keeps `{ x, y, k }` (the screen offset of the world origin) inside; hosts see `Camera`. */
const toCamera = (c: { x: number; y: number; k: number }, view: View): Camera => ({
  centerX: (view.width / 2 - c.x) / c.k,
  centerY: (view.height / 2 - c.y) / c.k,
  zoom: c.k,
});
const fromCamera = (c: Camera, view: View) => ({
  x: view.width / 2 - c.centerX * c.zoom,
  y: view.height / 2 - c.centerY * c.zoom,
  k: c.zoom,
});
const toBox = (r: { x: number; y: number; w: number; h: number }) => ({
  x: r.x,
  y: r.y,
  width: r.w,
  height: r.h,
});

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
    opened = false,
    firstFit = 0;
  const ready = session.openSource(options.source, options.onChange).then(() => {
    opened = true;
    if (destroyed) return;
    firstFit = requestAnimationFrame(() => {
      session.fitView();
      if (pendingMove) whenSized(pendingMove);
    });
  });

  // --- The host's camera: the viewer's shape and rules -----------------------------------------
  const listeners = new Set<(event: EditorEvents['camera']) => void>();
  let cameraReason: CameraReason = 'user',
    cameraFrame = 0;
  const stopCamera = session.onCamera(reason => {
    cameraReason = reason;
    if (cameraFrame) return;
    cameraFrame = requestAnimationFrame(() => {
      cameraFrame = 0;
      const event = {
        camera: toCamera(session.doc.camera, session.stageSize()),
        reason: cameraReason,
      };
      for (const listener of listeners) {
        try {
          listener(event);
        } catch {
          // One listener's error does not stop the others.
        }
      }
    });
  });
  let pendingMove: ((view: View) => MoveResult) | undefined;
  /** Run now, or once the editor has drawn and the canvas has a size; the latest call wins. */
  const whenSized = (run: (view: View) => MoveResult): MoveResult => {
    if (destroyed) return 'unchanged';
    const view = session.stageSize();
    if (!opened || view.width <= 1 || view.height <= 1) {
      pendingMove = run;
      return 'pending';
    }
    pendingMove = undefined;
    return run(view);
  };
  const moveTo = (camera: Camera, view: View, reason: CameraReason): MoveResult => {
    const next = fromCamera({ ...camera, zoom: clampZoom(camera.zoom) }, view),
      c = session.doc.camera;
    if (sameCamera(toCamera(c, view), toCamera(next, view))) return 'unchanged';
    session.setCamera(next, reason);
    return 'moved';
  };
  const boxOf = (id: string) =>
    session.doc.layout.nodes[id] ? toBox(objectRect(session.doc, session.geometry, id)) : undefined;
  // The first editor on a page is active until another one is used.
  if (!hasActiveSession()) setActiveSession(session);

  const dispose = render(() => {
    createEffect(() =>
      host.style.setProperty('--diagram-canvas', resolveAppearance(session.doc.appearance).canvas),
    );
    // A fit or reveal asked for before the canvas had a size runs once it has one.
    createEffect(() => {
      const view = session.stageSize();
      if (pendingMove && view.width > 1 && view.height > 1) whenSized(pendingMove);
    });
    return <Editor session={session} />;
  }, host);
  host.classList.add('draft-editor');
  if (!mounted++)
    for (const [type, fn, capture] of KEYS) document.addEventListener(type, fn, capture);

  const handle: MountedEditor = {
    ready,
    source: session.currentSource,
    update: async next => void (await session.receiveSource(next)),
    getCamera: () => toCamera(session.doc.camera, session.stageSize()),
    setCamera(camera) {
      if (
        destroyed ||
        !Number.isFinite(camera.centerX) ||
        !Number.isFinite(camera.centerY) ||
        !Number.isFinite(camera.zoom) ||
        camera.zoom <= 0
      )
        return;
      moveTo(camera, session.stageSize(), 'api');
    },
    fit: (ids, frameOptions) =>
      whenSized(view => {
        const box = ids
          ? unionBox(ids.flatMap(id => boxOf(id) ?? []))
          : toBox(session.viewerFrame());
        return box ? moveTo(fitCamera(box, view, frameOptions), view, 'api') : 'missing';
      }),
    reveal: (id, frameOptions) =>
      whenSized(view => {
        const box = boxOf(id);
        return box
          ? moveTo(revealCamera(handle.getCamera(), box, view, frameOptions), view, 'api')
          : 'missing';
      }),
    on(_type, listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pendingMove = undefined;
      cancelAnimationFrame(firstFit);
      cancelAnimationFrame(cameraFrame);
      stopCamera();
      listeners.clear();
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
  sessions.set(handle, session);
  return handle;
}

export type { Camera, CameraReason, FrameOptions, MoveResult } from '../runtime/camera';
export { ZOOM_MAX, ZOOM_MIN } from '../runtime/camera';
