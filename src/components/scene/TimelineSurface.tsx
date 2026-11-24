import { createMemo, For, Show } from 'solid-js';
import { timelineMarkup } from '../../runtime/svg-renderer';
import { resolveAppearance } from '../../model/appearance';
import type { Diagram } from '../../model/types';

export function TimelineSurface(props: {
  doc: Diagram;
  selected?: string[];
  pick?: (id: string) => void;
  reveal?: (id: string) => void;
}) {
  const chart = () => props.doc.layout.timeline;
  const markup = createMemo(() =>
    timelineMarkup(props.doc, resolveAppearance(props.doc.appearance)),
  );
  const item = (e: Event) =>
    (e.target as Element).closest('[data-timeline-id]')?.getAttribute('data-timeline-id');
  return (
    <Show when={chart()}>
      {c => (
        <g
          class="timeline-surface"
          onPointerDown={e => {
            const id = item(e);
            if (id && props.pick && e.button === 0) {
              e.stopPropagation();
              props.pick(id);
            }
          }}
          onDblClick={e => {
            const id = item(e);
            if (id && props.reveal) {
              e.stopPropagation();
              props.reveal(id);
            }
          }}
          onKeyDown={e => {
            const id = item(e);
            if (id && e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              props.pick?.(id);
              props.reveal?.(id);
            }
          }}
        >
          {/* All user text is escaped by the export renderer. */}
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <g innerHTML={markup()} />
          <g transform={`translate(${c().x} ${c().y})`} pointer-events="none">
            <For each={props.selected}>
              {id => (
                <Show when={c().boxes[id]}>
                  {b => (
                    <rect
                      x={b().x}
                      y={b().y}
                      width={b().w}
                      height={b().h}
                      rx="4"
                      stroke="var(--accent)"
                      fill="none"
                      stroke-width="2"
                    />
                  )}
                </Show>
              )}
            </For>
          </g>
        </g>
      )}
    </Show>
  );
}
