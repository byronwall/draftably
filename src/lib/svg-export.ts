const SVG_NS = 'http://www.w3.org/2000/svg';

/** Presentation properties copied from computed styles so exports render without our CSS. */
const STYLE_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'fill-opacity',
  'stroke-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'visibility',
  'display',
];

/** Interactive-only parts of a scene that never belong in an exported drawing. */
const EDITOR_ONLY =
  '.port,.selection-ring,.resize-handle,.waypoint,.edge-hit,.group-collapse,.group-header,.position-badge,.overlay-layer,.link-hit';

/**
 * Deep-copy an SVG subtree with computed styles inlined and editor-only parts removed.
 * The source element must be attached to the document.
 */
export function materializeSvg<T extends SVGElement>(original: T): T {
  const copy = original.cloneNode(true) as T,
    sources = [original, ...original.querySelectorAll('*')],
    copies = [copy, ...copy.querySelectorAll('*')];
  sources.forEach((el, i) => {
    const computed = getComputedStyle(el),
      dest = copies[i];
    for (const prop of STYLE_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) dest.setAttribute(prop, value);
    }
    for (const attr of [...dest.attributes])
      if (
        attr.name.startsWith('data-') ||
        ['class', 'style', 'tabindex', 'role', 'aria-pressed', 'aria-label'].includes(attr.name)
      )
        dest.removeAttribute(attr.name);
  });
  original.querySelectorAll(EDITOR_ONLY).forEach(el => copies[sources.indexOf(el)]?.remove());
  copy.removeAttribute('transform');
  return copy;
}

export const serializeSvg = (node: Node) => new XMLSerializer().serializeToString(node);

export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

export const escapeXml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const downloadText = (text: string, name: string, type: string) =>
  downloadBlob(new Blob([text], { type }), name);

/** Rasterize an SVG string at up to 2× scale, within browser canvas limits. */
export async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    let timer: number | undefined;
    try {
      await Promise.race([
        image.decode(),
        new Promise((_, reject) => {
          timer = window.setTimeout(
            () => reject(Error('Image decoding timed out. Save SVG instead.')),
            12000,
          );
        }),
      ]);
    } finally {
      window.clearTimeout(timer);
    }
    const { naturalWidth: w, naturalHeight: h } = image;
    const scale = Math.min(2, 8192 / Math.max(w, h), Math.sqrt(24e6 / (w * h)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        b => (b ? resolve(b) : reject(Error('PNG conversion failed. Export SVG instead.'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
