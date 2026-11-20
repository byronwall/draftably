/* eslint-disable solid/no-innerhtml -- Mermaid's SVG of the reader's source, our drawings and our highlighter */
import {
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  onCleanup,
  Show,
  untrack,
} from 'solid-js';
import { paperOf } from '../draw';
import { highlightHtml } from '../highlight';
import { mermaidSvg } from '../mermaid-svg';
import { prepare } from './Example';
import { playUrl } from './play-link';

/** What the browser import makes of the source, drawn by draftably. */
async function imported(source: string) {
  const { importBrowser } = await import('../../src/import/browser');
  const result = await importBrowser(source).catch((error: unknown) => ({
    nativeSource: undefined,
    diagnostics: [
      { severity: 'error', message: error instanceof Error ? error.message : String(error) },
    ],
  }));
  const native = result.nativeSource ?? '';
  const notes = result.diagnostics
    .filter(d => d.severity !== 'info')
    .map(d => ({ error: d.severity === 'error', message: d.message }));
  const drawing = native ? await prepare(native) : undefined;
  return { native, notes, svg: drawing?.svg ?? '', play: native ? await playUrl(native) : '' };
}

/**
 * A ```mermaid compare block: the Mermaid source and Mermaid's drawing beside the `.draft` the
 * import writes and draftably's drawing, with what the import changed. The Mermaid side is
 * editable, so a reader can paste their own diagram and see both drawings follow.
 */
export function MermaidCompare(props: { source: string }) {
  const original = untrack(() => props.source);
  const [text, setText] = createSignal(original);
  // Both drawings follow the text after a short pause.
  const [settled, setSettled] = createSignal(original);
  let timer: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on(
      text,
      t => {
        clearTimeout(timer);
        timer = setTimeout(() => setSettled(t), 400);
      },
      { defer: true },
    ),
  );
  onCleanup(() => clearTimeout(timer));

  const [mine] = createResource(settled, mermaidSvg);
  const [ours] = createResource(settled, imported);
  // The last drawing that worked stays, dimmed, while an edit has an error.
  const [lastMine, setLastMine] = createSignal('');
  createEffect(() => {
    const svg = mine.error ? undefined : mine();
    if (svg) setLastMine(svg);
  });
  const lines = (t: string) => t.trimEnd().split('\n').length;

  return (
    <figure class="mermaid-compare">
      <div class="mc-head mc-m-head">
        <span>Mermaid</span>
        <span class="mc-sub">editable · {lines(text())} lines</span>
        <button
          type="button"
          class="doc-link-button"
          style={{ visibility: text() === original ? 'hidden' : 'visible' }}
          onClick={() => setText(original)}
        >
          Reset
        </button>
      </div>
      <div class="mc-head mc-d-head">
        <span>.draft after import</span>
        <Show when={ours()?.native}>
          {native => <span class="mc-sub">{lines(native())} lines</span>}
        </Show>
        <Show when={ours()?.play}>
          {href => (
            <a class="doc-example-play" href={href()}>
              Playground →
            </a>
          )}
        </Show>
      </div>
      <textarea
        class="mc-code mc-m-code mc-edit"
        spellcheck={false}
        aria-label="Mermaid source"
        rows={Math.max(lines(text()), 4)}
        value={text()}
        onInput={e => setText(e.currentTarget.value)}
      />
      <pre class="mc-code mc-d-code">
        <code innerHTML={ours()?.native ? highlightHtml(ours()!.native.trimEnd()) : ''} />
      </pre>
      <div class="mc-drawing mc-m-drawing" classList={{ 'is-stale': !!mine.error }}>
        <Show when={lastMine()} fallback={<p class="mc-wait">Drawing with Mermaid…</p>}>
          {svg => <div class="mc-svg" innerHTML={svg()} />}
        </Show>
        <Show when={mine.error}>
          <p class="mc-error">Mermaid cannot draw this text.</p>
        </Show>
      </div>
      <div
        class="mc-drawing mc-d-drawing"
        classList={{ 'is-stale': !!ours() && !ours()!.svg }}
        style={{ background: paperOf(ours()?.svg ?? '') }}
      >
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
