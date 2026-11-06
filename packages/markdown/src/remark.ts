import {
  mermaidSource,
  prepare,
  makeDiagnostic,
  hostFailure,
  isHostFailure,
  isNoPlaceholder,
  type Diagnostic,
  type DraftMarkdownOptions,
} from './core.js';
import { parseFenceOptions, type FenceOptions } from './metadata.js';

interface Node {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  children?: Node[];
  position?: { start?: { line?: number; column?: number } };
}
interface FileLike {
  path?: string;
  data?: Record<string, unknown>;
}

/** Convert parser-recognized `draft` code nodes, and opted-in Mermaid ones, into static image nodes. */
export default function remarkDraft(options: DraftMarkdownOptions) {
  if (!options || typeof options.emitAsset !== 'function')
    throw new TypeError('remarkDraft requires an emitAsset function.');
  return async (tree: Node, file: FileLike) => {
    const document = { path: file.path };
    const assets: { fileName: string; url: string }[] = [];
    const clientModules = new Set<string>();
    const dependencies = new Set<string>();
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
    const diagnostics: Diagnostic[] = [];
    const ids = new Set<string>();
    let fenceIndex = 0;

    async function visit(parent: Node): Promise<void> {
      const children = parent.children;
      if (!children) return;
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        const location = {
          sourceId: file.path,
          line: node.position?.start?.line ?? 1,
          column: node.position?.start?.column,
        };
        const mermaid =
          node.type === 'code' && node.lang === 'mermaid'
            ? await mermaidSource(node.value ?? '', location, options)
            : undefined;
        diagnostics.push(...(mermaid?.diagnostics ?? []));
        if ((node.type === 'code' && node.lang === 'draft') || mermaid?.source) {
          const index = fenceIndex++;
          try {
            let metadata: FenceOptions;
            try {
              metadata = mermaid
                ? { alt: mermaid.alt }
                : parseFenceOptions(node.meta ? `draft ${node.meta}` : 'draft');
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
            const source = mermaid?.source ?? node.value ?? '';
            const result = await prepare(source, metadata, location, document, index, {
              ...options,
              sources: sourceOptions,
            });
            children.splice(i, 1, result.node as unknown as Node);
            if (result.asset) assets.push(result.asset);
            assets.push(...(result.extraAssets ?? []));
            if (result.clientModule) clientModules.add(result.clientModule);
            if (result.dependency) dependencies.add(result.dependency);
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
              const failure = new Error('Draftably Markdown transform failed.');
              Object.assign(failure, { diagnostics: items ?? [diag] });
              throw failure;
            }
            children.splice(i, 1, {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Diagram unavailable.' }],
            });
          }
        } else {
          await visit(node);
        }
      }
    }

    await visit(tree);
    for (const diagnostic of diagnostics) options.onDiagnostic?.(diagnostic);
    file.data ??= {};
    file.data.draftably = {
      version: 1,
      assets,
      clientModules: [...clientModules],
      dependencies: [...dependencies],
      diagnostics,
    };
  };
}
