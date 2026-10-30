import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { EXAMPLES, type ExampleInfo } from '../../src/model/examples';
import { thumbnail, type Thumbnail } from '../live/thumbnail';
import { REOPEN_HINT } from '../reopen';

export const BLANK = `diagram "Untitled" version=1

node start "Start"
node next "Next step"
edge go start -> next
`;

/** The parts of `text` that match `query`, for highlighting. */
function marked(text: string, query: string) {
  if (!query) return [{ text, hit: false }];
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return [{ text, hit: false }];
  return [
    { text: text.slice(0, at), hit: false },
    { text: text.slice(at, at + query.length), hit: true },
    { text: text.slice(at + query.length), hit: false },
  ];
}

function Marked(props: { text: string; query: string }) {
  return (
    <For each={marked(props.text, props.query)}>
      {part => (part.hit ? <mark>{part.text}</mark> : part.text)}
    </For>
  );
}

/**
 * Picks a starting diagram: New starts a blank one, and a button naming the current one opens a
 * searchable gallery of every example, drawn as thumbnails.
 */
export function ExamplePicker(props: {
  current: string;
  title: string;
  onPick: (id: string) => void;
  onOpenFile: (file: File) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  let wrap!: HTMLDivElement;
  let input!: HTMLInputElement;
  let button!: HTMLButtonElement;

  const shown = createMemo(() => {
    const q = query().trim().toLowerCase();
    return q
      ? EXAMPLES.filter(e => `${e.title} ${e.summary} ${e.id}`.toLowerCase().includes(q))
      : EXAMPLES;
  });

  const pick = (id: string) => {
    setOpen(false);
    setQuery('');
    props.onPick(id);
  };
  const toggle = () => {
    setOpen(o => !o);
    if (open()) queueMicrotask(() => input.focus());
  };

  const outside = (e: PointerEvent) => {
    if (!wrap.contains(e.target as Node)) setOpen(false);
  };
  onMount(() => document.addEventListener('pointerdown', outside));
  onCleanup(() => document.removeEventListener('pointerdown', outside));

  return (
    <>
      <button
        type="button"
        class="tool picker-new"
        title="Start a blank diagram"
        onClick={() => pick('blank')}
      >
        + New
      </button>
      <div class="picker" ref={wrap}>
        <button
          ref={button}
          type="button"
          class="picker-button"
          aria-expanded={open()}
          onClick={toggle}
        >
          <span>{props.title}</span>
        </button>
        <Show when={open()}>
          <div
            class="picker-panel"
            role="dialog"
            aria-label="Examples"
            onKeyDown={e => {
              if (e.key !== 'Escape') return;
              setOpen(false);
              button.focus();
            }}
          >
            <div class="picker-top">
              <input
                ref={input}
                class="picker-search"
                type="search"
                placeholder={`Search ${EXAMPLES.length} examples`}
                value={query()}
                onInput={e => setQuery(e.currentTarget.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && shown()[0]) pick(shown()[0].id);
                }}
              />
              <label class="tool picker-file" title={REOPEN_HINT}>
                Open a file…
                <input
                  type="file"
                  accept=".draft,.png,.svg,text/plain,image/png,image/svg+xml"
                  class="visually-hidden"
                  onChange={e => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!file) return;
                    setOpen(false);
                    props.onOpenFile(file);
                  }}
                />
              </label>
            </div>
            <div class="picker-grid">
              <Show when={!query()}>
                <button
                  type="button"
                  class="picker-card picker-blank"
                  onClick={() => pick('blank')}
                >
                  <span class="picker-thumb">+</span>
                  <strong>Blank diagram</strong>
                  <span>Two nodes and an edge to start from.</span>
                </button>
              </Show>
              <For each={shown()}>
                {ex => (
                  <Card
                    example={ex}
                    query={query()}
                    current={ex.id === props.current}
                    onPick={pick}
                  />
                )}
              </For>
            </div>
            <Show when={!shown().length}>
              <p class="picker-empty">No example matches “{query()}”.</p>
            </Show>
          </div>
        </Show>
      </div>
    </>
  );
}

function Card(props: {
  example: ExampleInfo;
  query: string;
  current: boolean;
  onPick: (id: string) => void;
}) {
  const [thumb, setThumb] = createSignal<Thumbnail | null>(null);
  onMount(() => void thumbnail(props.example.id, props.example.source).then(setThumb));
  return (
    <button
      type="button"
      class="picker-card"
      aria-current={props.current}
      onClick={() => props.onPick(props.example.id)}
    >
      <span class="picker-thumb" style={{ background: thumb()?.paper }}>
        <Show when={thumb()}>{t => <img src={t().url} alt="" />}</Show>
      </span>
      <strong>
        <Marked text={props.example.title} query={props.query} />
      </strong>
      <span>
        <Marked text={props.example.summary} query={props.query} />
      </span>
    </button>
  );
}
