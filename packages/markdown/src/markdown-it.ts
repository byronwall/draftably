import {
  makeDiagnostic,
  mermaidSource,
  prepare,
  hostFailure,
  isHostFailure,
  isNoPlaceholder,
  type Diagnostic,
  type DraftDocumentResult,
  type DraftMarkdownOptions,
} from './core.js';
import { parseFenceOptions, type FenceOptions } from './metadata.js';
import { imageHtml, isDraftFenceInfo } from './markdown-it-helpers.js';

export interface DraftMarkdownItEnvironment {
  draftably?: { documentPath?: string };
  [key: string]: unknown;
}
interface Token {
  type: string;
  info?: string;
  content?: string;
  map?: number[] | null;
  children?: Token[] | null;
}
interface MarkdownItLike {
  renderer: {
    rules: Record<
      string,
      | ((
          tokens: Token[],
          index: number,
          options: unknown,
          env: unknown,
          self: MarkdownItLike['renderer'],
        ) => string)
      | undefined
    >;
    renderToken(tokens: Token[], index: number, options: unknown): string;
  };
  utils: { escapeHtml(value: string): string };
}
interface MarkdownItRenderHost<Tokens> {
  parse(source: string, env?: unknown): Tokens[];
  options: unknown;
  renderer: { render(tokens: Tokens[], options: unknown, env?: unknown): string };
}
interface Prepared {
  node: Record<string, unknown>;
  diagnostics: readonly Diagnostic[];
}

function renderPrepared(node: Record<string, unknown>, escape: (value: string) => string): string {
  const type = node.type;
  if (type === 'paragraph') {
    const props =
      (node.data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties ?? {};
    const id = typeof props.id === 'string' ? ` id="${escape(props.id)}"` : '';
    const children = node.children as Record<string, unknown>[];
    const content = children.map(child => renderPrepared(child, escape)).join('');
    return `<p${id}>${content}</p>\n`;
  }
  if (type === 'figure') {
    const data = node.data as { hProperties?: Record<string, unknown> } | undefined;
    const id = data?.hProperties?.id;
    const idAttribute = typeof id === 'string' ? ` id="${escape(id)}"` : '';
    const children = node.children as Record<string, unknown>[];
    return `<figure${idAttribute}>${children.map(child => renderPrepared(child, escape)).join('')}</figure>\n`;
  }
  if (type === 'image') {
    const props =
      (node.data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties ?? {};
    return imageHtml({
      url: String(node.url ?? ''),
      alt: String(node.alt ?? ''),
      ...(typeof props.width === 'number' ? { width: props.width } : {}),
      ...(typeof props.height === 'number' ? { height: props.height } : {}),
    });
  }
  if (type === 'figcaption') {
    const children = node.children as Record<string, unknown>[];
    return `<figcaption>${children.map(child => renderPrepared(child, escape)).join('')}</figcaption>`;
  }
  if (type === 'div') {
    const props =
      (node.data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties ?? {};
    const region = props['data-draftably-region'] === '';
    if (
      !region ||
      typeof props['data-draftably-init'] !== 'string' ||
      typeof props['data-draftably-policy'] !== 'string' ||
      typeof props['data-draftably-key'] !== 'string'
    )
      throw new Error('Invalid generated viewer region.');
    const label = typeof props['aria-label'] === 'string' ? props['aria-label'] : 'Diagram viewer';
    return `<div class="draftably-viewer-region" data-draftably-region="" data-draftably-init="${escape(String(props['data-draftably-init']))}" data-draftably-policy="${escape(String(props['data-draftably-policy']))}" data-draftably-key="${escape(String(props['data-draftably-key']))}" role="region" aria-label="${escape(label)}"></div>`;
  }
  if (type === 'text') return escape(String(node.value ?? ''));
  throw new Error(`Unsupported generated AST node: ${String(type)}.`);
}

export function createMarkdownItDraft(options: DraftMarkdownOptions) {
  if (!options || typeof options.emitAsset !== 'function')
    throw new TypeError('createMarkdownItDraft requires an emitAsset function.');
  const prepared = new WeakMap<object, Prepared>();
  const isDraftToken = (token: Token) =>
    token.type === 'fence' && isDraftFenceInfo(token.info ?? '');

  function plugin(instance: unknown): void {
    const md = instance as MarkdownItLike;
    const previous = md.renderer.rules.fence;
    md.renderer.rules.fence = function (tokens, index, renderOptions, env, self) {
      const token = tokens[index];
      if (!isDraftToken(token) && !prepared.has(token))
        return previous
          ? previous(tokens, index, renderOptions, env, self)
          : self.renderToken(tokens, index, renderOptions);
      const result = prepared.get(token);
      if (!result)
        throw new Error(
          'Draft fence rendered before prepare(). Prepare and render the same token tree.',
        );
      return renderPrepared(result.node, value => md.utils.escapeHtml(value));
    };
  }

  async function render(
    md: MarkdownItRenderHost<unknown>,
    source: string,
    env: DraftMarkdownItEnvironment = {},
  ): Promise<{ html: string; manifest: DraftDocumentResult }> {
    const tokens = md.parse(source, env);
    const manifest = await prepareTokens(tokens as Token[], env);
    const html = md.renderer.render(tokens, md.options, env);
    return { html, manifest };
  }

  async function prepareTokens(
    tokens: Token[],
    env: DraftMarkdownItEnvironment = {},
  ): Promise<DraftDocumentResult> {
    const document = { path: env.draftably?.documentPath };
    const assets: { fileName: string; url: string }[] = [];
    const dependencies = new Set<string>();
    const clientModules = new Set<string>();
    const diagnostics: Diagnostic[] = [];
    const ids = new Set<string>();
    const sourceOptions = options.sources && {
      ...options.sources,
      onDependency: (dependency: {
        documentPath: string;
        dependencyPath: string;
        missing: boolean;
        watchPath?: string;
      }) => {
        dependencies.add(dependency.dependencyPath);
        try {
          options.sources?.onDependency?.(dependency);
        } catch (error) {
          throw hostFailure(error, 'Markdown dependency callback failed.');
        }
      },
    };
    let fenceIndex = 0;
    const visit = async (items: Token[]): Promise<void> => {
      for (const token of items) {
        const location = { sourceId: document.path, line: (token.map?.[0] ?? 0) + 1 };
        const mermaid =
          token.type === 'fence' && /^mermaid(?:\s|$)/.test((token.info ?? '').trim())
            ? await mermaidSource(token.content ?? '', location, options)
            : undefined;
        diagnostics.push(...(mermaid?.diagnostics ?? []));
        if (mermaid) prepared.delete(token);
        if (isDraftToken(token) || mermaid?.source) {
          const index = fenceIndex++;
          prepared.delete(token);
          try {
            let metadata: FenceOptions;
            try {
              metadata = mermaid ? { alt: mermaid.alt } : parseFenceOptions(token.info ?? '');
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Invalid draft fence metadata.';
              throw Object.assign(new Error(message), {
                diagnostic: makeDiagnostic('DRAFT_METADATA', message, location),
              });
            }
            if (metadata.id && ids.has(metadata.id)) {
              const message = `Duplicate draft id "${metadata.id}" in this document.`;
              throw Object.assign(new Error(message), {
                diagnostic: makeDiagnostic('DRAFT_METADATA', message, location),
              });
            }
            if (metadata.id) ids.add(metadata.id);
            const source = mermaid?.source ?? token.content ?? '';
            const result = await prepare(source, metadata, location, document, index, {
              ...options,
              sources: sourceOptions,
            });
            prepared.set(token, { node: result.node, diagnostics: result.diagnostics });
            if (result.asset) assets.push(result.asset);
            assets.push(...(result.extraAssets ?? []));
            if (result.dependency) dependencies.add(result.dependency);
            if (result.clientModule) clientModules.add(result.clientModule);
            diagnostics.push(...result.diagnostics);
          } catch (error) {
            if (isHostFailure(error)) throw (error as Error & { cause?: unknown }).cause ?? error;
            if (isNoPlaceholder(error)) throw error;
            const attached = (
              error as Error & { diagnostic?: Diagnostic; diagnostics?: Diagnostic[] }
            ).diagnostic;
            const items = (error as Error & { diagnostics?: Diagnostic[] }).diagnostics;
            const diag =
              attached ??
              items?.[0] ??
              makeDiagnostic(
                'DRAFT_BUILD',
                error instanceof Error ? error.message : 'Could not prepare diagram.',
                location,
              );
            diagnostics.push(...(items ?? [diag]));
            if ((options.errors ?? 'fail') === 'fail') {
              throw Object.assign(new Error('Draftably Markdown preparation failed.'), {
                diagnostics: items ?? [diag],
              });
            }
            prepared.set(token, {
              node: {
                type: 'paragraph',
                children: [{ type: 'text', value: 'Diagram unavailable.' }],
              },
              diagnostics: items ?? [diag],
            });
          }
        }
        if (token.children?.length) await visit(token.children);
      }
    };
    await visit(tokens);
    for (const diagnostic of diagnostics) options.onDiagnostic?.(diagnostic);
    return {
      version: 1,
      assets,
      clientModules: [...clientModules],
      dependencies: [...dependencies],
      diagnostics,
    };
  }

  return { plugin, prepare: prepareTokens, render };
}
