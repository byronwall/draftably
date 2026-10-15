/** A plain, dependency-free SVG of a projected diagram for terminal and agent inspection. */
import { colorTokens } from '../model/styles';
import { CONTAINER_HEADER } from '../model/graph';
import { computeRoutes } from '../model/routes';
import type { Diagram } from '../model/types';
import { visibleRects } from '../dsl/project';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderSvg(doc: Diagram): string {
  const { vg, rects } = visibleRects(doc);
  const { routes } = computeRoutes(doc, vg, rects, { previous: [] });
  const all = [...rects.values()];
  const x0 = Math.min(...all.map(r => r.x)) - 40,
    y0 = Math.min(...all.map(r => r.y)) - 40,
    w = Math.max(...all.map(r => r.x + r.w)) - x0 + 40,
    h = Math.max(...all.map(r => r.y + r.h)) - y0 + 40;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w}" height="${h}" font-family="Inter, Segoe UI, Arial, sans-serif">`,
    `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#f7f8fa"/>`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#5b6472"/></marker></defs>`,
  ];
  for (const g of vg.groups) {
    const r = rects.get(g.id)!,
      c = colorTokens(doc.styles[g.id]?.color, 'light');
    out.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10" fill="${c.fill}" fill-opacity="0.35" stroke="${c.stroke}"/>`,
      `<text x="${r.x + 12}" y="${r.y + CONTAINER_HEADER / 2 + 5}" font-size="13" font-weight="600" fill="${c.ink}">${esc(g.title)}</text>`,
    );
  }
  for (const route of routes) {
    const edge = doc.graph.edges.find(e => e.id === route.id)!;
    out.push(
      `<polyline points="${route.points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#5b6472" stroke-width="1.5"${edge.dashed ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#arrow)"/>`,
    );
  }
  for (const n of vg.nodes) {
    const r = rects.get(n.id)!,
      style = doc.styles[n.id],
      c = colorTokens(style?.color, 'light'),
      radius = style?.shape === 'pill' || style?.shape === 'circle' ? r.h / 2 : 8;
    out.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${radius}" fill="${c.fill}" stroke="${c.stroke}"/>`,
      `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 5}" text-anchor="middle" font-size="13" font-weight="550" fill="${c.ink}">${esc(n.title)}</text>`,
    );
  }
  out.push('</svg>\n');
  return out.join('\n');
}
