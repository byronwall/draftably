/**
 * `window.diagramStudio`: a small scripting surface for automated browser checks and the console.
 * The app itself never calls it.
 */
import { LayoutLab } from '../engines/layout-engine.js';
import { clone } from '../model/geometry';
import { SAMPLES } from '../model/samples';
import {
  addEdge,
  addNode,
  buildFromList,
  openDocument,
  openSample,
  quickExtend,
  reroute,
  setColor,
  setShade,
} from './actions';
import {
  applyCandidate,
  closeComparison,
  comparison,
  generate,
  openComparison,
} from './comparison';
import {
  canRedo,
  canUndo,
  doc,
  redo,
  selectedIds,
  selectItems,
  snapshotDoc,
  undo,
  undoStack,
} from './document';
import { tool } from './editor';
import { exportSvg, importText } from './files';
import { svgToPng } from '../lib/svg-export';
import {
  acceptPreview,
  discardPreview,
  layoutBusy,
  layoutPreview,
  layoutReport,
  runLayout,
} from './layout';
import { measured } from '../dsl/project';
import { currentSource, fileCompiling, fileDiagnostics, fileStatus } from './file-session';
import { routes, routingReport, sceneRects, visibleScene } from './scene';
import {
  activateBrush,
  brushDab,
  closeTimeline,
  keepStep,
  openTimeline,
  scrub,
  timeline,
} from './sculpt';

export function installDebugApi() {
  const api = {
    get: snapshotDoc,
    set: (input: unknown) => openDocument(input),
    select: (ids: string | string[], options = {}) => {
      selectItems(Array.isArray(ids) ? ids : [ids], options);
      return selectedIds();
    },
    addNode,
    addEdge,
    extend: quickExtend,
    fastBuild: buildFromList,
    undo,
    redo,
    layout: runLayout,
    preview: (options = {}) => runLayout({ ...options, preview: true }),
    acceptPreview,
    discardPreview,
    reroute,
    algorithms: () => clone(LayoutLab.algorithms),
    samples: () => clone(SAMPLES),
    loadSample: openSample,
    import: importText,
    exportSvg,
    /** The PNG export as a data URL. */
    exportPng: async () => {
      const blob = await svgToPng(exportSvg());
      return await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    },
    setColor,
    setShade,
    compare: openComparison,
    generateComparison: generate,
    applyCandidate,
    closeComparison,
    timeline: openTimeline,
    scrub,
    keepFrame: keepStep,
    cancelTimeline: closeTimeline,
    brush: activateBrush,
    brushDab,
    /** Geometry in the same form as `pnpm draftably inspect`, for comparing browser and CLI. */
    fileGeometry: () => measured(doc, sceneRects(), routes()),
    fileState: () => ({
      status: fileStatus(),
      compiling: fileCompiling(),
      source: currentSource(),
      diagnostics: clone(fileDiagnostics()),
    }),
    diagnostics: () => ({
      tool: tool(),
      selected: selectedIds(),
      visibleNodes: visibleScene().nodes.length,
      visibleEdges: visibleScene().edges.length,
      layoutBusy: layoutBusy(),
      preview: !!layoutPreview(),
      layoutReport: clone(layoutReport()),
      routingReport: clone(routingReport()),
      routes: routes().map(r => ({
        id: r.id,
        points: clone(r.points),
        fromSide: r.fromSide,
        toSide: r.toSide,
        blocked: r.blocked,
      })),
      undoDepth: undoStack().length,
      canUndo: canUndo(),
      canRedo: canRedo(),
      timeline: timeline()
        ? {
            busy: timeline()!.busy,
            index: timeline()!.index,
            frames: timeline()!.data?.frames.length ?? 0,
          }
        : null,
      comparison: comparison.open
        ? {
            busy: comparison.busy,
            cells: comparison.cells.map(c => ({ title: c.title, status: c.status })),
          }
        : null,
      title: doc.title,
    }),
  };
  Object.assign(window, { diagramStudio: Object.freeze(api) });
}
