import { Show } from 'solid-js';
import type { BrushMode } from '../../engines/sculpt-engine.js';
import { setTool } from '../../state/actions';
import {
  brushActive,
  brushHover,
  brushSettings,
  clearHolds,
  deactivateBrush,
  heldIds,
  openTimeline,
  referenceLabel,
  reopenTimeline,
  updateBrushSettings,
  useCurrentAsReference,
} from '../../state/sculpt';
import { Checkbox, IconButton, RangeField, Select } from '../controls';

const MODES: [BrushMode, string][] = [
  ['tidy', 'Tidy nearby'],
  ['flow', 'Nudge into flow'],
  ['space', 'Make space'],
  ['restore', 'Restore from bookmark'],
  ['protect', 'Hold this area'],
];

/** Settings for the local layout brush. */
export function BrushDock() {
  const hint = () => {
    const h = brushHover();
    if (!h) return 'Hover previews. Hold or drag to paint. [ / ] size · Alt restores · Space pans.';
    const n = Object.keys(h.weights).length;
    if (!n)
      return `No movable shapes here${h.locked.length ? ' · ' + h.locked.length + ' protected' : ''} · [ / ] changes the radius`;
    const detail = h.blocked
      ? 'movement blocked by nearby shapes'
      : h.mode === 'restore'
        ? 'restore locally; the rest stays put'
        : 'hover is preview only; drag to paint';
    return `${n} eligible · ${h.locked.length} protected · ${detail}`;
  };
  return (
    <Show when={brushActive()}>
      <section class="brush-dock floating-panel" aria-label="Layout brush controls">
        <header class="panel-header compact">
          <span class="eyebrow">Local layout</span>
          <IconButton
            icon="close"
            label="Exit layout brush"
            keys="Esc"
            onClick={() => {
              deactivateBrush();
              setTool('select');
            }}
          />
        </header>
        <label class="field">
          <span class="field-label">Brush</span>
          <Select
            value={brushSettings().mode}
            options={MODES}
            onChange={mode => updateBrushSettings({ mode })}
          />
        </label>
        <RangeField
          label="Radius"
          unit=" px"
          min={40}
          max={600}
          step={10}
          value={brushSettings().radius}
          onInput={radius => updateBrushSettings({ radius })}
          onChange={radius => updateBrushSettings({ radius })}
        />
        <RangeField
          label="Strength"
          unit="%"
          min={1}
          max={100}
          value={brushSettings().strength}
          onInput={strength => updateBrushSettings({ strength })}
          onChange={strength => updateBrushSettings({ strength })}
        />
        <RangeField
          label="Soft edge"
          unit="%"
          min={0}
          max={100}
          value={brushSettings().softness}
          onInput={softness => updateBrushSettings({ softness })}
          onChange={softness => updateBrushSettings({ softness })}
        />
        <Checkbox
          label="Hold restored nodes for the next layout"
          checked={brushSettings().holdRestored}
          onChange={holdRestored => updateBrushSettings({ holdRestored })}
        />
        <div class="brush-row">
          <span>
            Restore: <strong>{referenceLabel()}</strong>
          </span>
          <button type="button" class="button ghost small" onClick={useCurrentAsReference}>
            Use current
          </button>
        </div>
        <div class="brush-row">
          <span>{heldIds().length} local holds</span>
          <button type="button" class="button ghost small" onClick={clearHolds}>
            Clear holds
          </button>
        </div>
        <div class="button-row">
          <button
            type="button"
            class="button"
            onClick={() => {
              deactivateBrush();
              void openTimeline();
            }}
          >
            Preview from here
          </button>
          <button type="button" class="button ghost" onClick={reopenTimeline}>
            Last path
          </button>
        </div>
        <p class="hint" aria-live="polite">
          {hint()}
        </p>
      </section>
    </Show>
  );
}
