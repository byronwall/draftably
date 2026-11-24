import { createMemo, For, Match, Switch } from 'solid-js';
import type { ResolvedAppearance } from '../../model/appearance';
import { resolveAppearance } from '../../model/appearance';
import {
  timelineOrigin,
  timelineColor,
  timelineFont,
  type PlacedTimeline,
  type TimelineMark,
} from '../../model/timeline';
import type { Diagram, Rect } from '../../model/types';

/**
 * The diagram's timelines in the editor: the compiler's marks, drawn by the same function as the
 * SVG export, with a hit area on every row and band so selection works as it does on boxes.
 * Rows and bands keep their world boxes; the marks sit at each timeline's origin.
 */
export function TimelineViews(props: {
  doc: Diagram;
  rect: (id: string) => Rect | undefined;
  selected?: (id: string) => boolean;
}) {
  return (
    <For each={props.doc.layout.timelines ?? []}>
      {t => <TimelineView doc={props.doc} t={t} rect={props.rect} selected={props.selected} />}
    </For>
  );
}

function TimelineView(props: {
  doc: Diagram;
  t: PlacedTimeline;
  rect: (id: string) => Rect | undefined;
  selected?: (id: string) => boolean;
}) {
  const look = createMemo(() => resolveAppearance(props.doc.appearance));
  // The group's live box: while it is dragged, the marks move with its frame and rows.
  const origin = () => timelineOrigin(props.t, props.rect(props.t.scope));
  const bands = () =>
    props.doc.graph.groups.filter(
      g => g.parentId === props.t.scope || (props.t.scope === 'root' && !g.parentId),
    );
  const hit = (id: string, kind: 'node' | 'group', pad: number) => {
    const r = () => props.rect(id);
    return (
      <rect
        class="timeline-hit"
        classList={{ 'timeline-row': kind === 'node', selected: props.selected?.(id) }}
        data-kind={kind}
        data-id={id}
        x={(r()?.x ?? 0) - pad}
        y={r()?.y ?? 0}
        width={(r()?.w ?? 0) + 2 * pad}
        height={r()?.h ?? 0}
        rx="4"
      />
    );
  };
  return (
    <g class="timeline">
      <For each={bands().filter(g => props.rect(g.id)?.w)}>{g => hit(g.id, 'group', 10)}</For>
      <g pointer-events="none" transform={`translate(${origin().x},${origin().y})`}>
        <For each={props.t.under}>{m => <Mark look={look()} m={m} />}</For>
      </g>
      <For each={props.t.ids.filter(id => (props.rect(id)?.w ?? 0) > 1)}>
        {id => hit(id, 'node', 6)}
      </For>
      <g pointer-events="none" transform={`translate(${origin().x},${origin().y})`}>
        <For each={props.t.over}>{m => <Mark look={look()} m={m} />}</For>
      </g>
    </g>
  );
}

/** One mark, as `markSvg` in `model/timeline.ts` writes it for the SVG export. */
function Mark(props: { look: ResolvedAppearance; m: TimelineMark }) {
  const c = () => timelineColor(props.look, props.m.ink);
  return (
    <Switch>
      <Match when={props.m.k === 'line' && props.m}>
        {m => (
          <line
            x1={m().x1}
            y1={m().y1}
            x2={m().x2}
            y2={m().y2}
            stroke={c()}
            stroke-width={m().w}
            stroke-dasharray={m().dash}
            stroke-linecap={m().round ? 'round' : undefined}
          />
        )}
      </Match>
      <Match when={props.m.k === 'rect' && props.m}>
        {m => <rect x={m().x} y={m().y} width={m().w} height={m().h} rx={m().r} fill={c()} />}
      </Match>
      <Match when={props.m.k === 'dot' && props.m}>
        {m => <circle cx={m().x} cy={m().y} r={m().r} fill={c()} />}
      </Match>
      <Match when={props.m.k === 'path' && props.m}>
        {m =>
          m().stroke ? (
            <path
              d={m().d}
              fill="none"
              stroke={c()}
              stroke-width={m().stroke}
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          ) : (
            <path d={m().d} fill={c()} />
          )
        }
      </Match>
      <Match when={props.m.k === 'text' && props.m}>
        {m => {
          const f = () => timelineFont(props.look, m().font);
          return (
            <text
              x={m().x}
              y={m().y}
              dominant-baseline="central"
              text-anchor={m().anchor ?? 'start'}
              font-family={f().family}
              font-size={String(f().size)}
              font-weight={String(f().weight)}
              fill={c()}
            >
              {m().full ? <title>{m().full}</title> : null}
              {m().text}
            </text>
          );
        }}
      </Match>
    </Switch>
  );
}
