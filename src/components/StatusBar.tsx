import { Show } from 'solid-js';
import { findNode } from '../model/graph';

import { FileNotes } from './FileNotes';

import { type Tool } from '../state/session/editor';

import { ancestors } from '../model/graph';
import { useDiagramSession } from './session-context';

const HINTS: Record<Tool, string> = {
  brush: 'Hover previews · drag paints · [ / ] radius · Alt restores · Space pans',
  select: 'Drag shapes to edit · background pans · Shift drag selects',
  pan: 'Drag to pan · wheel zooms · Shift + wheel pans · V to edit',
  connect: 'Connect: choose source, then target · Esc to stop',
  container: 'Drag to draw a container around shapes',
  box: 'Click or drag to add a rectangle',
  diamond: 'Click or drag to add a diamond',
  circle: 'Click or drag to add an ellipse',
  text: 'Click to add text',
};

const BUILD = __DRAFTABLY_BUILD__;
const version = `v${BUILD.version}${BUILD.commit ? ` · ${BUILD.commit.slice(0, 7)}` : ''}`;

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export function StatusBar() {
  const s = useDiagramSession();
  const counts = () => {
    const vg = s.visibleScene();
    return `${count(vg.nodes.length, 'shape')} · ${count(vg.edges.length, 'connection')}${s.selection().size ? ` · ${s.selection().size} selected` : ''}`;
  };
  const hint = () => {
    if (s.drag()?.resizingContainer) return 'Resizing container only · contents stay in place';
    const from = s.connectFrom();
    if (s.tool() === 'connect' && from)
      return `Connect from ${findNode(s.doc, from.id)?.title || 'shape'} → choose target or empty space · Esc to stop`;
    return HINTS[s.tool()];
  };
  const pinnedCount = () =>
    s.doc.graph.nodes.filter(
      n =>
        s.doc.layout.nodes[n.id]?.pinned ||
        ancestors(s.doc, n.id).some(a => s.doc.layout.nodes[a]?.pinned),
    ).length + s.doc.graph.groups.filter(g => s.doc.layout.nodes[g.id]?.pinned).length;
  const engine = () => {
    if (s.layoutBusy()) return 'Arranging…';
    const blocked = s.blockedRouteIds().length;
    if (blocked) return count(blocked, 'obstructed route');
    if (pinnedCount()) return `${pinnedCount()} pinned · P to toggle`;
    const r = s.layoutReport();
    if (r)
      return `${r.mode === 'journey' ? 'Timeline step ' + r.selectedStep : r.mode === 'rebuild' ? 'Rebuild' : 'Pass'} · ${r.name} · ${r.maxDisplacement}px max move`;
    return 'Tab extends · L improves · Alt R reroutes';
  };
  return (
    <footer class="statusbar">
      <span>{counts()}</span>
      <span class="status-hint">{hint()}</span>
      <Show
        when={s.fileMode()}
        fallback={
          <span class="status-engine" classList={{ warning: s.blockedRouteIds().length > 0 }}>
            {engine()}
          </span>
        }
      >
        <FileNotes />
      </Show>
      <span class="status-version">{version}</span>
    </footer>
  );
}
