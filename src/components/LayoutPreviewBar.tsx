import { Show } from 'solid-js';
import { runCommand } from '../state/commands';
import { holdPreviewBefore, layoutPreview } from '../state/layout';

/** Shown while a layout preview waits to be kept or discarded. */
export function LayoutPreviewBar() {
  const hold = (held: boolean) => () => holdPreviewBefore(held);
  return (
    <Show when={layoutPreview()}>
      {preview => (
        <div class="layout-preview floating-bar" role="region" aria-label="Layout preview">
          <div class="layout-preview-text">
            <strong>{preview().mode === 'rebuild' ? 'Rebuild' : 'Pass'} preview</strong>
            <span>Not saved yet</span>
          </div>
          <button
            type="button"
            class="button"
            title="Hold to compare"
            aria-label="Hold to see previous layout"
            onPointerDown={e => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              holdPreviewBefore(true);
            }}
            onPointerUp={hold(false)}
            onPointerCancel={hold(false)}
            onLostPointerCapture={hold(false)}
            onKeyDown={e => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                holdPreviewBefore(true);
              }
            }}
            onKeyUp={hold(false)}
          >
            Hold before
          </button>
          <button type="button" class="button" onClick={() => runCommand('layout-discard')}>
            Discard <kbd>Esc</kbd>
          </button>
          <button type="button" class="button primary" onClick={() => runCommand('layout-accept')}>
            Keep layout
          </button>
        </div>
      )}
    </Show>
  );
}
