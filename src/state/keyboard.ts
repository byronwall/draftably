/** Global keyboard shortcuts and clipboard handling for the editor. */

import { setStartOpen, startOpen } from './launch';
import { findEdge, findNode } from '../model/graph';
import { isClipboardFragment } from '../model/edits';
import type { Side } from '../model/types';
import { commandEnabled, runCommand, type CommandId } from './commands';
import { comparison } from './comparison';
import { type Tool } from './session/editor';
import { importForeignText, importText, insertImage } from './files';
import { detectSource } from '../import/detect';
import { parseTextId, removeText, TEXT_NAMES } from './session/canvas-text';
import { shortcutKey } from './keys';
import { toast } from './toast';
import { closeMenu, dialog, menu, openQuickBuild } from './ui';
import { activeSession } from './active-session';

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
  '`': 'toggle-source',
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
  if (activeSession().sculptKey(e)) return;
  const mod = e.ctrlKey || e.metaKey,
    key = shortcutKey(e),
    target = e.target as Element;

  if (e.key === 'Escape') {
    if (activeSession().layoutBusy()) return (e.preventDefault(), activeSession().cancelLayout());
    if (activeSession().layoutPreview())
      return (e.preventDefault(), activeSession().discardPreview());
    if (activeSession().inlineEditId()) return;
    if (menu()) return (e.preventDefault(), closeMenu());
    e.preventDefault();
    activeSession().cancelGesture();
    activeSession().setConnectFrom(null);
    if (activeSession().tool() !== 'select') return activeSession().setTool('select');
    activeSession().clearSelection();
    activeSession().focusCanvas();
    return;
  }
  // Finding a command works from anywhere, even while typing in a field.
  if (mod && key === 'k') return (e.preventDefault(), runCommand('palette'));
  if (isEditable(target)) return;

  if (e.code === 'Space' && keepsSpace(target)) return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    activeSession().setSpaceHeld(true);
    return;
  }

  if (mod) {
    const shortcuts: Record<string, () => void> = {
      z: () => runCommand(e.shiftKey ? 'redo' : 'undo'),
      y: () => runCommand('redo'),
      a: () =>
        activeSession().setSelection(
          activeSession()
            .visibleScene()
            .nodes.map(n => n.id),
        ),
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

  // Keep from anywhere, including the Arrange button that started the preview.
  if (
    e.key === 'Enter' &&
    activeSession().layoutPreview() &&
    !target.closest?.('.layout-preview')
  ) {
    e.preventDefault();
    activeSession().acceptPreview();
    return;
  }

  const quickAdd = target.closest?.('[data-quick-add]') as SVGElement | null;
  if (e.key === 'Enter' && quickAdd) {
    e.preventDefault();
    activeSession().setSelection([quickAdd.dataset.owner!]);
    activeSession().quickExtend({ side: quickAdd.dataset.quickAdd as Side });
    return;
  }

  if (e.key === 'Enter') {
    if (target.tagName === 'BUTTON') return;
    e.preventDefault();
    if (activeSession().tool() === 'connect') {
      const id =
        focusedId && findNode(activeSession().doc, focusedId)
          ? focusedId
          : activeSession()
              .selectedIds()
              .find(id => findNode(activeSession().doc, id));
      if (!id) return;
      if (activeSession().connectFrom()) activeSession().completeConnection(id);
      else activeSession().setConnectFrom({ id, side: 'auto' });
      return;
    }
    if (e.shiftKey) return runCommand('add-connected');
    const id = focusedId || activeSession().selectedIds()[0] || activeSession().selectedText();
    if (id) activeSession().startInlineEdit(id);
    return;
  }

  if (e.key === 'Tab' && onCanvas) {
    if (activeSession().tool() === 'connect') {
      // Tab moves between connection targets.
      const targets = activeSession()
          .visibleScene()
          .nodes.map(n => n.id),
        anchor =
          focusedId ||
          activeSession()
            .selectedIds()
            .find(id => findNode(activeSession().doc, id)),
        i = targets.indexOf(anchor ?? ''),
        next = targets[(i + (e.shiftKey ? -1 : 1) + targets.length) % targets.length];
      if (next) {
        e.preventDefault();
        activeSession().setSelection([next]);
        (document.querySelector(`[data-id="${CSS.escape(next)}"]`) as SVGElement | null)?.focus({
          preventScroll: true,
        });
      }
      return;
    }
    const only = activeSession().singleSelection();
    if (only && (findNode(activeSession().doc, only) || findEdge(activeSession().doc, only))) {
      e.preventDefault();
      activeSession().quickExtend({ sibling: e.shiftKey });
    }
    return;
  }

  if (e.altKey && ARROW_SIDES[e.key] && onCanvas) {
    e.preventDefault();
    activeSession().quickExtend({ side: ARROW_SIDES[e.key] });
    return;
  }
  if (e.altKey && key === 's') return (e.preventDefault(), activeSession().markSelectedAs('start'));
  if (e.altKey && e.key === 'End')
    return (e.preventDefault(), activeSession().markSelectedAs('end'));
  if (e.altKey && key === 'r')
    return (e.preventDefault(), runCommand(e.shiftKey ? 'auto-ports' : 'reroute'));
  if (e.altKey && key === 'e') return (e.preventDefault(), runCommand('compare-layouts'));
  if (key === 'b' && !e.altKey) return (e.preventDefault(), runCommand('quick-build'));
  if ((key === '[' || key === ']') && !e.altKey && activeSession().stepState(key === ']' ? 1 : -1))
    return e.preventDefault();
  if ((e.key === 'Delete' || e.key === 'Backspace') && activeSession().selectedText()) {
    const id = activeSession().selectedText()!;
    e.preventDefault();
    if (parseTextId(id)?.kind === 'phase') return toast('A phase needs its label.');
    activeSession().transact(`Delete ${TEXT_NAMES[parseTextId(id)!.kind]}`, d => removeText(d, id));
    return activeSession().clearSelection();
  }
  if (e.key === 'Delete' || e.key === 'Backspace')
    return (e.preventDefault(), runCommand(e.shiftKey ? 'delete-deep' : 'delete'));

  if (ARROW_SIDES[e.key] && onCanvas) {
    e.preventDefault();
    if (focusedId && !activeSession().selection().has(focusedId))
      activeSession().setSelection([focusedId]);
    const amount = e.shiftKey ? 10 : 1,
      dx = e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0,
      dy = e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0;
    // With nothing selected, arrows pan the canvas.
    if (!activeSession().nudgeSelection(dx, dy)) activeSession().panBy(-dx * 30, -dy * 30);
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
    activeSession().setTool(KEY_TOOLS[key]);
  }
}

export function handleKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') activeSession().setSpaceHeld(false);
}

export function handleCopy(e: ClipboardEvent) {
  if (isEditable(e.target) || modalOpen() || !activeSession().selection().size) return;
  const part = activeSession().copySelection();
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
      if (isClipboardFragment(data)) activeSession().pasteFragment(data);
      else await importText(text);
      return;
    }
    if (!text && activeSession().hasClipboard()) {
      e.preventDefault();
      activeSession().pasteFragment();
    }
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}
