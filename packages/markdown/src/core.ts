import { createHash } from 'node:crypto';
import { fontMetricsVersion, renderSvg, runtimeVersion } from '@draftably/runtime';
import type { Diagnostic, RenderResult } from '@draftably/runtime';
import type { FenceOptions } from './metadata.js';
import { resolveSource } from './source.js';
export { resolveSource } from './source.js';
export { parseFenceOptions } from './metadata.js';

export type { Diagnostic } from '@draftably/runtime';

export interface DraftDocument {
  path?: string;
}
export interface DraftAsset {
  fileName: string;
  mediaType: 'image/svg+xml';
  bytes: Uint8Array;
}
export interface AssetReference {
  fileName: string;
  url: string;
}
export interface DraftDocumentResult {
  version: 1;
  assets: readonly AssetReference[];
  clientModules: readonly string[];
  dependencies: readonly string[];
  diagnostics: readonly Diagnostic[];
}
export interface SourceDependency {
  documentPath: string;
  dependencyPath: string;
  missing: boolean;
  watchPath?: string;
}
export type EmitAsset = (
  asset: DraftAsset,
  context: { document: DraftDocument; fenceIndex: number },
) => Promise<{ url: string }>;
export interface DraftMarkdownOptions {
  emitAsset: EmitAsset;
  errors?: 'fail' | 'placeholder';
  interactive?: MarkdownInteractiveBridge;
  render?: {
    includeSource?: boolean;
    links?:
      | { mode: 'none' }
      | {
          mode: 'safe';
          baseUrl?: string;
          target?: '_self' | '_blank';
          cacheKey?: string;
          resolve?: (request: { itemId: string; href: string }) => string | null;
        };
    limits?: {
      maxSourceChars?: number;
      maxSourceBytes?: number;
      maxOutputBytes?: number;
      maxObjects?: number;
      maxEdges?: number;
      maxDepth?: number;
    };
    signal?: AbortSignal;
  };
  sources?: {
    rootDir: string;
    onDependency?: (dependency: SourceDependency) => void;
  };
  onDiagnostic?: (diagnostic: Diagnostic) => void;
}

export interface DraftViewerInitV1 {
  version: 1;
  key: string;
  source: string;
  state: string | null;
  label: string;
  policyId: string;
}

export interface MarkdownInteractiveBridge {
  clientModuleUrl: string;
  policyId: string;
  emitInit(data: DraftViewerInitV1): Promise<{ fileName: string; url: string }>;
}

export function makeDiagnostic(
  code: string,
  message: string,
  location?: Diagnostic['location'],
  related?: Diagnostic['related'],
): Diagnostic {
  return {
    code,
    severity: 'error',
    message,
    location,
    itemIds: [],
    ...(related ? { related } : {}),
  };
}

export function contentHash(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function hasControls(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function hostFailure(error: unknown, message = 'Markdown host operation failed.'): Error {
  if (isHostFailure(error)) return error as Error;
  return Object.assign(new Error(message, { cause: error }), { hostFailure: true });
}

export function isHostFailure(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'hostFailure' in error;
}

function expectedError(code: string, message: string, location?: Diagnostic['location']): Error {
  return Object.assign(new Error(message), { diagnostic: makeDiagnostic(code, message, location) });
}

export function isNoPlaceholder(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'noPlaceholder' in error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw Object.assign(new Error('Markdown diagram preparation was aborted.'), {
      noPlaceholder: true,
      cause: signal.reason,
    });
  }
}

const cache = new Map<
  string,
  { svg: string; width: number; height: number; title: string; diagnostics: readonly Diagnostic[] }
>();
const cacheMax = 128;
function policyKey(options: DraftMarkdownOptions, state?: string): string | undefined {
  const render = options.render ?? {};
  if (render.links?.mode === 'safe' && render.links.resolve && !render.links.cacheKey)
    return undefined;
  return JSON.stringify({
    includeSource: render.includeSource ?? false,
    links: render.links ?? { mode: 'none' },
    limits: render.limits ?? {},
    state: state ?? null,
    target: 'image',
    fonts: 'embed',
  });
}

export async function prepare(
  source: string,
  metadata: FenceOptions,
  location: Diagnostic['location'],
  document: DraftDocument,
  fenceIndex: number,
  options: DraftMarkdownOptions,
): Promise<{
  node: Record<string, unknown>;
  asset?: AssetReference;
  diagnostics: Diagnostic[];
  dependency?: string;
  extraAssets?: AssetReference[];
  clientModule?: string;
}> {
  const diagnostics: Diagnostic[] = [];
  throwIfAborted(options.render?.signal);
  let actualSource = source;
  let sourceId = document.path;
  let dependency: string | undefined;
  let isInclude = false;
  if (metadata.src) {
    if (source.trim())
      throw expectedError(
        'DRAFT_INCLUDE',
        'src cannot be combined with a non-empty fence body.',
        location,
      );
    if (!document.path || !options.sources)
      throw expectedError(
        'DRAFT_INCLUDE',
        'src requires a document path and configured sources.rootDir.',
        location,
      );
    let included: { source: string; path: string };
    try {
      included = await resolveSource(metadata.src, document.path, options.sources.rootDir);
    } catch (error) {
      const { missingPath, watchPath } = error as Error & {
        missingPath?: string;
        watchPath?: string;
      };
      if (missingPath) {
        try {
          options.sources.onDependency?.({
            documentPath: document.path,
            dependencyPath: missingPath,
            missing: true,
            watchPath,
          });
        } catch (callbackError) {
          throw hostFailure(callbackError, 'Markdown dependency callback failed.');
        }
      }
      const message = error instanceof Error ? error.message : 'Could not read included diagram.';
      throw Object.assign(new Error(message), {
        diagnostic: makeDiagnostic(
          'DRAFT_INCLUDE',
          message,
          location,
          missingPath ? [{ message: 'Included here.', location: location! }] : undefined,
        ),
      });
    }
    actualSource = included.source;
    sourceId = included.path;
    isInclude = true;
    dependency = included.path;
    try {
      options.sources.onDependency?.({
        documentPath: document.path,
        dependencyPath: included.path,
        missing: false,
      });
    } catch (error) {
      throw hostFailure(error, 'Markdown dependency callback failed.');
    }
  }
  if (metadata.mode === 'interactive' && !options.interactive) {
    const error = expectedError(
      'DRAFT_CAPABILITY',
      'Interactive diagrams require a configured enhancement bridge.',
      location,
    );
    Object.assign(error, { noPlaceholder: true });
    throw error;
  }
  const keyPolicy = policyKey(options, metadata.state);
  const key =
    keyPolicy === undefined
      ? undefined
      : contentHash(
          JSON.stringify([
            actualSource,
            sourceId ?? '',
            runtimeVersion,
            fontMetricsVersion,
            keyPolicy,
          ]),
        );
  let rendered = key ? cache.get(key) : undefined;
  const mapDiagnostics = (items: readonly Diagnostic[]) =>
    items.map(d => ({
      ...d,
      location: d.location
        ? {
            ...d.location,
            line: d.location.line + (isInclude ? 0 : (location?.line ?? 1)),
            ...(!isInclude ? { column: undefined } : {}),
          }
        : location,
      ...(isInclude && location
        ? { related: [...(d.related ?? []), { message: 'Included here.', location }] }
        : {}),
    }));
  if (!rendered) {
    let result: RenderResult;
    try {
      result = await renderSvg(actualSource, {
        ...(options.render ?? {}),
        target: 'image',
        fonts: 'embed',
        includeSource: options.render?.includeSource ?? false,
        links: options.render?.links ?? { mode: 'none' },
        sourceId,
        state: metadata.state ?? null,
      });
    } catch (error) {
      throw Object.assign(new Error('Draftably renderer failed.'), {
        noPlaceholder: true,
        cause: error,
      });
    }
    if (!result.ok) {
      const mapped = mapDiagnostics(result.diagnostics);
      diagnostics.push(...mapped);
      const failure = Object.assign(new Error('Draftably could not render this diagram.'), {
        diagnostics: mapped,
      });
      if ((options.errors ?? 'fail') === 'fail' || !['input', 'limit'].includes(result.reason)) {
        Object.assign(failure, { noPlaceholder: true });
        throw failure;
      }
      return {
        node: { type: 'paragraph', children: [{ type: 'text', value: 'Diagram unavailable.' }] },
        diagnostics,
      };
    }
    rendered = {
      svg: result.value.svg,
      width: result.value.width,
      height: result.value.height,
      title: result.value.title,
      diagnostics: result.diagnostics,
    };
    if (key) {
      cache.set(key, rendered);
      if (cache.size > cacheMax) cache.delete(cache.keys().next().value!);
    }
  }
  diagnostics.push(...mapDiagnostics(rendered.diagnostics));
  throwIfAborted(options.render?.signal);
  const bytes = new TextEncoder().encode(rendered.svg);
  const fileName = `draft-${contentHash(bytes)}.svg`;
  let emitted: { url: string };
  try {
    emitted = await options.emitAsset(
      { fileName, mediaType: 'image/svg+xml', bytes },
      { document, fenceIndex },
    );
  } catch (error) {
    throw hostFailure(error, 'SVG asset emitter failed.');
  }
  if (!emitted || typeof emitted.url !== 'string')
    throw hostFailure(new TypeError('Asset emitter must return a URL string.'));
  let url: URL;
  try {
    url = new URL(emitted.url, 'https://draftably.invalid');
  } catch {
    throw hostFailure(new Error('Asset emitter returned an invalid URL.'));
  }
  if (
    !emitted.url ||
    emitted.url.charCodeAt(0) <= 0x20 ||
    hasControls(emitted.url) ||
    !['https:', 'http:'].includes(url.protocol)
  )
    throw hostFailure(new Error('Asset emitter returned an unsafe URL.'));
  const alt = metadata.alt?.trim() || rendered.title;
  const image = {
    type: 'image',
    url: emitted.url,
    alt,
    data: { hProperties: { width: Math.ceil(rendered.width), height: Math.ceil(rendered.height) } },
  };
  const asset: AssetReference = { fileName, url: emitted.url };
  const extraAssets: AssetReference[] = [];
  let clientModule: string | undefined;
  const figureChildren: Record<string, unknown>[] = [image];
  if (metadata.mode === 'interactive') {
    const bridge = options.interactive!;
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(bridge.policyId))
      throw hostFailure(new TypeError('Interactive policyId must be a short ASCII token.'));
    const viewerKey = `draft-${contentHash(JSON.stringify([actualSource, metadata.state ?? null, metadata.id ?? null, fenceIndex])).slice(0, 24)}`;
    const init: DraftViewerInitV1 = {
      version: 1,
      key: viewerKey,
      source: actualSource,
      state: metadata.state ?? null,
      label: alt,
      policyId: bridge.policyId,
    };
    const initBytes = new TextEncoder().encode(JSON.stringify(init));
    if (initBytes.byteLength > 1_000_000)
      throw expectedError('DRAFT_LIMIT', 'Interactive initialization data exceeds 1 MB.', location);
    let initAsset: { fileName: string; url: string };
    try {
      initAsset = await bridge.emitInit(init);
    } catch (error) {
      throw hostFailure(error, 'Interactive initialization emitter failed.');
    }
    if (!initAsset || typeof initAsset.fileName !== 'string' || typeof initAsset.url !== 'string')
      throw hostFailure(new TypeError('Initialization emitter must return a filename and URL.'));
    let initUrl: URL;
    let clientUrl: URL;
    try {
      initUrl = new URL(initAsset.url, 'https://draftably.invalid');
      clientUrl = new URL(bridge.clientModuleUrl, 'https://draftably.invalid');
    } catch {
      throw hostFailure(new Error('Interactive bridge returned an invalid URL.'));
    }
    if (
      initAsset.fileName !== `draft-${contentHash(initBytes)}.json` ||
      !initAsset.url ||
      initAsset.url.charCodeAt(0) <= 0x20 ||
      hasControls(initAsset.url) ||
      !['https:', 'http:'].includes(initUrl.protocol)
    )
      throw hostFailure(new Error('Initialization emitter returned an invalid asset.'));
    if (
      !bridge.clientModuleUrl ||
      bridge.clientModuleUrl.charCodeAt(0) <= 0x20 ||
      hasControls(bridge.clientModuleUrl) ||
      !['https:', 'http:'].includes(clientUrl.protocol)
    )
      throw hostFailure(new Error('clientModuleUrl is unsafe.'));
    extraAssets.push({ fileName: initAsset.fileName, url: initAsset.url });
    clientModule = bridge.clientModuleUrl;
    figureChildren.push({
      type: 'div',
      data: {
        hName: 'div',
        hProperties: {
          className: ['draftably-viewer-region'],
          'data-draftably-region': '',
          'data-draftably-init': initAsset.url,
          'data-draftably-policy': bridge.policyId,
          'data-draftably-key': viewerKey,
          role: 'region',
          'aria-label': alt,
        },
      },
      children: [],
    });
  }
  if (metadata.caption)
    figureChildren.push({
      type: 'figcaption',
      data: { hName: 'figcaption' },
      children: [{ type: 'text', value: metadata.caption }],
    });
  const figure =
    metadata.mode === 'interactive' || metadata.caption
      ? {
          type: 'figure',
          data: { hName: 'figure', ...(metadata.id ? { hProperties: { id: metadata.id } } : {}) },
          children: figureChildren,
        }
      : {
          type: 'paragraph',
          ...(metadata.id ? { data: { hProperties: { id: metadata.id } } } : {}),
          children: figureChildren,
        };
  return { node: figure, asset, extraAssets, clientModule, diagnostics, dependency };
}
