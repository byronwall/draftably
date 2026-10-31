import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { docsPath } from './content';
import { marks, search, words, type Hit } from './find';

const LAST = 'draftably-docs-search';
const SAMPLES = ['swim lanes', 'fold=never', 'vary --apply', 'kind=async'];

/**
 * ⌘K search, in a native modal dialog: the browser makes the page behind it inert and puts focus
 * back when it closes. Arrow keys move, Enter opens, Escape closes.
 */
export function SearchDialog(props: {
  onClose: () => void;
  onPick: (to: string, query: string) => void;
}) {
  const [query, setQuery] = createSignal(readLast());
  const [active, setActive] = createSignal(0);
  const hits = createMemo(() => search(query()));
  const terms = () => words(query());
  let dialog!: HTMLDialogElement;
  let input!: HTMLInputElement;
  let list!: HTMLDivElement;

  onMount(() => {
    dialog.showModal();
    input.select();
  });
  onCleanup(() => {
    // Leaving the page without close() would skip the focus return.
    dialog.close();
    try {
      localStorage.setItem(LAST, query());
    } catch {
      // Storage may be blocked; the next search just starts empty.
    }
  });

  const to = (hit: Hit) => docsPath(hit.entry.page.slug, hit.entry.id);
  const pick = (hit?: Hit) => hit && props.onPick(to(hit), query());
  const move = (by: number) => {
    const n = hits().length;
    if (!n) return;
    setActive((active() + by + n) % n);
    list.querySelector(`[data-i="${active()}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  const key = (e: KeyboardEvent) => {
    // A sample button in the empty state keeps its own Enter.
    if (e.target !== input && e.key !== 'Escape') return;
    if (e.key === 'ArrowDown') move(1);
    else if (e.key === 'ArrowUp') move(-1);
    else if (e.key === 'Enter') pick(hits()[active()]);
    else if (e.key === 'Escape') props.onClose();
    else return;
    e.preventDefault();
  };

  return (
    <dialog
      ref={dialog}
      class="search-backdrop"
      aria-label="Search docs"
      onKeyDown={key}
      onCancel={e => {
        e.preventDefault();
        props.onClose();
      }}
      onMouseDown={e => e.target === e.currentTarget && props.onClose()}
    >
      <div class="search">
        <label class="search-field">
          <SearchIcon />
          <input
            ref={input}
            value={query()}
            placeholder="Search the docs: fold=never, swim lanes, vary…"
            aria-label="Search the docs"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={hits().length > 0}
            aria-controls="search-results"
            aria-activedescendant={hits().length ? `search-hit-${active()}` : undefined}
            spellcheck={false}
            onInput={e => {
              setQuery(e.currentTarget.value);
              setActive(0);
              list.scrollTop = 0;
            }}
          />
          <kbd>Esc</kbd>
        </label>
        <div
          class="search-results"
          id="search-results"
          ref={list}
          role={hits().length ? 'listbox' : undefined}
          aria-label="Results"
        >
          <Show
            when={hits().length}
            fallback={
              <p class="search-empty">
                {terms().length ? `Nothing matches “${query()}”. Try ` : 'Try '}
                <For each={SAMPLES}>
                  {(sample, i) => (
                    <>
                      {i() ? ', ' : ''}
                      <button
                        type="button"
                        class="doc-inline-button"
                        onClick={() => {
                          setQuery(sample);
                          input.focus();
                        }}
                      >
                        {sample}
                      </button>
                    </>
                  )}
                </For>
                .
              </p>
            }
          >
            <For each={hits()}>
              {(hit, i) => (
                <a
                  href={`${import.meta.env.BASE_URL}${to(hit).slice(1)}`}
                  class="search-hit"
                  id={`search-hit-${i()}`}
                  tabIndex={-1}
                  classList={{ 'is-active': i() === active() }}
                  data-i={i()}
                  role="option"
                  aria-selected={i() === active()}
                  onMouseMove={() => setActive(i())}
                  onClick={e => {
                    if (e.metaKey || e.ctrlKey) return;
                    e.preventDefault();
                    pick(hit);
                  }}
                >
                  <span class="search-hit-title">
                    <Marked text={hit.entry.page.title} terms={terms()} />
                    <Show when={hit.entry.heading}>
                      <span class="search-hit-sep">›</span>
                      <Marked text={hit.entry.heading!} terms={terms()} />
                    </Show>
                  </span>
                  <span class="search-hit-text">
                    <Marked text={hit.snippet} terms={terms()} />
                  </span>
                </a>
              )}
            </For>
          </Show>
        </div>
        <div class="search-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span class="search-count">
            {hits().length ? `${hits().length}${hits().length === 40 ? '+' : ''} sections` : ''}
          </span>
        </div>
      </div>
    </dialog>
  );
}

function Marked(props: { text: string; terms: string[] }) {
  return (
    <For each={marks(props.text, props.terms)}>
      {run => (run.match ? <mark>{run.text}</mark> : run.text)}
    </For>
  );
}

function readLast() {
  try {
    return localStorage.getItem(LAST) ?? '';
  } catch {
    return '';
  }
}

export function SearchIcon() {
  return (
    <svg class="docs-search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}
