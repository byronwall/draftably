import { createSignal, For, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { EXAMPLES, findExample, type ExampleInfo } from '../../src/model/examples';
import { appUrl, draw, paperOf } from '../draw';
import { LiveEditor } from '../live/LiveEditor';

const GITHUB = 'https://github.com/byronwall/draftably';
const INSTALL = 'npx draftably open';

const HERO_EXAMPLES = ['checkout', 'login-sequence', 'order-lifecycle', 'billing-schema'];
const CARD_EXAMPLES = [
  'checkout',
  'login-sequence',
  'order-lifecycle',
  'support-triage',
  'billing-schema',
  'ci-cd-pipeline',
  'tcp-header',
  'kubernetes-cluster',
];

export function Landing() {
  return (
    <div class="page">
      <Nav />
      <main>
        <section class="hero">
          <h1>Write the diagram. Skip the dragging.</h1>
          <p class="hero-sub">
            A text language and CLI for architecture, sequence and flow diagrams. Draftably lays
            them out, routes the lines, and keeps the source in git.
          </p>
          <div class="hero-actions">
            <a class="button primary" href={appUrl()}>
              Open the editor
            </a>
            <a class="button" href={GITHUB}>
              View on GitHub
            </a>
            <CopyChip text={INSTALL} />
          </div>
          <LiveEditor examples={HERO_EXAMPLES} />
          <p class="hero-hint">Edit the source. The diagram redraws as you type.</p>
        </section>
        <Points />
        <Examples />
      </main>
      <footer class="footer">
        <span class="wordmark">Draftably</span>
        <span class="footer-tag">Diagrams you write as text.</span>
        <span class="footer-links">
          <a href={appUrl()}>Editor</a>
          <a href="https://www.npmjs.com/package/draftably">npm</a>
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
        <a href={appUrl()}>Editor</a>
        <a href={GITHUB}>GitHub</a>
      </nav>
    </header>
  );
}

function CopyChip(props: { text: string }) {
  const [copied, setCopied] = createSignal(false);
  const copy = async () => {
    await navigator.clipboard.writeText(props.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" class="chip" onClick={copy} aria-label={`Copy "${props.text}"`}>
      <span class="chip-prompt">$</span>
      <code>{props.text}</code>
      <span class="chip-note">{copied() ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

const POINTS: { title: string; body: JSX.Element; icon: JSX.Element }[] = [
  {
    title: 'Plain text source',
    body: (
      <>
        Write diagrams in <code>.draft</code> files that live next to your code and diff cleanly in
        review.
      </>
    ),
    icon: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />,
  },
  {
    title: 'Automatic layout',
    body: 'Groups, lanes and routed lines come out tidy without dragging a single box.',
    icon: <path d="M5 5h5v5H5zM14 14h5v5h-5zM7.5 10v6.5H14M14 5h5v5h-5" />,
  },
  {
    title: 'Built for agents',
    body: 'A local CLI and an agent skill, so a coding agent can draw, check and revise a diagram.',
    icon: <path d="M4 6l5 6-5 6M12 18h8" />,
  },
];

function Points() {
  return (
    <section class="points">
      <For each={POINTS}>
        {p => (
          <div class="point">
            <svg class="point-icon" viewBox="0 0 24 24" aria-hidden="true">
              {p.icon}
            </svg>
            <div>
              <h2>{p.title}</h2>
              <p>{p.body}</p>
            </div>
          </div>
        )}
      </For>
    </section>
  );
}

function Examples() {
  const cards = CARD_EXAMPLES.map(findExample).filter((e): e is ExampleInfo => !!e);
  return (
    <section class="examples" id="examples">
      <div class="section-head">
        <h2>Examples</h2>
        <a href={appUrl()}>Browse all {EXAMPLES.length} in the editor →</a>
      </div>
      <div class="cards">
        <For each={cards}>{ex => <ExampleCard example={ex} />}</For>
      </div>
    </section>
  );
}

/** Thumbnails draw one at a time, after the hero, so they never hold up the first drawing. */
let queue = Promise.resolve();

function ExampleCard(props: { example: ExampleInfo }) {
  const [src, setSrc] = createSignal('');
  const [paper, setPaper] = createSignal<string>();
  let card!: HTMLAnchorElement;
  onMount(() => {
    const seen = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      seen.disconnect();
      queue = queue.then(async () => {
        const { svg } = await draw(props.example.source);
        if (!svg) return;
        setPaper(paperOf(svg));
        setSrc(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
      });
    });
    seen.observe(card);
    onCleanup(() => {
      seen.disconnect();
      if (src()) URL.revokeObjectURL(src());
    });
  });
  return (
    <a class="card" href={appUrl(props.example.id)} ref={card}>
      <div class="card-thumb" style={{ background: paper() }}>
        <Show when={src()}>
          <img src={src()} alt="" loading="lazy" />
        </Show>
      </div>
      <h3>{props.example.title}</h3>
      <p>{props.example.summary}</p>
    </a>
  );
}
