import { createSignal, For, onCleanup, onMount, type JSX } from 'solid-js';
import { findExample } from '../../src/model/examples';
import { THEME_IDS } from '../../src/model/appearance';
import { paperOf } from '../draw';
import { highlightHtml } from '../highlight';
import { drawSvg, enqueue, whenSeen } from './render';

interface Variant {
  label: string;
  /** The full source to draw. */
  source: string;
  /** The emphasis state to draw, if any. */
  state?: string;
  /** The few source lines that make this variant, shown under the drawing. */
  lines: string;
}

interface Point {
  title: string;
  body: JSX.Element;
  variants: Variant[];
}

const sourceOf = (id: string) => findExample(id)?.source ?? '';
/** `source` with `line` added after its `diagram` line. */
const withLine = (source: string, line: string) => source.replace(/^(diagram .*)$/m, `$1\n${line}`);
const linesOf = (source: string, pattern: RegExp) =>
  source
    .split('\n')
    .filter(l => pattern.test(l))
    .join('\n');

const change = sourceOf('checkout-change');
const themed = sourceOf('ci-cd-pipeline');
const emphasis = sourceOf('emphasis');
const states = [...emphasis.matchAll(/^state (\S+) "([^"]+)"/gm)].map(m => ({
  id: m[1],
  label: m[2],
}));

const POINTS: Point[] = [
  {
    title: 'Review a change as a picture',
    body: (
      <>
        Start lines with <code>+</code>, <code>-</code> or <code>~</code> and the drawing shows what
        a pull request adds, removes and changes.
      </>
    ),
    variants: [
      { label: 'Marked', source: change, lines: linesOf(change, /^[+~-]node/) },
      {
        label: 'Side by side',
        source: withLine(change, 'compare "Before" "After"'),
        lines: 'compare "Before" "After"',
      },
    ],
  },
  {
    title: 'Restyle with one line',
    body: 'Five themes ship with the language. A theme changes fonts and colors. The structure stays, and boxes resize to fit.',
    variants: THEME_IDS.map(id => ({
      label: id[0].toUpperCase() + id.slice(1),
      source: withLine(themed, `theme ${id}`),
      lines: `theme ${id}`,
    })),
  },
  {
    title: 'Trace one path at a time',
    body: 'Name the objects on a path. That path stays in focus and everything else fades.',
    variants: [
      { label: 'All', source: emphasis, lines: linesOf(emphasis, /^state /) },
      ...states.map(s => ({
        label: s.label,
        source: emphasis,
        state: s.id,
        lines: linesOf(emphasis, new RegExp(`^state ${s.id} `)),
      })),
    ],
  },
];

export function Points() {
  const [point, setPoint] = createSignal(0);
  const [picks, setPicks] = createSignal(POINTS.map(() => 0));
  const [svg, setSvg] = createSignal('');
  const cache = new Map<string, Promise<string | null>>();
  const variant = () => POINTS[point()].variants[picks()[point()]];
  let el!: HTMLElement;
  let run = 0;

  const show = async (p: number, v = picks()[p]) => {
    setPoint(p);
    setPicks(all => all.map((x, i) => (i === p ? v : x)));
    const mine = ++run;
    const key = `${p}:${v}`;
    const { source, state } = POINTS[p].variants[v];
    if (!cache.has(key))
      cache.set(
        key,
        enqueue(() => drawSvg(source, state)),
      );
    const out = await cache.get(key);
    if (out && mine === run) setSvg(out);
  };
  onMount(() => onCleanup(whenSeen(el, () => void show(0))));

  return (
    <section class="points" ref={el} aria-labelledby="points-head">
      <div class="section-head">
        <h2 id="points-head">More than a picture</h2>
      </div>
      <div class="points-body">
        <div class="point-list">
          <For each={POINTS}>
            {(p, i) => (
              // The heading's button is the keyboard path; a click anywhere on the row also works.
              <div
                class="point"
                classList={{ 'is-active': point() === i() }}
                onClick={e => {
                  if (!(e.target as Element).closest('.point-tabs')) void show(i());
                }}
              >
                <h3>
                  <button type="button" aria-pressed={point() === i()}>
                    {p.title}
                  </button>
                </h3>
                <p>{p.body}</p>
                <div class="point-tabs" role="group" aria-label={p.title}>
                  <For each={p.variants}>
                    {(v, j) => (
                      <button
                        type="button"
                        aria-pressed={picks()[i()] === j()}
                        onClick={() => void show(i(), j())}
                      >
                        {v.label}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
        <div class="point-view">
          <div
            class="point-figure"
            classList={{ 'is-drawn': !!svg() }}
            style={{ background: paperOf(svg()) }}
            // The SVG comes from our own renderer, which escapes every label.
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={svg()}
          />
          <pre
            class="point-source"
            // Built from escaped tokens by highlightHtml.
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={highlightHtml(variant().lines)}
          />
        </div>
      </div>
    </section>
  );
}
