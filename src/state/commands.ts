/**
 * Named commands shared by the toolbar, menus and keyboard shortcuts.
 * While a timeline preview is open, only navigation and view commands run.
 */
import * as actions from './actions';
import { canRedo, canUndo, doc, redo, selectedIds, undo } from './document';
import { fitView, zoomAt } from './editor';
import { exportDocument } from './files';
import {
  acceptPreview,
  captureCheckpoint,
  discardPreview,
  layoutPreview,
  restoreCheckpoint,
  runLabLayout,
} from './layout';
import { openComparison } from './comparison';
import {
  brushActive,
  closeTimeline,
  deactivateBrush,
  openTimeline,
  reopenTimeline,
  saveTimelineFile,
  sculptInteracting,
  sculptUndo,
  timelineOpen,
  toggleBrush,
} from './sculpt';
import { fileMode, reflowSelectedGroup } from './file-session';
import { setStartOpen, startUrl, workspace } from './launch';
import { toast } from './toast';
import {
  inspectorOpen,
  objectsOpen,
  openDialog,
  openQuickBuild,
  setInspectorOpen,
  setObjectsOpen,
  toggleLayoutLab,
  togglePanels,
} from './ui';
import { findNode, isGroup } from '../model/graph';

export interface Command {
  label: string;
  /** Shortcut shown in menus. */
  keys?: string;
  icon?: string;
  run: () => unknown;
  /** Allowed while a timeline preview is open. */
  duringTimeline?: boolean;
  /** Exits the brush before running. */
  endsBrush?: boolean;
  enabled?: () => boolean;
}

let fileInput: ((replaceImageId: string | null, accept: 'diagram' | 'image') => void) | null = null;
/** Set by the app shell, which owns the hidden file inputs. */
export const setFilePicker = (fn: typeof fileInput) => (fileInput = fn);

function undoCommand() {
  if (sculptUndo()) return;
  if (layoutPreview()) return discardPreview();
  undo();
}

function redoCommand() {
  if (timelineOpen()) closeTimeline();
  redo();
}

function exportCommand(format: 'json' | 'svg' | 'png') {
  if (sculptInteracting()) {
    toast('Keep or cancel the preview before exporting the diagram.');
    return;
  }
  return exportDocument(format).catch(error =>
    toast(error instanceof Error ? error.message : String(error)),
  );
}

export const commands = {
  undo: {
    label: 'Undo',
    keys: '⌘Z',
    icon: 'undo',
    run: undoCommand,
    duringTimeline: true,
    enabled: canUndo,
  },
  redo: { label: 'Redo', keys: '⇧⌘Z', icon: 'redo', run: redoCommand, enabled: canRedo },

  'add-node': {
    label: 'Add box',
    keys: 'N',
    icon: 'plus',
    run: () => {
      actions.setTool('select');
      actions.addNode({}, undefined, true);
    },
  },
  'add-connected': {
    label: 'Add connected box',
    keys: '⇧ Enter',
    icon: 'connect',
    run: () => actions.quickExtend(),
  },
  'quick-build': {
    label: 'Build from a list…',
    keys: 'B',
    icon: 'layers',
    run: () => openQuickBuild(),
  },
  'insert-step': {
    label: 'Insert step',
    run: () => {
      const id = selectedIds().find(id => doc.graph.edges.some(e => e.id === id));
      if (id) actions.insertStep(id);
    },
  },
  duplicate: { label: 'Duplicate', keys: '⌘D', icon: 'copy', run: actions.duplicateSelection },
  group: { label: 'Wrap in container', keys: '⌘G', icon: 'group', run: actions.wrapSelection },
  ungroup: { label: 'Ungroup', keys: '⇧⌘G', run: actions.ungroupSelection },
  pin: { label: 'Toggle pin', keys: 'P', icon: 'pin', run: actions.togglePin },
  'release-manual': { label: 'Clear manual markers', run: actions.clearManualMarkers },
  delete: {
    label: 'Delete selection',
    keys: '⌫',
    icon: 'trash',
    run: () => actions.deleteSelection(),
  },
  'delete-deep': {
    label: 'Delete with contents',
    keys: '⇧⌫',
    run: () => actions.deleteSelection(true),
  },
  'align-left': { label: 'Align left', run: () => actions.alignSelection('left') },
  'align-top': { label: 'Align top', run: () => actions.alignSelection('top') },
  'align-center': {
    label: 'Align horizontal centers',
    run: () => actions.alignSelection('center'),
  },
  'align-middle': { label: 'Align vertical centers', run: () => actions.alignSelection('middle') },
  'distribute-x': {
    label: 'Distribute horizontally',
    run: () => actions.alignSelection('distribute-x'),
  },
  'distribute-y': {
    label: 'Distribute vertically',
    run: () => actions.alignSelection('distribute-y'),
  },
  'fit-container': { label: 'Fit contents', run: actions.fitSelectedContainer },
  'reflow-group': {
    label: 'Reflow group',
    run: () => {
      const id = selectedIds().find(id => isGroup(doc, id));
      if (id) reflowSelectedGroup(id);
    },
    enabled: () => fileMode() && selectedIds().some(id => isGroup(doc, id)),
  },
  'collapse-selected': { label: 'Collapse or expand', run: () => actions.toggleCollapse() },
  'reverse-edge': { label: 'Reverse', run: actions.reverseSelectedEdge },
  'reset-route': { label: 'Reset bends', run: actions.resetSelectedBends },
  'mark-start': { label: 'Start here', run: () => actions.markSelectedAs('start') },
  'mark-end': { label: 'End here', run: () => actions.markSelectedAs('end') },

  layout: {
    label: 'Improve layout',
    keys: 'L',
    icon: 'layout',
    run: () => runLabLayout(),
    endsBrush: true,
  },
  'layout-rebuild': {
    label: 'Preview a deterministic rebuild',
    keys: '⇧L',
    run: () => runLabLayout('rebuild', true),
    endsBrush: true,
  },
  'layout-preview': {
    label: 'Preview pass',
    run: () => runLabLayout('pass', true),
    endsBrush: true,
  },
  'layout-accept': { label: 'Keep layout', run: acceptPreview },
  'layout-discard': { label: 'Discard', run: discardPreview },
  'layout-menu': { label: 'Layout options', keys: '⌥L', run: toggleLayoutLab, endsBrush: true },
  'layout-checkpoint': { label: 'Capture checkpoint', run: captureCheckpoint },
  'layout-restore': { label: 'Restore checkpoint', run: restoreCheckpoint },
  'compare-layouts': {
    label: 'Compare layouts',
    keys: '⌥E',
    run: () => openComparison('layout'),
    endsBrush: true,
  },
  'compare-routes': {
    label: 'Compare ports & routes',
    run: () => openComparison('routing'),
    endsBrush: true,
  },
  reroute: { label: 'Reroute now', keys: '⌥R', icon: 'branch', run: () => actions.reroute() },
  'auto-ports': {
    label: 'Use auto ports on selection',
    keys: '⌥⇧R',
    run: () => actions.reroute({ auto: true }),
  },

  'timeline-toggle': {
    label: 'Layout timeline',
    keys: '⌥T',
    icon: 'journey',
    run: () => (timelineOpen() ? closeTimeline() : openTimeline()),
    duringTimeline: true,
  },
  'timeline-reopen': {
    label: 'Reopen last layout timeline',
    icon: 'journey',
    run: reopenTimeline,
    duringTimeline: true,
  },
  'timeline-save': {
    label: 'Save layout timeline…',
    icon: 'download',
    run: saveTimelineFile,
    duringTimeline: true,
  },
  'brush-toggle': {
    label: 'Layout brush',
    keys: 'W',
    icon: 'brush',
    run: toggleBrush,
    duringTimeline: true,
  },

  fit: { label: 'Fit diagram', keys: '1', icon: 'fit', run: fitView, duringTimeline: true },
  'zoom-in': {
    label: 'Zoom in',
    keys: '+',
    icon: 'plus',
    run: () => zoomAt(1.18),
    duringTimeline: true,
  },
  'zoom-out': {
    label: 'Zoom out',
    keys: '−',
    icon: 'minus',
    run: () => zoomAt(1 / 1.18),
    duringTimeline: true,
  },
  'reset-camera': {
    label: 'Zoom to 100%',
    keys: '0',
    run: () => zoomAt(1 / doc.camera.k),
    duringTimeline: true,
  },
  'toggle-objects': {
    label: 'Objects',
    keys: '[',
    icon: 'panel-left',
    run: () => setObjectsOpen(!objectsOpen()),
    duringTimeline: true,
  },
  'toggle-inspector': {
    label: 'Inspector',
    keys: ']',
    icon: 'panel-right',
    run: () => setInspectorOpen(!inspectorOpen()),
    duringTimeline: true,
  },
  'toggle-panels': {
    label: 'Hide or restore panels',
    keys: '\\',
    run: togglePanels,
    duringTimeline: true,
  },
  help: {
    label: 'Keyboard shortcuts',
    keys: '?',
    icon: 'help',
    run: () => openDialog('help'),
    duringTimeline: true,
  },

  start: {
    label: 'New, open or example…',
    icon: 'folder',
    // With a served folder the start page lists its files; otherwise it opens over the editor.
    run: () => (workspace() ? location.assign(startUrl()) : setStartOpen(true)),
    duringTimeline: true,
  },
  'new-diagram': { label: 'New diagram', icon: 'plus', run: actions.newDocument },
  open: {
    label: 'Open diagram…',
    keys: '⌘O',
    icon: 'folder',
    run: () => fileInput?.(null, 'diagram'),
  },
  'insert-image': { label: 'Insert image…', icon: 'image', run: () => fileInput?.(null, 'image') },
  'replace-image': {
    label: 'Replace image',
    run: () => fileInput?.(selectedIds().find(id => findNode(doc, id)) ?? null, 'image'),
  },
  'export-json': {
    label: 'Save diagram',
    keys: '⌘S',
    icon: 'download',
    run: () => exportCommand('json'),
  },
  'export-svg': { label: 'Export SVG', icon: 'export', run: () => exportCommand('svg') },
  'export-png': { label: 'Export PNG', icon: 'image', run: () => exportCommand('png') },
  theme: { label: 'Toggle light / dark', icon: 'sun', run: actions.toggleTheme },
} satisfies Record<string, Command>;

export type CommandId = keyof typeof commands;

/**
 * Tools whose results a diagram file cannot store yet. Rebuilds, Compare and routing are saved as
 * layout recipes and `routing` lines; passes, timeline steps and brush strokes as `stay`
 * positions. Checkpoints are not needed: undo steps through the file's versions.
 */
const FILE_UNSUPPORTED = new Set<string>([
  'layout-checkpoint',
  'layout-restore',
  'reset-route',
  'mark-start',
  'mark-end',
  'fit-container',
  'insert-image',
  'replace-image',
  'new-diagram',
  'open',
]);
const unavailableInFile = (id: string) => fileMode() && FILE_UNSUPPORTED.has(id);

export function runCommand(id: CommandId) {
  const command: Command = commands[id];
  if (unavailableInFile(id)) {
    toast('Not available while editing a diagram file. Its results cannot be saved to the file.');
    return;
  }
  if (timelineOpen() && !command.duringTimeline) {
    toast('Preview only. Keep this step or press Escape to cancel.');
    return;
  }
  if (command.endsBrush && brushActive()) deactivateBrush();
  try {
    const result = command.run();
    if (result instanceof Promise)
      result.catch(error => toast(error instanceof Error ? error.message : String(error)));
  } catch (error) {
    console.warn('[diagram-studio] command failed', id, error);
    toast(error instanceof Error ? error.message : String(error));
  }
}

export const commandEnabled = (id: CommandId) => {
  if (unavailableInFile(id)) return false;
  const command: Command = commands[id];
  return command.enabled ? command.enabled() : true;
};
