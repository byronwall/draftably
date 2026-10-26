/**
 * A standalone SVG of a projected diagram for terminal and agent inspection. It draws with the
 * same appearance, shapes and title wrapping as the canvas and embeds the fonts it uses.
 */
import { resolveAppearance } from '../model/appearance';
import { headingMarkup, headingSize } from '../model/heading';
import { legendMarkup, legendSize } from '../model/legend';
import { drawnSwatch } from '../model/colors';
import { truncateText } from '../model/fonts';
import { drawingBounds } from '../model/bounds';
import { styleOf } from '../model/graph';
import { ICONS } from '../model/icons';
import { nodeLabel } from '../model/labels';
import { computeRoutes } from '../model/routes';
import type { Diagram, Rect } from '../model/types';
import { visibleRects } from '../dsl/project';
import { fontFaceCss } from '../lib/font-data';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const font = (p: { family: string; size: number; weight: number }) =>
  `font-family="${esc(p.family)}" font-size="${p.size}" font-weight="${p.weight}"`;

function outline(shape: string, r: Rect, radius: number, paint: string) {
  if (shape === 'diamond')
    return `<path d="M${r.x + r.w / 2},${r.y} L${r.x + r.w},${r.y + r.h / 2} L${r.x + r.w / 2},${r.y + r.h} L${r.x},${r.y + r.h / 2} Z" ${paint}/>`;
  if (shape === 'circle')
    return `<ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h / 2}" rx="${r.w / 2}" ry="${r.h / 2}" ${paint}/>`;
  if (shape === 'text') return '';
  const rx = shape === 'pill' ? r.h / 2 : radius;
  return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${rx}" ${paint}/>`;
}

export function renderSvg(doc: Diagram): string {
  const look = resolveAppearance(doc.appearance);
  const { vg, rects } = visibleRects(doc);
  const { routes } = computeRoutes(doc, vg, rects, { previous: [] });
  const b = drawingBounds(doc, vg, rects, routes, 40),
    x0 = Math.floor(b.x),
    y0 = Math.floor(b.y),
    key = legendSize(look, doc.appearance.legend),
    head = headingSize(look, doc.appearance.heading),
    w = Math.max(Math.ceil(b.x + b.w) - x0, key.w + 80, head.w + 80),
    drawnH = Math.ceil(b.y + b.h) - y0,
    y1 = y0 - head.h,
    h = drawnH + key.h + head.h;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y1} ${w} ${h}" width="${w}" height="${h}" data-theme="${look.theme}">`,
    `<title>${esc(doc.title)}</title>`,
    `<defs><style>${fontFaceCss(look)}</style>` +
      `<marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L7 4L1 7" fill="none" stroke="${look.connection}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`,
    `<rect x="${x0}" y="${y1}" width="${w}" height="${h}" fill="${look.canvas}"/>`,
    // The title and subtitle sit above the drawing, left-aligned with the legend under it.
    headingMarkup(look, doc.appearance.heading, x0 + 40, y1 + 28),
  ];
  for (const g of vg.groups) {
    const r = rects.get(g.id)!,
      c = drawnSwatch(doc, look, g.id, 'group'),
      band = look.groupHeader / 2 - 7;
    out.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${Math.min(10, look.radius + 4)}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1" stroke-opacity="0.65"/>`,
      `<svg x="${r.x + 12}" y="${r.y + band - 6.5}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${c.ink}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${ICONS.group}</svg>`,
      `<text x="${r.x + 33}" y="${r.y + band}" dominant-baseline="central" ${font(look.groupTitle)} fill="${c.ink}">${esc(truncateText(g.title, Math.max(40, r.w - 33 - 64), look.groupTitle))}</text>`,
    );
  }
  for (const route of routes) {
    const edge = doc.graph.edges.find(e => e.id === route.id)!;
    out.push(
      `<path d="${route.path}" fill="none" stroke="${look.canvas}" stroke-width="8" stroke-linejoin="round"/>`,
      `<path d="${route.path}" fill="none" stroke="${look.connection}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"${edge.dashed ? ' stroke-dasharray="5 5"' : ''} marker-end="url(#arrow)"/>`,
    );
    const l = route.label;
    if (l)
      out.push(
        `<rect x="${l.x - l.w / 2}" y="${l.y - l.h / 2}" width="${l.w}" height="${l.h}" rx="4" fill="${look.canvas}"/>`,
        `<text x="${l.x}" y="${l.y}" text-anchor="middle" dominant-baseline="central" ${font(look.annotation)} fill="${look.connection}">${esc(edge.label)}</text>`,
      );
  }
  for (const n of vg.nodes) {
    const r = rects.get(n.id)!,
      style = styleOf(doc, n.id),
      c = drawnSwatch(doc, look, n.id, 'node'),
      label = nodeLabel(doc, n.id, n.title, r),
      first = r.y + label.y - ((label.lines.length - 1) * label.lineHeight) / 2,
      ink = label.mode === 'center' && style.shape !== 'text' ? c.ink : look.text;
    out.push(
      outline(
        style.shape,
        r,
        look.radius,
        `fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.2"`,
      ),
      `<text x="${r.x + label.x}" y="${first}" text-anchor="middle" dominant-baseline="central" ${font(look.title)} fill="${ink}">` +
        label.lines
          .map(
            (line, i) =>
              `<tspan x="${r.x + label.x}" dy="${i ? label.lineHeight : 0}">${esc(line)}</tspan>`,
          )
          .join('') +
        '</text>',
    );
  }
  // The legend sits under the drawing, left-aligned with it, one swatch and meaning per row.
  out.push(legendMarkup(look, doc.appearance.legend, x0 + 40, y0 + drawnH - 12));
  out.push('</svg>\n');
  return out.join('\n');
}
