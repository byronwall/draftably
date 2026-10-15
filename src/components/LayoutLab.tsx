import { createMemo, For, Show, type JSX } from 'solid-js';
import { LayoutLab as Engine, type LayoutSettingKey } from '../engines/layout-engine.js';
import type { AspectSetting, Diagram, LayoutAlgorithmId } from '../model/types';
import { runCommand } from '../state/commands';
import { doc, selection } from '../state/document';
import {
  currentScope,
  labScope,
  layoutCheckpoint,
  layoutReport,
  setLabScope,
  updateLayoutSettings,
  type LabScope,
} from '../state/layout';
import { toggleLayoutLab } from '../state/ui';
import { currentSource, fileMode, fileScene, sourceScope } from '../state/file-session';
import { currentRecipe, recipeText } from '../dsl/layout-edits';
import { Checkbox, IconButton, RangeField, SelectField } from './controls';
import { IntentSummary } from './Inspector';

type NumericKey = {
  [K in keyof Diagram['settings']]: Diagram['settings'][K] extends number ? K : never;
}[keyof Diagram['settings']];

type DiagramType = 'flow' | 'nested' | 'grid' | 'custom';

const DIAGRAM_APPROACHES: Record<Exclude<DiagramType, 'custom'>, LayoutAlgorithmId> = {
  flow: 'compound-flow',
  nested: 'boundary-align',
  grid: 'grid',
};

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

/** Controls specific to each layout approach. */
const APPROACH_CONTROLS: Record<LayoutSettingKey, () => JSX.Element> = {
  boundaryPull: () => (
    <Slider
      label="Cross-boundary pull"
      key="boundaryPull"
      min={0}
      max={100}
      step={5}
      hint="How strongly actual connected endpoints affect the containing blocks."
    />
  ),
  hierarchySweeps: () => (
    <Slider
      label="Hierarchy sweeps"
      key="hierarchySweeps"
      min={1}
      max={4}
      hint="Alternate inner-first and outer-first passes; still one total move budget."
    />
  ),
  groupGap: () => (
    <Slider
      label="Between-container gap"
      key="groupGap"
      min={12}
      max={160}
      step={4}
      hint="Extra breathing room between sibling frames."
    />
  ),
  rankGap: () => <Slider label="Rank spacing" key="rankGap" min={16} max={180} step={4} />,
  edgeLength: () => (
    <Slider
      label="Link breathing room"
      key="edgeLength"
      min={20}
      max={220}
      step={4}
      hint="Added to a size-aware centre distance."
    />
  ),
  repulsion: () => <Slider label="Repulsion" key="repulsion" min={0} max={100} step={5} />,
  flowStrength: () => (
    <Slider label="Forward pressure" key="flowStrength" min={0} max={100} step={5} />
  ),
  alignment: () => <Slider label="Alignment" key="alignment" min={0} max={100} step={5} />,
  compactness: () => (
    <Slider label="Compactness / aspect pull" key="compactness" min={0} max={100} step={5} />
  ),
  gridStrength: () => (
    <Slider label="Grid attraction" key="gridStrength" min={0} max={100} step={5} />
  ),
  ordering: () => (
    <SelectField
      label="Within-rank ordering"
      value={doc.settings.ordering}
      options={[
        ['stable', 'Keep current order'],
        ['crossings', 'Reorder to reduce crossings'],
      ]}
      onChange={ordering => updateLayoutSettings({ ordering })}
    />
  ),
  fold: () => (
    <SelectField
      label="Long sequences"
      value={doc.settings.fold}
      options={[
        ['auto', 'Fold to target aspect'],
        ['never', 'Continuous ranks'],
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

/** Layout options: diagram type, scope, advanced settings and the last run's report. */
export function LayoutLab() {
  const algorithm = createMemo(() => Engine.algorithms.find(a => a.id === doc.settings.algorithm)!);
  const diagramType = createMemo<DiagramType>(() => {
    const entry = Object.entries(DIAGRAM_APPROACHES).find(
      ([, id]) => id === doc.settings.algorithm,
    );
    return (entry?.[0] as DiagramType | undefined) ?? 'custom';
  });
  return (
    <aside class="layout-lab floating-panel" aria-label="Layout lab">
      <header class="panel-header">
        <div>
          <h2>Automatic layout</h2>
        </div>
        <IconButton icon="close" label="Close layout lab" keys="⌥L" onClick={toggleLayoutLab} />
      </header>
      <div class="panel-scroll stack">
        <SelectField<DiagramType>
          label="Diagram type"
          value={diagramType()}
          options={[
            ['flow', 'Flow'],
            ['nested', 'Nested architecture'],
            ['grid', 'Compact grid'],
            ...(diagramType() === 'custom' ? [['custom', 'Custom approach'] as const] : []),
          ]}
          onChange={value => {
            if (value !== 'custom') updateLayoutSettings({ algorithm: DIAGRAM_APPROACHES[value] });
          }}
        />
        <p class="hint">
          {fileMode()
            ? 'Automatic layout saves a rule. Tidy positions saves the current placement.'
            : 'Automatic layout starts a new arrangement. Tidy positions makes small adjustments.'}
        </p>
        <SelectField<LabScope>
          label="Scope"
          hint={
            currentScope().scope === 'all' ? 'Nothing selected' : `${selection().size} selected`
          }
          value={labScope()}
          options={[
            ['auto', 'Selection / container automatically'],
            ['all', 'Whole diagram'],
            ['selection', 'Selected siblings only'],
            ['neighbourhood', 'Selection + one-hop neighbours'],
            ['container', 'Inside selected container'],
          ]}
          onChange={setLabScope}
        />
        <div class="fields-2">
          <SelectField
            label="Direction"
            value={doc.settings.direction}
            options={[
              ['RIGHT', 'Left → right'],
              ['DOWN', 'Top → bottom'],
            ]}
            onChange={direction => updateLayoutSettings({ direction })}
          />
          <SelectField<AspectSetting>
            label="Target aspect"
            value={doc.settings.aspect}
            options={[
              ['1.6', 'Landscape 8:5'],
              ['1', 'Square 1:1'],
              ['1.333', 'Landscape 4:3'],
              ['2', 'Wide 2:1'],
              ['0.75', 'Portrait 3:4'],
              ['canvas', 'Match canvas'],
            ]}
            onChange={aspect => updateLayoutSettings({ aspect })}
          />
        </div>
        <details class="lab-section">
          <summary>Advanced layout settings</summary>
          <div class="stack">
            <SelectField<LayoutAlgorithmId>
              label="Approach"
              value={doc.settings.algorithm}
              options={Engine.algorithms.map(a => [a.id, a.name] as const)}
              onChange={value => updateLayoutSettings({ algorithm: value })}
            />
            <p class="hint">{algorithm().short}</p>
            <details class="disclosure">
              <summary>{algorithm().family} · how it works</summary>
              <p class="hint">{algorithm().detail}</p>
            </details>
            <Show when={fileMode()} fallback={<IntentSummary />}>
              <FileRecipe />
            </Show>

            <section class="lab-section">
              <Checkbox
                label="Respect arrow direction"
                checked={doc.settings.respectDirection}
                onChange={respectDirection => updateLayoutSettings({ respectDirection })}
              />
              <p class="hint">
                Forward order is shared across connective approaches. Pins and frames win. Cycles
                retain feedback edges. Turn this off to permit folded ranks.
              </p>
            </section>

            <section class="lab-section">
              <div class="row between">
                <h3>Small passes</h3>
                <span class="pill">Default</span>
              </div>
              <Slider
                label="Maximum move / action"
                key="maxMove"
                min={8}
                max={192}
                step={8}
                hint="World pixels, across all nested levels. No automatic camera fit."
              />
              <Slider
                label="Stay near this arrangement"
                key="stability"
                min={0}
                max={100}
                step={5}
                hint="A soft anchor, not a pin. Lower values allow more change."
              />
              <Slider
                label="Solver effort"
                key="iterations"
                min={8}
                max={96}
                step={8}
                hint="More internal steps; the same total movement limit."
              />
              <Slider label="Minimum shape gap" key="nodeGap" min={8} max={96} step={4} />
            </section>

            <details class="lab-section">
              <summary>Approach controls</summary>
              <For
                each={algorithm().controls}
                fallback={
                  <p class="hint">
                    Only padded collisions are repaired. Link direction and aspect are not
                    objectives.
                  </p>
                }
              >
                {key => APPROACH_CONTROLS[key]?.()}
              </For>
            </details>

            <details class="lab-section">
              <summary>Protection & interaction</summary>
              <Checkbox
                label="Treat Manual markers as fixed"
                checked={doc.settings.respectManual}
                onChange={respectManual => updateLayoutSettings({ respectManual })}
              />
              <Checkbox
                label="Allow containers to grow right / down"
                checked={doc.settings.growContainers}
                onChange={growContainers => updateLayoutSettings({ growContainers })}
              />
              <p class="hint">
                Pins always stay fixed. A pinned descendant anchors its container. Frame growth is
                off by default.
              </p>
            </details>
          </div>
        </details>

        <LayoutReportCard />

        <section class="lab-section">
          <div class="row between">
            <h3>Compare alternatives</h3>
            <span class="hint">{fileMode() ? 'Apply saves a recipe' : 'Session only'}</span>
          </div>
          <button
            type="button"
            class="button primary full"
            onClick={() => runCommand('compare-layouts')}
          >
            Compare layouts · ⌥E
          </button>
          <p class="hint">
            Six settled candidates from the same starting document. Apply only the one you choose.
          </p>
          <Show when={!fileMode()}>
            <div class="fields-2">
              <button type="button" class="button" onClick={() => runCommand('layout-checkpoint')}>
                Capture checkpoint
              </button>
              <button
                type="button"
                class="button"
                disabled={!layoutCheckpoint()}
                onClick={() => runCommand('layout-restore')}
              >
                Restore checkpoint
              </button>
            </div>
            <p class="hint">
              Restore the same starting layout before comparing another approach. This is not a
              saved view.
            </p>
          </Show>
        </section>
      </div>
      <footer class="lab-footer">
        <div class="fields-2">
          <button type="button" class="button" onClick={() => runCommand('layout')}>
            Tidy positions <kbd>L</kbd>
          </button>
          <button type="button" class="button" onClick={() => runCommand('layout-preview')}>
            Preview tidy
          </button>
        </div>
        <button
          type="button"
          class="button primary full"
          onClick={() => runCommand('layout-rebuild')}
        >
          Preview automatic layout <kbd>⇧L</kbd>
        </button>
      </footer>
    </aside>
  );
}

/** In a diagram file: the scope's layout line now, and the one a rebuild would write. */
function FileRecipe() {
  const scope = () => {
    const s = labScope();
    return sourceScope(s === 'auto' ? currentScope() : { ...currentScope(), scope: s });
  };
  return (
    <section class="lab-section file-recipe" aria-label="Layout recipe in the file">
      <div class="row between">
        <h3>In the file</h3>
        <span class="hint">{scope() ?? 'Selection'}</span>
      </div>
      <Show
        when={scope()}
        fallback={
          <p class="hint">
            A recipe arranges the whole diagram or one container. Tidy positions saves the selection
            as positions instead.
          </p>
        }
      >
        {id => (
          <>
            <code class="recipe-line">
              {/* The scene changes with every saved revision; read it so this line follows. */}
              {(fileScene(), currentRecipe(currentSource(), id())) ??
                `# ${id()} uses the built-in recipe`}
            </code>
            <p class="hint">Rebuild writes:</p>
            <code class="recipe-line next">{recipeText(id(), doc.settings)}</code>
          </>
        )}
      </Show>
    </section>
  );
}

function LayoutReportCard() {
  return (
    <Show
      when={layoutReport()}
      fallback={
        <div class="report-card">
          <strong>Nothing moves until you ask.</strong>
          <p class="hint">
            Drag something into place. Press L for a bounded pass. Undo is one step.
          </p>
        </div>
      }
    >
      {r => {
        const areaChange = () =>
          r().before.area ? Math.round((r().after.area / r().before.area - 1) * 100) : 0;
        const mode = () =>
          r().mode === 'journey'
            ? 'Timeline step ' + r().selectedStep
            : r().mode === 'pass'
              ? 'Small pass'
              : 'Rebuild';
        return (
          <div class="report-card">
            <div class="row between">
              <strong>{r().name}</strong>
              <span class="hint">{mode()}</span>
            </div>
            <div class="metric-grid">
              <Metric value={r().moved} label="objects moved" />
              <Metric value={`${r().maxDisplacement}px`} label="largest move" />
              <Metric
                value={`${r().before.overlaps} → ${r().after.overlaps}`}
                label="sibling overlaps"
              />
              <Metric
                value={`${areaChange() > 0 ? '+' : ''}${areaChange()}%`}
                label="bounding area"
              />
            </div>
            <p class="hint">
              Aspect {r().before.aspect}:1 → {r().after.aspect}:1 · {r().milliseconds} ms ·{' '}
              {r().thread || 'local'}
            </p>
            <For each={r().warnings}>{w => <p class="warning-text">{w}</p>}</For>
          </div>
        );
      }}
    </Show>
  );
}

function Metric(props: { value: JSX.Element; label: string }) {
  return (
    <div class="metric">
      <b>{props.value}</b>
      <span>{props.label}</span>
    </div>
  );
}
