import { Show } from 'solid-js';
import { fileMode, fileSession, fileStatus, sourceError } from '../state/file-session';

/** Explains why a file-backed drawing is not following its source. */
export function FileBanner() {
  return (
    <Show when={fileMode() && (sourceError() || fileStatus() === 'offline')}>
      <div class="file-banner" role="status">
        <Show
          when={sourceError()}
          fallback={
            <span>
              Lost contact with the file server. Changes on disk will appear when it is back.
            </span>
          }
        >
          {error => (
            <>
              <strong>{fileSession()!.name}</strong>
              <span>{error().message}</span>
              <span class="file-banner-note">
                Showing the last valid drawing. Edits are paused until the source is fixed.
              </span>
            </>
          )}
        </Show>
      </div>
    </Show>
  );
}
