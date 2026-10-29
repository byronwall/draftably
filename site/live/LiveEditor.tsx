import { createEffect, createSignal, For, on, onCleanup, Show, untrack } from 'solid-js';
import { findExample } from '../../src/model/examples';
import { appUrl, draw, paperOf, type Drawing } from '../draw';
import { highlightHtml } from '../highlight';

/**
 * Editable `.draft` source beside its drawing. Each edit redraws after a short pause; while the
 * source has errors the last good drawing stays, dimmed. The landing page hero and the playground
 * both use it.
 */
export function LiveEditor(props: { examples: string[] }) {
  const first = untrack(() => props.examples[0]);
  const [id, setId] = createSignal(first);
  const [source, setSource] = createSignal(findExample(first)?.source ?? '');
  const [drawing, setDrawing] = createSignal<Drawing>({ svg: null, diagnostics: [] });
  const [lastSvg, setLastSvg] = createSignal('');
  const [ms, setMs] = createSignal(0);
  const edited = () => source() !== findExample(id())?.source;

  let run = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const redraw = async (text: string) => {
    const mine = ++run;
    const start = performance.now();
    const result = await draw(text);
    if (mine !== run) return;
    setMs(Math.round(performance.now() - start));
    setDrawing(result);
    if (result.svg) setLastSvg(result.svg);
  };
  createEffect(
    on(source, text => {
      clearTimeout(timer);
      timer = setTimeout(() => void redraw(text), lastSvg() ? 200 : 0);
    }),
  );
  onCleanup(() => clearTimeout(timer));

  const pick = (next: string) => {
    setId(next);
    setSource(findExample(next)?.source ?? '');
  };
  const lines = () => source().split('\n').length;
  const errors = () => drawing().diagnostics.filter(d => d.level === 'error');

  return (
    <div class="live">
      <div class="live-bar" role="tablist" aria-label="Examples">
        <For each={props.examples}>
          {ex => (
            <button
              type="button"
              role="tab"
              class="live-tab"
              aria-selected={id() === ex}
              onClick={() => pick(ex)}
            >
              {ex}.draft
            </button>
          )}
        </For>
        <span class="live-bar-end">
          <Show when={edited()}>
            <button type="button" class="live-reset" onClick={() => pick(id())}>
              Reset
            </button>
          </Show>
          <a class="live-open" href={appUrl(id())}>
            Open in the editor
          </a>
        </span>
      </div>
      <div class="live-body">
        <div class="live-source">
          <div class="live-scroll">
            <pre class="live-gutter" aria-hidden="true">
              {Array.from({ length: lines() }, (_, i) => i + 1).join('\n')}
            </pre>
            <div class="live-code">
              <pre
                class="live-hl"
                aria-hidden="true"
                // Built from escaped tokens by highlightHtml.
                // eslint-disable-next-line solid/no-innerhtml
                innerHTML={highlightHtml(source()) + '\n'}
              />
              <textarea
                class="live-text"
                aria-label="Diagram source"
                spellcheck={false}
                autocapitalize="off"
                rows={lines()}
                value={source()}
                onInput={e => setSource(e.currentTarget.value)}
              />
            </div>
          </div>
          <div class="live-status" classList={{ 'is-error': errors().length > 0 }}>
            <Show
              when={errors()[0]}
              fallback={<span>{lastSvg() ? `Drawn in ${ms()} ms` : 'Drawing…'}</span>}
            >
              {err => (
                <span>
                  {err().line ? `Line ${err().line}: ` : ''}
                  {err().message}
                </span>
              )}
            </Show>
          </div>
        </div>
        <div
          class="live-diagram"
          classList={{ 'is-stale': !drawing().svg && !!lastSvg() }}
          style={{ background: paperOf(lastSvg()) }}
          // The SVG comes from our own renderer, which escapes every label.
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={lastSvg()}
        />
      </div>
    </div>
  );
}
