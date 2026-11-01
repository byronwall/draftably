/** Global keyboard shortcuts and clipboard handling for the editor. */
import { stepState } from './emphasis';
import { setStartOpen, startOpen } from './launch';
import { findEdge, findNode } from '../model/graph';
import { isClipboardFragment } from '../model/edits';
import type { Side } from '../model/types';
import * as actions from './actions';
import { commandEnabled, runCommand, type CommandId } from './commands';
import { comparison } from './comparison';
import {
  clearSelection,
  doc,
  selectedIds,
  selection,
  setSelection,
  singleSelection,
} from './document';
import {
  connectFrom,
  focusCanvas,
  inlineEditId,
  panBy,
  setConnectFrom,
  setSpaceHeld,
  tool,
  type Tool,
} from './editor';
import { importForeignText, importText, insertImage } from './files';
import { detectSource } from '../import/detect';
import { cancelLayout, layoutBusy, layoutPreview, discardPreview } from './layout';
import { cancelGesture } from './pointer';
import { visibleScene } from './scene';
import { sculptKey } from './sculpt';
import { shortcutKey } from './keys';
import { toast } from './toast';
import { closeMenu, dialog, menu, openQuickBuild } from './ui';

const isEditable = (el: EventTarget | null) =>
  el instanceof Element && el.matches('input,textarea,select,[contenteditable=true]');

const modalOpen = () => !!dialog() || comparison.open;

/** Keyboard focus on a button keeps Space. A button a click left focused still lets Space pan. */
const keepsSpace = (el: EventTarget | null) =>
  el instanceof Element && el.matches('button:focus-visible,summary:focus-visible');

const ARROW_SIDES: Record<string, Side> = {
  ArrowRight: 'right',
  ArrowLeft: 'left',
  ArrowUp: 'top',
  ArrowDown: 'bottom',
};

const KEY_COMMANDS: Record<string, CommandId> = {
  n: 'add-node',
  p: 'pin',
  '1': 'fit',
  '0': 'reset-camera',
  '?': 'help',
  f: 'toggle-files',
  '[': 'toggle-objects',
  ']': 'toggle-inspector',
  '\\': 'toggle-panels',
  '+': 'zoom-in',
  '=': 'zoom-in',
  '-': 'zoom-out',
};

const KEY_TOOLS: Record<string, Tool> = {
  v: 'select',
  h: 'pan',
  c: 'connect',
  r: 'box',
  d: 'diamond',
  o: 'circle',
  t: 'text',
  g: 'container',
};

/** The canvas object a key event targets: the focused shape, or the selection. */
function focusedObject(target: Element) {
  const el = target.closest?.('[data-id]') as HTMLElement | SVGElement | null;
  return el?.dataset.id;
}

export function handleKeyDown(e: KeyboardEvent) {
  if (e.isComposing || modalOpen()) return;
  if (startOpen()) {
    if (e.key === 'Escape') setStartOpen(false);
    return;
  }
  if (sculptKey(e)) return;
  const mod = e.ctrlKey || e.metaKey,
    key = shortcutKey(e),
    target = e.target as Element;

  if (e.key === 'Escape') {
    if (layoutBusy()) return (e.preventDefault(), cancelLayout());
    if (layoutPreview()) return (e.preventDefault(), discardPreview());
    if (inlineEditId()) return;
    if (menu()) return (e.preventDefault(), closeMenu());
    e.preventDefault();
    cancelGesture();
    setConnectFrom(null);
    if (tool() !== 'select') return actions.setTool('select');
    clearSelection();
    focusCanvas();
    return;
  }
  if (isEditable(target)) return;

  if (e.code === 'Space' && keepsSpace(target)) return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    setSpaceHeld(true);
    return;
  }

  if (mod) {
    const shortcuts: Record<string, () => void> = {
      z: () => runCommand(e.shiftKey ? 'redo' : 'undo'),
      y: () => runCommand('redo'),
      a: () => setSelection(visibleScene().nodes.map(n => n.id)),
      d: () => runCommand('duplicate'),
      g: () => runCommand(e.shiftKey ? 'ungroup' : 'group'),
      s: () => runCommand('export-json'),
      // A served folder has no file dialog; its way to open a diagram is the same as ⌘P.
      o: () => runCommand(commandEnabled('find-file') ? 'find-file' : 'open'),
    };
    // ⇧⌘C copies the diagram, or the selection, as an image; ⌘C stays an object copy.
    if (key === 'c' && e.shiftKey) shortcuts.c = () => runCommand('copy-image');
    // ⌘P goes to a diagram in the served folder; without one the browser prints as usual.
    if (key === 'p' && commandEnabled('find-file')) shortcuts.p = () => runCommand('find-file');
    if (shortcuts[key]) {
      e.preventDefault();
      shortcuts[key]();
    }
    return;
  }

  const onCanvas = target === document.querySelector('.canvas') || !!target.closest?.('[data-id]');
  const focusedId = focusedObject(target);

  const quickAdd = target.closest?.('[data-quick-add]') as SVGElement | null;
  if (e.key === 'Enter' && quickAdd) {
    e.preventDefault();
    setSelection([quickAdd.dataset.owner!]);
    actions.quickExtend({ side: quickAdd.dataset.quickAdd as Side });
    return;
  }

  if (e.key === 'Enter') {
    if (target.tagName === 'BUTTON') return;
    e.preventDefault();
    if (tool() === 'connect') {
      const id =
        focusedId && findNode(doc, focusedId)
          ? focusedId
          : selectedIds().find(id => findNode(doc, id));
      if (!id) return;
      if (connectFrom()) actions.completeConnection(id);
      else setConnectFrom({ id, side: 'auto' });
      return;
    }
    if (e.shiftKey) return runCommand('add-connected');
    const id = focusedId || selectedIds()[0];
    if (id) actions.startInlineEdit(id);
    return;
  }

  if (e.key === 'Tab' && onCanvas) {
    if (tool() === 'connect') {
      // Tab moves between connection targets.
      const targets = visibleScene().nodes.map(n => n.id),
        anchor = focusedId || selectedIds().find(id => findNode(doc, id)),
        i = targets.indexOf(anchor ?? ''),
        next = targets[(i + (e.shiftKey ? -1 : 1) + targets.length) % targets.length];
      if (next) {
        e.preventDefault();
        setSelection([next]);
        (document.querySelector(`[data-id="${CSS.escape(next)}"]`) as SVGElement | null)?.focus({
          preventScroll: true,
        });
      }
      return;
    }
    const only = singleSelection();
    if (only && (findNode(doc, only) || findEdge(doc, only))) {
      e.preventDefault();
      actions.quickExtend({ sibling: e.shiftKey });
    }
    return;
  }

  if (e.altKey && ARROW_SIDES[e.key] && onCanvas) {
    e.preventDefault();
    actions.quickExtend({ side: ARROW_SIDES[e.key] });
    return;
  }
  if (e.altKey && key === 's') return (e.preventDefault(), actions.markSelectedAs('start'));
  if (e.altKey && e.key === 'End') return (e.preventDefault(), actions.markSelectedAs('end'));
  if (e.altKey && key === 'r')
    return (e.preventDefault(), runCommand(e.shiftKey ? 'auto-ports' : 'reroute'));
  if (e.altKey && key === 'e') return (e.preventDefault(), runCommand('compare-layouts'));
  if (key === 'b' && !e.altKey) return (e.preventDefault(), runCommand('quick-build'));
  if ((key === '[' || key === ']') && !e.altKey && stepState(key === ']' ? 1 : -1))
    return e.preventDefault();
  if (e.key === 'Delete' || e.key === 'Backspace')
    return (e.preventDefault(), runCommand(e.shiftKey ? 'delete-deep' : 'delete'));

  if (ARROW_SIDES[e.key] && onCanvas) {
    e.preventDefault();
    if (focusedId && !selection().has(focusedId)) setSelection([focusedId]);
    const amount = e.shiftKey ? 10 : 1,
      dx = e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0,
      dy = e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0;
    // With nothing selected, arrows pan the canvas.
    if (!actions.nudgeSelection(dx, dy)) panBy(-dx * 30, -dy * 30);
    return;
  }

  if (key === 'l') {
    e.preventDefault();
    runCommand(e.altKey ? 'layout-menu' : e.shiftKey ? 'layout-rebuild' : 'layout');
    return;
  }
  if (KEY_COMMANDS[key]) {
    e.preventDefault();
    runCommand(KEY_COMMANDS[key]);
    return;
  }
  if (KEY_TOOLS[key]) {
    e.preventDefault();
    actions.setTool(KEY_TOOLS[key]);
  }
}

export function handleKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') setSpaceHeld(false);
}

export function handleCopy(e: ClipboardEvent) {
  if (isEditable(e.target) || modalOpen() || !selection().size) return;
  const part = actions.copySelection();
  e.clipboardData?.setData('text/plain', JSON.stringify(part));
  e.preventDefault();
}

/** Paste images, copied objects, diagram JSON, or a list of titles to build from. */
export async function handlePaste(e: ClipboardEvent) {
  if (isEditable(e.target) || modalOpen() || !e.clipboardData) return;
  try {
    const image = [...e.clipboardData.items].find(i => /^image\/(png|jpeg|webp|gif)$/.test(i.type));
    if (image) {
      e.preventDefault();
      await insertImage(image.getAsFile()!);
      return;
    }
    const text = e.clipboardData.getData('text/plain').trim();
    const detected = detectSource(text);
    if (detected.status === 'detected' && ['dot', 'mermaid', 'd2'].includes(detected.format)) {
      e.preventDefault();
      await importForeignText(text);
      return;
    }
    if (detected.status === 'choose-fence') {
      e.preventDefault();
      throw Error('This text has more than one diagram. Paste one diagram at a time.');
    }
    if (text.includes('\n') && !text.startsWith('{')) {
      e.preventDefault();
      openQuickBuild(text);
      return;
    }
    if (text.startsWith('{')) {
      e.preventDefault();
      const data = JSON.parse(text);
      if (isClipboardFragment(data)) actions.pasteFragment(data);
      else await importText(text);
      return;
    }
    if (!text && actions.hasClipboard()) {
      e.preventDefault();
      actions.pasteFragment();
    }
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}
