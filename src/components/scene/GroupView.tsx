import { createMemo, Show } from 'solid-js';
import { descendants, findGroup, findNode, isCollapsed } from '../../model/graph';
import { resolveAppearance } from '../../model/appearance';
import { drawnSwatch } from '../../model/colors';
import { statusPaint } from '../../model/status';
import { truncateText } from '../../model/fonts';
import type { Diagram, NodeLayout } from '../../model/types';
import { SceneGlyph } from '../Icon';
import { PositionBadge, ResizeHandles } from './parts';

/** A container's border is quieter than a connection: thinner and partly transparent. */
export const GROUP_BORDER = { width: 1, opacity: 0.65 };

export interface GroupViewProps {
  doc: Diagram;
  id: string;
  rect: NodeLayout;
  selected?: boolean;
  dropTarget?: boolean;
  interactive?: boolean;
  zoom?: number;
  focused?: boolean;
  /** Its title is being edited in place, so the drawn title hides. */
  editing?: boolean;
}

export function GroupView(props: GroupViewProps) {
  const group = () => findGroup(props.doc, props.id)!;
  const look = () => resolveAppearance(props.doc.appearance);
  const color = () => drawnSwatch(props.doc, look(), props.id, 'group');
  const paint = () => statusPaint(look(), props.doc.styles[props.id]?.status);
  const collapsed = () => isCollapsed(props.doc, props.id);
  const shapeCount = createMemo(
    () => descendants(props.doc, props.id).filter(id => findNode(props.doc, id)).length,
  );
  // Titles are shortened to the frame width rather than wrapped, leaving room for the controls.
  const title = () =>
    truncateText(group().title, Math.max(40, props.rect.w - 33 - 64), look().groupTitle);
  const w = () => props.rect.w;
  /** Middle of the title band at the top of the frame, the same open or collapsed. */
  const band = () => look().groupHeader / 2 - 7;

  return (
    <g
      class="group"
      classList={{
        selected: props.selected,
        'drop-target': props.dropTarget,
        focused: props.focused,
        editing: props.editing,
      }}
      data-kind="group"
      data-id={props.id}
      transform={`translate(${props.rect.x},${props.rect.y})`}
      opacity={paint().opacity < 1 ? paint().opacity : undefined}
      tabindex={props.interactive ? 0 : undefined}
      role={props.interactive ? 'button' : undefined}
      aria-label={
        props.interactive ? `${group().title}, container, ${shapeCount()} shapes` : undefined
      }
      aria-pressed={props.interactive ? !!props.selected : undefined}
    >
      <rect
        class="group-bg"
        width={w()}
        height={props.rect.h}
        rx={Math.min(10, look().radius + 4)}
        fill={color().fill}
        stroke={color().stroke}
        stroke-width={paint().width ?? GROUP_BORDER.width}
        stroke-opacity={paint().stroke ? 1 : GROUP_BORDER.opacity}
        stroke-dasharray={paint().dash}
      />
      <rect
        class="group-header"
        data-group-header
        width={Math.max(0, w() - 30)}
        height={band() * 2}
        fill="transparent"
      />
      <SceneGlyph name="group" x={12} y={band() - 6.5} size={13} color={color().ink} />
      <text
        class="group-title"
        x={33}
        y={band()}
        dominant-baseline="central"
        font-family={look().groupTitle.family}
        font-size={String(look().groupTitle.size)}
        font-weight={String(look().groupTitle.weight)}
        fill={color().ink}
        text-decoration={paint().strike ? 'line-through' : undefined}
        pointer-events="none"
      >
        {title()}
      </text>
      <Show when={props.interactive}>
        <g class="group-collapse" data-collapse>
          <rect x={w() - 29} y={5} width={24} height={24} rx={5} fill="transparent" />
          <path
            d={`M${w() - 22} 17h10${collapsed() ? 'm-5-5v10' : ''}`}
            fill="none"
            stroke={color().ink}
            stroke-width={1.4}
          />
          <title>{collapsed() ? 'Expand' : 'Collapse'} container</title>
        </g>
        <PositionBadge
          pinned={!!props.rect.pinned}
          manual={!!props.rect.manual && props.doc.settings.showManual}
          x={w() - 26}
          y={9}
        />
      </Show>
      <Show when={collapsed()}>
        <text
          x={33}
          y={band() * 2 + 9}
          font-family={look().annotation.family}
          font-size="10"
          fill={color().ink}
        >
          {shapeCount()} shapes
        </text>
      </Show>
      <Show when={props.interactive && props.selected && !collapsed()}>
        <ResizeHandles rect={props.rect} zoom={props.zoom ?? 1} />
      </Show>
    </g>
  );
}
