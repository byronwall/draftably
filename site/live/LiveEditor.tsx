import { createEffect, createSignal, For, on, onCleanup, Show, untrack } from 'solid-js';
import { encodeSource } from '../../src/lib/source-hash';
import { findExample } from '../../src/model/examples';
import { appUrl, draw, paperOf, type Drawing } from '../draw';
import { highlightHtml } from '../highlight';

/**
 * Editable `.draft` source beside its drawing. Each edit redraws after a short pause; while the
 * source has errors the last good drawing stays, dimmed. The landing page hero and the playground
 * both use it. Each example's edits are saved in the browser, so leaving the page and coming back
 * resumes them on the tab that was open.
 */
export function LiveEditor(props: { examples: string[] }) {
  const saved = read(TAB);
  const first = untrack(() =>
    saved && props.examples.includes(saved) ? saved : props.examples[0],
  );
  const [id, setId] = createSignal(first);
  const [source, setSource] = createSignal(read(DRAFT + first) ?? findExample(first)?.source ?? '');
  const [drawing, setDrawing] = createSignal<Drawing>({ svg: null, diagnostics: [], items: [] });
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

  // Save the draft after a short pause, and at once on a tab switch or when the page goes away.
  let pending: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    if (pending === undefined) return;
    clearTimeout(pending);
    pending = undefined;
    write(DRAFT + id(), edited() ? source() : null);
  };
  createEffect(
    on(
      source,
      () => {
        clearTimeout(pending);
        pending = setTimeout(save, 300);
      },
      { defer: true },
    ),
  );
  onCleanup(save);

  // The editor opens the example, or once it is edited, the edited source in a share hash.
  const [editorUrl, setEditorUrl] = createSignal(appUrl(first));
  createEffect(() => {
    const text = source();
    if (!edited()) return setEditorUrl(appUrl(id()));
    void encodeSource(text).then(
      hash => source() === text && setEditorUrl(`${import.meta.env.BASE_URL}app/#${hash}`),
    );
  });

  const pick = (next: string) => {
    save();
    setId(next);
    write(TAB, next);
    setSource(read(DRAFT + next) ?? findExample(next)?.source ?? '');
  };
  const reset = () => setSource(findExample(id())?.source ?? '');
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
            <button type="button" class="live-reset" onClick={reset}>
              Reset
            </button>
          </Show>
          <a class="live-open" href={editorUrl()} rel="external">
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

const DRAFT = 'draftably.landing.draft.';
const TAB = 'draftably.landing.tab';

// Storage can be blocked or full; the demo then just starts from the example.
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // See read.
  }
}
