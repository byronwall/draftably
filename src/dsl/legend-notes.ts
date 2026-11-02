/**
 * `check` advice on the key and the prose round a drawing: a `legend` swatch drawn in a shade that
 * no node of its family uses, and heading prose that the drawing should say instead.
 */
import { NODE_SHADE, resolveAppearance } from '../model/appearance';
import { wrapLines } from '../model/fonts';
import { headingTypes, subtitleMeasure } from '../model/heading';
import type { Diagnostic } from './compile';
import type { Model } from './syntax';

export function legendNotes(m: Model): Diagnostic[] {
  return [...shadeNotes(m), ...proseNotes(m)];
}

function shadeNotes(m: Model): Diagnostic[] {
  return (m.appearance.legend ?? []).flatMap((e, i) => {
    const nodes = m.objects.filter(o => o.type === 'node' && o.color === e.family),
      shade = e.shade ?? NODE_SHADE,
      used = [...new Set(nodes.map(o => o.shade ?? NODE_SHADE))].sort((a, b) => a - b);
    if (!nodes.length || used.includes(shade)) return [];
    return [
      {
        level: 'warning' as const,
        code: 'legend-shade',
        message: `legend ${e.family} is shade ${shade}; ${e.family} nodes use ${used.join(', ')}. Add \`shade=${used[0]}\`${used.length > 1 ? ' or another of them' : ''}.`,
        line: m.legendLines[i],
        ids: nodes.map(o => o.id),
      },
    ];
  });
}

/**
 * A diagram stands on its own: a subtitle is one short takeaway, and a note sits beside the object
 * it explains. Warn on a subtitle that wraps at its widest measure and on a note with no `near=`.
 */
function proseNotes(m: Model): Diagnostic[] {
  const out: Diagnostic[] = [],
    subtitle = m.appearance.heading?.subtitle;
  if (subtitle) {
    const look = resolveAppearance(m.appearance),
      lines = wrapLines(subtitle, subtitleMeasure(look, Infinity), headingTypes(look).subtitle);
    if (lines.length > 1)
      out.push({
        level: 'warning',
        code: 'heading-prose',
        message: `The subtitle takes ${lines.length} lines. Cut it to one short takeaway, about 10 words; let the drawing say the rest.`,
        ids: [],
      });
  }
  (m.appearance.notes ?? []).forEach((n, i) => {
    if (n.near) return;
    out.push({
      level: 'warning',
      code: 'heading-prose',
      message:
        'This note has no near=, so it sits under the heading as prose. Cut it, or anchor it with near=<id> to the object it explains.',
      line: m.noteLines[i],
      ids: [],
    });
  });
  return out;
}
