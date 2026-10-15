import { createMemo, Show } from 'solid-js';
import { descendants, findGroup, findNode, isCollapsed, styleOf } from '../../model/graph';
import { resolveAppearance, swatchFor } from '../../model/appearance';
import { truncateText } from '../../model/fonts';
import type { Diagram, NodeLayout } from '../../model/types';
import { SceneGlyph } from '../Icon';
import { PositionBadge, ResizeHandles } from './parts';

export interface GroupViewProps {
  doc: Diagram;
  id: string;
  rect: NodeLayout;
  selected?: boolean;
  dropTarget?: boolean;
  interactive?: boolean;
  zoom?: number;
  focused?: boolean;
}

export function GroupView(props: GroupViewProps) {
  const group = () => findGroup(props.doc, props.id)!;
  const look = () => resolveAppearance(props.doc.appearance);
  const color = () => {
    const style = styleOf(props.doc, props.id);
    return swatchFor(look(), style.color, style.shade, 'group');
  };
  const collapsed = () => isCollapsed(props.doc, props.id);
  const shapeCount = createMemo(
    () => descendants(props.doc, props.id).filter(id => findNode(props.doc, id)).length,
  );
  // Titles are shortened to the frame width rather than wrapped, leaving room for the controls.
  const title = () =>
    truncateText(group().title, Math.max(40, props.rect.w - 33 - 64), look().groupTitle);
  const w = () => props.rect.w;
  /** Middle of the title band at the top of the frame. */
  const band = () => Math.min(look().groupHeader, collapsed() ? 32 : Infinity) / 2 - 7;

  return (
    <g
      class="group"
      classList={{
        selected: props.selected,
        'drop-target': props.dropTarget,
        focused: props.focused,
      }}
      data-kind="group"
      data-id={props.id}
      transform={`translate(${props.rect.x},${props.rect.y})`}
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
        stroke-width={1.2}
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
          x={14}
          y={43}
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
