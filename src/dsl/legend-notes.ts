/**
 * `check` advice on the key and the prose round a drawing: a key that leaves a color or a line
 * style unexplained, a `legend` swatch drawn in a shade that no node of its family uses, and
 * heading prose that the drawing should say instead.
 */
import { NODE_SHADE, resolveAppearance } from '../model/appearance';
import { wrapLines } from '../model/fonts';
import { headingTypes, subtitleMeasure } from '../model/heading';
import type { Diagnostic } from './compile';
import type { Model } from './syntax';

export function legendNotes(m: Model): Diagnostic[] {
  return [...gapNotes(m), ...shadeNotes(m), ...proseNotes(m)];
}

/** Neutrals frame things, so they need no row. */
const NEUTRALS = new Set(['slate', 'stone']);

/**
 * A key explains the whole drawing or misleads: warn when it names some colors and not others, and
 * note when dashed and solid lines both appear with no `legend line` row to say how they differ. A
 * diff draws change colors only and keys them itself, so it gets neither.
 */
function gapNotes(m: Model): Diagnostic[] {
  if (m.objects.some(o => o.status) || m.edges.some(e => e.status)) return [];
  const legend = m.appearance.legend ?? [],
    out: Diagnostic[] = [];
  if (legend.length) {
    const named = new Set(legend.map(e => e.family)),
      unnamed = m.objects.filter(
        o => o.color !== 'auto' && !NEUTRALS.has(o.color) && !named.has(o.color),
      ),
      families = [...new Set(unnamed.map(o => o.color))];
    if (families.length)
      out.push({
        level: 'warning',
        code: 'legend-missing',
        message: `The legend has no row for ${families.join(', ')}. Add a \`legend <color> "meaning"\` line for each color the drawing uses, or draw those objects in slate.`,
        line: m.legendLines[0],
        ids: unnamed.map(o => o.id),
      });
  }
  // In a sequence a dashed message is a reply, which readers already know.
  const sequence = m.layouts.some(l => l.algorithm === 'sequence'),
    dashed = m.edges.filter(e => e.dashed);
  if (!sequence && dashed.length && dashed.length < m.edges.length && !legend.some(e => e.line))
    out.push({
      level: 'info',
      code: 'legend-lines',
      message:
        'Some lines are dashed (kind=async) and some solid. Say what each style means with `legend line dashed "meaning"` and `legend line solid "meaning"`.',
      line: dashed[0].line,
      ids: dashed.map(e => e.id),
    });
  return out;
}

function shadeNotes(m: Model): Diagnostic[] {
  return (m.appearance.legend ?? []).flatMap((e, i) => {
    if (!e.family) return [];
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
