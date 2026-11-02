import { createMemo, For, Show, type JSX } from 'solid-js';
import { LayoutLab as Engine, type LayoutSettingKey } from '../engines/layout-engine.js';
import { layoutShape, type LayoutShape } from '../dsl/layout-edits';
import { ENGINES, FITS, type Fit } from '../dsl/syntax';
import { selectionRoots } from '../model/graph';
import type { AspectSetting, Diagram, LayoutAlgorithmId, RoutingSettings } from '../model/types';
import { commandEnabled, runCommand, type CommandId } from '../state/commands';
import { doc, selection } from '../state/document';
import {
  changedLine,
  currentSource,
  fileMode,
  fileScene,
  sourceWithRecipe,
} from '../state/file-session';
import {
  arrangeScope,
  currentScope,
  labEngine,
  labScope,
  layoutCheckpoint,
  layoutPreview,
  previewSettings,
  previewShape,
  setLabEngine,
  setLabScope,
  updateLayoutSettings,
} from '../state/layout';
import {
  activeRoutePreset,
  applyRoutePreset,
  ROUTE_PRESETS,
  setRouting,
  type RoutePreset,
} from '../state/routing';
import { routingReport } from '../state/scene';
import { Checkbox, RangeField, SelectField, tip } from './controls';
import { IntentSummary } from './Inspector';

type NumericKey = {
  [K in keyof Diagram['settings']]: Diagram['settings'][K] extends number ? K : never;
}[keyof Diagram['settings']];

function Slider(props: {
  label: string;
  key: NumericKey;
  min: number;
  max: number;
  step?: number;
  hint?: string;
}) {
  return (
    <RangeField
      label={props.label}
      min={props.min}
      max={props.max}
      step={props.step}
      hint={props.hint}
      value={doc.settings[props.key]}
      onChange={value => updateLayoutSettings({ [props.key]: value })}
    />
  );
}

/**
 * Settings a rebuild reads, by layout approach. `ordering` is left out: a rebuild always orders
 * ranks to reduce crossings, so the choice only matters to a small pass.
 */
const ENGINE_CONTROLS: Partial<Record<LayoutSettingKey, () => JSX.Element>> = {
  boundaryPull: () => (
    <Slider label="Cross-boundary pull" key="boundaryPull" min={0} max={100} step={5} />
  ),
  hierarchySweeps: () => <Slider label="Hierarchy sweeps" key="hierarchySweeps" min={1} max={4} />,
  groupGap: () => <Slider label="Between groups" key="groupGap" min={12} max={160} step={4} />,
  rankGap: () => <Slider label="Between stages" key="rankGap" min={16} max={180} step={4} />,
  edgeLength: () => <Slider label="Line length" key="edgeLength" min={20} max={220} step={4} />,
  repulsion: () => <Slider label="Repulsion" key="repulsion" min={0} max={100} step={5} />,
  flowStrength: () => (
    <Slider label="Forward pressure" key="flowStrength" min={0} max={100} step={5} />
  ),
  alignment: () => <Slider label="Alignment" key="alignment" min={0} max={100} step={5} />,
  compactness: () => <Slider label="Compactness" key="compactness" min={0} max={100} step={5} />,
  gridStrength: () => (
    <Slider label="Grid attraction" key="gridStrength" min={0} max={100} step={5} />
  ),
  fold: () => (
    <SelectField
      label="Long runs"
      value={doc.settings.fold}
      options={[
        ['auto', 'Fold to fit'],
        ['never', 'Keep straight'],
      ]}
      onChange={fold => updateLayoutSettings({ fold })}
    />
  ),
  rootId: () => (
    <SelectField
      label="Root"
      value={doc.settings.rootId}
      options={[['', 'Automatic'], ...doc.graph.nodes.map(n => [n.id, n.title] as const)]}
      onChange={rootId => updateLayoutSettings({ rootId })}
    />
  ),
};

/** A browser diagram has no `layout` line. Its format is the engine's target aspect instead. */
const ASPECTS: Partial<Record<Fit, AspectSetting>> = {
  wide: '2',
  slide: '1.6',
  square: '1',
  page: '0.75',
};

type Direction = LayoutShape['direction'];

/** Sequence and cell drawings take their shape from their content. */
const SHAPED_BY_CONTENT: Record<string, string> = {
  sequence: 'Sequence diagrams follow message order.',
  cells: 'Cells follow their columns and spans.',
};

/** Recipes with a structure of their own, which an engine would replace and lose. */
const STRUCTURED = ['lanes', 'sequence', 'cells'];

/** How the diagram is arranged: direction, format and connections, with the exact values below. */
export function ArrangePanel() {
  const scope = () => (fileMode() ? arrangeScope() : 'root');
  const loose = () => currentScope().scope === 'selection' && labScope() === 'auto';
  // The scene changes with every saved revision; read it so the panel follows the file.
  const shape = createMemo(() => {
    fileScene();
    const id = scope();
    return id && fileMode()
      ? layoutShape(layoutPreview()?.file?.source ?? currentSource(), id)
      : null;
  });
  const direction = (): Direction =>
    shape()?.direction ?? (doc.settings.direction === 'DOWN' ? 'down' : 'right');
  const fit = (): Fit | null =>
    fileMode()
      ? (shape()?.fit ?? null)
      : ((Object.keys(ASPECTS) as Fit[]).find(f => ASPECTS[f] === doc.settings.aspect) ?? null);

  const setDirection = (next: Direction) => {
    if (fileMode()) return void previewShape({ direction: next });
    void previewSettings({ direction: next === 'down' ? 'DOWN' : 'RIGHT' });
  };
  const setFit = (next: Fit | null) => {
    if (fileMode()) return void previewShape({ fit: next });
    void previewSettings({ aspect: next ? ASPECTS[next] : 'canvas' });
  };

  const canReshape = () => !!scope() && !loose();
  const contentRule = () => SHAPED_BY_CONTENT[shape()?.recipe ?? ''];
  const axisOnly = () => ['row', 'column'].includes(shape()?.recipe ?? '');
  const structured = () => STRUCTURED.includes(shape()?.recipe ?? '');
  const hasFormat = () => (!fileMode() || scope() === 'root') && !structured();
  // A sequence draws its messages straight across, so there is no routing to choose.
  const routed = () => shape()?.recipe !== 'sequence';

  return (
    <div class="panel-scroll arrange">
      <Subject line={fileMode() ? recipeLine(scope(), shape()) : null} />

      <Show
        when={canReshape()}
        fallback={
          <p class="hint">Direction and format apply to the whole diagram or to one group.</p>
        }
      >
        <Show when={!contentRule()} fallback={<p class="hint">{contentRule()}</p>}>
          <section class="arrange-field">
            <h3>Direction</h3>
            <Choices<Direction>
              label="Direction"
              value={direction()}
              options={[
                ...(fileMode() && !axisOnly() ? [['auto', 'Auto'] as const] : []),
                ['right', 'Right'],
                ['down', 'Down'],
              ]}
              onChange={setDirection}
            />
          </section>
          <Show when={hasFormat()}>
            <section class="arrange-field">
              <h3>Format</h3>
              <FormatPicker value={fit()} onChange={setFit} />
              <Show when={fit() && direction() === 'auto'}>
                <p class="hint">Auto direction reads whichever way fits best.</p>
              </Show>
            </section>
          </Show>
        </Show>
        <Show when={!structured()}>
          <ActionButton command="compare-layouts" label="Compare alternatives" />
        </Show>
      </Show>

      <Show when={routed()}>
        <Connections />
      </Show>

      <details class="arrange-more">
        <summary>Exact layout</summary>
        <ExactLayout structured={structured()} />
      </details>
      <Show when={routed()}>
        <details class="arrange-more">
          <summary>Exact routing</summary>
          <ExactRouting />
        </details>
      </Show>
      <details class="arrange-more">
        <summary>Local tools</summary>
        <LocalTools />
      </details>
    </div>
  );
}

/** The scope's line as the file says it now, or as a preview would save it. */
function recipeLine(scope: string | null, shape: LayoutShape | null) {
  if (!scope || !shape) return null;
  const line = (layoutPreview()?.file?.source ?? currentSource())
    .split('\n')
    .find(l => new RegExp(`^layout ${scope}\\b`).test(l));
  return line?.split(' #')[0].trim() ?? `Built-in ${shape.recipe} recipe`;
}

/** What the panel acts on: it follows the selection, so there is no scope to set. */
function Subject(props: { line: string | null }) {
  const name = () => {
    const roots = selectionRoots(doc, selection());
    const id = currentScope().containerId;
    if (id) return doc.graph.groups.find(g => g.id === id)?.title ?? id;
    if (roots.length) return `${roots.length} ${roots.length === 1 ? 'shape' : 'shapes'}`;
    return 'Whole diagram';
  };
  return (
    <header class="arrange-subject">
      <strong>{name()}</strong>
      <Show when={props.line}>{line => <code>{line()}</code>}</Show>
    </header>
  );
}

function ActionButton(props: { command: CommandId; label: string }) {
  return (
    <button
      type="button"
      class="button"
      disabled={!commandEnabled(props.command)}
      onClick={() => runCommand(props.command)}
    >
      {props.label}
    </button>
  );
}

/** A segmented choice whose active button is what the drawing is now. */
function Choices<T extends string>(props: {
  label: string;
  value: T | null;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div class="segmented full" role="group" aria-label={props.label}>
      <For each={props.options}>
        {([value, text]) => (
          <button
            type="button"
            aria-pressed={props.value === value}
            onClick={() => props.value !== value && props.onChange(value)}
          >
            {text}
          </button>
        )}
      </For>
    </div>
  );
}

/** Each format drawn to its own proportions, so the shape is the label. */
function FormatPicker(props: { value: Fit | null; onChange: (fit: Fit | null) => void }) {
  const options = () =>
    (Object.keys(FITS) as Fit[]).filter(f => fileMode() || ASPECTS[f] !== undefined);
  const glyph = (ratio: number) => ({
    width: `${ratio >= 1 ? 18 : 18 * ratio}px`,
    height: `${ratio >= 1 ? 18 / ratio : 18}px`,
  });
  return (
    <div class="format-picker" role="group" aria-label="Format">
      <button
        type="button"
        aria-pressed={props.value === null}
        {...tip('Auto', undefined, 'No target shape. The drawing takes the size it needs.')}
        onClick={() => props.value !== null && props.onChange(null)}
      >
        <span class="format-glyph auto" />
        Auto
      </button>
      <For each={options()}>
        {fit => (
          <button
            type="button"
            aria-pressed={props.value === fit}
            onClick={() => props.value !== fit && props.onChange(fit)}
          >
            <span class="format-glyph" style={glyph(FITS[fit])} />
            {fit[0].toUpperCase() + fit.slice(1)}
          </button>
        )}
      </For>
    </div>
  );
}

function Connections() {
  const report = () => routingReport();
  return (
    <section class="arrange-field">
      <h3>Connections</h3>
      <Choices<RoutePreset>
        label="Connection routing"
        value={activeRoutePreset()}
        options={(Object.keys(ROUTE_PRESETS) as RoutePreset[]).map(p => [p, p] as const)}
        onChange={applyRoutePreset}
      />
      <Show when={!activeRoutePreset()}>
        <p class="hint">Custom values are set. A preset replaces them.</p>
      </Show>
      <div class="arrange-actions">
        <ActionButton command="reroute" label="Reroute" />
        <ActionButton command="compare-routes" label="Compare" />
      </div>
      <p class="hint">
        {report().crossings} crossings · {report().lanePairs} close lane pairs · {report().bends}{' '}
        bends
      </p>
    </section>
  );
}

/** Every setting by what it changes: the rebuild, then the small moves of Improve. */
function ExactLayout(props: { structured: boolean }) {
  const rebuildEngine = () =>
    fileMode() ? (labEngine() ?? (engineOf() as LayoutAlgorithmId | null)) : doc.settings.algorithm;
  const engineOf = () => {
    const id = arrangeScope();
    if (!id) return null;
    fileScene();
    const shape = layoutShape(currentSource(), id);
    return shape.engine ? shape.recipe : null;
  };
  const algorithm = () => Engine.algorithms.find(a => a.id === rebuildEngine());
  const engines = () =>
    Engine.algorithms.filter(a => !fileMode() || ENGINES.includes(a.id)).map(a => [a.id, a.name]);
  const writes = () => {
    const id = arrangeScope(),
      engine = rebuildEngine();
    if (!id || !engine || !labEngine()) return null;
    return changedLine(sourceWithRecipe(id, { ...doc.settings, algorithm: engine }).source);
  };
  const improver = () => Engine.algorithms.find(a => a.id === doc.settings.algorithm)!;
  return (
    <div class="stack">
      <Show when={!props.structured}>
        <section class="arrange-field">
          <h3>Rebuild</h3>
          <SelectField<string>
            label="Method"
            value={rebuildEngine() ?? ''}
            options={[
              ...(fileMode() && !engineOf() ? [['', 'The file’s recipe'] as const] : []),
              ...(engines() as Array<[string, string]>),
            ]}
            onChange={value => {
              if (fileMode()) setLabEngine((value || null) as LayoutAlgorithmId | null);
              else updateLayoutSettings({ algorithm: value as LayoutAlgorithmId });
            }}
          />
          <Show when={algorithm()}>
            {a => (
              <>
                <p class="hint">{a().short}</p>
                <For each={a().controls}>{key => ENGINE_CONTROLS[key]?.()}</For>
                <Slider label="Between shapes" key="nodeGap" min={8} max={96} step={4} />
              </>
            )}
          </Show>
          <Show when={fileMode() && !algorithm() && arrangeScope()}>
            <RecipeControls />
          </Show>
          <Show when={writes()}>{line => <code class="recipe-line next">{line()}</code>}</Show>
          <button type="button" class="button" onClick={() => runCommand('layout-rebuild')}>
            {labEngine() || !fileMode() ? 'Preview rebuild' : 'Reset to the recipe'} <kbd>⇧L</kbd>
          </button>
        </section>
      </Show>
      <section class="arrange-field">
        <h3>Improve</h3>
        <Show when={fileMode()}>
          <SelectField<LayoutAlgorithmId>
            label="Method"
            value={doc.settings.algorithm}
            options={Engine.algorithms.map(a => [a.id, a.name] as const)}
            onChange={value => updateLayoutSettings({ algorithm: value })}
          />
          <p class="hint">{improver().short}</p>
        </Show>
        <Slider label="Largest move" key="maxMove" min={8} max={192} step={8} />
        <Slider label="Stay near the drawing" key="stability" min={0} max={100} step={5} />
        <Slider label="Solver effort" key="iterations" min={8} max={96} step={8} />
        <SelectField
          label="Order within a stage"
          value={doc.settings.ordering}
          options={[
            ['stable', 'Keep current order'],
            ['crossings', 'Reduce crossings'],
          ]}
          onChange={ordering => updateLayoutSettings({ ordering })}
        />
        <Show when={currentScope().scope !== 'all'}>
          <Checkbox
            label="Include one-hop neighbours"
            checked={labScope() === 'neighbourhood'}
            onChange={on => setLabScope(on ? 'neighbourhood' : 'auto')}
          />
        </Show>
        <Checkbox
          label="Respect arrow direction"
          checked={doc.settings.respectDirection}
          onChange={respectDirection => updateLayoutSettings({ respectDirection })}
        />
        <Checkbox
          label="Protect shapes moved by hand"
          checked={doc.settings.respectManual}
          onChange={respectManual => updateLayoutSettings({ respectManual })}
        />
        <Checkbox
          label="Let groups grow"
          checked={doc.settings.growContainers}
          onChange={growContainers => updateLayoutSettings({ growContainers })}
        />
      </section>
      <Show when={!fileMode()}>
        <IntentSummary />
      </Show>
    </div>
  );
}

/** The recipe's own settings. Each change previews, like Direction and Format. */
function RecipeControls() {
  const shape = () => {
    fileScene();
    const id = arrangeScope();
    return id ? layoutShape(layoutPreview()?.file?.source ?? currentSource(), id) : null;
  };
  return (
    <Show when={shape() && !STRUCTURED.includes(shape()!.recipe) && shape()}>
      {s => (
        <>
          <RangeField
            label="Gap"
            min={8}
            max={120}
            step={4}
            value={s().gap ?? 28}
            onChange={gap => void previewShape({ gap })}
          />
          <Show when={s().recipe === 'flow'}>
            <SelectField
              label="Long runs"
              value={s().fold}
              options={[
                ['auto', 'Fold to fit'],
                ['never', 'Keep straight'],
              ]}
              onChange={fold => void previewShape({ fold })}
            />
          </Show>
        </>
      )}
    </Show>
  );
}

type RouteField = [keyof RoutingSettings, string, number, number, string?];

const ROUTE_SPACING: RouteField[] = [
  ['clearance', 'Around shapes', 4, 30],
  ['standoff', 'Before the first bend', 0, 40],
  ['portGap', 'At endpoints', 6, 28],
  ['edgeGap', 'Between lines', 4, 48],
];
const ROUTE_COSTS: RouteField[] = [
  ['crossingPenalty', 'Crossing', 0, 1200, 'Higher values prefer detours over crossings.'],
  ['bendPenalty', 'Bend', 0, 100],
  ['parallelPenalty', 'Close lines', 0, 60],
  ['sharedPenalty', 'Shared path', 0, 20],
  ['fanoutPenalty', 'Fan-out', 0, 160, 'Prefer different sides for separate branches.'],
  ['portStability', 'Changing sides', 0, 150],
];

function ExactRouting() {
  const field = ([key, label, min, max, hint]: RouteField) => (
    <RangeField
      label={label}
      min={min}
      max={max}
      hint={hint}
      value={doc.settings.routing[key]}
      onChange={value => setRouting({ [key]: value }, 'Change routing settings')}
    />
  );
  return (
    <div class="stack">
      <section class="arrange-field">
        <h3>Spacing</h3>
        <For each={ROUTE_SPACING}>{field}</For>
      </section>
      <section class="arrange-field">
        <h3>Costs</h3>
        <For each={ROUTE_COSTS}>{field}</For>
        {field(['passes', 'Passes', 1, 5])}
      </section>
    </div>
  );
}

function LocalTools() {
  return (
    <div class="arrange-actions wrap">
      <ActionButton command="timeline-toggle" label="Timeline" />
      <ActionButton command="brush-toggle" label="Brush" />
      <Show when={!fileMode()}>
        <ActionButton command="layout-checkpoint" label="Checkpoint" />
        <Show when={layoutCheckpoint()}>
          <ActionButton command="layout-restore" label="Restore" />
        </Show>
      </Show>
    </div>
  );
}
