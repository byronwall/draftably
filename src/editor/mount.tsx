import { createEffect, createMemo, on } from 'solid-js';
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
import { findEdge, findNode, isGroup, objectRect } from '../model/graph';
import { placedItems, type Geometry } from '../runtime/geometry';
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
  /** The selection changed, by the user or through `select()`. */
  select: { ids: readonly string[]; reason: 'user' | 'api' };
  /** A right-click; `id` is null on the background. The editor shows no menu of its own. */
  contextmenu: {
    id: string | null;
    kind?: 'node' | 'group' | 'edge';
    clientX: number;
    clientY: number;
    preventDefault(): void;
  };
}

/** An editor update's outcome. The editor draws in its own session, so it has no SVG value. */
export type EditorUpdateResult = { status: 'committed' | 'error' | 'destroyed'; revision: number };

/** The editor's handle: the viewer's camera, plus editing. */
export interface MountedEditor {
  /** Resolves once the first text is drawn. */
  readonly ready: Promise<EditorUpdateResult>;
  /** The text as the editor holds it now. */
  source(): string;
  /** Show text the host changed. Resolves once it is drawn. */
  update(source: string): Promise<EditorUpdateResult>;
  /** Where each item is drawn, in world units: the viewer's shapes. The same object for one revision. */
  geometry(): Geometry | null;
  /** Select these items (unknown IDs are dropped); `[]` clears the selection. */
  select(ids: readonly string[]): void;
  selection(): readonly string[];
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
  let revision = 0;
  const ready: Promise<EditorUpdateResult> = session
    .openSource(options.source, options.onChange)
    .then(() => {
      opened = true;
      if (destroyed) return;
      firstFit = requestAnimationFrame(() => {
        session.fitView();
        if (pendingMove) whenSized(pendingMove);
      });
    })
    .then(
      () => ({ status: destroyed ? 'destroyed' : 'committed', revision: ++revision }) as const,
      () => ({ status: 'error', revision: ++revision }) as const,
    );
  let latest = ready;

  /** Geometry, rebuilt when the drawing's boxes or routes change. */
  let geometryRevision = 0;
  let selectReason: 'user' | 'api' = 'user';
  const kindOf = (id: string) =>
    findNode(session.doc, id)
      ? ('node' as const)
      : isGroup(session.doc, id)
        ? ('group' as const)
        : findEdge(session.doc, id)
          ? ('edge' as const)
          : undefined;

  // --- The host's camera: the viewer's shape and rules -----------------------------------------
  const listeners = new Map<keyof EditorEvents, Set<(event: never) => void>>();
  const emit = <K extends keyof EditorEvents>(type: K, event: EditorEvents[K]) => {
    for (const listener of listeners.get(type) ?? []) {
      try {
        (listener as (value: EditorEvents[K]) => void)(event);
      } catch {
        // One listener's error does not stop the others.
      }
    }
  };
  let cameraReason: CameraReason = 'user',
    cameraFrame = 0;
  const stopCamera = session.onCamera(reason => {
    cameraReason = reason;
    if (cameraFrame) return;
    cameraFrame = requestAnimationFrame(() => {
      cameraFrame = 0;
      emit('camera', {
        camera: toCamera(session.doc.camera, session.stageSize()),
        reason: cameraReason,
      });
    });
  });
  let pendingMove: ((view: View) => MoveResult) | undefined;
  let geometryNow: () => Geometry = () => null as never;
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
  /** Any item's box in world units: a node or group's rectangle, or an edge's route and label. */
  const boxOf = (id: string) => {
    if (session.doc.layout.nodes[id] || isGroup(session.doc, id))
      return toBox(objectRect(session.doc, session.geometry, id));
    const route = session.routesById().get(id);
    if (!route) return undefined;
    const boxes = route.points.map(p => ({ x: p.x, y: p.y, width: 0, height: 0 }));
    if (route.label)
      boxes.push({
        x: route.label.x - route.label.w / 2,
        y: route.label.y - route.label.h / 2,
        width: route.label.w,
        height: route.label.h,
      });
    return unionBox(boxes);
  };
  // The first editor on a page is active until another one is used.
  if (!hasActiveSession()) setActiveSession(session);

  const dispose = render(() => {
    createEffect(() =>
      host.style.setProperty('--diagram-canvas', resolveAppearance(session.doc.appearance).canvas),
    );
    const drawn = createMemo(() => {
      const f = session.viewerFrame();
      return {
        revision: ++geometryRevision,
        frame: { x: f.x, y: f.y, width: f.w, height: f.h },
        ...placedItems(session.doc, session.sceneRects(), session.routes()),
      };
    });
    geometryNow = drawn;
    // Every selection change is reported once, with who made it.
    createEffect(
      on(
        session.selection,
        set => {
          emit('select', { ids: [...set], reason: selectReason });
          selectReason = 'user';
        },
        { defer: true },
      ),
    );
    // A fit or reveal asked for before the canvas had a size runs once it has one.
    createEffect(() => {
      const view = session.stageSize();
      if (pendingMove && view.width > 1 && view.height > 1) whenSized(pendingMove);
    });
    return (
      <Editor
        session={session}
        onContextMenu={e => {
          const id =
            (eventTarget(e) as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id') ??
            null;
          const kind = id ? kindOf(id) : undefined;
          emit('contextmenu', {
            id: kind ? id : null,
            ...(kind ? { kind } : {}),
            clientX: e.clientX,
            clientY: e.clientY,
            preventDefault: () => {},
          });
        }}
      />
    );
  }, host);
  host.classList.add('draft-editor');
  if (!mounted++)
    for (const [type, fn, capture] of KEYS) document.addEventListener(type, fn, capture);

  const handle: MountedEditor = {
    get ready() {
      return latest;
    },
    source: session.currentSource,
    update(next) {
      latest = session.receiveSource(next).then(
        () => ({ status: destroyed ? 'destroyed' : 'committed', revision: ++revision }) as const,
        () => ({ status: 'error', revision: ++revision }) as const,
      );
      return latest;
    },
    geometry: () => (destroyed || !opened ? null : geometryNow()),
    select(ids) {
      if (destroyed) return;
      selectReason = 'api';
      session.setSelection(ids);
      // An unchanged selection fires no effect; the next user change must not read as api.
      queueMicrotask(() => (selectReason = 'user'));
    },
    selection: () => session.selectedIds(),
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
    on(type, listener) {
      if (destroyed) return () => {};
      const set = listeners.get(type) ?? new Set();
      set.add(listener as (event: never) => void);
      listeners.set(type, set);
      return () => set.delete(listener as (event: never) => void);
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
export type { Box, EdgeOut, Geometry, PlacedBox } from '../runtime/geometry';
export { ZOOM_MAX, ZOOM_MIN } from '../runtime/camera';
