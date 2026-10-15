/** Panels, menus and dialogs. Panel visibility is remembered per browser. */
import { createEffect, createRoot, createSignal } from 'solid-js';

const UI_STORAGE = 'diagram-studio-v5-ui';

export type MenuId = 'file' | 'edit' | 'export' | 'routing' | 'context' | 'tools';
export type DialogId = 'help' | 'quick-build' | 'confirm' | 'error';

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

function readPanels() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE) || 'null');
    const right = saved?.rightClosed === false;
    return { left: saved?.leftClosed === false && !(compactPanels.matches && right), right };
  } catch {
    return { left: false, right: false };
  }
}

const state = createRoot(() => {
  const initial = readPanels();
  const [objectsOpen, setObjectsOpen] = createSignal(initial.left);
  const [inspectorOpen, setInspectorOpen] = createSignal(initial.right);
  const [menu, setMenu] = createSignal<MenuState | null>(null);
  const [dialog, setDialog] = createSignal<DialogId | null>(null);
  const [confirmRequest, setConfirmRequest] = createSignal<ConfirmRequest | null>(null);
  const [errorMessage, setErrorMessage] = createSignal('');
  const [quickBuildText, setQuickBuildText] = createSignal('');
  const [layoutLabOpen, setLayoutLabOpen] = createSignal(false);
  createEffect(() => {
    try {
      localStorage.setItem(
        UI_STORAGE,
        JSON.stringify({ leftClosed: !objectsOpen(), rightClosed: !inspectorOpen() }),
      );
    } catch {
      // Panel state is a convenience only.
    }
  });
  return {
    objectsOpen,
    setObjectsOpen,
    inspectorOpen,
    setInspectorOpen,
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
  };
});

export const {
  objectsOpen,
  inspectorOpen,
  menu,
  dialog,
  confirmRequest,
  errorMessage,
  quickBuildText,
  layoutLabOpen,
  setLayoutLabOpen,
} = state;

export function setObjectsOpen(open: boolean) {
  if (open && compactPanels.matches) {
    state.setInspectorOpen(false);
    state.setLayoutLabOpen(false);
  }
  state.setObjectsOpen(open);
}

export function setInspectorOpen(open: boolean) {
  if (open) {
    state.setLayoutLabOpen(false);
    if (compactPanels.matches) state.setObjectsOpen(false);
  }
  state.setInspectorOpen(open);
}

compactPanels.addEventListener('change', () => {
  if (!compactPanels.matches) return;
  if (state.layoutLabOpen()) {
    state.setInspectorOpen(false);
    state.setObjectsOpen(false);
  } else if (state.inspectorOpen()) state.setObjectsOpen(false);
});

let hiddenPanels: { left: boolean; right: boolean } | null = null;

/** Hide both panels, or bring back the ones that were open. */
export function togglePanels() {
  if (state.objectsOpen() || state.inspectorOpen()) {
    hiddenPanels = { left: state.objectsOpen(), right: state.inspectorOpen() };
    state.setObjectsOpen(false);
    state.setInspectorOpen(false);
  } else {
    setObjectsOpen(hiddenPanels?.left ?? true);
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
