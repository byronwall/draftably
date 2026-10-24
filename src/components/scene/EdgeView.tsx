import { For, Show } from 'solid-js';
import { findEdge, findNode } from '../../model/graph';
import type { DrawnRoute } from '../../model/routes';
import { resolveAppearance, swatchFor } from '../../model/appearance';
import type { Diagram } from '../../model/types';

/** Width of the halo under a connection, in drawing units. */
export const EDGE_HALO = 8;

export interface EdgeViewProps {
  doc: Diagram;
  route: DrawnRoute;
  selected?: boolean;
  interactive?: boolean;
  /** Its label is being edited in place, so the drawn label hides. */
  editing?: boolean;
  /** Keeps marker ids unique when several scenes share a page. */
  idPrefix?: string;
}

export function EdgeView(props: EdgeViewProps) {
  const edge = () => findEdge(props.doc, props.route.id)!;
  const look = () => resolveAppearance(props.doc.appearance);
  const stroke = () =>
    props.route.blocked
      ? swatchFor(look(), 'red', 600).fill
      : edge().emphasis && !edge().dashed
        ? swatchFor(look(), 'primary', 700).fill
        : look().connection;
  const markerId = () => `${props.idPrefix ?? ''}arrow-${props.route.id}`;
  const waypoints = () =>
    props.interactive && props.selected
      ? (props.doc.layout.edges[props.route.id]?.waypoints ?? [])
      : [];
  const description = () => {
    const e = edge();
    return `${findNode(props.doc, e.from)?.title} to ${findNode(props.doc, e.to)?.title}${e.label ? ', ' + e.label : ''}`;
  };

  return (
    <g
      class="edge"
      classList={{ selected: props.selected, editing: props.editing }}
      data-kind="edge"
      data-id={props.route.id}
      tabindex={props.interactive ? 0 : undefined}
      role={props.interactive ? 'button' : undefined}
      aria-label={props.interactive ? description() : undefined}
    >
      <title>
        {(edge().label || 'Connection') +
          (props.route.blocked ? ' — route obstructed; move overlapping nodes or reset bends' : '')}
      </title>
      <defs>
        <marker
          id={markerId()}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M1 1L7 4L1 7"
            fill="none"
            stroke={props.selected ? 'var(--accent)' : stroke()}
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </marker>
      </defs>
      <Show when={props.interactive}>
        <path class="edge-hit" d={props.route.path} />
      </Show>
      {/* A canvas-colored halo breaks container borders (and earlier lines) where this line
          crosses them, so the connection reads as the stronger mark. */}
      <path
        class="edge-halo"
        d={props.route.path}
        stroke={look().canvas}
        stroke-width={EDGE_HALO}
        fill="none"
        stroke-linejoin="round"
      />
      <path
        class="edge-line"
        d={props.route.path}
        stroke={stroke()}
        stroke-width={edge().emphasis ? 2 : 1.4}
        stroke-dasharray={edge().dashed || props.route.blocked ? '5 5' : undefined}
        marker-end={edge().directed ? `url(#${markerId()})` : undefined}
      />
      <Show when={props.route.label}>
        {label => (
          <g data-edge-label>
            <rect
              class="edge-label-bg"
              x={label().x - label().w / 2}
              y={label().y - label().h / 2}
              width={label().w}
              height={label().h}
              rx={4}
              fill={look().canvas}
            />
            <text
              class="edge-label"
              x={label().x}
              y={label().y}
              fill={stroke()}
              font-family={look().annotation.family}
              font-size={String(look().annotation.size)}
              font-weight={String(look().annotation.weight)}
            >
              {edge().label}
            </text>
          </g>
        )}
      </Show>
      <For each={waypoints()}>
        {(p, i) => (
          <rect
            class="waypoint"
            data-waypoint={i()}
            x={p.x - 5}
            y={p.y - 5}
            width={10}
            height={10}
            rx={2}
          >
            <title>Drag to move bend. Double-click to remove.</title>
          </rect>
        )}
      </For>
    </g>
  );
}
