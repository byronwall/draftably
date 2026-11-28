const HEADER = 46,
  ROW = 26;
const field = k => HEADER + (k + 0.5) * ROW;

/**
 * Three columns of table cards (2–7 fields) and two of analysis cards, six cards each. A quarter
 * of `lines` join two table rows in one column or the next; the rest run from a table's header
 * to an analysis's header.
 */
export function schema(lines, seed) {
  const rand = n => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  const nodes = [],
    edges = [],
    cols = [];
  for (let c = 0; c < 5; c++) {
    let y = 0;
    cols.push([]);
    for (let r = 0; r < 6; r++) {
      const rows = c < 3 ? 2 + rand(6) : 0,
        n = { id: `c${c}r${r}`, x: c * 320, y, width: 220, height: HEADER + rows * ROW };
      nodes.push(n);
      cols[c].push(n);
      y += n.height + 48;
    }
  }
  const rows = n => (n.height - HEADER) / ROW;
  let k = 0;
  while (edges.length < Math.round(lines * 0.4)) {
    const c = rand(3),
      a = cols[c][rand(6)],
      next = rand(3) !== 0 && c < 2,
      b = cols[c + (next ? 1 : 0)][rand(6)];
    if (a === b) continue;
    const side = next || rand(2) ? 'right' : 'left';
    edges.push({
      id: `rel${k++}`,
      source: a.id,
      target: b.id,
      sourceSide: side,
      targetSide: next ? 'left' : side,
      sourceAt: field(rand(rows(a))),
      targetAt: field(rand(rows(b))),
    });
  }
  while (edges.length < lines) {
    const a = cols[rand(3)][rand(6)],
      b = cols[3 + rand(2)][rand(6)];
    edges.push({
      id: `use${k++}`,
      source: a.id,
      target: b.id,
      sourceSide: 'right',
      targetSide: 'left',
      sourceAt: HEADER / 2,
      targetAt: HEADER / 2,
    });
  }
  return { nodes, edges };
}
