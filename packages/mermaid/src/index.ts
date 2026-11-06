/**
 * A drop-in for the `mermaid` package. Pages call the same `initialize`, `run`, `render` and `parse`;
 * Draftably draws `draft` source and Mermaid flowcharts and sequences, and hands every other
 * Mermaid family to the real Mermaid so nothing on the page stops rendering.
 */
import { renderSvg, validate } from '@draftably/runtime';
import type { ParseFlowResult } from '../../../src/import/mermaid-facade';

export interface MermaidConfig {
  startOnLoad?: boolean;
  /** Drop-in settings. Every other key passes through to Mermaid for families it still draws. */
  draftably?: {
    /** `convert` (default) draws Mermaid flowcharts and sequences with Draftably; `off` leaves them to Mermaid. */
    mermaid?: 'convert' | 'off';
  };
  [key: string]: unknown;
}

export interface RunOptions {
  querySelector?: string;
  nodes?: ArrayLike<HTMLElement>;
  suppressErrors?: boolean;
  postRenderCallback?: (id: string) => unknown;
}

export interface RenderResult {
  svg: string;
  diagramType: string;
  /** Who drew it: `draftably`, or `mermaid` for a family Draftably does not draw yet. */
  renderer: 'draftably' | 'mermaid';
  bindFunctions?: (element: Element) => void;
}

export interface ParseResult {
  diagramType: string;
  config: MermaidConfig;
}

type Upstream = (typeof import('mermaid'))['default'];

let config: MermaidConfig = { startOnLoad: true };
let upstream: Promise<Upstream> | undefined;
let parseError: ((err: unknown, hash?: unknown) => void) | undefined;
let count = 0;
let flowParser: Promise<(text: string) => Promise<ParseFlowResult>> | undefined;

/** The real Mermaid, loaded only when a page holds Mermaid source. */
const real = () => (upstream ??= import('mermaid').then(m => m.default));

/** Draft source starts with a `diagram` line or a declaration; Mermaid starts with its family keyword. */
const isDraft = (text: string) =>
  /^\s*(?:%%.*\n\s*)*(?:diagram\s+"|(?:node|group|edge|layout|theme)\s)/.test(text);

const dedent = (text: string) => {
  const lines = text
    .replace(/^\s*\n/, '')
    .replace(/\s+$/, '')
    .split('\n');
  const pad = Math.min(...lines.filter(l => l.trim()).map(l => /^\s*/.exec(l)![0].length));
  return lines.map(l => l.slice(Number.isFinite(pad) ? pad : 0)).join('\n');
};

const failure = (message: string) => Object.assign(new Error(message), { name: 'DraftablyError' });

/** Native source for Mermaid text, or null when Draftably should leave it to Mermaid. */
async function convert(text: string): Promise<{ source: string; family: string } | null> {
  if (config.draftably?.mermaid === 'off') return null;
  flowParser ??= import('../../../src/import/mermaid-facade').then(m =>
    m.createMermaidFlowParser(real),
  );
  const [{ makePlainLabel }, { importMermaidFlow }] = await Promise.all([
    import('../../../src/import/mermaid-facade'),
    import('../../../src/import/mermaid-importer'),
  ]);
  const parsed = await (await flowParser)(text);
  if (!parsed.ok) return null;
  const result = importMermaidFlow(parsed, makePlainLabel(document), '');
  return result.nativeSource ? { source: result.nativeSource, family: result.family } : null;
}

async function drawDraft(id: string, source: string, diagramType: string): Promise<RenderResult> {
  const result = await renderSvg(source, { target: 'inline', idPrefix: id });
  if (!result.ok) throw failure(result.diagnostics.map(d => d.message).join('\n'));
  return { svg: result.value.svg, diagramType, renderer: 'draftably' };
}

async function drawMermaid(id: string, text: string, container?: Element): Promise<RenderResult> {
  const mermaid = await real();
  // The parser shares this instance with strict settings, so restore the page's settings first.
  mermaid.initialize({ ...config, startOnLoad: false } as Parameters<Upstream['initialize']>[0]);
  const out = await mermaid.render(id, text, container);
  return {
    svg: out.svg,
    diagramType: out.diagramType,
    renderer: 'mermaid',
    bindFunctions: out.bindFunctions,
  };
}

export async function render(id: string, text: string, container?: Element): Promise<RenderResult> {
  const source = dedent(text);
  if (isDraft(source)) return drawDraft(id, source, 'draftably');
  const native = await convert(source);
  return native ? drawDraft(id, native.source, native.family) : drawMermaid(id, source, container);
}

export async function parse(
  text: string,
  options: { suppressErrors?: boolean } = {},
): Promise<ParseResult | false> {
  const source = dedent(text);
  try {
    if (isDraft(source)) {
      const result = await validate(source);
      if (!result.ok) throw failure(result.diagnostics.map(d => d.message).join('\n'));
      return { diagramType: 'draftably', config };
    }
    const out = await (await real()).parse(source);
    return out ? { diagramType: out.diagramType, config } : false;
  } catch (err) {
    parseError?.(err);
    if (options.suppressErrors) return false;
    throw err;
  }
}

export async function run(options: RunOptions = {}): Promise<void> {
  const nodes =
    options.nodes ?? document.querySelectorAll<HTMLElement>(options.querySelector ?? '.mermaid');
  const errors: unknown[] = [];
  for (const node of Array.from(nodes)) {
    if (node.getAttribute('data-processed')) continue;
    node.setAttribute('data-processed', 'true');
    const id = `mermaid-${count++}`;
    try {
      const { svg, bindFunctions } = await render(id, node.textContent ?? '', node);
      node.innerHTML = svg;
      bindFunctions?.(node);
      options.postRenderCallback?.(id);
    } catch (err) {
      parseError?.(err);
      errors.push(err);
      node.setAttribute('data-draftably-error', String((err as Error).message ?? err));
    }
  }
  if (errors.length && !options.suppressErrors) throw errors[0];
}

export function initialize(next: MermaidConfig) {
  config = { ...config, ...next };
}

export const getConfig = () => config;

export function setParseErrorHandler(handler: (err: unknown, hash?: unknown) => void) {
  parseError = handler;
}

/** Mermaid's page-load hook: render every `.mermaid` element when `startOnLoad` is on. */
export async function contentLoaded() {
  if (config.startOnLoad) await run();
}

/** Diagram families from plugins render through Mermaid, so register them there. */
export async function registerExternalDiagrams(
  ...args: Parameters<Upstream['registerExternalDiagrams']>
) {
  await (await real()).registerExternalDiagrams(...args);
}

const mermaid = {
  initialize,
  run,
  render,
  parse,
  contentLoaded,
  getConfig,
  setParseErrorHandler,
  registerExternalDiagrams,
  mermaidAPI: { initialize, render, parse, getConfig },
};

if (typeof window !== 'undefined')
  window.addEventListener('load', () => void contentLoaded().catch(() => {}), { once: true });

export default mermaid;
