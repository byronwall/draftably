/**
 * Getting back to a diagram: a `.draft` file, or a PNG or SVG that draftably exported (they carry
 * their source), dropped or pasted anywhere on the site opens in the playground.
 */
import { createSignal } from 'solid-js';
import { readImageSource } from '../src/model/embed';

export const REOPEN_HINT = 'Drop or paste a draftably PNG, SVG or .draft file to keep editing';

/** The source in a file, or null when it holds none. */
export async function readDiagramFile(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = await readImageSource(bytes);
  if (image != null) return image;
  if (file.type.startsWith('image/') || /\.(png|svg)$/i.test(file.name)) return null;
  return new TextDecoder().decode(bytes);
}

/** The source in pasted SVG markup, or null. */
export async function readPastedText(text: string): Promise<string | null> {
  if (!/^\s*(<\?xml[^>]*>\s*)?<svg\b/.test(text)) return null;
  return readImageSource(new TextEncoder().encode(text));
}

/** Source the playground should open now; the site shell sets it, the playground takes it. */
const [incoming, setIncoming] = createSignal<{ source: string; at: number } | null>(null);
export { incoming };
export const deliver = (source: string) => setIncoming({ source, at: Date.now() });
