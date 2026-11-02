import { Show } from 'solid-js';
import { runCommand } from '../state/commands';
import { holdPreviewBefore, layoutPreview } from '../state/layout';
import { tip } from './controls';

/** Shown while a layout preview waits to be kept or discarded. */
export function LayoutPreviewBar() {
  const hold = (held: boolean) => () => holdPreviewBefore(held);
  return (
    <Show when={layoutPreview()}>
      {preview => (
        <div class="layout-preview floating-bar" role="region" aria-label="Layout preview">
          <div class="layout-preview-text">
            <strong>Not saved yet</strong>
            <Show
              when={preview().file}
              fallback={
                <span>
                  {preview().mode === 'rebuild' ? 'New arrangement' : `${preview().moved} moved`}
                </span>
              }
            >
              {file => (
                <span>
                  <Show when={file().line}>{line => <code>{line()}</code>}</Show>
                  <Show when={file().removed}>
                    {' '}
                    · removes {file().removed} hand placement{file().removed === 1 ? '' : 's'}
                  </Show>
                </span>
              )}
            </Show>
          </div>
          <button
            type="button"
            class="button"
            {...tip('Hold to see the drawing before this preview')}
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
            Hold to compare
          </button>
          <button type="button" class="button" onClick={() => runCommand('layout-discard')}>
            Discard <kbd>Esc</kbd>
          </button>
          <button type="button" class="button primary" onClick={() => runCommand('layout-accept')}>
            Keep
          </button>
        </div>
      )}
    </Show>
  );
}
