import { createSignal, For, Index, onCleanup, onMount, Show } from 'solid-js';
import {
  candidateChange,
  anchorFor,
  applyCandidate,
  closeComparison,
  comparison,
  effectiveCamera,
  fitAll,
  generate,
  gridColumns,
  LAYER_COLORS,
  rememberFocus,
  setPresentation,
  toggleControls,
  toggleExpanded,
  type Candidate,
} from '../../state/comparison';
import { IconButton } from '../controls';
import { StaticScene } from '../scene/StaticScene';
import { ComparisonSidebar } from './ComparisonSidebar';
import { ViewportCanvas } from './ViewportCanvas';
import './comparison.css';

/** Full-screen comparison of layout or routing candidates. */
export function ComparisonDialog() {
  return (
    <Show when={comparison.open}>
      <Dialog />
    </Show>
  );
}

function Dialog() {
  let dialog!: HTMLDialogElement;
  onMount(() => {
    rememberFocus(document.activeElement);
    dialog.tabIndex = -1;
    dialog.showModal();
    dialog.focus();
  });
  onCleanup(() => dialog.open && dialog.close());

  const anchorTitle = () =>
    [
      ...(comparison.baseline?.graph.nodes ?? []),
      ...(comparison.baseline?.graph.groups ?? []),
    ].find(n => n.id === comparison.focusId)?.title ?? 'none';

  return (
    <dialog
      ref={dialog}
      class="comparison"
      classList={{ 'controls-hidden': comparison.controlsHidden }}
      aria-labelledby="comparison-title"
      onCancel={e => {
        e.preventDefault();
        closeComparison();
      }}
      onKeyDown={e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          void generate();
        }
      }}
    >
      <header class="comparison-header">
        <IconButton icon="menu" label="Toggle comparison controls" onClick={toggleControls} />
        <div class="comparison-heading">
          <h2 id="comparison-title">
            {comparison.config?.mode === 'routing' ? 'Compare ports & routes' : 'Compare layouts'}
          </h2>
          <p>{comparison.baseline?.title}</p>
        </div>
        <div class="segmented" role="group" aria-label="Comparison display">
          <button
            type="button"
            aria-pressed={comparison.presentation === 'grid'}
            onClick={() => setPresentation('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            aria-pressed={comparison.presentation === 'overlay'}
            onClick={() => setPresentation('overlay')}
          >
            Overlay
          </button>
        </div>
        <span class="grow" />
        <span class="hint">Preview only · Apply to keep</span>
        <button
          type="button"
          class="button ghost"
          aria-label="Close comparison"
          onClick={closeComparison}
        >
          Close <kbd>Esc</kbd>
        </button>
      </header>
      <Show when={!comparison.controlsHidden}>
        <ComparisonSidebar />
      </Show>
      <main class="comparison-main" aria-label="Candidate diagrams">
        <div class="comparison-bar">
          <span>Visual anchor: {anchorTitle()} · click a shape to change</span>
          <span class="grow" />
          <button type="button" class="button ghost small" onClick={fitAll}>
            Fit all <kbd>Home</kbd>
          </button>
        </div>
        <Show when={comparison.presentation === 'grid'} fallback={<OverlayView />}>
          <CandidateGrid />
        </Show>
        <div
          class="comparison-progress"
          classList={{ 'error-text': comparison.progress.error }}
          role="status"
          aria-live="polite"
        >
          {comparison.progress.text}
        </div>
      </main>
    </dialog>
  );
}

function CandidateGrid() {
  let grid!: HTMLDivElement;
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  onMount(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(grid);
    onCleanup(() => observer.disconnect());
  });
  const columns = () => gridColumns(size());
  const count = () => (comparison.expanded !== null ? 1 : Math.max(1, comparison.cells.length));
  return (
    <div
      ref={grid}
      class="candidate-grid"
      aria-label="Comparison contact sheet"
      style={{ '--cols': columns(), '--rows': Math.ceil(count() / columns()) }}
    >
      <Show
        when={comparison.cells.length}
        fallback={
          <div class="empty-state">
            <strong>One diagram. Several possibilities.</strong>
            <p>
              Generate six candidates from this exact starting point. Nothing changes in your
              diagram until you choose Apply.
            </p>
            <button type="button" class="button primary" onClick={() => generate()}>
              Generate comparison
            </button>
          </div>
        }
      >
        <Index each={comparison.cells}>
          {(cell, i) => (
            <Show when={comparison.expanded === null || comparison.expanded === i}>
              <CandidateCard cell={cell()} index={i} />
            </Show>
          )}
        </Index>
      </Show>
    </div>
  );
}

function CandidateCard(props: { cell: Candidate; index: number }) {
  const report = () => props.cell.result?.report;
  const routing = () => props.cell.result?.routing.report;
  const stopped = () =>
    report()
      ? comparison.generatedConfig?.run === 'pass'
        ? 'Bounded pass'
        : report()!.termination
      : 'Reroute only';
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const detail = () => {
    const r = routing()!,
      l = report();
    return [
      plural(r.crossings, 'crossing'),
      plural(r.lanePairs, 'close lane pair'),
      `${r.bends} bends`,
      ...(l
        ? [`${l.after.overlaps} overlaps`, `${l.backwardEdges} backward`, `${l.after.aspect}:1`]
        : []),
    ].join(' · ');
  };
  const warnings = () => [
    ...(report()?.warnings ?? []),
    ...(routing()?.lanePairs
      ? [
          `The requested ${routing()!.requestedEdgeGap}px lane gap is not fully feasible in this result. ${routing()!.lanePairs} parallel segment pairs remain too close.`,
        ]
      : []),
  ];
  const expanded = () => comparison.expanded === props.index;
  return (
    <article class="candidate-card" aria-label={`Candidate ${props.index + 1}`}>
      <header>
        <div>
          <span class="candidate-index">{String(props.index + 1).padStart(2, '0')}</span>
          <strong>{props.cell.title}</strong>
          <p>{props.cell.subtitle}</p>
        </div>
        <button
          type="button"
          class="button ghost small"
          aria-label={`${expanded() ? 'Back to grid from' : 'Enlarge'} candidate ${props.index + 1}`}
          onClick={() => toggleExpanded(props.index)}
        >
          {expanded() ? 'Back to grid' : 'Enlarge'}
        </button>
      </header>
      <div class="candidate-body">
        <Show
          when={props.cell.status === 'ready' && props.cell.scene}
          fallback={
            <div
              class="candidate-pending"
              classList={{ 'error-text': props.cell.status === 'error' }}
            >
              {props.cell.status === 'error' ? props.cell.error : 'Queued'}
            </div>
          }
        >
          {scene => (
            <>
              <ViewportCanvas
                index={props.index}
                label={`Candidate ${props.index + 1}. Drag or use arrow keys to pan. Plus and minus zoom. Home fits.`}
              >
                <StaticScene
                  scene={scene()}
                  idPrefix={`c${props.index}-`}
                  focusId={comparison.cameraMode === 'focus' ? comparison.focusId : undefined}
                  focusable
                />
              </ViewportCanvas>
              <span class="scale-badge">{Math.round(effectiveCamera(props.index).k * 100)}%</span>
            </>
          )}
        </Show>
      </div>
      <footer>
        <Show
          when={props.cell.status === 'ready' && routing()}
          fallback={
            <span>{props.cell.status === 'error' ? 'Not applied' : 'Waiting for computation'}</span>
          }
        >
          <div>
            <strong classList={{ 'warning-text': !!(routing()!.blocked || routing()!.lanePairs) }}>
              <Show when={props.cell.source} fallback={stopped()}>
                {source => <code class="candidate-recipe">{candidateChange(source())}</code>}
              </Show>
              {routing()!.blocked ? ` · ${routing()!.blocked} blocked` : ''}
            </strong>
            <p>{detail()}</p>
          </div>
          <button type="button" class="button primary" onClick={() => applyCandidate(props.index)}>
            Apply
          </button>
        </Show>
      </footer>
      <Show when={warnings().length}>
        <details class="candidate-warnings">
          <summary>{plural(warnings().length, 'constraint note')}</summary>
          <For each={warnings()}>{w => <p>{w}</p>}</For>
        </details>
      </Show>
    </article>
  );
}

function OverlayView() {
  const visible = (i: number) =>
    comparison.cells[i]?.status === 'ready' && comparison.cells[i].layer.visible;
  const layer = (i: number) => (
    <g
      class="overlay-layer-group"
      data-layer={i}
      classList={{
        active: i === comparison.overlay.active,
        'all-labels': comparison.overlay.allLabels,
      }}
      style={{
        '--layer-color': LAYER_COLORS[i % LAYER_COLORS.length],
        opacity: comparison.cells[i].layer.opacity,
      }}
      transform={`translate(${-anchorFor(i).x},${-anchorFor(i).y})`}
    >
      <StaticScene
        scene={comparison.cells[i].scene!}
        idPrefix={`o${i}-`}
        focusId={comparison.focusId}
        focusable={i === comparison.overlay.active}
      />
    </g>
  );
  return (
    <div class="overlay-stage">
      <ViewportCanvas
        index={-1}
        class="overlay-canvas"
        label="Anchored overlay. Click a shape to align every layer on it. Drag to pan. Pinch to zoom."
      >
        {/* The emphasized layer is drawn last so its labels read clearly and it receives clicks. */}
        <Index each={comparison.cells}>
          {(_, i) => <Show when={visible(i) && i !== comparison.overlay.active}>{layer(i)}</Show>}
        </Index>
        <Show
          when={visible(comparison.overlay.active) ? { i: comparison.overlay.active } : undefined}
          keyed
        >
          {active => layer(active.i)}
        </Show>
      </ViewportCanvas>
      <span class="scale-badge">
        {Math.round(comparison.overlay.camera.k * 100)}% · shared scale
      </span>
      <Show when={!comparison.cells.some((_, i) => visible(i))}>
        <div class="overlay-empty">Generate layouts to compare their geometry.</div>
      </Show>
    </div>
  );
}
