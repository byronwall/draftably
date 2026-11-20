/**
 * Shape buckets for frequency weighting (docs/CHECKS.md, "Frequency weights"). A diagram's bucket
 * is its size, its group nesting and its recipe family; density and direction are reported but
 * do not split buckets, so each bucket keeps enough diagrams to weigh.
 */

/** Shape features from the source and `draftably inspect --json` geometry. */
export function featuresOf(source, geo) {
  const parents = new Map(geo.nodes.map(n => [n.id, n.parent]));
  const isGroup = new Set(geo.nodes.map(n => n.parent));
  const leaves = geo.nodes.filter(n => !isGroup.has(n.id)).length;
  const groups = geo.nodes.length - leaves;
  let depth = 0;
  for (const n of geo.nodes) {
    if (!isGroup.has(n.id)) continue;
    let d = 1,
      p = n.parent;
    while (p && p !== 'root' && d < 20) (d++, (p = parents.get(p)));
    depth = Math.max(depth, d);
  }
  const edges = geo.routes?.length ?? 0;
  const layout = source.match(/^\s*layout\s+root\s+(.*)$/m)?.[1] ?? '';
  const engine = layout.match(/engine=(\S+)/)?.[1];
  const word = layout.match(/^(\w[\w-]*)/)?.[1];
  const recipeName = engine ?? (word && !word.includes('=') ? word : 'flow');
  const direction = layout.match(/direction=(\w+)/)?.[1] ?? 'default';
  const ratio = edges / Math.max(1, leaves);
  return {
    leaves,
    groups,
    depth,
    edges,
    recipeName,
    direction,
    size: leaves <= 8 ? 'S' : leaves <= 16 ? 'M' : leaves <= 32 ? 'L' : 'XL',
    nesting: depth === 0 ? 'flat' : depth === 1 ? 'groups' : 'nested',
    density: ratio < 0.9 ? 'sparse' : ratio <= 1.4 ? 'normal' : 'dense',
    recipe: RECIPE_FAMILY[recipeName] ?? 'other',
  };
}

const RECIPE_FAMILY = {
  flow: 'flow',
  layered: 'flow',
  'compound-flow': 'flow',
  tree: 'flow',
  lanes: 'lanes',
  sequence: 'sequence',
  column: 'stack',
  row: 'stack',
  cells: 'stack',
  grid: 'stack',
  stress: 'organic',
  force: 'organic',
  'compound-spring': 'organic',
};

export const bucketOf = f => `${f.size}·${f.nesting}·${f.recipe}`;
