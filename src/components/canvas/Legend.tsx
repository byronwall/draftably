import { For, Show } from 'solid-js';
import { NODE_SHADE, resolveAppearance, swatchFor } from '../../model/appearance';
import { doc } from '../../state/document';

/**
 * The file's `legend` lines as a key in the canvas corner, in the diagram's own colors and type.
 * It belongs to the drawing, so it follows the diagram's theme rather than the editor's.
 */
export function Legend() {
  const look = () => resolveAppearance(doc.appearance);
  const entries = () => doc.appearance.legend ?? [];
  return (
    <Show when={entries().length}>
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
      </aside>
    </Show>
  );
}
