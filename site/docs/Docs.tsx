import { A, useLocation, useNavigate, useParams } from '@solidjs/router';
import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';
import { appUrl } from '../draw';
import {
  anchorPath,
  docsPath,
  findPage,
  GITHUB,
  html,
  inlineHtml,
  isDraft,
  PAGES,
  type Page,
} from './content';
import { Example, prepare, warm } from './Example';
import { SearchDialog, SearchIcon } from './Search';
import { words } from './find';

const BASE = import.meta.env.BASE_URL;
const GROUPS = [...new Set(PAGES.map(p => p.group))];
const MAC = /Mac|iPhone|iPad/.test(navigator.platform);

/** `/docs` and `/docs/<topic>`: sidebar, the page, its contents and search. */
export function Docs() {
  const params = useParams<{ slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const slug = () => params.slug?.replace(/\/$/, '') || PAGES[0].slug;
  const [page, setPage] = createSignal<Page>();
  const [missing, setMissing] = createSignal(false);
  const [searching, setSearching] = createSignal(false);
  const [menu, setMenu] = createSignal(false);

  // Draw the next page's examples before swapping it in, so nothing moves once it shows.
  createEffect(
    on(slug, s => {
      const next = findPage(s);
      setMenu(false);
      // A DSL.md heading anchor, such as the playground's help links, opens its page there.
      const anchor = !next && anchorPath(s);
      if (anchor) return navigate(anchor, { replace: true });
      if (!next) {
        document.title = 'No such page · Draftably docs';
        return setMissing(true);
      }
      void Promise.all(next.drafts.map(prepare)).then(() => {
        if (slug() !== s) return;
        setMissing(false);
        setPage(next);
        document.title = `${next.title} · Draftably docs`;
      });
    }),
  );
  onMount(() => {
    const first = setTimeout(() => warm(PAGES.flatMap(p => p.drafts)), 600);
    onCleanup(() => clearTimeout(first));
  });

  onMount(() => {
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearching(true);
      } else if (e.key === 'Escape' && !typing && !searching() && location.search) {
        // Clear what search marked on the page.
        navigate(`${location.pathname.slice(BASE.length - 1)}${location.hash}`, { replace: true });
      }
    };
    window.addEventListener('keydown', key);
    onCleanup(() => window.removeEventListener('keydown', key));
  });

  const index = () => PAGES.findIndex(p => p.slug === page()?.slug);
  createEffect(() => document.body.classList.toggle('docs-menu-open', menu()));
  onCleanup(() => document.body.classList.remove('docs-menu-open'));

  return (
    <div class="docs">
      <header class="docs-top">
        <a class="wordmark" href={BASE}>
          Draftably
        </a>
        <button type="button" class="docs-search-button" onClick={() => setSearching(true)}>
          <SearchIcon />
          <span>Search docs</span>
          <kbd>{MAC ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <nav class="docs-top-links">
          <a href={`${BASE}play`}>Playground</a>
          <A href="/docs" class="is-active">
            Docs
          </A>
          <a href={appUrl()}>Editor</a>
          <a href={GITHUB}>GitHub</a>
        </nav>
        <button
          type="button"
          class="docs-menu-button"
          aria-expanded={menu()}
          onClick={() => setMenu(!menu())}
        >
          {menu() ? 'Close' : 'Topics'}
        </button>
      </header>
      <div class="docs-body">
        <nav
          class="docs-side"
          classList={{ 'is-open': menu() }}
          aria-label="Docs topics"
          onClick={e => (e.target as Element).closest('a') && setMenu(false)}
        >
          <For each={GROUPS}>
            {group => (
              <section>
                <h2>{group}</h2>
                <For each={PAGES.filter(p => p.group === group)}>
                  {p => (
                    <A href={docsPath(p.slug)} classList={{ 'is-current': p.slug === slug() }}>
                      {p.title}
                    </A>
                  )}
                </For>
              </section>
            )}
          </For>
        </nav>
        <Show
          when={!missing()}
          fallback={
            <main class="docs-main">
              <article class="doc">
                <h1>No such page</h1>
                <p class="doc-lead">
                  There is no docs page at <code>{location.pathname}</code>.{' '}
                  <button
                    type="button"
                    class="doc-inline-button"
                    onClick={() => setSearching(true)}
                  >
                    Search the docs
                  </button>{' '}
                  or pick a topic from the list.
                </p>
              </article>
            </main>
          }
        >
          <Show when={page()}>
            {p => (
              <>
                <main class="docs-main">
                  <Article page={p()} query={new URLSearchParams(location.search).get('q') ?? ''} />
                  <Pager prev={PAGES[index() - 1]} next={PAGES[index() + 1]} />
                </main>
                <Contents page={p()} />
              </>
            )}
          </Show>
        </Show>
      </div>
      <Show when={searching()}>
        <SearchDialog
          onClose={() => setSearching(false)}
          onPick={(to, query) => {
            setSearching(false);
            navigate(
              `${to.split('#')[0]}?q=${encodeURIComponent(query)}${to.includes('#') ? `#${to.split('#')[1]}` : ''}`,
            );
          }}
        />
      </Show>
    </div>
  );
}

function Article(props: { page: Page; query: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  let el!: HTMLElement;

  // Plain HTML runs, with each ```draft block as a live example between them.
  const parts = () => {
    const out: ({ html: string } | { draft: string; themes: boolean })[] = [];
    let run: Page['tokens'] = [];
    const flush = () => run.length && (out.push({ html: html(run) }), (run = []));
    for (const t of props.page.tokens) {
      if (isDraft(t)) {
        flush();
        out.push({ draft: t.text, themes: t.lang === 'draft themes' });
      } else run.push(t);
    }
    flush();
    return out;
  };

  // Scroll to the hash, or the top, once the page is in place; then mark what search matched.
  createEffect(
    on(
      () => [props.page, location.hash, props.query] as const,
      ([, hash, query]) => {
        requestAnimationFrame(() => {
          const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
          const first = highlight(el, query);
          if (target) target.scrollIntoView();
          else if (first) {
            const top = first.getBoundingClientRect().top + window.scrollY;
            window.scrollTo(0, Math.max(0, top - window.innerHeight / 3));
          } else window.scrollTo(0, 0);
        });
      },
    ),
  );
  onCleanup(() => CSS.highlights?.delete('search'));

  // Links inside the Markdown stay in the app; code blocks copy.
  const click = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const copy = target.closest<HTMLButtonElement>('.doc-copy');
    if (copy) {
      const code = copy.parentElement?.querySelector('code')?.textContent ?? '';
      void navigator.clipboard.writeText(code);
      copy.classList.remove('is-copied');
      void copy.offsetWidth;
      copy.classList.add('is-copied');
      return;
    }
    const a = target.closest('a');
    const href = a?.getAttribute('href');
    if (!a || !href || a.target || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (href.startsWith('#')) {
      e.preventDefault();
      navigate(`${location.pathname.slice(BASE.length - 1)}#${href.slice(1)}`);
    } else if (href.startsWith(`${BASE}docs`)) {
      e.preventDefault();
      navigate(href.slice(BASE.length - 1));
    }
  };

  return (
    <article class="doc" ref={el} onClick={click}>
      <div class="doc-crumbs">
        {/* The group links to its first page, unless that is this page. */}
        <Show
          when={PAGES.find(p => p.group === props.page.group)!.slug !== props.page.slug}
          fallback={<span>{props.page.group}</span>}
        >
          <A href={docsPath(PAGES.find(p => p.group === props.page.group)!.slug)}>
            {props.page.group}
          </A>
        </Show>
        <span aria-hidden="true">/</span>
        <span>{props.page.title}</span>
      </div>
      <h1>{props.page.title}</h1>
      <Show when={props.page.lead}>
        {/* eslint-disable-next-line solid/no-innerhtml -- our own Markdown */}
        <p class="doc-lead" innerHTML={inlineHtml(props.page.lead)} />
      </Show>
      <For each={parts()}>
        {part =>
          'html' in part ? (
            // eslint-disable-next-line solid/no-innerhtml -- our own Markdown
            <div class="doc-md" innerHTML={part.html} />
          ) : (
            <Example source={part.draft} themes={part.themes} />
          )
        }
      </For>
    </article>
  );
}

/** Mark every match of the search words in the article, without touching its DOM. */
function highlight(root: HTMLElement, query: string): Range | undefined {
  if (!CSS.highlights) return;
  CSS.highlights.delete('search');
  const terms = words(query);
  if (!terms.length) return;
  const ranges: Range[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    if (node.parentElement?.closest('.doc-drawing, .doc-example-gutter, textarea')) continue;
    const text = node.textContent!.toLowerCase();
    for (const term of terms)
      for (let at = text.indexOf(term); at >= 0; at = text.indexOf(term, at + term.length)) {
        const range = new Range();
        range.setStart(node, at);
        range.setEnd(node, at + term.length);
        ranges.push(range);
      }
  }
  if (ranges.length) CSS.highlights.set('search', new Highlight(...ranges));
  return ranges[0];
}

/** "On this page", with the section in view marked. */
function Contents(props: { page: Page }) {
  const [current, setCurrent] = createSignal('');
  onMount(() => {
    const spy = () => {
      let id = '';
      for (const h of props.page.headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 120) id = h.id;
      }
      const end = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      setCurrent(end ? (props.page.headings.at(-1)?.id ?? id) : id);
    };
    window.addEventListener('scroll', spy, { passive: true });
    createEffect(
      on(
        () => props.page,
        () => requestAnimationFrame(spy),
      ),
    );
    onCleanup(() => window.removeEventListener('scroll', spy));
  });
  return (
    <aside class="docs-toc" aria-label="On this page">
      <Show when={props.page.headings.length > 1}>
        <h2>On this page</h2>
        <For each={props.page.headings}>
          {h => (
            <A
              href={docsPath(props.page.slug, h.id)}
              classList={{ 'is-current': current() === h.id, 'is-sub': h.depth > 2 }}
            >
              {h.text}
            </A>
          )}
        </For>
      </Show>
      <a class="docs-edit" href={props.page.source} target="_blank" rel="noreferrer">
        Edit this page on GitHub
      </a>
    </aside>
  );
}

function Pager(props: { prev?: Page; next?: Page }) {
  return (
    <nav class="doc-pager" aria-label="Previous and next">
      <Show when={props.prev} fallback={<span />}>
        {p => (
          <A href={docsPath(p().slug)}>
            <small>← Previous</small>
            {p().title}
          </A>
        )}
      </Show>
      <Show when={props.next} fallback={<span />}>
        {p => (
          <A href={docsPath(p().slug)} class="is-next">
            <small>Next →</small>
            {p().title}
          </A>
        )}
      </Show>
    </nav>
  );
}
