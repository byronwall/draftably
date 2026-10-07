import { createMemo, For, Show } from 'solid-js';
import { SculptLab } from '../../engines/sculpt-engine.js';
import { center } from '../../model/geometry';
import { findNode, isGroup, styleOf } from '../../model/graph';
import { portPoint, sideToward, SIDE_VECTORS } from '../../model/routes';
import type { NodeLayout, Side } from '../../model/types';
import { doc, singleSelection } from '../../state/document';
import { connectFrom, drag, inlineEditId, pointer, tool } from '../../state/editor';
import { geometry, sculptGeometry } from '../../state/scene';
import { roundedPath } from '../../model/geometry';
import {
  brushActive,
  brushHover,
  brushPoint,
  brushSettings,
  heldIds,
  restoreKey,
  stroking,
  timeline,
} from '../../state/sculpt';

/** Temporary drawing on top of the diagram: gestures, connection previews and brush feedback. */
export function Overlay() {
  return (
    <g class="overlay-layer">
      <GestureFeedback />
      <ConnectionPreview />
      <QuickAddButtons />
      <TimelineGhosts />
      <HeldObjects />
      <BrushCursor />
    </g>
  );
}

function GestureFeedback() {
  return (
    <>
      <Show when={drag()?.marquee}>
        {r => <rect class="marquee" x={r().x} y={r().y} width={r().w} height={r().h} />}
      </Show>
      <Show when={drag()?.draw}>
        {r => (
          <rect class="drawing-preview" x={r().x} y={r().y} width={r().w} height={r().h} rx={8} />
        )}
      </Show>
      <For each={drag()?.guides ?? []}>
        {g => (
          <path
            class="guide"
            d={g.axis === 'x' ? `M${g.value} ${g.from}V${g.to}` : `M${g.from} ${g.value}H${g.to}`}
          />
        )}
      </For>
    </>
  );
}

/** Dashed elbow from the connection source to the pointer. */
function ConnectionPreview() {
  const path = createMemo(() => {
    const from = connectFrom(),
      b = pointer();
    if (!from || !b || !findNode(doc, from.id)) return null;
    const r = geometry(from.id),
      side: Side = from.side === 'auto' ? sideToward(r, b) : from.side,
      a = portPoint(styleOf(doc, from.id).shape, r, side),
      points =
        side === 'left' || side === 'right'
          ? [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b]
          : [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b];
    return roundedPath(points, doc.settings.routing.cornerRadius);
  });
  return <Show when={path()}>{d => <path class="connection-preview" d={d()} />}</Show>;
}

/** "+" buttons beside a single selected shape that add a connected shape. */
function QuickAddButtons() {
  const owner = () => {
    const id = singleSelection();
    const visible =
      id &&
      findNode(doc, id) &&
      !sculptGeometry() &&
      tool() !== 'brush' &&
      !drag() &&
      !inlineEditId() &&
      !connectFrom() &&
      !timeline();
    return visible ? id : null;
  };
  return (
    <Show when={owner()}>
      {id => (
        <For each={['right', 'bottom'] as Side[]}>
          {side => {
            const k = () => doc.camera.k;
            const at = () => {
              const p = portPoint(styleOf(doc, id()).shape, geometry(id()), side),
                v = SIDE_VECTORS[side];
              return { x: p.x + (v.x * 26) / k(), y: p.y + (v.y * 26) / k() };
            };
            const size = () => 22 / k();
            return (
              <g
                class="quick-add"
                data-quick-add={side}
                data-owner={id()}
                role="button"
                tabindex="0"
                aria-label={`Add connected shape ${side}`}
              >
                <title>Add connected shape {side} · Alt + arrow</title>
                <circle cx={at().x} cy={at().y} r={size() / 2} />
                <path
                  d={`M${at().x - size() / 4} ${at().y}h${size() / 2}M${at().x} ${at().y - size() / 4}v${size() / 2}`}
                />
              </g>
            );
          }}
        </For>
      )}
    </Show>
  );
}

/** Dashed outlines showing where shapes go next while scrubbing a timeline. */
function TimelineGhosts() {
  const ghosts = createMemo(() => {
    const t = timeline();
    if (!t?.data || t.ghost === 'off') return [];
    const k = doc.camera.k,
      index = t.peek ?? t.index,
      at = t.data.frames[index],
      next =
        t.ghost === 'final'
          ? t.data.frames.length - 1
          : SculptLab.lookahead(t.data.frames, index, 48, k),
      to = t.data.frames[next];
    return Object.entries(to.nodes)
      .filter(
        ([id, p]) =>
          at.nodes[id] && Math.hypot(at.nodes[id].x - p.x, at.nodes[id].y - p.y) >= 1 / k,
      )
      .map(([id, p]) => ({ id, p, from: center(at.nodes[id]), to: center(p) }));
  });
  return (
    <g aria-hidden="true">
      <For each={ghosts()}>
        {g => (
          <>
            <path class="sculpt-travel" d={`M${g.from.x},${g.from.y} L${g.to.x},${g.to.y}`} />
            <Ghost id={g.id} rect={g.p} color="var(--accent)" opacity={0.48} />
          </>
        )}
      </For>
    </g>
  );
}

function Ghost(props: { id: string; rect: NodeLayout; color: string; opacity: number }) {
  return (
    <rect
      class="sculpt-ghost"
      x={props.rect.x}
      y={props.rect.y}
      width={props.rect.w}
      height={props.rect.h}
      rx={isGroup(doc, props.id) ? 8 : 10}
      style={{ stroke: props.color, opacity: props.opacity }}
      stroke-dasharray="5 4"
    />
  );
}

/** Objects held in place by the brush. */
function HeldObjects() {
  const k = () => doc.camera.k;
  return (
    <For each={heldIds()}>
      {id => {
        const p = () => geometry(id);
        return (
          <>
            <rect
              class="sculpt-held"
              x={p().x - 4 / k()}
              y={p().y - 4 / k()}
              width={p().w + 8 / k()}
              height={p().h + 8 / k()}
              rx={12}
            />
            <circle
              class="sculpt-held-dot"
              cx={p().x + p().w - 2 / k()}
              cy={p().y - 2 / k()}
              r={4}
            />
          </>
        );
      }}
    </For>
  );
}

/** The brush ring, plus a preview of what the next dab would move. */
function BrushCursor() {
  const visible = () => brushActive() && brushPoint() && !drag();
  const k = () => doc.camera.k;
  const restoring = () => restoreKey() || brushSettings().mode === 'restore';
  const color = () => (restoring() ? 'var(--sculpt-restore)' : 'var(--accent)');
  const weights = createMemo(() => Object.entries(brushHover()?.weights ?? {}));
  return (
    <Show when={visible() && brushPoint()}>
      {p => {
        const r = () => brushSettings().radius / k();
        const core = () => r() * (1 - brushSettings().softness / 100);
        return (
          <>
            <g class="sculpt-brush-ring" style={{ color: color() }} aria-hidden="true">
              <circle cx={p().x} cy={p().y} r={r()} class="brush-outer" />
              <circle cx={p().x} cy={p().y} r={core()} class="brush-core" />
              <path
                d={`M${p().x - 5 / k()},${p().y}h${10 / k()} M${p().x},${p().y - 5 / k()}v${10 / k()}`}
              />
            </g>
            <For each={weights()}>
              {([id, w]) => {
                const base = () => geometry(id);
                const target = () =>
                  !stroking() ? brushHover()?.document.layout.nodes[id] : undefined;
                const moves = () => {
                  const q = target();
                  return q && Math.hypot(q.x - base().x, q.y - base().y) > 0.05;
                };
                return (
                  <>
                    <rect
                      x={base().x}
                      y={base().y}
                      width={base().w}
                      height={base().h}
                      rx={10}
                      fill={color()}
                      opacity={w * 0.12}
                      pointer-events="none"
                    />
                    <Show when={moves()}>
                      <Ghost id={id} rect={target()!} color={color()} opacity={0.8} />
                    </Show>
                  </>
                );
              }}
            </For>
          </>
        );
      }}
    </Show>
  );
}
