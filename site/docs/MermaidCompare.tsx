/* eslint-disable solid/no-innerhtml -- Mermaid's SVG of our own docs source, our drawings and our highlighter */
import { createResource, For, Show } from 'solid-js';
import { paperOf } from '../draw';
import { highlightHtml } from '../highlight';
import { prepare } from './Example';
import { playUrl } from './play-link';

let mermaidLoad: Promise<typeof import('mermaid').default> | undefined;
let renders = 0;

/** Mermaid's own drawing of the source, as a site that uses Mermaid shows it today. */
async function mermaidSvg(source: string) {
  mermaidLoad ??= import('mermaid').then(m => {
    m.default.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
    return m.default;
  });
  const mermaid = await mermaidLoad;
  return (await mermaid.render(`mermaid-compare-${++renders}`, source)).svg;
}

/** What the browser import makes of the source, drawn by draftably. */
async function imported(source: string) {
  const { importBrowser } = await import('../../src/import/browser');
  const result = await importBrowser(source);
  const native = result.nativeSource ?? '';
  const notes = result.diagnostics
    .filter(d => d.severity !== 'info')
    .map(d => ({ error: d.severity === 'error', message: d.message }));
  const drawing = native ? await prepare(native) : undefined;
  return { native, notes, svg: drawing?.svg ?? '', play: native ? await playUrl(native) : '' };
}

/**
 * A ```mermaid compare block: the Mermaid source and Mermaid's drawing beside the `.draft` the
 * import writes and draftably's drawing, with what the import changed.
 */
export function MermaidCompare(props: { source: string }) {
  const [mine] = createResource(() => props.source, mermaidSvg);
  const [ours] = createResource(() => props.source, imported);
  const lines = (text: string) => text.split('\n').length;

  return (
    <figure class="mermaid-compare">
      <div class="mc-head mc-m-head">
        <span>Mermaid</span>
        <span class="mc-sub">{lines(props.source)} lines</span>
      </div>
      <div class="mc-head mc-d-head">
        <span>.draft after import</span>
        <Show when={ours()?.native}>
          {native => <span class="mc-sub">{lines(native().trimEnd())} lines</span>}
        </Show>
        <Show when={ours()?.play}>
          {href => (
            <a class="doc-example-play" href={href()}>
              Playground →
            </a>
          )}
        </Show>
      </div>
      <pre class="mc-code mc-m-code">
        <code>{props.source}</code>
      </pre>
      <pre class="mc-code mc-d-code">
        <code innerHTML={ours() ? highlightHtml(ours()!.native.trimEnd()) : ''} />
      </pre>
      <div class="mc-drawing mc-m-drawing">
        <Show
          when={!mine.error}
          fallback={<p class="mc-wait">Mermaid could not draw this: {String(mine.error)}</p>}
        >
          <Show when={mine()} fallback={<p class="mc-wait">Drawing with Mermaid…</p>}>
            {svg => <div class="mc-svg" innerHTML={svg()} />}
          </Show>
        </Show>
      </div>
      <div class="mc-drawing mc-d-drawing" style={{ background: paperOf(ours()?.svg ?? '') }}>
        <Show when={ours()?.svg} fallback={<p class="mc-wait">Importing…</p>}>
          {svg => <div class="mc-svg" innerHTML={svg()} />}
        </Show>
      </div>
      <figcaption class="mc-notes">
        <Show when={ours()}>
          {found => (
            <Show
              when={found().notes.length}
              fallback={<p>The import keeps every detail of this source.</p>}
            >
              <p>What the import changes:</p>
              <ul>
                <For each={found().notes}>
                  {n => <li classList={{ 'is-error': n.error }}>{n.message}</li>}
                </For>
              </ul>
            </Show>
          )}
        </Show>
      </figcaption>
    </figure>
  );
}
