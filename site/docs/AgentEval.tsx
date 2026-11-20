import {
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
} from 'solid-js';
import { Portal } from 'solid-js/web';

const BASE = import.meta.env.BASE_URL;
const DIR = `${BASE}evaluations/agent-diagrams`;

const TOOLS = [
  ['mermaid', 'Mermaid'],
  ['draftably', 'Draftably'],
  ['d2', 'D2'],
  ['dot', 'Graphviz DOT'],
  ['svg', 'Raw SVG'],
] as const;
const ARMS = [
  ['bare', 'Bare prompt'],
  ['reference', 'With reference'],
  ['tooled', 'With CLI and docs'],
] as const;

interface Cell {
  arm: string;
  task: string;
  tool: string;
  source: string;
  lines: number;
  bytes: number;
  costUsd: number;
  render: 'success' | 'failed';
  image?: string;
  error?: string;
  turns?: number;
  cliCalls?: number;
  imageViews?: number;
}
interface Task {
  id: string;
  title: string;
  prompt: string;
}

let study: Promise<{ cells: Cell[]; tasks: Task[] }> | undefined;
const load = (): Promise<{ cells: Cell[]; tasks: Task[] }> =>
  (study ??= Promise.all([
    fetch(`${DIR}/results.json`).then(r => r.json()),
    fetch(`${DIR}/tasks.json`).then(r => r.json()),
  ]).then(([results, tasks]) => ({ cells: results.cells, tasks })));

/** The renderer's own message, without the command line around it. */
const errorOf = (cell: Cell) =>
  /error\s+(.+?)\s*$/m.exec(cell.error ?? '')?.[1] ?? 'The source did not render.';
const sourceUrl = (cell: Cell) => `${DIR}/source/${cell.source}.txt`;
const toolName = (id: string) => TOOLS.find(t => t[0] === id)?.[1] ?? id;
const armName = (id: string) => ARMS.find(a => a[0] === id)?.[1] ?? id;

/**
 * A ```agent-eval block: one task's 15 drawings as a grid, arms down and formats across, each at
 * the same small size. A click opens the drawing fitted to the window with its numbers and source;
 * the arrow keys move across formats and arms. The block's text is the task id, then
 * `best=tool,tool` for the formats the page says read best.
 */
export function AgentEval(props: { spec: string }) {
  // A docs block's text never changes after the page renders.
  const [taskId, ...rest] = untrack(() => props.spec)
    .trim()
    .split(/\s+/);
  const best = (/best=([\w,]+)/.exec(rest.join(' '))?.[1] ?? '').split(',');
  const [data] = createResource(load);
  const task = () => data()?.tasks.find(t => t.id === taskId);
  const cell = (arm: string, tool: string) =>
    data()?.cells.find(c => c.task === taskId && c.arm === arm && c.tool === tool);
  const [open, setOpen] = createSignal<{ arm: number; tool: number } | null>(null);
  let opener: HTMLElement | null = null;

  return (
    <figure class="agent-eval">
      <Show when={task()}>
        {t => (
          <details class="ae-prompt">
            <summary>Task prompt</summary>
            <p>{t().prompt}</p>
          </details>
        )}
      </Show>
      <div class="ae-row ae-head" aria-hidden="true">
        <span />
        <For each={TOOLS}>
          {([id, name]) => (
            <span classList={{ 'is-best': best.includes(id) }}>
              {name}
              <Show when={best.includes(id)}>
                <small>reads best</small>
              </Show>
            </span>
          )}
        </For>
      </div>
      <For each={ARMS}>
        {([arm, label], armIndex) => (
          <div class="ae-row" role="group" aria-label={label}>
            <span class="ae-arm">{label}</span>
            <For each={TOOLS}>
              {([tool, name], toolIndex) => (
                <Show
                  when={cell(arm, tool)}
                  fallback={<span class="ae-tile is-empty" aria-hidden="true" />}
                >
                  {c => (
                    <button
                      type="button"
                      class="ae-tile"
                      classList={{ 'is-failed': c().render !== 'success' }}
                      aria-label={`${name}, ${label}: ${c().render === 'success' ? 'open the drawing' : 'did not render'}`}
                      onClick={e => {
                        opener = e.currentTarget;
                        setOpen({ arm: armIndex(), tool: toolIndex() });
                      }}
                    >
                      <span class="ae-thumb">
                        <Show
                          when={c().render === 'success' && c().image}
                          fallback={
                            <span class="ae-fail">
                              Did not render
                              <code>{errorOf(c())}</code>
                            </span>
                          }
                        >
                          {image => (
                            <img src={`${DIR}/${image()}`} alt="" loading="lazy" decoding="async" />
                          )}
                        </Show>
                      </span>
                      <span class="ae-cap">
                        <span class="ae-tool">{name}</span>
                        {c().lines} lines
                        <Show when={c().turns != null}> · {c().turns} turns</Show>
                      </span>
                    </button>
                  )}
                </Show>
              )}
            </For>
          </div>
        )}
      </For>
      <Show when={open() && task()}>
        <Inspector
          title={task()!.title}
          at={open()!}
          cellAt={(a, t) => cell(ARMS[a][0], TOOLS[t][0])}
          best={best}
          onMove={setOpen}
          onClose={() => {
            setOpen(null);
            opener?.focus();
          }}
        />
      </Show>
    </figure>
  );
}

function Inspector(props: {
  title: string;
  at: { arm: number; tool: number };
  cellAt: (arm: number, tool: number) => Cell | undefined;
  best: string[];
  onMove: (at: { arm: number; tool: number }) => void;
  onClose: () => void;
}) {
  const current = () => props.cellAt(props.at.arm, props.at.tool);
  const [source] = createResource(
    () => current()?.source,
    async () => {
      const c = current();
      return c ? (await fetch(sourceUrl(c))).text() : '';
    },
  );
  const [size, setSize] = createSignal('');
  const move = (arm: number, tool: number) =>
    props.onMove({
      arm: (arm + ARMS.length) % ARMS.length,
      tool: (tool + TOOLS.length) % TOOLS.length,
    });
  const key = (e: KeyboardEvent) => {
    const { arm, tool } = props.at;
    const step: Record<string, () => void> = {
      ArrowLeft: () => move(arm, tool - 1),
      ArrowRight: () => move(arm, tool + 1),
      ArrowUp: () => move(arm - 1, tool),
      ArrowDown: () => move(arm + 1, tool),
      Escape: props.onClose,
    };
    if (!step[e.key] || (e.target as HTMLElement).closest('pre')) return;
    e.preventDefault();
    step[e.key]();
  };
  let close!: HTMLButtonElement;
  onMount(() => {
    close.focus();
    document.body.style.overflow = 'hidden';
  });
  onCleanup(() => (document.body.style.overflow = ''));

  const facts = createMemo(() => {
    const c = current();
    if (!c) return [];
    return [
      ['Lines', `${c.lines} (${(c.bytes / 1024).toFixed(1)} KB)`],
      ...(c.turns != null
        ? [
            ['Turns', String(c.turns)],
            ['CLI calls', String(c.cliCalls)],
            ['Image views', String(c.imageViews)],
          ]
        : []),
      ['Cost', `$${c.costUsd.toFixed(3)}`],
      ...(size() ? [['Drawing', size()]] : []),
    ];
  });

  return (
    <Portal>
      <div class="ae-backdrop" onClick={e => e.target === e.currentTarget && props.onClose()}>
        <div
          class="ae-inspector"
          role="dialog"
          aria-modal="true"
          aria-label={`${toolName(current()?.tool ?? '')}, ${armName(current()?.arm ?? '')}`}
          onKeyDown={key}
        >
          <header class="ae-bar">
            <div class="ae-tabs" role="group" aria-label="Format">
              <For each={TOOLS}>
                {([, name], i) => (
                  <button
                    type="button"
                    aria-pressed={props.at.tool === i()}
                    onClick={() => move(props.at.arm, i())}
                  >
                    {name}
                  </button>
                )}
              </For>
            </div>
            <div class="ae-tabs" role="group" aria-label="Arm">
              <For each={ARMS}>
                {([, name], i) => (
                  <button
                    type="button"
                    aria-pressed={props.at.arm === i()}
                    onClick={() => move(i(), props.at.tool)}
                  >
                    {name}
                  </button>
                )}
              </For>
            </div>
            <button ref={close} type="button" class="ae-close" onClick={() => props.onClose()}>
              Close <kbd>Esc</kbd>
            </button>
          </header>
          <Show when={current()}>
            {c => (
              <div class="ae-body">
                <div class="ae-stage">
                  <Show
                    when={c().render === 'success' && c().image}
                    fallback={
                      <div class="ae-stage-fail">
                        <strong>Did not render</strong>
                        <code>{errorOf(c())}</code>
                      </div>
                    }
                  >
                    {image => (
                      <img
                        src={`${DIR}/${image()}`}
                        alt={`${toolName(c().tool)}, ${armName(c().arm)}: ${props.title}`}
                        onLoad={e =>
                          setSize(
                            `${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`,
                          )
                        }
                      />
                    )}
                  </Show>
                </div>
                <aside class="ae-side">
                  <h3>
                    {toolName(c().tool)}
                    <Show when={props.best.includes(c().tool)}>
                      <small>reads best</small>
                    </Show>
                  </h3>
                  <p class="ae-sub">
                    {armName(c().arm)} · {props.title}
                  </p>
                  <dl>
                    <For each={facts()}>
                      {([k, v]) => (
                        <>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </>
                      )}
                    </For>
                  </dl>
                  <div class="ae-source-head">
                    <span>Source</span>
                    <a href={sourceUrl(c())} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                    <Show when={c().image}>
                      {image => (
                        <a href={`${DIR}/${image()}`} target="_blank" rel="noreferrer">
                          Open SVG
                        </a>
                      )}
                    </Show>
                  </div>
                  <pre tabIndex={0}>
                    <code>{source() ?? ''}</code>
                  </pre>
                  <p class="ae-keys">
                    <kbd>←</kbd> <kbd>→</kbd> format · <kbd>↑</kbd> <kbd>↓</kbd> arm
                  </p>
                </aside>
              </div>
            )}
          </Show>
        </div>
      </div>
    </Portal>
  );
}
