import { For, Show } from 'solid-js';
import { resolveAppearance } from '../../model/appearance';
import type { Diagram, NodeLayout } from '../../model/types';
import { LIFELINE } from '../../dsl/frame';

/** Sequence participants' dashed lifelines, drawn under the message lines. */
export function Lifelines(props: {
  doc: Diagram;
  ids: string[];
  rect: (id: string) => NodeLayout | undefined;
}) {
  const look = () => resolveAppearance(props.doc.appearance);
  const length = (id: string) => props.doc.graph.nodes.find(n => n.id === id)?.lifeline;
  return (
    <g class="lifelines" pointer-events="none">
      <For each={props.ids}>
        {id => (
          <Show when={length(id) ? props.rect(id) : undefined}>
            {r => (
              <line
                x1={r().x + r().w / 2}
                x2={r().x + r().w / 2}
                y1={r().y + r().h}
                y2={r().y + r().h + length(id)!}
                stroke={look().muted}
                stroke-width={LIFELINE.width}
                stroke-dasharray={LIFELINE.dash}
              />
            )}
          </Show>
        )}
      </For>
    </g>
  );
}
