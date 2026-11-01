/**
 * Named commands shared by the toolbar, menus and keyboard shortcuts.
 * While a timeline preview is open, only navigation and view commands run.
 */
import * as actions from './actions';
import { canRedo, canUndo, doc, redo, selectedIds, undo } from './document';
import { fitView, zoomAt } from './editor';
import {
  copyImage,
  exportDocument,
  openExport,
  openPdfExport,
  type CopyAs,
  type ExportKind,
} from './files';
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
import { exampleMode, fileMode, reflowSelectedGroup } from './file-session';
import { encodeSource } from '../lib/source-hash';
import {
  go,
  homeUrl,
  newDiagramSource,
  openInPlayground,
  playgroundNote,
  setStartOpen,
  siteUrl,
  startUrl,
  workspace,
} from './launch';
import { toast } from './toast';
import {
  filesShown,
  inspectorOpen,
  objectsOpen,
  confirmAction,
  openDialog,
  openQuickBuild,
  setCreatingFile,
  setFilesOpen,
  setInspectorOpen,
  setObjectsOpen,
  setSavingExample,
  toggleLayoutLab,
  togglePanels,
} from './ui';
import { findNode, isGroup } from '../model/graph';

export interface Command {
  label: string;
  /** Shortcut shown in menus. */
  keys?: string;
  icon?: string;
  /** What it does, in a sentence: shown in tooltips and the palette. */
  hint?: string;
  run: () => unknown;
  /** Allowed while a timeline preview is open. */
  duringTimeline?: boolean;
  /** Exits the brush before running. */
  endsBrush?: boolean;
  enabled?: () => boolean;
}

let fileInput:
  ((replaceImageId: string | null, accept: 'diagram' | 'image' | 'foreign') => void) | null = null;
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

function exportCommand(format: 'json') {
  if (sculptInteracting()) {
    toast('Keep or cancel the preview before exporting the diagram.');
    return;
  }
  return exportDocument(format).catch(error =>
    toast(error instanceof Error ? error.message : String(error)),
  );
}

function openExportCommand(kind: ExportKind) {
  if (sculptInteracting()) toast('Keep or cancel the preview before exporting the diagram.');
  else openExport(kind);
}

function copyCommand(kind: CopyAs) {
  if (sculptInteracting()) {
    toast('Keep or cancel the preview before copying the diagram.');
    return;
  }
  return copyImage(kind).catch(error =>
    toast(error instanceof Error ? error.message : String(error)),
  );
}

/** Show the files panel and put the cursor in its filter. */
function findFile() {
  setFilesOpen(true);
  requestAnimationFrame(() =>
    document.querySelector<HTMLInputElement>('.files-panel .panel-search input')?.select(),
  );
}

/**
 * A served folder names the new diagram in its files panel. The static site replaces the
 * browser copy; from an example there, a blank scratch copy opens instead, like the Playground's.
 */
async function newDiagram() {
  if (!fileMode()) return actions.newDocument();
  if (workspace()) {
    setFilesOpen(true);
    setCreatingFile(true);
    return;
  }
  // `?new` makes this a page load even from a shared copy, whose URL differs only in the hash.
  // The time keeps each blank's stored edits apart (see `openExampleSession`).
  const hash = await encodeSource(newDiagramSource(''));
  location.assign(`${startUrl()}?new#${hash}&t=${Date.now()}`);
}

function openStart() {
  if (workspace()) void go(startUrl());
  else setStartOpen(true);
}

const hasSelection = () => selectedIds().length > 0;

export const commands = {
  undo: {
    hint: 'Step back through your last edit.',
    label: 'Undo',
    keys: '⌘Z',
    icon: 'undo',
    run: undoCommand,
    duringTimeline: true,
    enabled: canUndo,
  },
  redo: {
    hint: 'Put back the edit you just undid.',
    label: 'Redo',
    keys: '⇧⌘Z',
    icon: 'redo',
    run: redoCommand,
    enabled: canRedo,
  },

  'add-node': {
    hint: 'Add a box to the canvas and start typing its label.',
    label: 'Add box',
    keys: 'N',
    icon: 'plus',
    run: () => {
      actions.setTool('select');
      actions.addNode({}, undefined, true);
    },
  },
  'add-connected': {
    hint: 'Add a box joined to the selected shape.',
    label: 'Add connected box',
    keys: '⇧ Enter',
    icon: 'connect',
    run: () => actions.quickExtend(),
  },
  'quick-build': {
    hint: 'Type or paste an indented list and get connected shapes.',
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
  duplicate: {
    hint: 'Copy the selection beside itself.',
    enabled: hasSelection,
    label: 'Duplicate',
    keys: '⌘D',
    icon: 'copy',
    run: actions.duplicateSelection,
  },
  group: {
    hint: 'Frame the selection in a new container.',
    enabled: hasSelection,
    label: 'Wrap in container',
    keys: '⌘G',
    icon: 'group',
    run: actions.wrapSelection,
  },
  ungroup: {
    hint: 'Remove the container and keep its contents.',
    enabled: hasSelection,
    label: 'Ungroup',
    keys: '⇧⌘G',
    run: actions.ungroupSelection,
  },
  pin: {
    hint: 'Stop layout tools from moving the selection.',
    enabled: hasSelection,
    label: 'Toggle pin',
    keys: 'P',
    icon: 'pin',
    run: actions.togglePin,
  },
  'release-manual': {
    hint: 'Forget that shapes were moved by hand.',
    label: 'Clear manual markers',
    run: actions.clearManualMarkers,
  },
  delete: {
    hint: 'Remove the selection and keep the contents of containers.',
    label: 'Delete selection',
    enabled: hasSelection,
    keys: '⌫',
    icon: 'trash',
    run: () => actions.deleteSelection(),
  },
  'delete-deep': {
    label: 'Delete with contents',
    keys: '⇧⌫',
    run: () => actions.deleteSelection(true),
  },
  'align-left': {
    label: 'Align left',
    enabled: hasSelection,
    run: () => actions.alignSelection('left'),
  },
  'align-top': {
    label: 'Align top',
    enabled: hasSelection,
    run: () => actions.alignSelection('top'),
  },
  'align-center': {
    label: 'Align horizontal centers',
    enabled: hasSelection,
    run: () => actions.alignSelection('center'),
  },
  'align-middle': {
    label: 'Align vertical centers',
    enabled: hasSelection,
    run: () => actions.alignSelection('middle'),
  },
  'distribute-x': {
    label: 'Distribute horizontally',
    enabled: hasSelection,
    run: () => actions.alignSelection('distribute-x'),
  },
  'distribute-y': {
    label: 'Distribute vertically',
    enabled: hasSelection,
    run: () => actions.alignSelection('distribute-y'),
  },
  'fit-container': { label: 'Fit contents', run: actions.fitSelectedContainer },
  'reflow-group': {
    hint: 'Rearrange the contents of the selected container.',
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
    hint: 'Nudge shapes into line with small moves. Your arrangement stays.',
    label: 'Tidy positions',
    keys: 'L',
    icon: 'layout',
    run: () => runLabLayout(),
    endsBrush: true,
  },
  'layout-rebuild': {
    hint: 'Preview a new arrangement of the whole diagram.',
    label: 'Preview automatic layout',
    keys: '⇧L',
    run: () => runLabLayout('rebuild', true),
    endsBrush: true,
  },
  'layout-preview': {
    label: 'Preview tidy',
    run: () => runLabLayout('pass', true),
    endsBrush: true,
  },
  'layout-accept': { label: 'Keep layout', run: acceptPreview },
  'layout-discard': { label: 'Discard', run: discardPreview },
  'layout-menu': {
    hint: 'Choose an arrangement, preview it and keep it if you like it.',
    label: 'Automatic layout…',
    keys: '⌥L',
    run: toggleLayoutLab,
    endsBrush: true,
  },
  'layout-checkpoint': { label: 'Capture checkpoint', run: captureCheckpoint },
  'layout-restore': { label: 'Restore checkpoint', run: restoreCheckpoint },
  'compare-layouts': {
    hint: 'See other arrangements side by side, then apply one.',
    label: 'Compare layouts',
    keys: '⌥E',
    run: () => openComparison('layout'),
    endsBrush: true,
  },
  'compare-routes': {
    hint: 'See other connection routes side by side, then apply one.',
    label: 'Compare ports & routes',
    run: () => openComparison('routing'),
    endsBrush: true,
  },
  reroute: {
    hint: 'Redraw every connection. Shapes stay where they are.',
    label: 'Reroute now',
    keys: '⌥R',
    icon: 'branch',
    run: () => actions.reroute(),
  },
  'auto-ports': {
    hint: 'Let the router choose sides for the selected lines.',
    label: 'Use auto ports on selection',
    keys: '⌥⇧R',
    run: () => actions.reroute({ auto: true }),
  },

  'timeline-toggle': {
    hint: 'Step through arrangements from here to a tidy result and pick one.',
    label: 'Layout timeline',
    keys: '⌥T',
    icon: 'journey',
    run: () => (timelineOpen() ? closeTimeline() : openTimeline()),
    duringTimeline: true,
  },
  'timeline-reopen': {
    hint: 'Open the last layout timeline again.',
    label: 'Reopen last layout timeline',
    icon: 'journey',
    run: reopenTimeline,
    duringTimeline: true,
  },
  'timeline-save': {
    hint: 'Download the last layout timeline as a file.',
    label: 'Save layout timeline…',
    icon: 'download',
    run: saveTimelineFile,
    duringTimeline: true,
  },
  'brush-toggle': {
    hint: 'Paint over shapes to tidy only that part of the drawing.',
    label: 'Layout brush',
    keys: 'W',
    icon: 'brush',
    run: toggleBrush,
    duringTimeline: true,
  },

  fit: {
    hint: 'Zoom so the whole diagram fills the view.',
    label: 'Fit diagram',
    keys: '1',
    icon: 'fit',
    run: fitView,
    duringTimeline: true,
  },
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
    hint: 'List every shape and container, with search.',
    label: 'Objects',
    keys: '[',
    icon: 'tree',
    run: () => setObjectsOpen(!objectsOpen()),
    duringTimeline: true,
  },
  'toggle-files': {
    hint: 'List the diagrams in the open folder.',
    label: 'Diagrams in this folder',
    keys: 'F',
    icon: 'folder',
    run: () => setFilesOpen(!filesShown()),
    enabled: () => !!workspace(),
    duringTimeline: true,
  },
  'find-file': {
    hint: 'Jump to a diagram in the open folder.',
    label: 'Go to diagram…',
    keys: '⌘P',
    icon: 'search',
    run: findFile,
    enabled: () => !!workspace(),
    duringTimeline: true,
  },
  'toggle-inspector': {
    hint: 'Edit the selected shape or connection, or the diagram.',
    label: 'Inspector',
    keys: ']',
    icon: 'sliders',
    run: () => setInspectorOpen(!inspectorOpen()),
    duringTimeline: true,
  },
  'toggle-panels': {
    hint: 'Give the canvas the whole window, or bring the panels back.',
    label: 'Hide or restore panels',
    keys: '\\',
    run: togglePanels,
    duringTimeline: true,
  },
  palette: {
    label: 'Find a command',
    keys: '⌘K',
    icon: 'search',
    hint: 'Search every command, diagram and example by name.',
    run: () => openDialog('palette'),
    duringTimeline: true,
  },
  help: {
    hint: 'See every shortcut.',
    label: 'Keyboard shortcuts',
    keys: '?',
    icon: 'help',
    run: () => openDialog('help'),
    duringTimeline: true,
  },

  start: {
    hint: 'See new, recent and example diagrams.',
    label: 'Start screen…',
    icon: 'folder',
    // With a served folder the start page lists its files; otherwise it opens over the editor.
    run: openStart,
    duringTimeline: true,
  },
  'new-diagram': {
    label: 'New diagram',
    icon: 'plus',
    run: newDiagram,
    hint: 'Start an empty diagram.',
  },
  open: {
    hint: 'Open a saved diagram, SVG or image.',
    label: 'Open diagram…',
    keys: '⌘O',
    icon: 'folder',
    run: () => fileInput?.(null, 'diagram'),
  },
  'save-example': {
    hint: 'Write this scratch copy to a new file in the folder.',
    label: 'Save as file…',
    icon: 'file',
    enabled: () => exampleMode() && !!workspace(),
    run: () => setSavingExample(true),
  },
  'import-diagram': {
    hint: 'Turn a Mermaid, DOT or D2 file into a diagram.',
    label: 'Import text diagram…',
    icon: 'folder',
    run: () => fileInput?.(null, 'foreign'),
  },
  'insert-image': {
    hint: 'Place a picture on the canvas.',
    label: 'Insert image…',
    icon: 'image',
    run: () => fileInput?.(null, 'image'),
  },
  'replace-image': {
    label: 'Replace image',
    run: () => fileInput?.(selectedIds().find(id => findNode(doc, id)) ?? null, 'image'),
  },
  'export-json': {
    hint: 'Save the diagram to a file on this computer.',
    label: 'Save diagram',
    keys: '⌘S',
    icon: 'download',
    run: () => exportCommand('json'),
  },
  'export-folder': {
    hint: 'Put every diagram in the folder into one PDF.',
    label: 'Export folder as PDF…',
    icon: 'file',
    enabled: () => !!workspace()?.files.length,
    run: () => openPdfExport((workspace()?.files ?? []).map(f => f.path)),
  },
  'export-png': {
    hint: 'Save a picture, with size and background options.',
    label: 'Export PNG…',
    icon: 'image',
    run: () => openExportCommand('png'),
  },
  'export-svg': {
    hint: 'Save a scalable drawing that opens again as a diagram.',
    label: 'Export SVG…',
    icon: 'export',
    run: () => openExportCommand('svg'),
  },
  'export-pdf': {
    hint: 'Save this diagram as a PDF page.',
    label: 'Export PDF…',
    icon: 'file',
    run: () => openExportCommand('pdf'),
  },
  'copy-image': {
    hint: 'Copy the diagram or selection to the clipboard as a picture.',
    label: 'Copy image',
    keys: '⇧⌘C',
    icon: 'copy',
    run: () => copyCommand('image'),
  },
  'copy-svg': { label: 'SVG markup', icon: 'code', run: () => copyCommand('svg') },
  'copy-source': { label: 'draftably source', icon: 'file', run: () => copyCommand('source') },
  'copy-link': { label: 'Link to this diagram', icon: 'globe', run: () => copyCommand('link') },
  theme: {
    hint: 'Switch the editor between light and dark. The diagram keeps its theme.',
    label: 'Light or dark editor',
    icon: 'sun',
    run: actions.toggleTheme,
  },
  home: {
    hint: 'Go to the start of this folder or to the draftably site.',
    label: 'Home',
    icon: 'home',
    run: () => void go(homeUrl()),
    duringTimeline: true,
  },
  docs: {
    hint: 'Open the draftably docs in a new tab.',
    label: 'Docs',
    icon: 'globe',
    // A new tab, so the diagram here stays as it is.
    run: () => window.open(siteUrl('docs'), '_blank', 'noopener'),
    duringTimeline: true,
  },
  'open-playground': {
    hint: 'Edit a copy of this source next to its drawing.',
    label: 'Open in Playground',
    icon: 'code',
    // Only a file or an example has source to carry.
    enabled: fileMode,
    run: () =>
      confirmAction({
        title: 'Open in the Playground?',
        message: playgroundNote(),
        confirmLabel: 'Open Playground',
        onConfirm: () => void openInPlayground(),
      }),
  },
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
