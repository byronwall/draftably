import { mountViewer } from '@draftably/runtime/viewer';
import type { Diagnostic } from '@draftably/runtime';
import { MAX_INIT_BYTES, parseInitJson, sameOriginInitUrl } from './client-validation.js';

type ViewerOptions = Parameters<typeof mountViewer>[1];

export interface EnhanceDraftsOptions {
  policies: ReadonlyMap<string, ViewerOptions>;
  onDiagnostic?: (diagnostic: Diagnostic) => void;
}

const ownedRoots = new WeakSet<HTMLElement>();

async function readBounded(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`Initialization request failed with HTTP ${response.status}.`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_INIT_BYTES)
    throw new Error('Initialization response exceeds the size limit.');
  if (!response.body) throw new Error('Initialization response has no body.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_INIT_BYTES) {
        await reader.cancel();
        throw new Error('Initialization response exceeds the size limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function diagnostic(message: string): Diagnostic {
  return { code: 'DRAFT_ENHANCE', severity: 'warning', message, itemIds: [] };
}

/** Load generated init assets and progressively enhance static diagram figures under root. */
export function enhanceDrafts(
  root: HTMLElement,
  options: EnhanceDraftsOptions,
): { destroy(): void } {
  if (ownedRoots.has(root))
    throw new Error('This Markdown root already has an active Draftably enhancement.');
  ownedRoots.add(root);
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  if (!win) {
    ownedRoots.delete(root);
    throw new Error('The Markdown root has no browser window.');
  }
  let destroyed = false;
  const aborters = new Set<AbortController>();
  const handles = new Set<ReturnType<typeof mountViewer>>();
  const restores: Array<() => void> = [];
  const report = (message: string) => {
    try {
      options.onDiagnostic?.(diagnostic(message));
    } catch {
      /* Host logging must not break static content. */
    }
  };
  const regions = Array.from(
    root.querySelectorAll<HTMLElement>('[data-draftably-region][data-draftably-init]'),
  );

  for (const region of regions) {
    const figure = region.closest('figure');
    const image = figure?.querySelector('img');
    if (image) {
      const wasHidden = image.hidden;
      restores.push(() => {
        image.hidden = wasHidden;
      });
    }
    const controller = new win.AbortController();
    aborters.add(controller);
    void (async () => {
      let handle: ReturnType<typeof mountViewer> | undefined;
      try {
        const initUrl = sameOriginInitUrl(
          region.dataset.draftablyInit ?? '',
          win.location.origin,
          doc.baseURI,
        );
        const response = await win.fetch(initUrl, {
          signal: controller.signal,
          credentials: 'same-origin',
          redirect: 'error',
        });
        if (response.url) sameOriginInitUrl(response.url, win.location.origin, doc.baseURI);
        const text = await readBounded(response);
        if (destroyed || controller.signal.aborted) return;
        const init = parseInitJson(
          text,
          region.dataset.draftablyKey ?? '',
          region.dataset.draftablyPolicy ?? '',
        );
        const policy = options.policies.get(init.policyId);
        if (!policy) throw new Error('No viewer policy is configured for this diagram.');
        if (
          region.dataset.draftablyKey !== init.key ||
          region.dataset.draftablyPolicy !== init.policyId
        )
          throw new Error('Figure markers do not match initialization data.');
        if (region.childNodes.length) throw new Error('Viewer region is not empty.');
        handle = mountViewer(region, { ...policy, label: policy.label ?? init.label });
        handles.add(handle);
        const result = await handle.update(init.source, {
          state: init.state,
          camera: 'fit',
          signal: controller.signal,
        });
        if (destroyed || controller.signal.aborted) return;
        if (result.status === 'committed' && image) image.hidden = true;
        else if (result.status === 'error')
          report('The interactive diagram could not load. The static image is still available.');
      } catch (error) {
        if (!destroyed && !controller.signal.aborted)
          report(
            error instanceof Error ? error.message : 'The interactive diagram could not load.',
          );
      } finally {
        aborters.delete(controller);
      }
    })();
  }

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const controller of aborters) controller.abort();
      aborters.clear();
      for (const handle of handles) handle.destroy();
      handles.clear();
      for (const restore of restores) restore();
      restores.length = 0;
      ownedRoots.delete(root);
    },
  };
}
