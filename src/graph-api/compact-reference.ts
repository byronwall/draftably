import { cardEnvelope } from './card-envelope';
import type { PlacedNodeIn } from './core';

export function compactFrame(nodes: PlacedNodeIn[]) {
  const cards = nodes.map(n => ({ x: n.x, y: n.y, w: n.width, h: n.height }));
  const faces = [...new Set(cards.flatMap(r => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  return {
    bounds: cardEnvelope(cards),
    spans: faces.slice(1).map((x, i) => x - faces[i]),
    rows: cards.flatMap(r => [r.y, r.h]),
  };
}

export interface FullFrame extends ReturnType<typeof compactFrame> {
  cost: number;
  outside: number;
}

/** Compare card widths and gaps at matching row positions. */
export function nearestFrame(
  samples: FullFrame[],
  frame: ReturnType<typeof compactFrame>,
  clearance: number,
  outside: number,
) {
  let nearest: { frame: FullFrame; distance: number } | undefined;
  const supporting: FullFrame[] = [];
  for (const sample of samples) {
    if (
      sample.spans.length !== frame.spans.length ||
      sample.rows.length !== frame.rows.length ||
      frame.rows.some((y, i) => y !== sample.rows[i])
    )
      continue;
    const distance = frame.spans.reduce(
      (max, x, i) =>
        Math.max(max, Math.abs(x - sample.spans[i]) / Math.max(1, 2 * clearance, sample.spans[i])),
      0,
    );
    if (distance <= 0.5 && sample.outside > outside) supporting.push(sample);
    if (!nearest || distance < nearest.distance) nearest = { frame: sample, distance };
  }
  if (!nearest) return;
  // Two almost identical widths supply only one observation about exterior detours.
  const distinct = supporting.some((a, i) =>
    supporting
      .slice(i + 1)
      .some(
        b =>
          a.outside === b.outside &&
          a.spans.some((x, j) => Math.abs(x - b.spans[j]) > Math.max(2 * clearance, x * 0.12)),
      ),
  );
  return { ...nearest, outsideLimit: nearest.frame.outside - (distinct ? 1 : 2) };
}
