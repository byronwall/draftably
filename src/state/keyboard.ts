/** The app's keyboard shortcuts and clipboard handling, around the canvas ones. */

import { setStartOpen, startOpen } from './launch';
import { isClipboardFragment } from '../model/edits';
import { commandEnabled, runCommand, type CommandId } from './commands';
import { comparison } from './comparison';
import { importForeignText, importText, insertImage } from './files';
import { detectSource } from '../import/detect';
import { shortcutKey } from './keys';
import { toast } from './toast';
import { closeMenu, dialog, menu, openQuickBuild } from './ui';
import {
  copyShapes,
  handleCanvasKey,
  handleKeyUp,
  isEditable,
  pasteShapes,
} from './canvas-keyboard';

export { handleKeyUp };

const modalOpen = () => !!dialog() || comparison.open;

/** App keys the canvas leaves alone. */
const KEY_COMMANDS: Record<string, CommandId> = {
  '?': 'help',
  f: 'toggle-files',
  '[': 'toggle-objects',
  ']': 'toggle-inspector',
  '\\': 'toggle-panels',
  '`': 'toggle-source',
};

const closeOpenMenu = () => !!menu() && (closeMenu(), true);

export function handleKeyDown(e: KeyboardEvent) {
  if (e.isComposing || modalOpen()) return;
  if (startOpen()) {
    if (e.key === 'Escape') setStartOpen(false);
    return;
  }
  const mod = e.ctrlKey || e.metaKey,
    key = shortcutKey(e);
  // Finding a command works from anywhere, even while typing in a field.
  if (mod && key === 'k') return (e.preventDefault(), runCommand('palette'));
  if (handleCanvasKey(e, closeOpenMenu)) return;

  if (mod) {
    const shortcuts: Record<string, () => void> = {
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

  if (e.altKey && key === 'e') return (e.preventDefault(), runCommand('compare-layouts'));
  if (e.altKey && key === 'l') return (e.preventDefault(), runCommand('layout-menu'));
  if (key === 'b' && !e.altKey) return (e.preventDefault(), runCommand('quick-build'));
  if (KEY_COMMANDS[key]) {
    e.preventDefault();
    runCommand(KEY_COMMANDS[key]);
  }
}

export function handleCopy(e: ClipboardEvent) {
  if (!modalOpen()) copyShapes(e);
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
    if (text.startsWith('{') && !isClipboardFragment(JSON.parse(text))) {
      e.preventDefault();
      await importText(text);
      return;
    }
  } catch (error) {
    e.preventDefault();
    toast(error instanceof Error ? error.message : String(error));
    return;
  }
  pasteShapes(e);
}
