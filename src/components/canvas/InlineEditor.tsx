import { createEffect, createMemo, on, onMount, Show } from 'solid-js';
import { clamp } from '../../model/geometry';
import { resolveAppearance, swatchFor } from '../../model/appearance';
import { findEdge, findGroup, findNode, objectRect, styleOf } from '../../model/graph';
import {
  finishInlineEdit,
  inlineDraft,
  quickExtend,
  setInlineDraft,
  setTool,
} from '../../state/actions';
import { doc, setSelection } from '../../state/document';
import { focusCanvas, inlineEditId, stageSize } from '../../state/editor';
import { geometry, routesById } from '../../state/scene';

/** A text box over the canvas for editing a shape, container or connection label in place. */
export function InlineEditor() {
  return <Show when={inlineEditId()}>{id => <Editor id={id()} />}</Show>;
}

function Editor(props: { id: string }) {
  let input!: HTMLTextAreaElement;
  const look = () => resolveAppearance(doc.appearance);

  /**
   * The editor sits on the object itself: a shape's whole face, a container's title band, or a
   * connection's label, in the object's own font, colors and line height. Below about 12px text
   * it is drawn larger than the object, around the same center, so it stays legible.
   */
  const frame = createMemo(() => {
    const k = doc.camera.k,
      { width, height } = stageSize();
    let world: { x: number; y: number; w: number; h: number },
      type = look().annotation,
      fill = look().canvas,
      ink = look().text,
      align: 'center' | 'left' = 'center',
      radius = 4;
    if (findEdge(doc, props.id)) {
      const route = routesById().get(props.id),
        at = route?.label ?? route?.points[Math.floor(route.points.length / 2)] ?? { x: 0, y: 0 };
      const w = Math.max(route?.label?.w ?? 0, 120),
        h = route?.label?.h ?? type.lineHeight + 6;
      world = { x: at.x - w / 2, y: at.y - h / 2, w, h };
    } else if (findGroup(doc, props.id)) {
      const r = objectRect(doc, geometry, props.id),
        style = styleOf(doc, props.id),
        swatch = swatchFor(look(), style.color, style.shade, 'group'),
        band = look().groupHeader / 2 - 7;
      type = look().groupTitle;
      fill = swatch.fill;
      ink = swatch.ink;
      align = 'left';
      world = { x: r.x + 28, y: r.y + 3, w: Math.max(80, r.w - 28 - 34), h: band * 2 - 6 };
    } else {
      const r = objectRect(doc, geometry, props.id),
        style = styleOf(doc, props.id),
        swatch = swatchFor(look(), style.color, style.shade, 'node');
      type = look().title;
      // Text shapes and images keep their title off the face; those edit on the canvas color.
      const onFace = style.shape !== 'text' && style.shape !== 'image';
      fill = onFace ? swatch.fill : look().canvas;
      ink = onFace ? swatch.ink : look().text;
      radius = Math.min(look().radius, r.h / 2);
      world = r;
    }
    const scale = Math.max(k, 12 / type.size),
      w = world.w * scale,
      h = world.h * scale,
      cx = (world.x + world.w / 2) * k + doc.camera.x,
      cy = (world.y + world.h / 2) * k + doc.camera.y;
    return {
      left: clamp(cx - w / 2, 5, Math.max(5, width - w - 5)),
      top: clamp(cy - h / 2, 5, Math.max(5, height - h - 5)),
      w,
      h,
      scale,
      type,
      fill,
      ink,
      align,
      radius: radius * scale,
    };
  });

  /** Grow the text box to its content, so a long title never scrolls. */
  const fit = () => {
    input.style.height = '0px';
    input.style.height = `${input.scrollHeight}px`;
  };

  const label = () =>
    findEdge(doc, props.id)
      ? 'Edit connection label'
      : findGroup(doc, props.id)
        ? 'Edit container title'
        : 'Edit node title';

  onMount(() => {
    input.focus();
    input.select();
    fit();
  });
  createEffect(on(frame, () => fit(), { defer: true }));

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.isComposing) return;
    if (e.key === 'Tab') {
      // Tab keeps going: commit and add the next connected shape (Shift: a sibling branch).
      e.preventDefault();
      const id = props.id;
      finishInlineEdit(true);
      setSelection([id]);
      if (findNode(doc, id) || findEdge(doc, id)) quickExtend({ sibling: e.shiftKey });
      else focusCanvas();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishInlineEdit(true);
      focusCanvas();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishInlineEdit(false);
      setTool('select');
    }
  };

  return (
    <div
      class="inline-edit"
      classList={{ left: frame().align === 'left' }}
      style={{
        left: `${frame().left}px`,
        top: `${frame().top}px`,
        width: `${frame().w}px`,
        'min-height': `${frame().h}px`,
        background: frame().fill,
        'border-radius': `${frame().radius}px`,
      }}
    >
      <textarea
        ref={input}
        rows={1}
        aria-label={label()}
        value={inlineDraft()}
        onInput={e => {
          setInlineDraft(e.currentTarget.value);
          fit();
        }}
        onKeyDown={onKeyDown}
        onBlur={() => finishInlineEdit(true)}
        style={{
          color: frame().ink,
          'font-family': frame().type.family,
          'font-size': `${frame().type.size * frame().scale}px`,
          'font-weight': String(frame().type.weight),
          'line-height': `${frame().type.lineHeight * frame().scale}px`,
          'text-align': frame().align,
        }}
      />
    </div>
  );
}
