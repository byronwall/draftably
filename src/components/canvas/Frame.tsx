import { createMemo, createSignal, For, Show } from 'solid-js';
import { resolveAppearance } from '../../model/appearance';
import { MIN_FRAME_WIDTH, type DiagramFrame } from '../../model/frame';
import { headingLines, headingTypes } from '../../model/heading';
import { legendMarkup } from '../../model/legend';
import { drawnLegend, usedStatuses } from '../../model/status';
import { HEADING_EDIT } from '../../state/actions';
import { doc, transact } from '../../state/document';
import { inlineEditId, screenToWorld } from '../../state/editor';
import { viewerFrame } from '../../state/scene';

type Key = 'title' | 'subtitle';

/**
 * Where the title or subtitle line sits, or would sit once added: a missing title goes in the
 * frame's top margin, or above the subtitle; a missing subtitle goes under the title. A subtitle
 * is offered only once there is a title.
 */
export function headingSlot(frame: DiagramFrame, key: Key) {
  const look = resolveAppearance(doc.appearance),
    types = headingTypes(look),
    lines = headingLines(look, doc.appearance.heading, frame.heading.x, frame.heading.y),
    line = lines.find(l => l.key === key),
    title = lines.find(l => l.key === 'title'),
    w = Math.max(240, frame.x + frame.w - frame.heading.x - 40),
    h = types[key].lineHeight;
  const y = line
    ? line.y
    : key === 'title'
      ? lines.length
        ? lines[0].y - h
        : frame.y + 2
      : title && title.y + title.type.lineHeight;
  return y === undefined ? undefined : { x: frame.heading.x, y, w, h, type: types[key] };
}

/**
 * The frame an export draws round the diagram, drawn on the canvas: the heading above the drawing
 * and the key under it, from the same geometry as `inspect --svg` and the editor's exports.
 * Double-click the title or subtitle to edit it; drag the right edge to widen the frame.
 */
export function Frame() {
  const look = () => resolveAppearance(doc.appearance);
  const frame = createMemo(viewerFrame);
  // Width while the right edge is dragged, before it is saved.
  const [dragW, setDragW] = createSignal<number | null>(null);
  const w = () => dragW() ?? frame().w;
  const lines = () =>
    headingLines(look(), doc.appearance.heading, frame().heading.x, frame().heading.y);
  const legend = () =>
    legendMarkup(look(), drawnLegend(doc), frame().legend.x, frame().legend.y, usedStatuses(doc));
  const ghost = (key: Key) => {
    if (doc.appearance.heading?.[key] || inlineEditId() === HEADING_EDIT[key]) return;
    // Frame notes sit where a missing subtitle would go, as exports draw them.
    if (key === 'subtitle' && frame().notes.some(n => n.inFrame)) return;
    return headingSlot(frame(), key);
  };
  let start = 0;
  const onEdgeDown = (e: PointerEvent) => {
    if (e.button) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    start = screenToWorld(e.clientX, 0).x - (frame().x + frame().w);
    setDragW(frame().w);
  };
  const onEdgeMove = (e: PointerEvent) => {
    if (dragW() === null) return;
    e.stopPropagation();
    const right = screenToWorld(e.clientX, 0).x - start;
    setDragW(Math.max(frame().natural, MIN_FRAME_WIDTH, right - frame().x));
  };
  const onEdgeUp = (e: PointerEvent) => {
    const next = dragW();
    if (next === null) return;
    e.stopPropagation();
    setDragW(null);
    // Back at the content's own width, the frame follows the content again.
    const width = next - frame().natural < 4 ? undefined : Math.round(next);
    if (width === doc.appearance.heading?.width) return;
    transact('Resize frame', d => {
      const heading = (d.appearance.heading ??= {});
      if (width) heading.width = width;
      else delete heading.width;
    });
  };

  return (
    <g class="diagram-frame" classList={{ resizing: dragW() !== null }}>
      <rect
        class="diagram-frame-page"
        x={frame().x}
        y={frame().y}
        width={w()}
        height={frame().h}
        fill={look().canvas}
      />
      <For each={lines()}>
        {line => (
          <text
            class="diagram-frame-heading"
            classList={{ editing: inlineEditId() === HEADING_EDIT[line.key] }}
            x={line.x}
            y={line.y + line.type.lineHeight / 2}
            dominant-baseline="central"
            font-family={line.type.family}
            font-size={String(line.type.size)}
            font-weight={String(line.type.weight)}
            fill={line.fill}
            data-heading={HEADING_EDIT[line.key]}
          >
            {line.text}
          </text>
        )}
      </For>
      <For each={['title', 'subtitle'] as const}>
        {key => (
          <Show when={ghost(key)}>
            {slot => (
              <text
                class="diagram-frame-ghost"
                x={slot().x}
                y={slot().y + slot().h / 2}
                dominant-baseline="central"
                font-family={look().annotation.family}
                font-size={String(look().annotation.size)}
                fill={look().muted}
                data-heading={HEADING_EDIT[key]}
              >
                {key === 'title' ? 'Double-click to add a title' : 'Double-click to add a subtitle'}
              </text>
            )}
          </Show>
        )}
      </For>
      {/* The key markup escapes its labels, as in exports. */}
      {/* eslint-disable-next-line solid/no-innerhtml */}
      <g class="diagram-frame-legend" pointer-events="none" innerHTML={legend()} />
      <rect
        class="diagram-frame-edge"
        data-frame-edge
        role="separator"
        aria-orientation="vertical"
        aria-label="Frame width. Drag to widen the frame."
        x={frame().x + w() - 6 / doc.camera.k}
        y={frame().y}
        width={12 / doc.camera.k}
        height={frame().h}
        onPointerDown={onEdgeDown}
        onPointerMove={onEdgeMove}
        onPointerUp={onEdgeUp}
        onPointerCancel={() => setDragW(null)}
      />
    </g>
  );
}
