/** `check` advice on `legend` lines: a swatch drawn in a shade that no node of its family uses. */
import { NODE_SHADE } from '../model/appearance';
import type { Diagnostic } from './compile';
import type { Model } from './syntax';

export function legendNotes(m: Model): Diagnostic[] {
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
