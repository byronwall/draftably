import { For, Show } from 'solid-js';
import type { TypeProfile } from '../../model/fonts';
import type { Rect } from '../../model/types';

/** Multi-line, vertically centered text in one of the diagram's type profiles. */
export function SceneText(props: {
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  type: TypeProfile;
  fill: string;
  class?: string;
}) {
  const first = () => props.y - ((props.lines.length - 1) * props.lineHeight) / 2;
  return (
    <text
      class={props.class}
      x={props.x}
      y={first()}
      font-size={String(props.type.size)}
      font-weight={String(props.type.weight)}
      font-family={props.type.family}
      fill={props.fill}
      text-anchor="middle"
      dominant-baseline="central"
    >
      <For each={props.lines}>
        {(line, i) => (
          <tspan x={props.x} dy={i() ? props.lineHeight : 0}>
            {line}
          </tspan>
        )}
      </For>
    </text>
  );
}

/** "Pinned" or "Manual" tag in an object's top-right corner. */
export function PositionBadge(props: { pinned: boolean; manual: boolean; x: number; y: number }) {
  const width = () => (props.pinned ? 45 : 47);
  return (
    <Show when={props.pinned || props.manual}>
      <g class="position-badge" classList={{ pinned: props.pinned }}>
        <rect x={props.x - width() - 9} y={props.y} width={width()} height={16} rx={4} />
        <text x={props.x - width() / 2 - 9} y={props.y + 11} text-anchor="middle">
          {props.pinned ? 'Pinned' : 'Manual'}
        </text>
      </g>
    </Show>
  );
}

const HANDLES = [
  ['nw', 0, 0],
  ['n', 0.5, 0],
  ['ne', 1, 0],
  ['e', 1, 0.5],
  ['se', 1, 1],
  ['s', 0.5, 1],
  ['sw', 0, 1],
  ['w', 0, 0.5],
] as const;

const CURSORS: Record<string, string> = {
  nw: 'nwse',
  se: 'nwse',
  ne: 'nesw',
  sw: 'nesw',
  n: 'ns',
  s: 'ns',
  e: 'ew',
  w: 'ew',
};

/** Square handles that keep a constant screen size. Shapes use corners only. */
export function ResizeHandles(props: { rect: Rect; zoom: number; corners?: boolean }) {
  const size = () => 7 / props.zoom;
  return (
    <For each={HANDLES.filter(([side]) => !props.corners || side.length === 2)}>
      {([side, fx, fy]) => (
        <rect
          class="resize-handle"
          data-resize={side}
          x={props.rect.w * fx - size() / 2}
          y={props.rect.h * fy - size() / 2}
          width={size()}
          height={size()}
          rx={1 / props.zoom}
          style={{ cursor: `${CURSORS[side]}-resize` }}
        >
          <title>{props.corners ? 'Resize shape' : 'Resize container only'}</title>
        </rect>
      )}
    </For>
  );
}
