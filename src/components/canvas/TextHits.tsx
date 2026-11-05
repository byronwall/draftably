import { createMemo, For, Show } from 'solid-js';
import { resolveAppearance } from '../../model/appearance';
import { measureText } from '../../model/fonts';
import { rectUnion } from '../../model/geometry';
import { parseTextId, selectedText, TEXT_NAMES } from '../../state/canvas-text';
import { doc } from '../../state/document';
import { drag, inlineEditId } from '../../state/editor';
import { routesById, sceneRects, viewerFrame } from '../../state/scene';
import { textBox, textBoxes } from './text-boxes';

/** Room between a text's words and its selection outline. */
const PAD = 3;

/**
 * Click targets over the frame's text: notes, legend rows and phase labels select on a click and
 * edit on a double-click; a note drags to sit beside another object. Change counts in the key
 * are counted from the drawing, so a click there shows a hint instead. Not part of exports.
 */
export function TextHits() {
  const frame = createMemo(viewerFrame);
  const boxes = createMemo(() => textBoxes(frame()));
  const selected = () => {
    const id = selectedText();
    return id && id !== inlineEditId() ? textBox(frame(), id)?.rect : undefined;
  };
  const statusRows = () =>
    frame()
      .key.items.filter(item => item.status)
      .map(item => ({
        x: frame().legend.x + item.x,
        y: frame().legend.y + 12 + item.y,
        w: 24 + measureText(item.label, resolveAppearance(doc.appearance).annotation),
        h: frame().key.row,
      }));
  const moving = () => drag()?.text;
  const anchor = () => {
    const near = moving()?.near;
    if (!near) return;
    const route = routesById().get(near);
    return (
      sceneRects().get(near) ??
      (route &&
        rectUnion(
          route.points.map(p => ({ ...p, w: 0, h: 0 })),
          6,
        ))
    );
  };
  const k = () => doc.camera.k;
  return (
    <g class="text-hits">
      <For each={boxes()}>
        {box => (
          <rect
            class="text-hit"
            classList={{ note: parseTextId(box.id)?.kind === 'note' }}
            data-text={box.id}
            role="button"
            aria-label={`Diagram ${TEXT_NAMES[parseTextId(box.id)!.kind]}. Double-click to edit.`}
            x={box.rect.x - PAD}
            y={box.rect.y - PAD}
            width={box.rect.w + PAD * 2}
            height={box.rect.h + PAD * 2}
          />
        )}
      </For>
      {/* Links sit over their text's click box: a click opens the link, as a node's link mark does. */}
      <For each={boxes().flatMap(b => b.links ?? [])}>
        {link => (
          <rect
            class="text-hit link"
            data-open-link={link.href}
            aria-label={`Open ${link.href}`}
            x={link.x}
            y={link.y}
            width={link.w}
            height={link.h}
          >
            <title>{link.href}</title>
          </rect>
        )}
      </For>
      <For each={statusRows()}>
        {r => (
          <rect
            class="text-hit read-only"
            data-text-hint="Change counts come from the drawing. Edit each object's status to change them."
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
          >
            <title>Counted from the drawing</title>
          </rect>
        )}
      </For>
      <Show when={selected()}>
        {r => (
          <rect
            class="text-selection"
            x={r().x - PAD}
            y={r().y - PAD}
            width={r().w + PAD * 2}
            height={r().h + PAD * 2}
            rx={4}
            stroke-width={1.5 / k()}
          />
        )}
      </Show>
      <Show when={anchor()}>
        {r => (
          <rect
            class="text-anchor"
            x={r().x - 4}
            y={r().y - 4}
            width={r().w + 8}
            height={r().h + 8}
            rx={6}
            stroke-width={1.5 / k()}
          />
        )}
      </Show>
      <Show when={moving()}>
        {m => (
          <rect
            class="text-ghost"
            x={m().rect.x}
            y={m().rect.y}
            width={m().rect.w}
            height={m().rect.h}
            rx={4}
            stroke-width={1.5 / k()}
          />
        )}
      </Show>
    </g>
  );
}
