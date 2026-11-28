// Read the rendered scene groups. Each panel has its own translated copy of the IDs.
function parsePanels(svg) {
  const panels = [],
    stack = [];
  const tags = /<g\b[^>]*>|<\/g>/g;
  for (const match of svg.matchAll(tags)) {
    const tag = match[0];
    if (tag === '</g>') {
      const group = stack.pop();
      if (group?.panel && group.id)
        group.panel.items.push({ id: group.id, body: svg.slice(group.start, match.index) });
      continue;
    }
    const parent = stack.at(-1);
    const translate = tag.match(/\btransform="translate\(([-\d.]+),([-\d.]+)\)"/);
    let panel = parent?.panel;
    // Scene groups are the outer translated groups, not translated icons within an item.
    if (!parent && translate) {
      panel = { x: +translate[1], y: +translate[2], items: [] };
      panels.push(panel);
    }
    const id = parent?.panel && !parent.id ? tag.match(/\bdata-id="([^"]+)"/)?.[1] : undefined;
    stack.push({ panel, id, start: match.index + tag.length });
  }
  return panels.filter(p => p.items.length);
}

export function parseLabels(svg, { segs, center, textWidth, decodeText, routeIds }) {
  const panels = parsePanels(svg);
  for (const panel of panels) {
    panel.ids = new Set(panel.items.map(item => item.id));
    panel.frames = new Map();
    for (const { id, body } of panel.items) {
      const rect = body.match(
        /<rect class="shape" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/,
      );
      if (rect)
        panel.frames.set(id, {
          x: +rect[1] + panel.x,
          y: +rect[2] + panel.y,
          w: +rect[3],
          h: +rect[4],
        });
    }
    panel.routes = [];
    panel.labels = [];
    for (const { id, body } of panel.items) {
      if (routeIds && !routeIds.has(id)) continue;
      const path = body.match(/<path d="(M[^"]+)"[^>]*stroke-linecap/)?.[1];
      if (!path) continue;
      const points = [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(p => ({
        x: +p[1] + panel.x,
        y: +p[2] + panel.y,
      }));
      panel.routes.push({ id, points, segs: segs(points) });
      // Surface paint can produce multiple rects; the last one precedes the label text.
      const label = body.match(
        /<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="4" [^>]*\/>\s*<text([^>]*)>([\s\S]*?)<\/text>/,
      );
      if (!label) continue;
      const lines = [...label[6].matchAll(/<tspan\b[^>]*>([^<]*)<\/tspan>/g)].map(m => m[1]);
      if (!lines.length) lines.push(label[6]);
      const size = +(label[5].match(/font-size="([\d.]+)"/)?.[1] ?? 10.5);
      const lineHeight = +([...label[6].matchAll(/<tspan[^>]*dy="([\d.]+)"/g)][1]?.[1] ?? size);
      const l = {
        x: +label[1] + panel.x,
        y: +label[2] + panel.y,
        w: +label[3],
        h: +label[4],
        text: lines.map(decodeText).join('\n'),
        edge: id,
        path: points,
        panel,
      };
      const c = center(l);
      l.ink = lines.map((line, i) => {
        const w = Math.min(l.w - 16, textWidth(line, label[5]));
        return {
          x: c.x - w / 2,
          y: c.y + (i - (lines.length - 1) / 2) * lineHeight - size / 2,
          w,
          h: size,
        };
      });
      panel.labels.push(l);
    }
  }
  return panels.flatMap(p => p.labels);
}
