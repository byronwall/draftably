/**
 * A standalone SVG of a projected diagram for terminal and agent inspection. It draws with the
 * same appearance, shapes and title wrapping as the canvas and embeds the fonts it uses.
 */
import { resolveAppearance, type ResolvedAppearance } from '../model/appearance';
import { panelDoc } from '../model/panels';
import { countText, STACK_OFFSETS } from '../model/stack';
import { measureText } from '../model/fonts';
import { headingMarkup, headingSize } from '../model/heading';
import { legendMarkup, legendSize } from '../model/legend';
import { drawnSwatch } from '../model/colors';
import { truncateText } from '../model/fonts';
import { drawingBounds } from '../model/bounds';
import { styleOf } from '../model/graph';
import { ICONS } from '../model/icons';
import { nodeLabel } from '../model/labels';
import { computeRoutes } from '../model/routes';
import {
  drawnLegend,
  edgeInk,
  isDiff,
  statusPaint,
  usedStatuses,
  type StatusPaint,
} from '../model/status';
import type { Diagram, Rect } from '../model/types';
import { visibleRects } from '../dsl/project';
import { fontFaceCss } from '../lib/font-data';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Wrap marks in a link when the object has one. */
const linked = (href: string | undefined, marks: string[]) =>
  href ? [`<a href="${esc(href)}">`, ...marks, '</a>'] : marks;

/** A status's fade, as an attribute on the element that groups an object's marks. */
const fade = (p: StatusPaint) => (p.opacity < 1 ? ` opacity="${p.opacity}"` : '');

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

/** One drawing's marks in its own coordinates, and the box they need with a margin. */
function sceneMarkup(doc: Diagram, look: ResolvedAppearance, arrow: (ink: string) => string) {
  const { vg, rects } = visibleRects(doc);
  const { routes } = computeRoutes(doc, vg, rects, { previous: [] });
  const out: string[] = [],
    diff = isDiff(doc);
  for (const g of vg.groups) {
    const r = rects.get(g.id)!,
      c = drawnSwatch(doc, look, g.id, 'group'),
      p = statusPaint(look, styleOf(doc, g.id).status),
      band = look.groupHeader / 2 - 7;
    out.push(
      ...linked(g.href, [
        `<g${fade(p)}>`,
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${Math.min(10, look.radius + 4)}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${p.width ?? 1}" stroke-opacity="${p.stroke ? 1 : 0.65}"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}/>`,
        `<svg x="${r.x + 12}" y="${r.y + band - 6.5}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${c.ink}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${ICONS.group}</svg>`,
        `<text x="${r.x + 33}" y="${r.y + band}" dominant-baseline="central" ${font(look.groupTitle)} fill="${c.ink}"${p.strike ? ' text-decoration="line-through"' : ''}>${esc(truncateText(g.title, Math.max(40, r.w - 33 - 64), look.groupTitle))}</text>`,
        '</g>',
      ]),
    );
  }
  for (const route of routes) {
    const edge = doc.graph.edges.find(e => e.id === route.id)!,
      p = statusPaint(look, edge.status),
      ink = edgeInk(look, edge, diff),
      dash = p.dash ?? (edge.dashed ? '5 5' : '');
    out.push(
      `<g${fade(p)}>`,
      `<path d="${route.path}" fill="none" stroke="${look.canvas}" stroke-width="8" stroke-linejoin="round"/>`,
      `<path d="${route.path}" fill="none" stroke="${ink}" stroke-width="${p.width ? p.width - 0.5 : 1.4}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#${arrow(ink)})"/>`,
    );
    const l = route.label;
    if (l)
      out.push(
        `<rect x="${l.x - l.w / 2}" y="${l.y - l.h / 2}" width="${l.w}" height="${l.h}" rx="4" fill="${look.canvas}"/>`,
        `<text x="${l.x}" y="${l.y}" text-anchor="middle" dominant-baseline="central" ${font(look.annotation)} fill="${ink}"${p.strike ? ' text-decoration="line-through"' : ''}>${esc(edge.label)}</text>`,
      );
    out.push('</g>');
  }
  for (const n of vg.nodes) {
    const r = rects.get(n.id)!,
      style = styleOf(doc, n.id),
      c = drawnSwatch(doc, look, n.id, 'node'),
      p = statusPaint(look, style.status),
      label = nodeLabel(doc, n.id, n.title, r),
      first = r.y + label.y - ((label.lines.length - 1) * label.lineHeight) / 2,
      ink = label.mode === 'center' && style.shape !== 'text' ? c.ink : look.text,
      paint = `fill="${c.fill}" stroke="${c.stroke}" stroke-width="${p.width ?? 1.2}"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}`;
    const badge = n.count ? countText(n.count) : '',
      bw = measureText(badge, look.annotation) + 12,
      bh = look.annotation.lineHeight + 4;
    out.push(
      ...linked(n.href, [
        `<g${fade(p)}>`,
        ...(n.count && style.shape !== 'text'
          ? STACK_OFFSETS.map(d =>
              outline(style.shape, { ...r, x: r.x + d, y: r.y + d }, look.radius, paint),
            )
          : []),
        outline(style.shape, r, look.radius, paint),
        `<text x="${r.x + label.x}" y="${first}" text-anchor="middle" dominant-baseline="central" ${font(look.title)} fill="${ink}"${p.strike ? ' text-decoration="line-through"' : ''}>` +
          label.lines
            .map(
              (line, i) =>
                `<tspan x="${r.x + label.x}" dy="${i ? label.lineHeight : 0}">${esc(line)}</tspan>`,
            )
            .join('') +
          '</text>',
        badge
          ? `<rect x="${r.x + r.w - bw + 6}" y="${r.y - bh / 2}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="${c.stroke}"/>` +
            `<text x="${r.x + r.w - bw / 2 + 6}" y="${r.y}" text-anchor="middle" dominant-baseline="central" ${font(look.annotation)} fill="${look.canvas}">${esc(badge)}</text>`
          : '',
        '</g>',
      ]),
    );
  }
  return { markup: out.join('\n'), bounds: drawingBounds(doc, vg, rects, routes, 40) };
}

/** Height of a panel's label band in a side-by-side comparison, and the gap between panels. */
const PANEL_LABEL = 24,
  PANEL_GAP = 0;

export function renderSvg(doc: Diagram): string {
  const look = resolveAppearance(doc.appearance),
    compare = doc.appearance.compare;
  // One arrowhead per line color: the theme's connection color, then each status color used.
  const inks = [
    ...new Set([look.connection, ...doc.graph.edges.map(e => edgeInk(look, e, isDiff(doc)))]),
  ];
  const arrow = (ink: string) => (inks.indexOf(ink) ? `arrow-${inks.indexOf(ink)}` : 'arrow');
  // With `compare`, each version is its own panel drawn from the merged positions, so the panels
  // share one box and every unchanged object lines up across them.
  const scenes = (compare ? [panelDoc(doc, 'before'), panelDoc(doc, 'after')] : [doc]).map(d =>
    sceneMarkup(d, look, arrow),
  );
  const b = scenes.map(s => s.bounds).reduce(union),
    x0 = Math.floor(b.x),
    y0 = Math.floor(b.y),
    bw = Math.ceil(b.x + b.w) - x0,
    bh = Math.ceil(b.y + b.h) - y0,
    label = compare ? PANEL_LABEL : 0,
    statuses = usedStatuses(doc),
    legend = drawnLegend(doc),
    key = legendSize(look, legend, statuses),
    head = headingSize(look, doc.appearance.heading);
  // Along the stacking axis each panel takes only the room its own version needs; across it, the
  // panels share the merged extent, which is what keeps unchanged objects aligned: stacked panels
  // line up left to right, side-by-side panels top to bottom.
  const arrange = (stacked: boolean) => {
    const spans = scenes.map(({ bounds: r }) =>
        stacked
          ? { from: Math.floor(r.y), size: Math.ceil(r.y + r.h) - Math.floor(r.y) }
          : { from: Math.floor(r.x), size: Math.ceil(r.x + r.w) - Math.floor(r.x) },
      ),
      starts = spans.map((_, i) =>
        spans.slice(0, i).reduce((sum, p) => sum + p.size + PANEL_GAP + (stacked ? label : 0), 0),
      ),
      total = starts.at(-1)! + spans.at(-1)!.size,
      areaW = stacked ? bw : total,
      areaH = stacked ? total + label : bh + label;
    return {
      stacked,
      spans,
      starts,
      areaH,
      w: Math.max(areaW, key.w + 80, head.w + 80),
      h: areaH + key.h + head.h,
    };
  };
  // An explicit direction wins; otherwise take the arrangement whose whole image comes closest to
  // the target aspect ratio.
  const target = compare?.aspect ?? 1.6,
    fit = (a: ReturnType<typeof arrange>) => Math.abs(Math.log(a.w / a.h / target)),
    options = compare?.direction
      ? [arrange(compare.direction === 'down')]
      : [arrange(true), arrange(false)],
    { stacked, spans, starts, areaH, w, h } = options.reduce((a, b) => (fit(b) < fit(a) ? b : a)),
    y1 = y0 - head.h;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y1} ${w} ${h}" width="${w}" height="${h}" data-theme="${look.theme}">`,
    `<title>${esc(doc.title)}</title>`,
    `<defs><style>${fontFaceCss(look)}</style>` +
      inks
        .map(
          ink =>
            `<marker id="${arrow(ink)}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L7 4L1 7" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>`,
        )
        .join('') +
      '</defs>',
    `<rect x="${x0}" y="${y1}" width="${w}" height="${h}" fill="${look.canvas}"/>`,
    // The title and subtitle sit above the drawing, left-aligned with the legend under it.
    headingMarkup(look, doc.appearance.heading, x0 + 40, y1 + 28),
  ];
  scenes.forEach((scene, i) => {
    // Panel i's corner, and the shift that brings its own span to that corner.
    const px = stacked ? x0 : x0 + starts[i],
      py = stacked ? y0 + starts[i] : y0,
      dx = stacked ? 0 : px - spans[i].from,
      dy = (stacked ? py - spans[i].from : 0) + label;
    if (compare) {
      const name = i ? compare.after : compare.before;
      out.push(
        `<text x="${px + 40}" y="${py + 36}" dominant-baseline="central" ${font(look.groupTitle)} fill="${look.text}">${esc(name)}</text>`,
      );
      if (i)
        out.push(
          stacked
            ? `<line x1="${x0 + 40}" x2="${x0 + bw - 40}" y1="${py - PANEL_GAP / 2}" y2="${py - PANEL_GAP / 2}" stroke="${look.muted}" stroke-opacity="0.35"/>`
            : `<line x1="${px - PANEL_GAP / 2}" x2="${px - PANEL_GAP / 2}" y1="${y0}" y2="${y0 + areaH}" stroke="${look.muted}" stroke-opacity="0.35"/>`,
        );
    }
    out.push(`<g transform="translate(${dx},${dy})">`, scene.markup, '</g>');
  });
  // The legend sits under the drawing, left-aligned with it, one swatch and meaning per row.
  out.push(legendMarkup(look, legend, x0 + 40, y0 + areaH - 12, statuses));
  out.push('</svg>\n');
  return out.join('\n');
}

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};
