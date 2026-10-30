import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';
import { Logo } from '../Logo';
import { SiteNav } from '../SiteNav';
import { EXAMPLES, findExample, type ExampleInfo } from '../../src/model/examples';
import { appUrl, paperOf } from '../draw';
import { useLocation, useNavigate } from '@solidjs/router';
import { LiveEditor } from '../live/LiveEditor';
import { deliver, readDiagramFile } from '../reopen';
import { Points } from './Points';
import { drawSvg, enqueue, whenSeen } from './render';

const GITHUB = 'https://github.com/byronwall/draftably';
const NPM = 'https://www.npmjs.com/package/draftably';

const HERO_EXAMPLES = ['checkout', 'order-lifecycle', 'support-triage', 'billing-schema'];
/** The box each hero example labels "Drag me". */
const HERO_HINTS: Record<string, string> = {
  checkout: 'db',
  'order-lifecycle': 'cancelled',
  'support-triage': 'link',
  'billing-schema': 'invoices',
};
/** None of these repeat a hero tab, so every example on the page is a new one. */
const CARD_EXAMPLES = [
  'login-sequence',
  'incident-response',
  'data-lakehouse',
  'observability-stack',
  'rag-assistant',
  'order-saga',
  'tcp-header',
  'kubernetes-cluster',
];

const COMMANDS: [string, string][] = [
  ['draftably check plan.draft', 'Reports errors by line. Exits 1, so CI can fail on them.'],
  ['draftably compare old.draft new.draft', 'Marks what changed between two versions.'],
  ['draftably vary plan.draft', 'Ranks layout variants on one contact sheet.'],
];

const TITLE = 'draftably: manual diagrams are a drag';

export function Landing() {
  // Arriving from another page keeps that page's title; name this one.
  onMount(() => (document.title = TITLE));
  // The router changes the hash without scrolling, so a link to a section of this page (or to
  // it from another page) scrolls there once the section exists.
  const location = useLocation();
  createEffect(
    on(
      () => location.hash,
      hash => {
        if (!hash) return;
        setTimeout(() =>
          document
            .getElementById(decodeURIComponent(hash.slice(1)))
            ?.scrollIntoView({ behavior: 'instant' }),
        );
      },
    ),
  );
  return (
    <div class="page">
      <Nav />
      <main>
        <section class="hero">
          <h1>Manual diagrams are a drag.</h1>
          <div class="hero-head">
            <div>
              <p class="hero-kicker">Write yours. Drag only if you want to.</p>
              <p class="hero-sub">
                draftably lays out a plain-text <code>.draft</code> file and routes every line. Move
                a box by hand and the move lands in the file as one readable line.
              </p>
            </div>
            <div class="hero-actions">
              <a class="button primary" href={appUrl()} rel="external">
                Open the editor
              </a>
              <CopyCommand text="npx draftably open" class="button" />
            </div>
          </div>
          <LiveEditor examples={HERO_EXAMPLES} hints={HERO_HINTS} />
          <ReopenLine />
        </section>
        <Install />
        <Points />
        <Examples />
      </main>
      <footer class="footer">
        <span class="wordmark">
          <Logo size={18} />
          draftably
        </span>
        <span class="footer-links">
          <a href={appUrl()} rel="external">
            Editor
          </a>
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
        <Logo />
        draftably
      </a>
      <SiteNav current="home" class="nav-links" />
    </header>
  );
}

/**
 * A shell command with a copy button. The icon turns to a check for a moment after a copy. If the
 * browser refuses the clipboard, the command text is selected so the user can copy it by hand.
 */
function CopyCommand(props: { text: string; class?: string }) {
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let code!: HTMLElement;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.text);
    } catch {
      getSelection()?.selectAllChildren(code);
      return;
    }
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
      <code ref={code}>{props.text}</code>
      <span class="sr-only" aria-live="polite">
        {copied() ? 'Copied' : ''}
      </span>
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
        <a href={appUrl()} rel="external">
          Open all {EXAMPLES.length} in the editor
        </a>
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
    <a class="card" href={appUrl(ex().id)} rel="external" ref={card}>
      <div class="card-thumb" style={{ background: paper() }}>
        <Show when={src()}>
          <img src={src()} alt="" onLoad={e => e.currentTarget.classList.add('is-loaded')} />
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
        <h2>Two ways out of one file</h2>
      </div>
      <div class="install-cols">
        <div>
          <h3>Static: ship a picture</h3>
          <p>
            An SVG or PNG for READMEs, docs and pull requests. Nothing in it moves. The source rides
            inside the image, so drop it back here to edit it.
          </p>
          <CopyCommand text="npx draftably inspect plan.draft --svg > plan.svg" />
        </div>
        <div>
          <h3>Live: keep a diagram</h3>
          <p>
            The editor on your own file. Drag a box and the file gets a <code>near</code> or{' '}
            <code>stay</code> line. Edit the text and the drawing follows. Git sees every change.
          </p>
          <CopyCommand text="npx draftably open plan.draft" />
        </div>
        <div>
          <h3>Teach your coding agent</h3>
          <p>
            A bundled skill teaches an agent the language, so it writes, checks and renders{' '}
            <code>.draft</code> files on its own. Add <code>--global</code> for every project.
          </p>
          <CopyCommand text="npx draftably skill install" />
        </div>
      </div>
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
      <p class="install-note">
        Needs Node 22.21 or later. Run <code>npm i -g draftably</code> to drop the <code>npx</code>.
      </p>
    </section>
  );
}

/** Someone with an exported diagram goes straight back to editing it. */
function ReopenLine() {
  const navigate = useNavigate();
  const [error, setError] = createSignal('');
  const choose = async (file: File) => {
    const source = await readDiagramFile(file);
    if (source == null) return setError(`${file.name} has no draftably source in it.`);
    deliver(source);
    navigate('/play');
  };
  return (
    <p class="hero-reopen" classList={{ 'is-error': !!error() }}>
      {error() || 'Have a draftably PNG or SVG? Drop or paste it anywhere, or '}
      <Show when={!error()}>
        <label class="hero-reopen-pick">
          choose a file
          <input
            type="file"
            accept=".draft,.png,.svg,text/plain,image/png,image/svg+xml"
            class="sr-only"
            onChange={e => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (file) void choose(file);
            }}
          />
        </label>
        , to keep editing.
      </Show>
    </p>
  );
}
