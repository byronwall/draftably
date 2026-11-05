import { PHASE_TAB } from '../../cli/svg';
import { resolveAppearance, swatchFor, type ResolvedAppearance } from '../../model/appearance';
import type { DiagramFrame } from '../../model/frame';
import { measureText } from '../../model/fonts';
import type { Rect } from '../../model/types';
import { parseTextId, textId } from '../../state/canvas-text';
import { doc } from '../../state/document';
import { headingSlot } from './Frame';

type Type = ResolvedAppearance['annotation'];

/** A piece of canvas text: its id, where it is drawn, and the type and paint to edit it in. */
export interface TextBox {
  id: string;
  rect: Rect;
  type: Type;
  fill: string;
  ink: string;
}

/**
 * Every note, legend row and phase label the frame draws, with the box a click or an edit covers.
 * Status rows in the key are counted from the drawing, so they are not here.
 */
export function textBoxes(frame: DiagramFrame): TextBox[] {
  const look = resolveAppearance(doc.appearance),
    type = look.annotation,
    panel = swatchFor(look, 'slate', 50, 'group').fill,
    out: TextBox[] = [];
  frame.notes.forEach((n, i) =>
    out.push({ id: textId('note', i), rect: n.rect, type, fill: panel, ink: look.text }),
  );
  const legend = doc.appearance.legend?.length ?? 0;
  frame.key.items.forEach((item, i) => {
    if (!item.legend || i >= legend) return;
    out.push({
      id: textId('legend', i),
      rect: {
        x: frame.legend.x + item.x,
        y: frame.legend.y + 12 + item.y,
        w: 24 + measureText(item.label, type),
        h: frame.key.row,
      },
      type,
      fill: look.canvas,
      ink: look.text,
    });
  });
  const seq = doc.layout.sequence;
  for (const ph of seq?.phases ?? [])
    out.push({
      id: textId('phase', ph.id),
      rect: {
        x: (seq!.phaseX ?? seq!.panel.x) + PHASE_TAB - 2,
        y: ph.y + PHASE_TAB - 2,
        w: measureText(ph.label, type) + 4,
        h: type.lineHeight,
      },
      type,
      fill: look.canvas,
      ink: look.muted,
    });
  return out;
}

/** The box of one text id, including the title and subtitle; undefined when it is not drawn. */
export function textBox(frame: DiagramFrame, id: string): TextBox | undefined {
  const t = parseTextId(id);
  if (!t) return;
  if (t.kind === 'title' || t.kind === 'subtitle') {
    const slot = headingSlot(frame, t.kind),
      look = resolveAppearance(doc.appearance);
    return (
      slot && {
        id,
        rect: slot,
        type: slot.type,
        fill: look.canvas,
        ink: t.kind === 'title' ? look.text : look.muted,
      }
    );
  }
  return textBoxes(frame).find(b => b.id === id);
}
