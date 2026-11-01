/** Panels, menus and dialogs. Panel visibility is remembered per browser. */
import { createEffect, createRoot, createSignal } from 'solid-js';
import { workspace } from './launch';

const UI_STORAGE = 'diagram-studio-v5-ui';

export type MenuId =
  | 'file'
  | 'edit'
  | 'view'
  | 'layout'
  | 'help'
  | 'export'
  | 'routing'
  | 'context'
  | 'appearance'
  | 'tools';
export type DialogId = 'help' | 'palette' | 'quick-build' | 'confirm' | 'error' | 'export';

export interface MenuState {
  id: MenuId;
  /** Element the menu is anchored to, or a point for context menus. */
  anchor: HTMLElement | { x: number; y: number };
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

const compactPanels = matchMedia('(max-width: 1100px)');

const SIDEBAR_WIDTH = 264;
const INSPECTOR_WIDTH = 280;
const MIN_PANEL = 200;
/** The canvas keeps at least this much of the window, whatever the panels ask for. */
const MIN_CANVAS = 360;

const clampPanel = (width: number) =>
  Math.round(Math.max(MIN_PANEL, Math.min(width, Math.min(640, innerWidth - MIN_CANVAS))));

function readPanels() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE) || 'null');
    const right = saved?.rightClosed === false;
    const files = saved?.filesClosed !== true && !(compactPanels.matches && right);
    return {
      // The two left panels share one sidebar. The files tab wins only with a folder to list.
      left: saved?.leftClosed === false && !(compactPanels.matches && (right || files)),
      right,
      files,
      sidebarWidth: saved?.sidebarWidth ?? SIDEBAR_WIDTH,
      inspectorWidth: saved?.inspectorWidth ?? INSPECTOR_WIDTH,
    };
  } catch {
    return {
      left: false,
      right: false,
      files: true,
      sidebarWidth: SIDEBAR_WIDTH,
      inspectorWidth: INSPECTOR_WIDTH,
    };
  }
}

const state = createRoot(() => {
  const initial = readPanels();
  const [objectsOpen, setObjectsOpen] = createSignal(initial.left);
  // The served folder's diagrams. Open unless closed, and only shown when a folder is served.
  const [filesOpen, setFilesOpen] = createSignal(initial.files);
  const [inspectorOpen, setInspectorOpen] = createSignal(initial.right);
  const [sidebarWidth, setSidebarWidth] = createSignal<number>(initial.sidebarWidth);
  const [inspectorWidth, setInspectorWidth] = createSignal<number>(initial.inspectorWidth);
  const [menu, setMenu] = createSignal<MenuState | null>(null);
  const [dialog, setDialog] = createSignal<DialogId | null>(null);
  const [confirmRequest, setConfirmRequest] = createSignal<ConfirmRequest | null>(null);
  const [errorMessage, setErrorMessage] = createSignal('');
  const [quickBuildText, setQuickBuildText] = createSignal('');
  const [layoutLabOpen, setLayoutLabOpen] = createSignal(false);
  const [creatingFile, setCreatingFile] = createSignal(false);
  createEffect(() => {
    try {
      localStorage.setItem(
        UI_STORAGE,
        JSON.stringify({
          leftClosed: !objectsOpen(),
          rightClosed: !inspectorOpen(),
          filesClosed: !filesOpen(),
          sidebarWidth: sidebarWidth(),
          inspectorWidth: inspectorWidth(),
        }),
      );
    } catch {
      // Panel state is a convenience only.
    }
  });
  return {
    objectsOpen,
    setObjectsOpen,
    filesOpen,
    setFilesOpen,
    inspectorOpen,
    setInspectorOpen,
    sidebarWidth,
    setSidebarWidth,
    inspectorWidth,
    setInspectorWidth,
    menu,
    setMenu,
    dialog,
    setDialog,
    confirmRequest,
    setConfirmRequest,
    errorMessage,
    setErrorMessage,
    quickBuildText,
    setQuickBuildText,
    layoutLabOpen,
    setLayoutLabOpen,
    creatingFile,
    setCreatingFile,
  };
});

export const {
  filesOpen,
  inspectorOpen,
  sidebarWidth,
  inspectorWidth,
  menu,
  dialog,
  confirmRequest,
  errorMessage,
  quickBuildText,
  layoutLabOpen,
  setLayoutLabOpen,
  creatingFile,
  setCreatingFile,
} = state;

/** The files panel is on screen: open, with a served folder to list. */
export const filesShown = () => state.filesOpen() && !!workspace();

/** The objects panel is on screen. It shares the sidebar with the files panel, which comes first. */
export const objectsOpen = () => state.objectsOpen() && !filesShown();

export const setSidebarWidth = (width: number) => state.setSidebarWidth(clampPanel(width));
export const resetSidebarWidth = () => state.setSidebarWidth(SIDEBAR_WIDTH);
export const setInspectorWidth = (width: number) => state.setInspectorWidth(clampPanel(width));
export const resetInspectorWidth = () => state.setInspectorWidth(INSPECTOR_WIDTH);

export function setObjectsOpen(open: boolean) {
  if (open) {
    state.setFilesOpen(false);
    if (compactPanels.matches) {
      state.setInspectorOpen(false);
      state.setLayoutLabOpen(false);
    }
  }
  state.setObjectsOpen(open);
}

export function setFilesOpen(open: boolean) {
  if (open) {
    state.setObjectsOpen(false);
    if (compactPanels.matches) {
      state.setInspectorOpen(false);
      state.setLayoutLabOpen(false);
    }
  }
  state.setFilesOpen(open);
}

export function setInspectorOpen(open: boolean) {
  if (open) {
    state.setLayoutLabOpen(false);
    if (compactPanels.matches) {
      state.setObjectsOpen(false);
      state.setFilesOpen(false);
    }
  }
  state.setInspectorOpen(open);
}

compactPanels.addEventListener('change', () => {
  if (!compactPanels.matches) return;
  if (state.layoutLabOpen()) {
    state.setInspectorOpen(false);
    state.setObjectsOpen(false);
  } else if (state.inspectorOpen()) {
    state.setObjectsOpen(false);
    state.setFilesOpen(false);
  } else if (state.filesOpen()) state.setObjectsOpen(false);
});

let hiddenPanels: { left: boolean; right: boolean; files: boolean } | null = null;

/** Hide the side panels, or bring back the ones that were open. */
export function togglePanels() {
  if (objectsOpen() || state.inspectorOpen() || filesShown()) {
    hiddenPanels = {
      left: objectsOpen(),
      right: state.inspectorOpen(),
      files: filesShown(),
    };
    state.setObjectsOpen(false);
    state.setInspectorOpen(false);
    state.setFilesOpen(false);
  } else {
    if (hiddenPanels?.left || !workspace()) setObjectsOpen(hiddenPanels?.left ?? true);
    else setFilesOpen(hiddenPanels?.files ?? true);
    setInspectorOpen(hiddenPanels?.right ?? true);
  }
}

export function openMenu(id: MenuId, anchor: MenuState['anchor']) {
  const current = state.menu();
  if (current?.id === id && current.anchor === anchor) {
    state.setMenu(null);
    return;
  }
  state.setMenu({ id, anchor });
}

export const closeMenu = () => state.setMenu(null);

export function openDialog(id: DialogId) {
  state.setMenu(null);
  state.setDialog(id);
}

export const closeDialog = () => state.setDialog(null);

export function confirmAction(request: ConfirmRequest) {
  state.setConfirmRequest(request);
  openDialog('confirm');
}

export function showError(message: string) {
  state.setErrorMessage(message);
  openDialog('error');
}

export function openQuickBuild(text = '') {
  state.setQuickBuildText(text);
  openDialog('quick-build');
}

export const toggleLayoutLab = () => {
  state.setMenu(null);
  const open = !state.layoutLabOpen();
  if (open) {
    state.setInspectorOpen(false);
    if (compactPanels.matches) state.setObjectsOpen(false);
  }
  state.setLayoutLabOpen(open);
};
