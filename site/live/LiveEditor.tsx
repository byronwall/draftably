import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  Show,
  untrack,
} from 'solid-js';
import type { Scene } from '../../src/dsl/compile';
import { encodeSource } from '../../src/lib/source-hash';
import { downloadBlob, downloadText, svgToPng } from '../../src/lib/svg-export';
import { embedPngSource, embedSvgSource } from '../../src/model/embed';
import { findExample } from '../../src/model/examples';
import { appUrl, draw, paperOf, type Drawing } from '../draw';
import { highlightHtml } from '../highlight';
import { DragView } from './DragView';
import { addedLines, moveNote, moveObject } from './move';

type Output = 'live' | 'static';

/** The last source that drew, with its drawing. Drags and exports work from it. */
interface Good {
  source: string;
  svg: string;
  scene: Scene;
}

const kb = (text: string) => `${Math.max(1, Math.round(new Blob([text]).size / 1024))} KB`;

const [handoff, setHandoff] = createSignal(appUrl());

/**
 * Where the demo's work opens in the Editor: the open example, or once it is edited, a share URL
 * that carries the edited source. Links to it need `rel="external"`.
 */
export const demoEditorUrl = handoff;

/**
 * The landing page hero: `.draft` source beside its drawing, with the two ways out of a file.
 * Live: drag a box and the move is written into the source, or edit the source and it redraws.
 * Static: the same drawing as an SVG image that cannot move, with SVG and PNG downloads.
 * Each example's edits are saved in the browser, so leaving the page and coming back resumes them
 * on the tab that was open.
 */
export function LiveEditor(props: { examples: string[]; hints?: Record<string, string> }) {
  const saved = read(TAB);
  const first = untrack(() =>
    saved && props.examples.includes(saved) ? saved : props.examples[0],
  );
  const [id, setId] = createSignal(first);
  const [source, setSource] = createSignal(read(DRAFT + first) ?? findExample(first)?.source ?? '');
  const [drawing, setDrawing] = createSignal<Drawing>({ svg: null, diagnostics: [], items: [] });
  const [good, setGood] = createSignal<Good>();
  const [ms, setMs] = createSignal(0);
  const [output, setOutput] = createSignal<Output>('live');
  const [changed, setChanged] = createSignal<number[]>([]);
  const [note, setNote] = createSignal('');
  const [undo, setUndo] = createSignal<string[]>([]);
  const [fits, setFits] = createSignal(0);
  const edited = () => source() !== findExample(id())?.source;

  let run = 0;
  let now = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const redraw = async (text: string) => {
    const mine = ++run;
    const start = performance.now();
    const result = await draw(text);
    if (mine !== run) return;
    setMs(Math.round(performance.now() - start));
    setDrawing(result);
    if (result.svg && result.scene) setGood({ source: text, svg: result.svg, scene: result.scene });
  };
  createEffect(
    on(source, text => {
      clearTimeout(timer);
      // A drop or an undo redraws at once; typing waits for a pause.
      timer = setTimeout(() => void redraw(text), now || !good() ? 0 : 200);
      now = false;
    }),
  );
  onCleanup(() => clearTimeout(timer));

  /** Replace the source from outside the text box, marking the lines that are new. */
  const replace = (next: string, message: string) => {
    setChanged(addedLines(source(), next));
    setNote(message);
    now = true;
    setSource(next);
    const top = changed()[0];
    if (top !== undefined && scroller) {
      const y = top * 20;
      if (y < scroller.scrollTop || y > scroller.scrollTop + scroller.clientHeight - 60) {
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        scroller.scrollTo({
          top: Math.max(0, y - scroller.clientHeight / 3),
          behavior: still ? 'auto' : 'smooth',
        });
      }
    }
  };

  const preview = async (oid: string, dx: number, dy: number) => {
    const g = good();
    const next = g && (await moveObject(g.source, g.scene, oid, dx, dy, true));
    return next ? (await draw(next)).svg : null;
  };
  const drop = async (oid: string, dx: number, dy: number) => {
    const g = good();
    const next = g && (await moveObject(g.source, g.scene, oid, dx, dy));
    if (!g || !next || next === g.source) return false;
    setUndo(u => [...u, g.source].slice(-40));
    replace(next, moveNote(g.source, next, oid));
    return true;
  };
  const back = () => {
    const prev = undo().at(-1);
    if (prev === undefined) return;
    setUndo(u => u.slice(0, -1));
    replace(prev, 'Undid the last move');
    setChanged([]);
  };

  const clearMarks = () => {
    setUndo([]);
    setChanged([]);
    setNote('');
    now = true;
  };

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
  createEffect(() => {
    const text = source();
    if (!edited()) return setHandoff(appUrl(id()));
    void encodeSource(text).then(
      hash => source() === text && setHandoff(`${import.meta.env.BASE_URL}app/#${hash}`),
    );
  });

  const pick = (next: string) => {
    if (next === id()) return;
    save();
    setId(next);
    write(TAB, next);
    clearMarks();
    // The last tab's drawing is not this file's, so it cannot stand in if this draft is broken.
    setGood(undefined);
    setSource(read(DRAFT + next) ?? findExample(next)?.source ?? '');
  };
  const reset = () => {
    clearMarks();
    setFits(n => n + 1);
    setSource(findExample(id())?.source ?? '');
  };
  const onTabKey = (e: KeyboardEvent) => {
    const tabs = props.examples;
    const at = tabs.indexOf(id());
    const keys: Record<string, number> = {
      ArrowRight: (at + 1) % tabs.length,
      ArrowLeft: (at - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const to = keys[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pick(tabs[to]);
    document.getElementById(`live-tab-${tabs[to]}`)?.focus();
  };
  const lines = () => source().split('\n').length;
  const errors = () => drawing().diagnostics.filter(d => d.level === 'error');
  const stale = () => !drawing().svg && !!good();
  /** Nothing to show or export: no drawing yet from a broken file, or a file with no objects. */
  const blank = () => (errors().length > 0 || !!good()) && !good()?.scene.objects.length;
  /** What stands between the source and an up-to-date download. */
  const blocked = () => {
    const err = errors()[0];
    if (err) return err.line ? `Fix line ${err.line}` : 'Fix the source';
    return blank() ? 'Add a node' : '';
  };
  let scroller: HTMLDivElement | undefined;

  // The static image carries its source, so a copy found in a doc or PR reopens as this file.
  const exported = createMemo(() => {
    const g = good();
    return g ? embedSvgSource(g.svg, g.source) : '';
  });
  const imageUrl = createMemo<string>(prev => {
    if (prev) URL.revokeObjectURL(prev);
    return exported() ? URL.createObjectURL(new Blob([exported()], { type: 'image/svg+xml' })) : '';
  }, '');
  onCleanup(() => imageUrl() && URL.revokeObjectURL(imageUrl()));
  const saveSvg = () => downloadText(exported(), `${id()}.svg`, 'image/svg+xml');
  const savePng = async () => {
    const g = good();
    if (!g) return;
    const png = new Uint8Array(await (await svgToPng(g.svg)).arrayBuffer());
    const bytes = await embedPngSource(png, g.source);
    downloadBlob(new Blob([bytes as BlobPart], { type: 'image/png' }), `${id()}.png`);
  };

  return (
    <div class="live">
      <div class="live-bar">
        <div class="live-tabs" role="tablist" aria-label="Examples" onKeyDown={onTabKey}>
          <For each={props.examples}>
            {ex => (
              <button
                type="button"
                role="tab"
                class="live-tab"
                id={`live-tab-${ex}`}
                aria-selected={id() === ex}
                aria-controls="live-panel"
                tabIndex={id() === ex ? 0 : -1}
                onClick={() => pick(ex)}
              >
                {ex}.draft
              </button>
            )}
          </For>
        </div>
        <span class="live-bar-end">
          <Show when={undo().length}>
            <button type="button" class="live-reset" onClick={back}>
              Undo
            </button>
          </Show>
          <Show when={edited()}>
            <button type="button" class="live-reset" onClick={reset}>
              Reset
            </button>
          </Show>
          <a class="live-open" href={handoff()} rel="external">
            Open in the editor
          </a>
        </span>
      </div>
      <div class="live-body" id="live-panel" role="tabpanel" aria-labelledby={`live-tab-${id()}`}>
        <div class="live-stage">
          <Show
            when={output() === 'static'}
            fallback={
              <DragView
                svg={good()?.svg ?? ''}
                scene={good()?.scene}
                stale={stale()}
                fitKey={`${id()}:${fits()}`}
                hint={props.hints?.[id()]}
                preview={preview}
                drop={drop}
              />
            }
          >
            <div
              class="live-static"
              classList={{ 'is-stale': stale() }}
              style={{ background: paperOf(good()?.svg ?? '') }}
            >
              <Show when={imageUrl()}>
                <img src={imageUrl()} alt={`${good()?.scene.title ?? id()} as a static image`} />
              </Show>
            </div>
          </Show>
          <Show when={blank()}>
            <p class="live-caption-blank">
              {errors().length
                ? 'This file has an error, so it cannot draw. Fix it in the source, or press Reset.'
                : 'Nothing to draw yet. Add a node in the source.'}
            </p>
          </Show>
          <div class="live-caption">
            <div class="live-output" role="group" aria-label="Output">
              <button
                type="button"
                aria-pressed={output() === 'live'}
                onClick={() => setOutput('live')}
              >
                Live
              </button>
              <button
                type="button"
                aria-pressed={output() === 'static'}
                onClick={() => setOutput('static')}
              >
                Static
              </button>
            </div>
            <Show
              when={blocked()}
              fallback={
                <Show
                  when={output() === 'static'}
                  fallback={
                    <span>
                      Drag any box.
                      <span class="live-caption-tail"> The move is saved to the source.</span>
                    </span>
                  }
                >
                  <span>
                    A {kb(exported())} SVG
                    <span class="live-caption-long"> that stays put. Its source rides inside.</span>
                  </span>
                </Show>
              }
            >
              <span>
                {blocked()}
                <span class="live-caption-tail">
                  {output() === 'static' ? ' to download.' : ' to drag.'}
                </span>
              </span>
            </Show>
            <Show when={output() === 'static'}>
              <span class="live-caption-actions">
                <button
                  type="button"
                  class="live-reset"
                  aria-label="Download SVG"
                  disabled={!!blocked()}
                  onClick={saveSvg}
                >
                  <span class="live-caption-tail">Download </span>SVG
                </button>
                <button
                  type="button"
                  class="live-reset"
                  aria-label="Download PNG"
                  disabled={!!blocked()}
                  onClick={() => void savePng()}
                >
                  <span class="live-caption-tail">Download </span>PNG
                </button>
              </span>
            </Show>
          </div>
        </div>
        <div class="live-source">
          <div class="live-scroll" ref={scroller}>
            <pre class="live-gutter" aria-hidden="true">
              {Array.from({ length: lines() }, (_, i) => i + 1).join('\n')}
            </pre>
            <div class="live-code">
              <For each={changed()}>
                {i => <div class="live-band" style={{ top: `${i * 20}px` }} />}
              </For>
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
                onInput={e => {
                  // Undo restores a whole source, so it would take this typing with it.
                  setUndo([]);
                  setChanged([]);
                  setNote('');
                  setSource(e.currentTarget.value);
                }}
              />
            </div>
          </div>
          <div
            class="live-status"
            classList={{ 'is-error': errors().length > 0 }}
            aria-live="polite"
          >
            <Show
              when={errors()[0]}
              fallback={
                // Timings change on each keystroke, so a screen reader skips them.
                <span classList={{ 'is-note': !!note() }} aria-hidden={!note() && !blank()}>
                  {note() ||
                    (blank() ? 'Nothing to draw yet' : good() ? `Drawn in ${ms()} ms` : 'Drawing…')}
                </span>
              }
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
