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

/**
 * The landing page hero: `.draft` source beside its drawing, with the two ways out of a file.
 * Live: drag a box and the move is written into the source, or edit the source and it redraws.
 * Static: the same drawing as an SVG image that cannot move, with SVG and PNG downloads.
 */
export function LiveEditor(props: { examples: string[]; hints?: Record<string, string> }) {
  const first = untrack(() => props.examples[0]);
  const [id, setId] = createSignal(first);
  const [source, setSource] = createSignal(findExample(first)?.source ?? '');
  const [drawing, setDrawing] = createSignal<Drawing>({ svg: null, diagnostics: [], items: [] });
  const [good, setGood] = createSignal<Good>();
  const [ms, setMs] = createSignal(0);
  const [output, setOutput] = createSignal<Output>('live');
  const [changed, setChanged] = createSignal<number[]>([]);
  const [note, setNote] = createSignal('');
  const [undo, setUndo] = createSignal<string[]>([]);
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
      if (y < scroller.scrollTop || y > scroller.scrollTop + scroller.clientHeight - 60)
        scroller.scrollTo({ top: Math.max(0, y - scroller.clientHeight / 3), behavior: 'smooth' });
    }
  };

  const pick = (next: string) => {
    setId(next);
    setUndo([]);
    setChanged([]);
    setNote('');
    now = true;
    setSource(findExample(next)?.source ?? '');
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

  const lines = () => source().split('\n').length;
  const errors = () => drawing().diagnostics.filter(d => d.level === 'error');
  const stale = () => !drawing().svg && !!good();
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
        <div class="live-tabs" role="tablist" aria-label="Examples">
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
        </div>
        <span class="live-bar-end">
          <Show when={undo().length}>
            <button type="button" class="live-reset" onClick={back}>
              Undo
            </button>
          </Show>
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
        <div class="live-stage">
          <Show
            when={output() === 'static'}
            fallback={
              <DragView
                svg={good()?.svg ?? ''}
                scene={good()?.scene}
                stale={stale()}
                fitKey={id()}
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
              when={output() === 'static'}
              fallback={<span>Drag any box. The move is saved to the source.</span>}
            >
              <span>A {kb(exported())} SVG that stays put. Its source rides inside.</span>
              <span class="live-caption-actions">
                <button type="button" class="live-reset" onClick={saveSvg}>
                  Download SVG
                </button>
                <button type="button" class="live-reset" onClick={() => void savePng()}>
                  Download PNG
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
                  setChanged([]);
                  setNote('');
                  setSource(e.currentTarget.value);
                }}
              />
            </div>
          </div>
          <div class="live-status" classList={{ 'is-error': errors().length > 0 }}>
            <Show
              when={errors()[0]}
              fallback={
                <span classList={{ 'is-note': !!note() }}>
                  {note() || (good() ? `Drawn in ${ms()} ms` : 'Drawing…')}
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
