import { compile, type Scene } from '../../src/dsl/compile';
import { projectScene } from '../../src/dsl/project';
import { printSource, readSource } from '../../src/dsl/syntax';
import { keepDropped, translateEdit, UnsupportedEdit } from '../../src/dsl/translate';
import { normalize } from '../../src/model/document';

/** `id` and everything inside it, outermost first. */
export function subtree(scene: Scene, id: string) {
  const ids = [id];
  for (let i = 0; i < ids.length; i++)
    for (const o of scene.objects) if (o.parent === ids[i]) ids.push(o.id);
  return ids;
}

/**
 * `source` with object `id` moved by `dx`, `dy` in drawing units, written the way the editor saves
 * a drag: a `near` its closest sibling when that draws it where it was dropped, else a `stay` at the
 * exact point. With `exact`, skip the `near` (one compile instead of two, for previews during a
 * drag). Returns null when the file cannot take the move.
 */
export async function moveObject(
  source: string,
  scene: Scene,
  id: string,
  dx: number,
  dy: number,
  exact = false,
): Promise<string | null> {
  const before = normalize(projectScene(scene));
  const after = structuredClone(before);
  for (const x of subtree(scene, id)) {
    const r = after.layout.nodes[x];
    if (r) after.layout.nodes[x] = { ...r, x: r.x + dx, y: r.y + dy };
  }
  let result;
  try {
    result = translateEdit({
      source: readSource(source),
      scene,
      before,
      after,
      label: 'Move',
      selection: [id],
    });
  } catch (error) {
    if (error instanceof UnsupportedEdit) return null;
    throw error;
  }
  if (exact) keepDropped(result.source, result.drops);
  const next = printSource(result.source);
  if (exact || !result.drops.length) return next;
  // A `near` that does not draw the object where it was dropped is not what the drop asked for.
  const drawn = await compile(next);
  const off = result.drops.filter(d => {
    const o = drawn.byId.get(d.id);
    return !o || Math.abs(o.x - d.x) > 1 || Math.abs(o.y - d.y) > 1;
  });
  if (!off.length) return next;
  const fixed = readSource(next);
  keepDropped(fixed, off);
  return printSource(fixed);
}
