import { Show } from 'solid-js';
import { findNode } from '../model/graph';
import { fileMode } from '../state/file-session';
import { FileNotes } from './FileNotes';
import { runCommand } from '../state/commands';
import { doc, selection } from '../state/document';
import { connectFrom, drag, tool, type Tool } from '../state/editor';
import { layoutBusy, layoutReport } from '../state/layout';
import { blockedRouteIds, visibleScene } from '../state/scene';
import { ancestors } from '../model/graph';

const HINTS: Record<Tool, string> = {
  brush: 'Hover previews · drag paints · [ / ] radius · Alt restores · Space pans',
  select: 'Drag shapes to edit · background pans · Shift drag selects',
  pan: 'Drag to pan · scroll to pan · pinch to zoom · V to edit',
  connect: 'Connect: choose source, then target · Esc to stop',
  container: 'Drag to draw a container around shapes',
  box: 'Click or drag to add a rectangle',
  diamond: 'Click or drag to add a diamond',
  circle: 'Click or drag to add an ellipse',
  text: 'Click to add text',
};

export function StatusBar() {
  const counts = () => {
    const vg = visibleScene();
    return `${vg.nodes.length} shapes · ${vg.edges.length} connections${selection().size ? ` · ${selection().size} selected` : ''}`;
  };
  const hint = () => {
    if (drag()?.resizingContainer) return 'Resizing container only · contents stay in place';
    const from = connectFrom();
    if (tool() === 'connect' && from)
      return `Connect from ${findNode(doc, from.id)?.title || 'shape'} → choose target or empty space · Esc to stop`;
    return HINTS[tool()];
  };
  const pinnedCount = () =>
    doc.graph.nodes.filter(
      n =>
        doc.layout.nodes[n.id]?.pinned ||
        ancestors(doc, n.id).some(a => doc.layout.nodes[a]?.pinned),
    ).length + doc.graph.groups.filter(g => doc.layout.nodes[g.id]?.pinned).length;
  const engine = () => {
    if (layoutBusy()) return 'Arranging…';
    const blocked = blockedRouteIds().length;
    if (blocked) return `${blocked} obstructed routes`;
    if (pinnedCount()) return `${pinnedCount()} pinned · P to toggle`;
    const r = layoutReport();
    if (r)
      return `${r.mode === 'journey' ? 'Timeline step ' + r.selectedStep : r.mode === 'rebuild' ? 'Rebuild' : 'Pass'} · ${r.name} · ${r.maxDisplacement}px max move`;
    return 'Tab extends · L improves · Alt R reroutes';
  };
  return (
    <footer class="statusbar">
      <span>{counts()}</span>
      <span class="status-hint">{hint()}</span>
      <Show
        when={fileMode()}
        fallback={
          <span class="status-engine" classList={{ warning: blockedRouteIds().length > 0 }}>
            {engine()}
          </span>
        }
      >
        <FileNotes />
      </Show>
      <button
        type="button"
        class="button ghost small"
        title="Keyboard shortcuts"
        onClick={() => runCommand('help')}
      >
        ?
      </button>
    </footer>
  );
}
