import { createSignal, For, onCleanup, Show, untrack } from 'solid-js';
import { draw, paperOf, type Drawing } from '../draw';
import { highlightHtml } from '../highlight';
import { themed } from './content';
import { Zoom } from './Zoom';

/** Drawings of the docs' examples, kept so a page can draw them all before it shows. */
const cache = new Map<string, Promise<Drawing>>();
const done = new Map<string, Drawing>();

export function prepare(source: string): Promise<Drawing> {
  let p = cache.get(source);
  if (!p) {
    p = draw(source).then(d => (done.set(source, d), d));
    cache.set(source, p);
  }
  return p;
}

/** Draw every source in turn, in idle time, so later pages open at once. */
export function warm(sources: string[]) {
  const next = () => {
    const source = sources.shift();
    if (source === undefined) return;
    void prepare(source).then(() => requestIdleCallback(next));
  };
  requestIdleCallback(next);
}

// TODO(playground): link to `/play#<hash>` with this source once the playground's share hash
// (compressed source in the URL hash) lands; until then it opens the playground empty.
const playUrl = (_source: string) => `${import.meta.env.BASE_URL}play`;

/** A drawing this narrow sits beside its source instead of under it. */
const SPLIT_WIDTH = 640;
const widthOf = (svg: string) => Number(/width="([\d.]+)"/.exec(svg)?.[1] ?? Infinity);

/**
 * A ```draft block: its source, editable in place, with its drawing. With `themes`, the drawing
 * is repeated once per theme. An edit redraws after a short pause; while the source has errors
 * the last good drawing stays, dimmed, with the error over it.
 */
export function Example(props: { source: string; themes?: boolean }) {
  const original = untrack(() => props.source);
  const variants = (text: string) =>
    untrack(() => props.themes) ? themed(text) : [{ id: '', source: text }];
  const first = variants(original).map(v => done.get(v.source)?.svg ?? '');

  const [source, setSource] = createSignal(original);
  const [svgs, setSvgs] = createSignal(first);
  const [error, setError] = createSignal('');
  const [zoomed, setZoomed] = createSignal<string>();
  // Decided once, from the first drawing, so an edit never flips the layout.
  const split = !props.themes && widthOf(first[0]) <= SPLIT_WIDTH;

  let run = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const edit = (text: string) => {
    setSource(text);
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++run;
      const results = await Promise.all(variants(text).map(v => draw(v.source)));
      if (mine !== run) return;
      const err = results[0].diagnostics.find(d => d.level === 'error');
      setError(err ? `${err.line ? `Line ${err.line}: ` : ''}${err.message}` : '');
      if (!err) setSvgs(results.map(r => r.svg ?? ''));
    }, 160);
  };
  onCleanup(() => clearTimeout(timer));

  const lines = () => source().split('\n').length;
  const ids = variants(original).map(v => v.id);

  return (
    <figure class="doc-example" classList={{ 'is-split': split }}>
      <div class="doc-example-bar">
        <span class="doc-example-label">.draft</span>
        <Show when={source() !== original}>
          <button type="button" class="doc-link-button" onClick={() => edit(original)}>
            Reset
          </button>
        </Show>
        <CopyButton text={source} />
        <Show when={!props.themes}>
          <button type="button" class="doc-link-button" onClick={() => setZoomed(svgs()[0])}>
            Expand
          </button>
        </Show>
        <a class="doc-example-play" href={playUrl(source())}>
          Edit in playground →
        </a>
      </div>
      <div class="doc-example-body">
        <div class="doc-example-source">
          <pre class="doc-example-gutter" aria-hidden="true">
            {Array.from({ length: lines() }, (_, i) => i + 1).join('\n')}
          </pre>
          <div class="doc-example-code">
            <pre
              class="doc-example-hl"
              aria-hidden="true"
              // Built from escaped tokens by highlightHtml.
              // eslint-disable-next-line solid/no-innerhtml
              innerHTML={highlightHtml(source()) + '\n'}
            />
            <textarea
              class="doc-example-text"
              aria-label="Diagram source"
              spellcheck={false}
              autocapitalize="off"
              rows={lines()}
              value={source()}
              onInput={e => edit(e.currentTarget.value)}
            />
          </div>
        </div>
        <Show
          when={props.themes}
          fallback={
            <Svg svg={svgs()[0]} error={error()} onOpen={() => setZoomed(svgs()[0])} />
          }
        >
          <div class="doc-themes">
            <For each={ids}>
              {(id, i) => (
                <figure class="doc-theme">
                  <figcaption>
                    <code>theme {id}</code>
                  </figcaption>
                  <Svg
                    svg={svgs()[i()]}
                    error={i() === 0 ? error() : ''}
                    stale={!!error()}
                    onOpen={() => setZoomed(svgs()[i()])}
                  />
                </figure>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={zoomed()}>{svg => <Zoom svg={svg()} onClose={() => setZoomed()} />}</Show>
    </figure>
  );
}

function Svg(props: { svg: string; error?: string; stale?: boolean; onOpen: () => void }) {
  return (
    <div
      class="doc-drawing"
      classList={{ 'is-stale': !!props.error || props.stale }}
      style={{ background: paperOf(props.svg) }}
      onDblClick={() => props.onOpen()}
      title="Double-click to expand"
    >
      {/* The SVG comes from our own renderer, which escapes every label. */}
      {/* eslint-disable-next-line solid/no-innerhtml */}
      <div class="doc-drawing-svg" innerHTML={props.svg} />
      <Show when={props.error}>
        <p class="doc-drawing-error">{props.error}</p>
      </Show>
    </div>
  );
}

export function CopyButton(props: { text: () => string }) {
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const copy = async () => {
    await navigator.clipboard.writeText(props.text());
    setCopied(true);
    clearTimeout(timer);
    timer = setTimeout(() => setCopied(false), 700);
  };
  onCleanup(() => clearTimeout(timer));
  return (
    <button
      type="button"
      class="doc-link-button"
      classList={{ 'is-copied': copied() }}
      onClick={copy}
    >
      Copy
    </button>
  );
}
