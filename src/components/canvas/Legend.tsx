import { For, Show } from 'solid-js';
import { NODE_SHADE, resolveAppearance, swatchFor } from '../../model/appearance';
import { STATUS_LABELS, statusPaint, usedStatuses } from '../../model/status';
import { doc } from '../../state/document';

/**
 * The file's `legend` lines as a key in the canvas corner, in the diagram's own colors and type.
 * It belongs to the drawing, so it follows the diagram's theme rather than the editor's.
 */
export function Legend() {
  const look = () => resolveAppearance(doc.appearance);
  const entries = () => doc.appearance.legend ?? [];
  const statuses = () => usedStatuses(doc);
  return (
    <Show when={entries().length || statuses().length}>
      <aside
        class="diagram-legend"
        aria-label="Legend"
        style={{
          background: look().canvas,
          color: look().text,
          'font-family': look().annotation.family,
        }}
      >
        <For each={entries()}>
          {e => {
            const swatch = () => swatchFor(look(), e.family, e.shade ?? NODE_SHADE, 'node');
            return (
              <div class="diagram-legend-row">
                <span
                  class="diagram-legend-swatch"
                  style={{ background: swatch().fill, 'border-color': swatch().stroke }}
                />
                <span>{e.label}</span>
              </div>
            );
          }}
        </For>
        <For each={statuses()}>
          {s => {
            const p = () => statusPaint(look(), s);
            return (
              <div class="diagram-legend-row">
                <span
                  class="diagram-legend-swatch"
                  style={{
                    background: p().stroke ? look().canvas : look().muted,
                    'border-color': p().stroke ?? look().muted,
                    'border-width': `${p().width ?? 1}px`,
                    'border-style': p().dash ? 'dashed' : 'solid',
                    opacity: p().opacity,
                  }}
                />
                <span>{STATUS_LABELS[s]}</span>
              </div>
            );
          }}
        </For>
      </aside>
    </Show>
  );
}
