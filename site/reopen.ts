/**
 * Getting back to a diagram: a `.draft` file, or a PNG or SVG that draftably exported (they carry
 * their source), dropped or pasted anywhere on the site opens in the playground.
 */
import { createSignal } from 'solid-js';
import { readImageSource } from '../src/model/embed';
import { detectSource } from '../src/import/detect';

export const REOPEN_HINT = 'Drop a draftably, DOT, Mermaid or D2 file to open it';

export class ImportCancelled extends Error {}

async function convert(text: string, name = ''): Promise<string | null> {
  const detected = detectSource(text, { filename: name });
  if (detected.status === 'choose-fence') throw Error('Open one diagram at a time.');
  if (detected.status !== 'detected' || detected.format === 'native') return null;
  if (!['dot', 'mermaid', 'd2'].includes(detected.format))
    throw Error(`${detected.format} import is not supported yet.`);
  const { importBrowser } = await import('../src/import/browser');
  const result = await importBrowser(text, name);
  const errors = result.diagnostics.filter(item => item.severity === 'error');
  if (!result.nativeSource || errors.length)
    throw Error(errors.map(item => item.message).join('\n') || 'Could not import this diagram.');
  const warnings = result.diagnostics.filter(item => item.severity === 'warning');
  if (
    warnings.length &&
    !window.confirm(
      `Review import changes:\n\n${warnings.map(item => item.message).join('\n')}\n\nOpen the imported diagram?`,
    )
  )
    throw new ImportCancelled();
  return result.nativeSource;
}

/** The source in a file, or null when it holds none. */
export async function readDiagramFile(file: File): Promise<string | null> {
  if (/\.(dot|gv|mmd|mermaid|d2)$/i.test(file.name)) {
    if (file.size > 256 * 1024) throw Error('Use a diagram smaller than 256 KB.');
    return convert(await file.text(), file.name);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = await readImageSource(bytes);
  if (image != null) return image;
  // Only `.draft` text is source. A NUL byte means a binary file with that name.
  if (!/\.draft$/i.test(file.name) || bytes.includes(0)) return null;
  return new TextDecoder().decode(bytes);
}

/**
 * Why a file did not open. A draftably PDF holds source, but only the CLI reads it. Other text is
 * not read, so the message says nothing about what it holds.
 */
export function unreadableFile(name: string) {
  if (/\.pdf$/i.test(name))
    return `The site cannot read a PDF. Run draftably open ${name} to keep editing.`;
  if (/\.(png|svg|draft)$/i.test(name))
    return `${name} has no draftably source in it. ${REOPEN_HINT}.`;
  return `${name} did not open. ${REOPEN_HINT}.`;
}

/** The source in pasted SVG markup, or null. */
export async function readPastedText(text: string): Promise<string | null> {
  if (/^\s*(<\?xml[^>]*>\s*)?<svg\b/.test(text))
    return readImageSource(new TextEncoder().encode(text));
  return convert(text);
}

/** Source the playground should open now; the site shell sets it, the playground takes it. */
const [incoming, setIncoming] = createSignal<{ source: string; at: number } | null>(null);
export { incoming };
export const deliver = (source: string) => setIncoming({ source, at: Date.now() });
