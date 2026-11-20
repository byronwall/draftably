/**
 * `check --metrics`: when the root sets `direction=`, draw the file once more the other way.
 * If that removes most of the bends without adding crossings, say so with the size tradeoff; the
 * author may want the direction as written, so it is a note, not a warning.
 */
import type { Diagnostic } from '../dsl/compile';
import { parseModel } from '../dsl/syntax';
import { draw } from './variants';

type Drawn = Awaited<ReturnType<typeof draw>>;

export async function directionNotes(source: string, drawn: Drawn): Promise<Diagnostic[]> {
  const root = parseModel(source).layouts.find(l => l.scope === 'root');
  if (!root || (root.direction !== 'down' && root.direction !== 'right')) return [];
  const lines = source.split('\n'),
    text = lines[root.line - 1] ?? '',
    other = root.direction === 'down' ? 'right' : 'down';
  if ((text.match(/\bdirection=(down|right)\b/g) ?? []).length !== 1) return [];
  lines[root.line - 1] = text.replace(/\bdirection=(down|right)\b/, `direction=${other}`);
  let alt: Drawn['metrics'];
  try {
    alt = (await draw(lines.join('\n'))).metrics;
  } catch {
    return [];
  }
  const cur = drawn.metrics;
  if (cur.bends - alt.bends < 2 || alt.bends > cur.bends / 2) return [];
  if (alt.crossings > cur.crossings || alt.length >= cur.length) return [];
  return [
    {
      level: 'info',
      code: 'direction-bends',
      message: `direction=${other} draws ${alt.bends} bends instead of ${cur.bends} and ${alt.length}px of lines instead of ${cur.length}, at ${alt.width}×${alt.height} instead of ${cur.width}×${cur.height}. Change direction=${root.direction} to direction=${other} to try it, or keep it if the ${root.direction === 'down' ? 'vertical' : 'horizontal'} layout is deliberate.`,
      line: root.line,
      ids: ['root'],
    },
  ];
}
