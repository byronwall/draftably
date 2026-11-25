/**
 * `check --metrics`: when the root sets `direction=`, draw the file once more the other way.
 * If that removes most of the bends without adding crossings, say so with the size tradeoff; the
 * author may want the direction as written, so it is a note, not a warning.
 *
 * A root with no direction whose drawing is one unbranched chain through groups is drawn once
 * more as a rightward compound flow; when that removes the avoidable bends at a comparable
 * width, the note names that one line.
 */
import { compile, type Diagnostic } from '../dsl/compile';
import { parseModel } from '../dsl/syntax';
import { applyEdits, draw, shapeOf, straighter } from './variants';

type Drawn = Awaited<ReturnType<typeof draw>>;

export async function directionNotes(source: string, drawn: Drawn): Promise<Diagnostic[]> {
  const root = parseModel(source).layouts.find(l => l.scope === 'root');
  if (!root) return [];
  if (root.direction !== 'down' && root.direction !== 'right') return chainNote(source, drawn);
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

/** The note for a root with no direction: an unbranched chain through groups, drawn straight. */
async function chainNote(source: string, drawn: Drawn): Promise<Diagnostic[]> {
  const shape = shapeOf(await compile(source));
  if (!shape.chain || !shape.groups || shape.fixed) return [];
  const { source: next, changes } = applyEdits(source, [
    { kind: 'layout', scope: 'root', attrs: { engine: 'compound-flow', direction: 'right' } },
  ]);
  const change = changes[0];
  if (changes.length !== 1 || !change.line || !change.after) return [];
  let alt: Drawn['metrics'];
  try {
    alt = (await draw(next)).metrics;
  } catch {
    return [];
  }
  const cur = drawn.metrics;
  if (!straighter(alt, cur) || alt.crossings > cur.crossings || alt.length >= cur.length) return [];
  return [
    {
      level: 'info',
      code: 'direction-bends',
      message: `This is one chain through groups. \`${change.after}\` draws it straight: ${alt.bends} bends instead of ${cur.bends} and ${alt.length}px of lines instead of ${cur.length}, at ${alt.width}×${alt.height} instead of ${cur.width}×${cur.height}.`,
      line: change.line,
      ids: ['root'],
    },
  ];
}
