/** Opening, importing and exporting diagrams and images. */
import { batch } from 'solid-js';
import { isLegacyDiagram } from '../model/document';
import { clamp } from '../model/geometry';
import { findNode } from '../model/graph';
import {
  createSvgElement,
  downloadBlob,
  downloadText,
  materializeSvg,
  serializeSvg,
  svgToPng,
} from '../lib/svg-export';
import { addNode, finishInlineEdit, openDocument } from './actions';
import { doc, selection, setSelection, snapshot, transact } from './document';
import { connectFrom, setConnectFrom } from './editor';
import { runLayout } from './layout';
import { sceneBounds } from './scene';
import { toast } from './toast';

const IMAGE_TYPES = /^image\/(png|jpeg|webp|gif)$/;

/** Set by the timeline module: opens a saved layout timeline file. */
let timelineImporter: ((data: unknown) => void) | null = null;
export const setTimelineImporter = (fn: (data: unknown) => void) => (timelineImporter = fn);

/** Set by the canvas: the `<g>` that holds the drawn diagram. */
let sceneElement: SVGGElement | undefined;
export const registerSceneElement = (el: SVGGElement) => (sceneElement = el);

export function filename(extension: string) {
  const base = doc.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (base || 'diagram') + '.' + extension;
}

/** Open diagram JSON, an editable SVG export, or a saved layout timeline. */
export async function importText(text: string, name = '') {
  const trimmed = text.trim();
  let data;
  if (trimmed.startsWith('<')) {
    const xml = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
    if (xml.querySelector('parsererror')) throw Error('This SVG is not valid XML.');
    const metadata = xml.querySelector('metadata#diagram-studio-data');
    if (!metadata)
      throw Error('Use an SVG exported by Diagram Studio. Other SVGs are not editable diagrams.');
    data = JSON.parse(metadata.textContent || '');
  } else if (trimmed.startsWith('{')) data = JSON.parse(trimmed);
  else throw Error('Open a saved JSON diagram or an exported, editable SVG.');
  if (data.kind === 'diagram-studio-journey' && timelineImporter) return timelineImporter(data);
  const legacy = isLegacyDiagram(data),
    needsLayout =
      !data.layout?.nodes &&
      !data.views?.some(
        (v: { layout?: { nodes?: object } }) => Object.keys(v.layout?.nodes || {}).length,
      );
  openDocument(data, { label: 'Import diagram' });
  if (needsLayout) await runLayout({ fit: true });
  toast(
    legacy
      ? 'Imported the active v1 diagram. The original file is unchanged.'
      : 'Opened ' + (name || 'diagram'),
  );
}

/** Embed an image as a new shape, or replace the image in an existing one. */
export async function insertImage(file: File, replaceId: string | null = null) {
  if (!IMAGE_TYPES.test(file.type))
    throw Error(
      'Use a PNG, JPEG, WebP, or GIF image. SVG files are imported only as editable diagrams.',
    );
  if (file.size > 20 * 1024 * 1024) throw Error('Use an image smaller than 20 MB.');
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = url;
  await image.decode();
  // Large images are downscaled so the diagram stays small enough to save in the browser.
  const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92),
    w = Math.min(300, canvas.width),
    h = clamp((w * canvas.height) / canvas.width, 32, 400);
  if (replaceId && findNode(doc, replaceId)) {
    transact('Replace image', d => {
      findNode(d, replaceId)!.image = data;
      (d.styles[replaceId] ||= { shape: 'image', color: 'slate', icon: '' }).shape = 'image';
      d.layout.nodes[replaceId].w = w;
      d.layout.nodes[replaceId].h = h;
    });
  } else
    addNode({
      title: file.name.replace(/\.[^.]+$/, '') || 'Image',
      image: data,
      style: { shape: 'image', icon: '', color: 'slate' },
      w,
      h,
    });
  toast('Image embedded · no external file required');
}

export async function openFile(file: File | undefined, replaceImageId: string | null = null) {
  if (!file) return;
  if (IMAGE_TYPES.test(file.type)) return insertImage(file, replaceImageId);
  if (file.size > 24 * 1024 * 1024) throw Error('Use a diagram smaller than 24 MB.');
  await importText(await file.text(), file.name);
}

/** Editable SVG: the drawing plus the full diagram in a metadata element. */
export function exportSvg(): string {
  finishInlineEdit(true);
  const world = sceneElement;
  if (!world) throw Error('The canvas is not ready.');
  const previousSelection = selection(),
    previousConnect = connectFrom();
  // Clearing the selection removes handles and rings before the DOM is copied.
  batch(() => {
    setSelection([]);
    setConnectFrom(null);
  });
  try {
    const b = sceneBounds(),
      x = b.x - 28,
      y = b.y - 28,
      w = b.w + 56,
      h = b.h + 56;
    const svg = createSvgElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: Math.ceil(w),
      height: Math.ceil(h),
      viewBox: `${x} ${y} ${w} ${h}`,
      role: 'img',
    });
    const title = createSvgElement('title');
    title.textContent = doc.title;
    const meta = createSvgElement('metadata', { id: 'diagram-studio-data' });
    meta.textContent = snapshot();
    const background = getComputedStyle(world.ownerSVGElement!).getPropertyValue('--canvas').trim();
    svg.append(
      title,
      meta,
      createSvgElement('rect', { x, y, width: w, height: h, fill: background || '#fbfbfd' }),
    );
    svg.appendChild(materializeSvg(world));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializeSvg(svg);
  } finally {
    batch(() => {
      setSelection(previousSelection);
      setConnectFrom(previousConnect);
    });
  }
}

export type ExportFormat = 'json' | 'svg' | 'png';

export async function exportDocument(format: ExportFormat) {
  finishInlineEdit(true);
  if (format === 'json')
    downloadText(
      JSON.stringify(JSON.parse(snapshot()), null, 2),
      filename('json'),
      'application/json',
    );
  else if (format === 'svg') downloadText(exportSvg(), filename('svg'), 'image/svg+xml');
  else downloadBlob(await svgToPng(exportSvg()), filename('png'));
  toast(format.toUpperCase() + ' export created');
}
