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
import { cellsBandOf, isCell, isOpenCell, styleOf } from '../model/graph';
import { brokenRectPath } from '../model/geometry';
import { ICONS } from '../model/icons';
import { groupTitleLines, nodeLabel } from '../model/labels';
import { groupLinkMark, LINK_MARK_PATH, linkMark, linkTarget, type LinkMark } from '../model/link';
import { computeRoutes } from '../model/routes';
import {
  drawnLegend,
  edgeInk,
  HALO_GAP,
  haloInk,
  isDiff,
  statusPaint,
  usedStatuses,
  withState,
  type StatusPaint,
} from '../model/status';
import type { Diagram, Rect } from '../model/types';
import { visibleRects } from '../dsl/project';
import { LIFELINE, SOFT_PAD, SOFT_RADIUS, SOFT_TITLE } from '../dsl/frame';

import { fontFaceCss } from '../lib/font-data';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** How an object's `href` is written into the file; as written unless the caller says. */
export interface SvgOptions {
  href?: (href: string) => string;
  /** Draw every emphasis state as its own panel. */
  states?: boolean;
}

/** Wrap marks in a link, with a tooltip naming the target, when the object has one. */
function linked(href: string | undefined, title: string, marks: string[], opts: SvgOptions) {
  if (!href) return marks;
  const url = linkTarget(href).kind === 'url';
  return [
    `<a class="link" href="${esc(opts.href?.(href) ?? href)}"${url ? ' target="_blank" rel="noopener"' : ''}>`,
    `<title>${esc(title)}\n${esc(href)}</title>`,
    ...marks,
    '</a>',
  ];
}

/** The ↗ that says an object is a link. */
const markMarkup = (m: LinkMark, x: number, y: number, ink: string) =>
  `<path class="link-mark" transform="translate(${x + m.x},${y + m.y}) scale(${m.size / 10})" d="${LINK_MARK_PATH}" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Hover for links, which a browser applies to an SVG opened on its own. */
const LINK_CSS =
  'a.link{cursor:pointer}a.link:hover .shape{stroke-width:2.4px}a.link:hover .link-mark{stroke-width:2px}';

/** A status's fade, as an attribute on the element that groups an object's marks. */
const fade = (p: StatusPaint) => (p.opacity < 1 ? ` opacity="${p.opacity}"` : '');

const font = (p: { family: string; size: number; weight: number }) =>
  `font-family="${esc(p.family)}" font-size="${p.size}" font-weight="${p.weight}"`;

function outline(shape: string, r: Rect, radius: number, paint: string, ink = '') {
  if (shape === 'diamond')
    return `<path d="M${r.x + r.w / 2},${r.y} L${r.x + r.w},${r.y + r.h / 2} L${r.x + r.w / 2},${r.y + r.h} L${r.x},${r.y + r.h / 2} Z" ${paint}/>`;
  if (shape === 'circle')
    return `<ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h / 2}" rx="${r.w / 2}" ry="${r.h / 2}" ${paint}/>`;
  if (shape === 'text') return '';
  if (shape === 'marker')
    return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="2" fill="${ink}"/>`;
  const rx = shape === 'pill' ? r.h / 2 : radius;
  return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${rx}" ${paint}/>`;
}

/** The accent ring around an object a `rest=plain` state focuses. */
const haloMarkup = (shape: string, r: Rect, look: ResolvedAppearance) =>
  outline(
    shape === 'text' ? 'box' : shape,
    { x: r.x - HALO_GAP, y: r.y - HALO_GAP, w: r.w + 2 * HALO_GAP, h: r.h + 2 * HALO_GAP },
    look.radius + HALO_GAP,
    `fill="none" stroke="${haloInk(look)}" stroke-width="2"`,
  );

type Route = ReturnType<typeof computeRoutes>['routes'][number];

/** A byte or bit layout's unit numbers and the run-on pieces of its fields. */
function cellsChromeMarkup(doc: Diagram, look: ResolvedAppearance, id: string, g: Rect) {
  const chrome = doc.layout.containers[id]?.cellsChrome,
    ink = drawnSwatch(doc, look, id, 'group').ink;
  if (!chrome) return [];
  return [
    ...(chrome.ruler?.ticks ?? []).map(
      t =>
        `<text x="${g.x + t.x}" y="${g.y + chrome.ruler!.y + chrome.ruler!.h / 2}" text-anchor="middle" dominant-baseline="central" ${font(look.annotation)} fill="${ink}">${esc(t.label)}</text>`,
    ),
    ...Object.entries(chrome.pieces ?? {}).flatMap(([cell, pieces]) => {
      const c = drawnSwatch(doc, look, cell, 'node'),
        title = doc.graph.nodes.find(n => n.id === cell)?.title ?? '';
      return pieces.map(
        r =>
          `<rect x="${g.x + r.x}" y="${g.y + r.y}" width="${r.w}" height="${r.h}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.2"/>` +
          `<text x="${g.x + r.x + r.w / 2}" y="${g.y + r.y + r.h / 2}" text-anchor="middle" dominant-baseline="central" ${font(look.annotation)} fill="${c.ink}" opacity="0.75">${esc(truncateText(`… ${title}`, Math.max(0, r.w - 8), look.annotation))}</text>`,
      );
    }),
  ];
}

/** The connections' paths and label spots, routed around the document's own shapes. */
function routesOf(doc: Diagram) {
  const { vg, rects } = visibleRects(doc);
  return computeRoutes(doc, vg, rects, { previous: [] }).routes;
}

/**
 * One drawing's marks in its own coordinates, and the box they need with a margin. A comparison
 * panel passes the merged drawing's routes, so every line it keeps runs exactly where it does in
 * the other panel.
 */
function sceneMarkup(
  doc: Diagram,
  look: ResolvedAppearance,
  arrow: (ink: string) => string,
  opts: SvgOptions,
  shared?: Route[],
) {
  const { vg, rects } = visibleRects(doc);
  const kept = new Set(doc.graph.edges.map(e => e.id)),
    routes = shared ? shared.filter(r => kept.has(r.id)) : routesOf(doc);
  const out: string[] = [],
    diff = isDiff(doc);
  for (const g of vg.groups) {
    const r = rects.get(g.id)!,
      c = drawnSwatch(doc, look, g.id, 'group'),
      p = statusPaint(look, styleOf(doc, g.id).status, styleOf(doc, g.id).spot),
      // A `cells` group is a title band over cells drawn edge to edge, with no group glyph.
      cells = cellsBandOf(doc, g.id),
      band = cells ? cells / 2 : look.groupHeader / 2 - 7,
      tx = cells ? 12 : 33,
      title = cells
        ? [truncateText(g.title, Math.max(40, r.w - tx - 12), look.groupTitle)]
        : groupTitleLines(g.title, r.w, look, g.titleLines);
    if (g.frame === 'none') continue;
    if (g.frame === 'soft') {
      const hull = g.hull?.length ? g.hull : [{ x: 0, y: 0, w: r.w, h: r.h }];
      out.push(
        ...linked(
          g.href,
          g.title,
          [
            `<g data-id="${esc(g.id)}"${fade(p)}>`,
            ...hull.map(
              h =>
                `<rect x="${r.x + h.x}" y="${r.y + h.y}" width="${h.w}" height="${h.h}" rx="${SOFT_RADIUS}" fill="${c.fill}"/>`,
            ),
            `<text x="${r.x + hull[0].x + SOFT_TITLE.x}" y="${r.y + hull[0].y + SOFT_TITLE.y}" dominant-baseline="central" ${font(look.annotation)} fill="${c.ink}"${p.strike ? ' text-decoration="line-through"' : ''}>${esc(truncateText(g.title, Math.max(40, hull[0].w - 2 * SOFT_PAD), look.annotation))}</text>`,
            '</g>',
          ],
          opts,
        ),
      );
      continue;
    }
    out.push(
      ...linked(
        g.href,
        g.title,
        [
          `<g data-id="${esc(g.id)}"${fade(p)}>`,
          p.halo ? haloMarkup('box', r, { ...look, radius: Math.min(10, look.radius + 4) }) : '',
          `<rect class="shape" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${cells ? Math.min(4, look.radius) : Math.min(10, look.radius + 4)}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${p.width ?? 1}" stroke-opacity="${p.stroke ? 1 : 0.65}"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}/>`,
          cells
            ? ''
            : `<svg x="${r.x + 12}" y="${r.y + band - 6.5}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${c.ink}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${ICONS.group}</svg>`,
          ...cellsChromeMarkup(doc, look, g.id, r),
          ...title.map(
            (line, i) =>
              `<text x="${r.x + tx}" y="${r.y + band + i * look.groupTitle.lineHeight}" dominant-baseline="central" ${font(look.groupTitle)} fill="${c.ink}"${p.strike ? ' text-decoration="line-through"' : ''}>${esc(line)}</text>`,
          ),
          g.href
            ? markMarkup(
                groupLinkMark(
                  title[title.length - 1],
                  look.groupTitle,
                  band + (title.length - 1) * look.groupTitle.lineHeight,
                ),
                r.x,
                r.y,
                c.ink,
              )
            : '',
          '</g>',
        ],
        opts,
      ),
    );
  }
  // Sequence participants' lifelines, under the message lines.
  for (const n of vg.nodes) {
    const r = rects.get(n.id);
    if (!r || !n.lifeline) continue;
    const x = r.x + r.w / 2;
    out.push(
      `<line x1="${x}" y1="${r.y + r.h}" x2="${x}" y2="${r.y + r.h + n.lifeline}" stroke="${look.muted}" stroke-width="${LIFELINE.width}" stroke-dasharray="${LIFELINE.dash}"/>`,
    );
  }
  for (const route of routes) {
    const edge = doc.graph.edges.find(e => e.id === route.id)!,
      p = statusPaint(look, edge.status, edge.spot),
      ink = edgeInk(look, edge, diff),
      dash = p.dash ?? (edge.dashed ? '5 5' : '');
    out.push(
      `<g data-id="${esc(edge.id)}"${fade(p)}>`,
      route.halo
        ? `<path d="${route.halo}" fill="none" stroke="${look.canvas}" stroke-width="8"/>`
        : '',
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
      p = statusPaint(look, style.status, style.spot),
      radius = isCell(doc, n.id) ? 0 : look.radius,
      label = nodeLabel(doc, n.id, n.title, r),
      first = r.y + label.y - ((label.lines.length - 1) * label.lineHeight) / 2,
      ink = label.mode === 'center' && style.shape !== 'text' ? c.ink : look.text,
      paint = `class="shape" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${p.width ?? 1.2}"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}`;
    const badge = n.count ? countText(n.count) : '',
      bw = measureText(badge, look.annotation) + 12,
      bh = look.annotation.lineHeight + 4;
    const mark = n.href ? linkMark(style.shape, r.w, r.h, badge ? bw : 0) : undefined;
    out.push(
      ...linked(
        n.href,
        n.title,
        [
          `<g data-id="${esc(n.id)}"${fade(p)}>`,
          ...(n.count && style.shape !== 'text'
            ? STACK_OFFSETS.map(d =>
                outline(style.shape, { ...r, x: r.x + d, y: r.y + d }, radius, paint),
              )
            : []),
          p.halo ? haloMarkup(style.shape, r, look) : '',
          isOpenCell(doc, n.id)
            ? `<path d="${brokenRectPath(r)}" ${paint}/>`
            : outline(style.shape, r, radius, paint, look.text),
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
          mark ? markMarkup(mark, r.x, r.y, mark.inside ? c.ink : look.muted) : '',
          '</g>',
        ],
        opts,
      ),
    );
  }
  // A line that crosses cells to reach one is drawn over them, ending in a dot.
  for (const route of routes) {
    if (!route.cross) continue;
    const edge = doc.graph.edges.find(e => e.id === route.id)!,
      p = statusPaint(look, edge.status),
      ink = edgeInk(look, edge, diff),
      [a, b] = route.cross;
    out.push(
      `<g${fade(p)}>`,
      `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${ink}" stroke-width="${p.width ? p.width - 0.5 : 1.4}"${p.dash || edge.dashed ? ` stroke-dasharray="${p.dash ?? '5 5'}"` : ''}/>`,
      `<circle cx="${b.x}" cy="${b.y}" r="3.5" fill="${ink}"/>`,
      '</g>',
    );
  }
  return { markup: out.join('\n'), bounds: drawingBounds(doc, vg, rects, routes, 40) };
}

/** Height of a panel's label band in a side-by-side comparison, and the gap between panels. */
const PANEL_LABEL = 24,
  PANEL_GAP = 0;

/** One arrowhead per line color: the theme's connection color, then each other color used. */
function arrowsFor(look: ResolvedAppearance, docs: Diagram[]) {
  const inks = [
    ...new Set([
      look.connection,
      ...docs.flatMap(d => d.graph.edges.map(e => edgeInk(look, e, isDiff(d)))),
    ]),
  ];
  return {
    inks,
    arrow: (ink: string) => (inks.indexOf(ink) ? `arrow-${inks.indexOf(ink)}` : 'arrow'),
  };
}

/** The file's opening: the canvas, fonts, link hover, arrowheads, and the title above it all. */
function openSvg(
  doc: Diagram,
  look: ResolvedAppearance,
  inks: string[],
  arrow: (ink: string) => string,
  { x, y, w, h }: Rect,
) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" data-theme="${look.theme}">`,
    `<title>${esc(doc.title)}</title>`,
    `<defs><style>${fontFaceCss(look)}${doc.graph.nodes.some(n => n.href) || doc.graph.groups.some(g => g.href) ? LINK_CSS : ''}</style>` +
      inks
        .map(
          ink =>
            `<marker id="${arrow(ink)}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L7 4L1 7" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>`,
        )
        .join('') +
      '</defs>',
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${look.canvas}"/>`,
    // The title and subtitle sit above the drawing, left-aligned with the legend under it.
    headingMarkup(look, doc.appearance.heading, x + 40, y + 28),
  ];
}

/**
 * Every emphasis state as its own labelled panel, in file order, in a grid whose whole image
 * comes closest to the target aspect ratio. States never move anything, so every panel shares one
 * box and one set of routes, and each object sits at the same place in every panel.
 */
function statesSvg(doc: Diagram, look: ResolvedAppearance, opts: SvgOptions): string {
  const states = doc.appearance.states ?? [],
    docs = states.map(s => withState(doc, s.id)),
    { inks, arrow } = arrowsFor(look, docs),
    shared = routesOf(doc),
    scenes = docs.map(d => sceneMarkup(d, look, arrow, opts, shared));
  const b = scenes.map(s => s.bounds).reduce(union),
    x0 = Math.floor(b.x),
    y0 = Math.floor(b.y),
    cw = Math.ceil(b.x + b.w) - x0,
    ch = Math.ceil(b.y + b.h) - y0 + PANEL_LABEL,
    statuses = usedStatuses(doc),
    legend = drawnLegend(doc),
    key = legendSize(look, legend, statuses),
    head = headingSize(look, doc.appearance.heading);
  const target = doc.appearance.compare?.aspect ?? 1.6,
    grid = (cols: number) => {
      const rows = Math.ceil(states.length / cols),
        w = Math.max(cols * cw, key.w + 80, head.w + 80);
      return { cols, rows, w, h: rows * ch + key.h + head.h };
    },
    { cols, rows, w, h } = states
      .map((_, i) => grid(i + 1))
      .reduce((a, c) =>
        Math.abs(Math.log(c.w / c.h / target)) < Math.abs(Math.log(a.w / a.h / target)) ? c : a,
      ),
    y1 = y0 - head.h,
    out = openSvg(doc, look, inks, arrow, { x: x0, y: y1, w, h });
  scenes.forEach((scene, i) => {
    const col = i % cols,
      row = Math.floor(i / cols),
      px = x0 + col * cw,
      py = y0 + row * ch;
    out.push(
      `<text x="${px + 40}" y="${py + 36}" dominant-baseline="central" ${font(look.groupTitle)} fill="${look.text}">${esc(states[i].label)}</text>`,
    );
    if (col)
      out.push(
        `<line x1="${px}" x2="${px}" y1="${py + 16}" y2="${py + ch - 16}" stroke="${look.muted}" stroke-opacity="0.35"/>`,
      );
    if (row && !col)
      out.push(
        `<line x1="${x0 + 40}" x2="${x0 + cols * cw - 40}" y1="${py}" y2="${py}" stroke="${look.muted}" stroke-opacity="0.35"/>`,
      );
    out.push(
      `<g data-state="${esc(states[i].id)}" transform="translate(${col * cw},${row * ch + PANEL_LABEL})">`,
      scene.markup,
      '</g>',
    );
  });
  out.push(legendMarkup(look, legend, x0 + 40, y0 + rows * ch - 12, statuses));
  out.push('</svg>\n');
  return out.join('\n');
}

export function renderSvg(doc: Diagram, opts: SvgOptions = {}): string {
  const look = resolveAppearance(doc.appearance),
    compare = doc.appearance.compare;
  if (opts.states) return statesSvg(doc, look, opts);
  const { inks, arrow } = arrowsFor(look, [doc]);
  // With `compare`, each version is its own panel drawn from the merged positions, so the panels
  // share one box and every unchanged object lines up across them.
  const shared = compare ? routesOf(doc) : undefined,
    scenes = (compare ? [panelDoc(doc, 'before'), panelDoc(doc, 'after')] : [doc]).map(d =>
      sceneMarkup(d, look, arrow, opts, shared),
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
  const out = openSvg(doc, look, inks, arrow, { x: x0, y: y1, w, h });
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
