import { createMemo, createSignal, For, Index, onCleanup, onMount, Show } from 'solid-js';
import { describeMeasure, readDifference } from '../../model/candidates';
import { labelHits } from '../../model/label-hits';
import { sourceScope } from '../../state/session/file-session';
import {
  candidateChange,
  anchorFor,
  applyCandidate,
  cancelGeneration,
  closeComparison,
  comparison,
  comparisonSheet,
  effectiveCamera,
  fitAll,
  generate,
  gridColumns,
  LAYER_COLORS,
  rememberFocus,
  setComparisonMode,
  setPresentation,
  shownCells,
  toggleControls,
  toggleExpanded,
  toggleShowAll,
  type Candidate,
} from '../../state/comparison';
import { cutTip, IconButton, tip } from '../controls';
import { StaticScene } from '../scene/StaticScene';
import { ComparisonSidebar } from './ComparisonSidebar';
import { ViewportCanvas } from './ViewportCanvas';
import './comparison.css';
import { activeSession } from '../../state/active-session';

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

  const scopeName = () => {
    const config = comparison.config;
    if (config?.scope !== 'container') return comparison.baseline?.title;
    return comparison.baseline?.graph.groups.find(g => g.id === config.containerId)?.title;
  };
  const routing = () => comparison.config?.mode === 'routing';
  const others = () => comparisonSheet().others.length;

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
        <div class="comparison-heading">
          <h2 id="comparison-title">Compare</h2>
          <p>{scopeName()}</p>
        </div>
        <div class="segmented" role="group" aria-label="What to compare">
          <button
            type="button"
            aria-pressed={!routing()}
            disabled={!!activeSession().rebuildBlocked()}
            {...tip('Layouts', undefined, activeSession().rebuildBlocked() ?? undefined)}
            onClick={() => setComparisonMode('layout')}
          >
            Layouts
          </button>
          <button
            type="button"
            aria-pressed={routing()}
            onClick={() => setComparisonMode('routing')}
          >
            Connections
          </button>
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
        <Show when={others()}>
          <button
            type="button"
            class="button ghost"
            aria-pressed={comparison.showAll}
            onClick={toggleShowAll}
          >
            {comparison.showAll ? 'Fewer' : `${others()} more`}
          </button>
        </Show>
        <Summary />
        <Show when={comparison.busy}>
          <button type="button" class="button ghost" onClick={cancelGeneration}>
            Stop
          </button>
        </Show>
        <button type="button" class="button ghost" onClick={fitAll}>
          Fit <kbd>Home</kbd>
        </button>
        <IconButton
          icon="sliders"
          label="Comparison options"
          pressed={!comparison.controlsHidden}
          onClick={toggleControls}
        />
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
        <Show when={comparison.presentation === 'grid'} fallback={<OverlayView />}>
          <CandidateGrid />
        </Show>
      </main>
    </dialog>
  );
}

/** How the sheet came out: progress or a notice first, then what was left off it. */
function Summary() {
  const parts = () => {
    const sheet = comparisonSheet();
    return [
      ...(sheet.alike ? [`${sheet.alike} drew the same`] : []),
      ...(sheet.failed.length ? [`${sheet.failed.length} failed`] : []),
    ].join(' · ');
  };
  const failures = () =>
    comparisonSheet()
      .failed.map(i => `${comparison.cells[i].title}: ${comparison.cells[i].error}`)
      .join(' · ');
  return (
    <p
      class="comparison-progress"
      classList={{ 'error-text': comparison.progress.error }}
      role="status"
      aria-live="polite"
      {...(failures() ? tip('Could not draw', undefined, failures()) : cutTip)}
    >
      {comparison.progress.text || parts()}
    </p>
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
  const count = () => (comparison.expanded !== null ? 1 : Math.max(1, shownCells().length));
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
            <strong>Nothing to compare</strong>
            <p>{comparison.progress.text}</p>
            <button type="button" class="button" onClick={closeComparison}>
              Close
            </button>
          </div>
        }
      >
        <For each={shownCells()}>
          {i => (
            <Show when={comparison.expanded === null || comparison.expanded === i}>
              <CandidateCard cell={comparison.cells[i]} index={i} />
            </Show>
          )}
        </For>
      </Show>
    </div>
  );
}

/** What the file says now, on the line the other candidates change. */
function currentLine() {
  const routing = comparison.config?.mode === 'routing',
    command = routing ? 'routing' : 'layout',
    scope = routing ? '' : ` ${sourceScope(comparison.config!) ?? 'root'}`;
  const line = activeSession()
    .currentSource()
    .split('\n')
    .find(l => l.startsWith(command + scope));
  return line?.split(' #')[0].trim() ?? (routing ? 'Default routing' : 'Built-in recipe');
}

function CandidateCard(props: { cell: Candidate; index: number }) {
  const routing = () => props.cell.result?.routing.report;
  const baseline = () => comparison.cells.find(c => c.current)?.measure;
  const reading = () => {
    const m = props.cell.measure,
      base = baseline();
    return m && base && !props.cell.current ? readDifference(m, base) : null;
  };
  /** The card's headline: what the drawing is, or what choosing it gains. */
  const headline = () => reading()?.gains.join(' · ') || props.cell.title;
  const detail = () => {
    const r = reading();
    if (props.cell.current) return props.cell.measure ? describeMeasure(props.cell.measure) : '';
    if (!r) return props.cell.subtitle;
    return r.costs.join(' · ') || (r.gains.length ? '' : 'Same counts as the current drawing');
  };
  const hits = createMemo(() => (props.cell.scene ? labelHits(props.cell.scene) : []));
  const warnings = () => [
    ...hits().map(h => h.note),
    ...(props.cell.result?.report?.warnings ?? []),
    ...(routing()?.lanePairs
      ? [
          `The requested ${routing()!.requestedEdgeGap}px lane gap is not fully feasible in this result. ${routing()!.lanePairs} parallel segment pairs remain too close.`,
        ]
      : []),
  ];
  const expanded = () => comparison.expanded === props.index;
  return (
    <article
      class="candidate-card"
      classList={{ current: props.cell.current }}
      aria-label={props.cell.current ? 'Current drawing' : props.cell.title}
    >
      <header>
        <div class="candidate-reading">
          <strong {...cutTip}>{headline()}</strong>
          <p {...cutTip}>
            <Show when={reading()?.defects.length}>
              <span class="warning-text">{reading()!.defects.join(' · ')}</span>{' '}
            </Show>
            {detail()}
          </p>
        </div>
        <Show when={headline() !== props.cell.title}>
          <span class="candidate-method">{props.cell.title}</span>
        </Show>
        <IconButton
          icon="expand"
          label={`${expanded() ? 'Back to the sheet from' : 'Enlarge'} ${props.cell.title}`}
          pressed={expanded()}
          onClick={() => toggleExpanded(props.index)}
        />
        <Show when={!props.cell.current && props.cell.status !== 'error'}>
          <button
            type="button"
            class="button primary"
            disabled={props.cell.status !== 'ready'}
            {...tip('Apply', 'Enter', 'Enter works while this drawing has focus.')}
            onClick={() => applyCandidate(props.index)}
          >
            Apply
          </button>
        </Show>
      </header>
      <div class="candidate-body">
        <Show
          when={props.cell.status === 'ready' && props.cell.scene}
          fallback={
            <div
              class="candidate-pending"
              classList={{ 'error-text': props.cell.status === 'error' }}
              role={props.cell.status === 'error' ? 'alert' : undefined}
            >
              {props.cell.status === 'error' ? props.cell.error : 'Drawing…'}
            </div>
          }
        >
          {scene => (
            <>
              <ViewportCanvas
                index={props.index}
                label={`${props.cell.title}. Drag or use arrow keys to pan. Plus and minus zoom. Home fits.${props.cell.current ? '' : ' Enter applies.'}`}
              >
                <StaticScene
                  scene={scene()}
                  idPrefix={`c${props.index}-`}
                  focusId={comparison.cameraMode === 'focus' ? comparison.focusId : undefined}
                  focusable
                />
                <For each={hits()}>
                  {h => (
                    <rect
                      class="label-hit"
                      x={h.box.x - 3}
                      y={h.box.y - 3}
                      width={h.box.w + 6}
                      height={h.box.h + 6}
                      rx="4"
                    />
                  )}
                </For>
              </ViewportCanvas>
              <span class="scale-badge">{Math.round(effectiveCamera(props.index).k * 100)}%</span>
            </>
          )}
        </Show>
        <Show when={warnings().length}>
          <details class="candidate-warnings">
            <summary>
              {warnings().length} note{warnings().length === 1 ? '' : 's'}
            </summary>
            <For each={warnings()}>{w => <p>{w}</p>}</For>
          </details>
        </Show>
      </div>
      <Show when={props.cell.source ?? (props.cell.current && activeSession().fileMode())}>
        {source => (
          <footer>
            <code class="candidate-recipe" {...cutTip}>
              {props.cell.current ? currentLine() : candidateChange(source() as string)}
            </code>
          </footer>
        )}
      </Show>
    </article>
  );
}

function OverlayView() {
  const visible = (i: number) =>
    shownCells().includes(i) &&
    comparison.cells[i]?.status === 'ready' &&
    comparison.cells[i].layer.visible;
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
        <div class="overlay-empty">No layers are on. Turn one on in the sidebar.</div>
      </Show>
    </div>
  );
}
