import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { EXAMPLES, findExample, type ExampleInfo } from '../../src/model/examples';
import { appUrl, paperOf } from '../draw';
import { LiveEditor } from '../live/LiveEditor';
import { Points } from './Points';
import { drawSvg, enqueue, whenSeen } from './render';

const GITHUB = 'https://github.com/byronwall/draftably';
const NPM = 'https://www.npmjs.com/package/draftably';

const HERO_EXAMPLES = ['checkout', 'login-sequence', 'order-lifecycle', 'billing-schema'];
/** None of these repeat a hero tab, so every example on the page is a new one. */
const CARD_EXAMPLES = [
  'support-triage',
  'incident-response',
  'data-lakehouse',
  'aws-vpc-network',
  'rag-assistant',
  'order-saga',
  'tcp-header',
  'kubernetes-cluster',
];

const COMMANDS: [string, string][] = [
  ['draftably check plan.draft', 'Reports errors by line. Exits 1, so CI can fail on them.'],
  ['draftably inspect plan.draft --svg', 'Writes an SVG or PNG for docs, READMEs and PRs.'],
  ['draftably compare old.draft new.draft', 'Marks what changed between two versions.'],
  ['draftably vary plan.draft', 'Ranks layout variants on one contact sheet.'],
];

export function Landing() {
  return (
    <div class="page">
      <Nav />
      <main>
        <section class="hero">
          <div class="hero-head">
            <div>
              <h1>Write the diagram. Skip the dragging.</h1>
              <p class="hero-sub">
                Plain-text <code>.draft</code> files in, clean diagrams out. Draftably lays out the
                boxes and routes the lines. Edit the source below and watch it redraw.
              </p>
            </div>
            <div class="hero-actions">
              <a class="button primary" href={appUrl()}>
                Open the editor
              </a>
              <CopyCommand text="npx draftably open" class="button" />
            </div>
          </div>
          <LiveEditor examples={HERO_EXAMPLES} />
        </section>
        <Points />
        <Examples />
        <Install />
      </main>
      <footer class="footer">
        <span class="wordmark">Draftably</span>
        <span class="footer-links">
          <a href={appUrl()}>Editor</a>
          <a href={NPM}>npm</a>
          <a href={GITHUB}>GitHub</a>
        </span>
      </footer>
    </div>
  );
}

function Nav() {
  return (
    <header class="nav">
      <a class="wordmark" href={import.meta.env.BASE_URL}>
        Draftably
      </a>
      <nav class="nav-links">
        <a href="#examples">Examples</a>
        <a href="#install">Install</a>
        <a href={appUrl()}>Editor</a>
        <a href={GITHUB}>GitHub</a>
      </nav>
    </header>
  );
}

/** A shell command with a copy button. The icon turns to a check for a moment after a copy. */
function CopyCommand(props: { text: string; class?: string }) {
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const copy = async () => {
    await navigator.clipboard.writeText(props.text);
    setCopied(true);
    clearTimeout(timer);
    timer = setTimeout(() => setCopied(false), 1400);
  };
  onCleanup(() => clearTimeout(timer));
  return (
    <button
      type="button"
      class={`copy ${props.class ?? ''}`}
      classList={{ 'is-copied': copied() }}
      onClick={copy}
      aria-label={`Copy "${props.text}"`}
    >
      <span class="copy-prompt">$</span>
      <code>{props.text}</code>
      <svg class="copy-icon" viewBox="0 0 16 16" aria-hidden="true">
        <Show when={copied()} fallback={<path d="M5.5 5.5V3h7.5v7.5h-2.5M3 5.5h7.5V13H3z" />}>
          <path d="M3.5 8.5l3 3 6-7" />
        </Show>
      </svg>
    </button>
  );
}

function Examples() {
  const cards = CARD_EXAMPLES.map(findExample).filter((e): e is ExampleInfo => !!e);
  return (
    <section class="examples" id="examples">
      <div class="section-head">
        <h2>More examples</h2>
        <a href={appUrl()}>Open all {EXAMPLES.length} in the editor</a>
      </div>
      <div class="cards">
        <For each={cards}>{ex => <ExampleCard example={ex} />}</For>
      </div>
    </section>
  );
}

function ExampleCard(props: { example: ExampleInfo }) {
  const [src, setSrc] = createSignal('');
  const [paper, setPaper] = createSignal<string>();
  let card!: HTMLAnchorElement;
  onMount(() => {
    const stop = whenSeen(card, () =>
      enqueue(async () => {
        const svg = await drawSvg(props.example.source);
        if (!svg) return;
        setPaper(paperOf(svg));
        setSrc(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
      }),
    );
    onCleanup(() => {
      stop();
      if (src()) URL.revokeObjectURL(src());
    });
  });
  const ex = () => props.example;
  return (
    <a class="card" href={appUrl(ex().id)} ref={card}>
      <div class="card-thumb" style={{ background: paper() }}>
        <Show when={src()}>
          <img src={src()} alt={`${ex().title}, drawn by Draftably`} />
        </Show>
      </div>
      <h3>{ex().title}</h3>
      <p>{ex().summary}</p>
    </a>
  );
}

function Install() {
  return (
    <section class="install" id="install">
      <div class="section-head">
        <h2>Install</h2>
      </div>
      <div class="install-cols">
        <div>
          <h3>Run it on your files</h3>
          <CopyCommand text="npx draftably open plan.draft" />
          <p>
            Opens the editor on a local file, and edits save back to it. Needs Node 22.21 or later.
            Run <code>npm i -g draftably</code> to use the commands below.
          </p>
          <dl class="commands">
            <For each={COMMANDS}>
              {([cmd, what]) => (
                <>
                  <dt>
                    <code>{cmd}</code>
                  </dt>
                  <dd>{what}</dd>
                </>
              )}
            </For>
          </dl>
        </div>
        <div>
          <h3>Teach your coding agent</h3>
          <CopyCommand text="npx draftably skill install" />
          <p>
            A bundled skill teaches an agent the language, so it can write, check and render{' '}
            <code>.draft</code> files on its own. It installs to{' '}
            <code>.claude/skills/draftably</code>. Add <code>--global</code> for every project, or
            run <code>npx skills add byronwall/draftably</code>.
          </p>
        </div>
      </div>
    </section>
  );
}
