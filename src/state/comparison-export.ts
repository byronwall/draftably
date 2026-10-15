/** SVG contact sheets and JSON experiments exported from Compare. */
import { rectUnion } from '../model/geometry';
import { downloadText, escapeXml, materializeSvg, serializeSvg } from '../lib/svg-export';
import { anchorFor, comparison, experiment, LAYER_COLORS } from './comparison';

const text = (value: string, x: number, y: number, size = 14, weight = 400, fill = '#626a7e') =>
  `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text>`;

const canvasColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim() || '#fbfbfd';

/** Every ready candidate, each fitted independently in a grid of tiles. */
function gridSheet(): string | null {
  const ready = comparison.cells
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.status === 'ready' && c.scene);
  if (!ready.length) return null;
  const cols = Math.min(3, ready.length),
    tileW = 800,
    tileH = 530,
    gap = 22,
    margin = 28,
    header = 92,
    w = margin * 2 + cols * tileW + (cols - 1) * gap,
    h = header + Math.ceil(ready.length / cols) * (tileH + gap) + margin;
  const routing = comparison.generatedConfig?.mode === 'routing';
  let body =
    `<rect width="${w}" height="${h}" fill="#f4f5f9"/>` +
    text(comparison.baseline!.title, margin, 40, 24, 700, '#222738') +
    text(
      routing
        ? 'Port & route comparison · identical node positions'
        : 'Layout comparison · one starting document',
      margin,
      68,
      15,
    );
  ready.forEach(({ c, i }, n) => {
    const world = document.querySelector(`[data-viewport="${i}"] > g`) as SVGGElement | null;
    if (!world) return;
    const x = margin + (n % cols) * (tileW + gap),
      y = header + Math.floor(n / cols) * (tileH + gap),
      b = c.scene!.bounds,
      plotW = tileW - 24,
      plotH = tileH - 130,
      // Export complete drawings, not the crop left by interactive panning.
      k = Math.min((plotW - 30) / Math.max(1, b.w), (plotH - 30) / Math.max(1, b.h), 2),
      cx = plotW / 2 - (b.x + b.w / 2) * k,
      cy = plotH / 2 - (b.y + b.h / 2) * k,
      r = c.result!.routing.report,
      termination = c.result!.report?.termination || 'reroute only';
    body +=
      `<g transform="translate(${x},${y})"><rect width="${tileW}" height="${tileH}" rx="12" fill="#fff" stroke="#dfe2eb"/>` +
      text(`${n + 1}. ${c.title}`, 20, 31, 18, 700, '#222738') +
      text(c.subtitle, 20, 55, 13) +
      `<svg x="12" y="70" width="${plotW}" height="${plotH}" overflow="hidden"><rect width="100%" height="100%" fill="${canvasColor()}"/>` +
      `<g transform="translate(${cx},${cy}) scale(${k})">${serializeSvg(materializeSvg(world))}</g></svg>` +
      text(
        `${termination} · ${r.crossings} crossings · ${r.lanePairs} close lane pairs · ${r.bends} bends`,
        20,
        tileH - 31,
        13,
      ) +
      text(`Fit independently · ${Math.round(k * 100)}%`, 20, tileH - 12, 11) +
      '</g>';
  });
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>${escapeXml(comparison.baseline!.title)} — comparison sheet</title>${body}</svg>`;
}

/** The visible overlay layers, aligned on the anchor at one common scale. */
function overlaySheet(): string | null {
  const ready = comparison.cells
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.status === 'ready' && c.layer.visible && c.scene);
  if (!ready.length) return null;
  const b = rectUnion(
      ready.map(({ c, i }) => {
        const a = anchorFor(i);
        return { ...c.scene!.bounds, x: c.scene!.bounds.x - a.x, y: c.scene!.bounds.y - a.y };
      }),
    ),
    w = 1440,
    h = 1000,
    pad = 36,
    head = 100,
    foot = 40 + Math.ceil(ready.length / 3) * 18,
    k = Math.min((w - 2 * pad) / b.w, (h - head - foot) / b.h, 2);
  const content = ready
    .map(({ i }) => {
      const layer = document.querySelector(`[data-layer="${i}"]`) as SVGGElement | null,
        a = anchorFor(i);
      return layer
        ? `<g transform="translate(${-a.x},${-a.y})">${serializeSvg(materializeSvg(layer))}</g>`
        : '';
    })
    .join('');
  const anchor =
    comparison.baseline!.graph.nodes.find(n => n.id === comparison.focusId)?.title ||
    comparison.focusId;
  const legend = ready
    .map(
      ({ c, i }, n) =>
        `<text x="${pad + (n % 3) * 450}" y="${h - 45 + Math.floor(n / 3) * 18}" font-family="Arial" font-size="12" fill="${LAYER_COLORS[i % LAYER_COLORS.length]}">${escapeXml(c.title)} · ${Math.round(c.layer.opacity * 100)}%</text>`,
    )
    .join('');
  const dark = document.documentElement.dataset.theme === 'dark';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${dark ? '#191c27' : '#fbfbfd'}"/><text x="36" y="38" font-family="Arial" font-size="24" fill="${dark ? '#e8eaf3' : '#222738'}">${escapeXml(comparison.baseline!.title)} · overlay</text><text x="36" y="66" font-family="Arial" font-size="14" fill="#697185">Aligned on ${escapeXml(anchor)} · translation only · common scale ${Math.round(k * 100)}%</text><g transform="translate(${pad - b.x * k},${head - b.y * k}) scale(${k})">${content}</g>${legend}</svg>`;
}

/** Save the visible presentation as SVG. Returns false when there is nothing to save. */
export function exportComparisonSvg() {
  const overlay = comparison.presentation === 'overlay',
    svg = overlay ? overlaySheet() : gridSheet();
  if (!svg) return false;
  downloadText(svg, overlay ? 'diagram-overlay.svg' : 'diagram-comparison.svg', 'image/svg+xml');
  return true;
}

export function exportExperiment() {
  const data = experiment();
  if (data)
    downloadText(JSON.stringify(data, null, 2), 'diagram-experiment.json', 'application/json');
}
