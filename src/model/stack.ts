/**
 * A node with `count` stands for many things: two offset outlines behind it read as a stack, and
 * a badge on its corner says how many. Shared by the canvas and the SVG output.
 */

/** Offsets of the outlines behind the node, back to front. */
export const STACK_OFFSETS = [6, 3];

/** The badge's text: `×42`, or `×1.2k` for large counts. */
export function countText(count: number) {
  if (count < 1000) return `×${count}`;
  const k = count / 1000;
  return `×${k < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)}k`;
}
