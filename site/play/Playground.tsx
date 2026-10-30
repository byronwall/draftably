import { Logo } from '../Logo';
import { SiteNav } from '../SiteNav';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  untrack,
} from 'solid-js';
import { decodeSource, encodeSource } from '../../src/lib/source-hash';
import { EXAMPLES, findExample } from '../../src/model/examples';
import { THEME_IDS } from '../../src/model/appearance';
import { draw, type Drawing } from '../draw';
import { CodeEditor, type EditorApi } from '../live/CodeEditor';
import { DiagramView } from '../live/DiagramView';
import { embedPngSource, embedSvgSource } from '../../src/model/embed';
import { deliver, incoming, readDiagramFile, REOPEN_HINT } from '../reopen';
import { BLANK, ExamplePicker } from './ExamplePicker';

const BASE = import.meta.env.BASE_URL;
const SPLIT_KEY = 'draftably.play.split';
const DRAFT_KEY = 'draftably.play.draft';

const THEME_LINE = /^theme[ \t]+([\w-]+)/m;

/** The source the URL names: a shared `#s=` link, then `?example=`. */
async function urlSource() {
  const shared = await decodeSource(location.hash);
  if (shared != null) return { id: 'shared', source: shared };
  const ex = findExample(new URLSearchParams(location.search).get('example') ?? '');
  return ex ? { id: ex.id, source: ex.source } : null;
}

/** The source to start from: a handed-over file, the URL, the saved draft, then checkout. */
async function startingSource() {
  // A file dropped or pasted on another page, handed over by the site shell.
  const handed = incoming();
  if (handed) return { id: 'shared', source: handed.source };
  const fromUrl = await urlSource();
  if (fromUrl) return fromUrl;
  const draft = readDraft();
  if (draft) return { id: 'draft', source: draft };
  const ex = findExample('checkout') ?? EXAMPLES[0];
  return { id: ex.id, source: ex.source };
}

/** Source the visitor wrote or changed, as opposed to an example as it ships. */
const isCustom = (text: string) =>
  !!text.trim() && text !== BLANK && !EXAMPLES.some(e => e.source === text);

const titleOf = (source: string) => /^diagram\s+"([^"]*)"/m.exec(source)?.[1] || 'Untitled diagram';
const fileName = (source: string, ext: string) =>
  `${
    titleOf(source)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'diagram'
  }.${ext}`;

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** A PNG of the drawing at 2x, carrying its source so it opens again. */
async function savePng(svg: string, source: string, name: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * 2;
  canvas.height = img.naturalHeight * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const png = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/png'));
  if (!png) return;
  const bytes = await embedPngSource(new Uint8Array(await png.arrayBuffer()), source);
  save(new Blob([bytes], { type: 'image/png' }), name);
}

export function Playground() {
  const [ready, setReady] = createSignal(false);
  const [exampleId, setExampleId] = createSignal('');
  const [source, setSource] = createSignal('');
  const [drawing, setDrawing] = createSignal<Drawing>({ svg: null, diagnostics: [], items: [] });
  // The source that `drawing` was drawn from; it lags `source` while a redraw is pending.
  const [drawn, setDrawn] = createSignal('');
  const [svg, setSvg] = createSignal('');
  // Ids for completion and linking, kept from the last source that parsed.
  const [items, setItems] = createSignal<Drawing['items']>([]);
  const [ms, setMs] = createSignal(0);
  const [fitKey, setFitKey] = createSignal('');
  const [cursorLine, setCursorLine] = createSignal(0);
  const [hoverId, setHoverId] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);
  const [menu, setMenu] = createSignal(false);
  const [split, setSplit] = createSignal(readSplit());
  // Narrow screens show one pane at a time; wide ones ignore this.
  const [tab, setTab] = createSignal<'source' | 'diagram'>('diagram');
  let editor: EditorApi | undefined;
  let body!: HTMLDivElement;

  // A shared link is someone else's work: it becomes the saved draft only once it is typed in.
  let fromLink = false;
  onMount(async () => {
    const start = await startingSource();
    fromLink = start.id === 'shared' && !untrack(incoming);
    setExampleId(start.id);
    setSource(start.source);
    setFitKey(`${start.id}:0`);
    setTab(isCustom(start.source) ? 'source' : 'diagram');
    setReady(true);
  });

  // Keep the last custom draft, so a bare /play (a nav link, a new tab) resumes it.
  const saveDraft = () => {
    if (ready() && !fromLink && isCustom(source())) writeDraft(source());
  };
  createEffect(on(source, saveDraft));

  // Back and Forward move between a draft and the example that replaced it.
  const onPop = async () => {
    const next = await urlSource();
    if (!next || next.source === source()) return;
    setReplaced(null);
    fromLink = next.id === 'shared';
    setExampleId(next.id);
    setFitKey(`${next.id}:${Date.now()}`);
    editor?.replace(next.source);
  };
  onMount(() => window.addEventListener('popstate', onPop));
  onCleanup(() => window.removeEventListener('popstate', onPop));

  // Redraw after a short pause; a newer edit wins over an older drawing still in flight.
  let run = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on([source, ready], ([text]) => {
      if (!ready()) return;
      clearTimeout(timer);
      timer = setTimeout(
        async () => {
          const mine = ++run;
          const t0 = performance.now();
          const result = await draw(text);
          if (mine !== run) return;
          setMs(Math.round(performance.now() - t0));
          setDrawing(result);
          setDrawn(text);
          if (result.svg) setSvg(result.svg);
          if (result.items.length) setItems(result.items);
        },
        svg() ? 150 : 0,
      );
    }),
  );

  // Keep the URL current, so a refresh or a copied link reopens this source.
  let hashTimer: ReturnType<typeof setTimeout> | undefined;
  const writeHash = async () => {
    const hash = await encodeSource(source());
    history.replaceState(null, '', `${location.pathname}#${hash}`);
  };
  createEffect(
    on(source, () => {
      if (!ready()) return;
      const ex = findExample(exampleId());
      clearTimeout(hashTimer);
      if (ex && ex.source === source()) {
        history.replaceState(null, '', `${location.pathname}?example=${ex.id}`);
        return;
      }
      hashTimer = setTimeout(() => void writeHash(), 400);
    }),
  );
  onCleanup(() => {
    clearTimeout(timer);
    clearTimeout(hashTimer);
  });

  // Picking an example over custom work is a new history entry, so Back (or Restore) returns
  // to the draft.
  const [replaced, setReplaced] = createSignal<string | null>(null);
  const pickExample = async (id: string) => {
    const text = id === 'blank' ? BLANK : findExample(id)?.source;
    const prev = source();
    if (text == null || text === prev) return;
    if (isCustom(prev)) {
      clearTimeout(hashTimer);
      await writeHash();
      saveDraft();
      history.pushState(null, '', location.href);
      setReplaced(prev);
    } else setReplaced(null);
    setExampleId(id);
    setFitKey(`${id}:${Date.now()}`);
    editor?.replace(text);
  };
  // The picker names an example only while the source is that example as it ships.
  const shownExample = () => {
    const ex = findExample(exampleId());
    return ex && ex.source === source() ? ex : undefined;
  };
  const pickerTitle = () => shownExample()?.title ?? titleOf(source());

  // Name the tab after the diagram.
  createEffect(() => {
    if (ready()) document.title = `${titleOf(source())} · Draftably playground`;
  });

  // Source the site shell hands over (a dropped or pasted file) replaces what is open.
  let seen = untrack(incoming)?.at ?? 0;
  createEffect(() => {
    const handed = incoming();
    if (!handed || handed.at === seen || !ready()) return;
    seen = handed.at;
    setExampleId('shared');
    setFitKey(`file:${handed.at}`);
    editor?.replace(handed.source);
  });
  const [fileError, setFileError] = createSignal('');
  const openFile = async (file: File) => {
    const text = await readDiagramFile(file);
    if (text == null) {
      setFileError(`${file.name} has no Draftably source in it.`);
      setTimeout(() => setFileError(''), 3500);
    } else deliver(text);
  };

  const theme = () => THEME_LINE.exec(source())?.[1] ?? 'drafting';
  const setTheme = (id: string) => {
    const text = source();
    const next = THEME_LINE.test(text)
      ? text.replace(THEME_LINE, `theme ${id}`)
      : text.replace(/^(diagram[^\n]*\n)?/, m => `${m}theme ${id}\n`);
    editor?.replace(next);
  };

  // Two-way links: the cursor's line lifts its objects; a hovered object lights its line.
  // The cursor's line lifts its objects while typing; a clicked object stays lifted until a
  // click on empty canvas or Escape.
  const [editing, setEditing] = createSignal(false);
  const [picked, setPicked] = createSignal<string | null>(null);
  const linkedIds = createMemo(() => {
    const hover = hoverId() ?? picked();
    if (hover) return [hover];
    if (!editing()) return [];
    return items()
      .filter(i => i.line === cursorLine())
      .map(i => i.id);
  });
  const linkedLines = createMemo(() => {
    const hover = hoverId() ?? picked();
    const item = hover ? items().find(i => i.id === hover) : undefined;
    return item ? [item.line] : [];
  });
  const pick = (id: string | null) => {
    setPicked(id);
    const item = id ? items().find(i => i.id === id) : undefined;
    if (item) editor?.goto(item.line);
  };

  const problems = () => drawing().diagnostics.filter(d => d.level === 'error');
  const allProblems = () => drawing().diagnostics.filter(d => d.level !== 'info');
  const [listOpen, setListOpen] = createSignal(false);
  // An empty file compiles to a blank page; show the empty state instead.
  const shown = () => (source().trim() ? svg() : '');
  // An image export must show the current source, not the last drawing that worked.
  const imageBlocked = () => {
    const err = problems()[0];
    if (err)
      return err.line
        ? `Fix line ${err.line} to export the image`
        : 'Fix the source to export the image';
    if (!source().trim()) return 'Nothing to draw yet';
    if (drawn() !== source() || !drawing().svg) return 'Drawing…';
    return '';
  };

  const copyLink = async () => {
    await writeHash();
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const openInEditor = async () => {
    location.assign(`${BASE}app/#${await encodeSource(source())}`);
  };

  // Close the download menu on any outside click.
  const closeMenu = (e: PointerEvent) => {
    if (!(e.target as Element).closest('.menu-wrap')) setMenu(false);
  };
  onMount(() => document.addEventListener('pointerdown', closeMenu));
  onCleanup(() => document.removeEventListener('pointerdown', closeMenu));

  // The download menu follows the menu-button pattern: arrows move between items, and Escape or
  // focus leaving it closes it.
  let menuButton!: HTMLButtonElement;
  const menuItems = () => [
    ...menuButton.parentElement!.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    ),
  ];
  const openMenu = (at: 'first' | 'last') => {
    setMenu(true);
    const items = menuItems();
    (at === 'first' ? items[0] : items.at(-1))?.focus();
  };
  const choose = (action: () => void) => {
    setMenu(false);
    menuButton.focus();
    action();
  };
  const onMenuKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && menu()) {
      e.preventDefault();
      e.stopPropagation();
      setMenu(false);
      menuButton.focus();
      return;
    }
    const items = menuItems();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu(e.key === 'ArrowDown' ? 'first' : 'last');
      }
      return;
    }
    const next =
      e.key === 'ArrowDown'
        ? at + 1
        : e.key === 'ArrowUp'
          ? at - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? -1
              : null;
    if (next == null) return;
    e.preventDefault();
    items.at(next % items.length)?.focus();
  };

  const saveSplit = () => {
    try {
      localStorage.setItem(SPLIT_KEY, String(split()));
    } catch {
      // Storage can be blocked; the split still works for this visit.
    }
  };
  const startResize = (e: PointerEvent) => {
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    const box = body.getBoundingClientRect();
    const move = (ev: PointerEvent) =>
      setSplit(Math.min(0.7, Math.max(0.2, (ev.clientX - box.left) / box.width)));
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      saveSplit();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  };

  return (
    <div
      class="play"
      onKeyDown={e => {
        if (e.key === 'Escape') setPicked(null);
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          save(new Blob([source()], { type: 'text/plain' }), fileName(source(), 'draft'));
        }
      }}
    >
      <Show when={fileError()}>
        <div class="drop-veil is-error" onClick={() => setFileError('')}>
          {fileError()}
        </div>
      </Show>
      <header class="play-head">
        <a class="wordmark" href={BASE}>
          <Logo />
          Draftably
        </a>
        <SiteNav current="play" class="play-nav" />
        <div class="play-actions">
          <button type="button" class="tool" classList={{ 'is-done': copied() }} onClick={copyLink}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <Show
                when={copied()}
                fallback={
                  <path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1" />
                }
              >
                <path d="M3.5 8.5l3 3 6-7" />
              </Show>
            </svg>
            Copy link
          </button>
          <div
            class="menu-wrap"
            onKeyDown={onMenuKey}
            onFocusOut={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMenu(false);
            }}
          >
            <button
              type="button"
              class="tool"
              ref={menuButton}
              aria-haspopup="menu"
              aria-expanded={menu()}
              aria-controls="download-menu"
              disabled={!ready()}
              // A keyboard press (detail 0) opens onto the first item, as a menu button should.
              onClick={e =>
                menu() ? setMenu(false) : e.detail ? setMenu(true) : openMenu('first')
              }
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" />
              </svg>
              Download
            </button>
            <Show when={menu()}>
              <div class="menu" id="download-menu" role="menu" aria-label="Download">
                <button
                  type="button"
                  role="menuitem"
                  disabled={!!imageBlocked()}
                  aria-describedby={imageBlocked() ? 'export-note' : undefined}
                  tabIndex={-1}
                  onClick={() =>
                    choose(() =>
                      save(
                        new Blob([embedSvgSource(svg(), source())], { type: 'image/svg+xml' }),
                        fileName(source(), 'svg'),
                      ),
                    )
                  }
                >
                  SVG<span>Opens again here</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!!imageBlocked()}
                  aria-describedby={imageBlocked() ? 'export-note' : undefined}
                  tabIndex={-1}
                  onClick={() =>
                    choose(() => void savePng(svg(), source(), fileName(source(), 'png')))
                  }
                >
                  PNG<span>2×, opens again here</span>
                </button>
                <Show when={imageBlocked()}>
                  <p class="menu-note" id="export-note">
                    {imageBlocked()}
                  </p>
                </Show>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() =>
                    choose(() =>
                      save(
                        new Blob([source()], { type: 'text/plain' }),
                        fileName(source(), 'draft'),
                      ),
                    )
                  }
                >
                  .draft<span>The source</span>
                </button>
              </div>
            </Show>
          </div>
          <button type="button" class="tool primary" onClick={openInEditor}>
            <span class="long">Open in the editor</span>
            <span class="short">Open</span>
          </button>
        </div>
      </header>

      <div
        class="play-tabs"
        role="tablist"
        aria-label="Panes"
        onKeyDown={e => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const next = tab() === 'source' ? 'diagram' : 'source';
          setTab(next);
          document.getElementById(`play-tab-${next}`)?.focus();
        }}
      >
        <For each={['source', 'diagram'] as const}>
          {id => (
            <button
              type="button"
              role="tab"
              id={`play-tab-${id}`}
              aria-selected={tab() === id}
              aria-controls={`play-${id}`}
              tabIndex={tab() === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              {id === 'source' ? 'Source' : 'Diagram'}
            </button>
          )}
        </For>
      </div>
      <div class="play-body" ref={body} data-tab={tab()} style={{ '--split': `${split() * 100}%` }}>
        <section class="play-source" id="play-source" aria-label="Source">
          <div class="pane-head">
            <ExamplePicker
              current={shownExample()?.id ?? ''}
              title={pickerTitle()}
              onPick={id => void pickExample(id)}
              onOpenFile={file => void openFile(file)}
            />
            <label class="select">
              <span class="select-label">Theme</span>
              <select
                aria-label="Theme"
                value={theme()}
                onChange={e => setTheme(e.currentTarget.value)}
              >
                <For each={THEME_IDS}>
                  {id => <option value={id}>{id[0].toUpperCase() + id.slice(1)}</option>}
                </For>
              </select>
            </label>
            <button
              type="button"
              class="tool quiet"
              title={
                problems().length
                  ? 'Fix the errors to format'
                  : 'Rewrite in the standard layout (Shift+Alt+F)'
              }
              disabled={problems().length > 0}
              onClick={() => editor?.format()}
            >
              Format
            </button>
          </div>
          <Show when={replaced()}>
            {draft => (
              <div class="play-notice" role="status">
                <span>Replaced “{titleOf(draft())}”</span>
                <button type="button" class="tool" onClick={() => history.back()}>
                  Restore your draft
                </button>
                <button
                  type="button"
                  class="play-notice-close"
                  aria-label="Dismiss"
                  onClick={() => setReplaced(null)}
                >
                  ×
                </button>
              </div>
            )}
          </Show>
          <Show when={ready()}>
            <CodeEditor
              value={source()}
              onChange={setSource}
              diagnostics={drawing().diagnostics}
              linkedLines={linkedLines()}
              onCursorLine={setCursorLine}
              onFocusChange={setEditing}
              onType={() => {
                setPicked(null);
                setReplaced(null);
                fromLink = false;
                saveDraft();
              }}
              ref={api => (editor = api)}
            />
          </Show>
          <div class="play-status-wrap">
            <Show when={listOpen() && allProblems().length > 1}>
              <ul
                class="problems"
                onKeyDown={e => {
                  if (e.key === 'Escape') setListOpen(false);
                }}
              >
                <For each={allProblems()}>
                  {d => (
                    <li>
                      <button
                        type="button"
                        classList={{ 'is-error': d.level === 'error' }}
                        onClick={() => {
                          setListOpen(false);
                          if (d.line) editor?.goto(d.line);
                        }}
                      >
                        <span class="problem-line">{d.line ? `Line ${d.line}` : 'File'}</span>
                        {d.message}
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
            <button
              type="button"
              class="play-status"
              classList={{
                'is-error': problems().length > 0,
                'is-warning': !problems().length && allProblems().length > 0,
              }}
              disabled={!allProblems().length}
              onClick={() => {
                if (allProblems().length > 1) setListOpen(o => !o);
                else if (allProblems()[0]?.line) editor?.goto(allProblems()[0].line!);
              }}
            >
              <Show
                when={allProblems()[0]}
                fallback={
                  <span>
                    {!source().trim()
                      ? 'Empty file'
                      : svg()
                        ? `No problems · drawn in ${ms()} ms`
                        : 'Drawing…'}
                  </span>
                }
              >
                {d => (
                  <span>
                    {d().line ? `Line ${d().line}: ` : ''}
                    {d().message}
                    {allProblems().length > 1 ? ` · ${allProblems().length - 1} more` : ''}
                  </span>
                )}
              </Show>
              <Show when={shown()}>
                <span class="play-hint">Click a shape to find its line</span>
              </Show>
            </button>
          </div>
        </section>
        <div
          class="play-split"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          aria-valuenow={Math.round(split() * 100)}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={e => {
            const step = e.key === 'ArrowLeft' ? -0.02 : e.key === 'ArrowRight' ? 0.02 : 0;
            if (!step) return;
            e.preventDefault();
            setSplit(v => Math.min(0.7, Math.max(0.2, v + step)));
            saveSplit();
          }}
        />
        <section class="play-diagram" id="play-diagram" aria-label="Diagram">
          <DiagramView
            svg={shown()}
            stale={!drawing().svg && !!svg()}
            fitKey={fitKey()}
            linkedIds={linkedIds()}
            onHover={setHoverId}
            onPick={pick}
          />
          <Show when={!shown() && ready()}>
            <div class="diagram-empty">
              <Show
                when={source().trim()}
                fallback={
                  <>
                    <p>Nothing to draw yet. {REOPEN_HINT}, or start here.</p>
                    <div>
                      <button type="button" class="tool" onClick={() => pickExample('blank')}>
                        Start from two nodes
                      </button>
                      <button type="button" class="tool" onClick={() => pickExample('checkout')}>
                        Open an example
                      </button>
                    </div>
                  </>
                }
              >
                <Show when={problems()[0]} fallback={<p>Drawing…</p>}>
                  {d => (
                    <p>
                      The drawing appears once {d().line ? `line ${d().line}` : 'the source'} is
                      fixed.
                    </p>
                  )}
                </Show>
              </Show>
            </div>
          </Show>
        </section>
      </div>
    </div>
  );
}

function readDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

function writeDraft(text: string) {
  try {
    localStorage.setItem(DRAFT_KEY, text);
  } catch {
    // Storage can be blocked; the URL still carries the draft.
  }
}

function readSplit() {
  try {
    const n = Number(localStorage.getItem(SPLIT_KEY));
    return n >= 0.2 && n <= 0.7 ? n : 0.38;
  } catch {
    return 0.38;
  }
}
