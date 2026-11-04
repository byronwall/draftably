import { Show } from 'solid-js';
import {
  inspectorWidth,
  resetInspectorWidth,
  rightTab,
  setInspectorOpen,
  setInspectorWidth,
  setRightTab,
} from '../state/ui';
import { ArrangePanel } from './ArrangePanel';
import { IconButton, tip } from './controls';
import { Inspector } from './Inspector';
import { ResizeHandle } from './ResizeHandle';

/** The right side: the selection's properties and the diagram's arrangement, one at a time. */
export function RightPanel() {
  return (
    <aside class="panel inspector-panel" aria-label="Inspector">
      <header class="sidebar-head">
        <div class="sidebar-tabs" role="tablist" aria-label="Right panel">
          <button
            type="button"
            role="tab"
            aria-selected={rightTab() === 'properties'}
            {...tip('Properties', ']', 'Edit the selection.')}
            onClick={() => setRightTab('properties')}
          >
            Properties
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rightTab() === 'arrange'}
            {...tip('Arrange', '⌥L', 'Lay out again, direction, format and connections.')}
            onClick={() => setRightTab('arrange')}
          >
            Arrange
          </button>
        </div>
        <IconButton
          icon="close"
          label="Close panel"
          keys="]"
          onClick={() => setInspectorOpen(false)}
        />
      </header>
      <Show when={rightTab() === 'arrange'} fallback={<Inspector />}>
        <ArrangePanel />
      </Show>
      <ResizeHandle
        edge="left"
        label="Resize panel"
        width={inspectorWidth()}
        onResize={setInspectorWidth}
        onReset={resetInspectorWidth}
      />
    </aside>
  );
}
