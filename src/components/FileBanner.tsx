import { Match, Show, Switch } from 'solid-js';
import {
  conflictProposal,
  fileMode,
  fileSession,
  fileStatus,
  keepDiskVersion,
  retrySave,
  saveProposalOverDisk,
  sourceError,
} from '../state/file-session';

/** Explains why a file-backed drawing is not following its source, and what to do about it. */
export function FileBanner() {
  const visible = () =>
    fileMode() &&
    (!!sourceError() || !!conflictProposal() || ['offline', 'failed'].includes(fileStatus()));
  return (
    <Show when={visible()}>
      <div class="file-banner" role="status">
        <strong>{fileSession()!.name}</strong>
        <Switch>
          <Match when={sourceError()}>
            {error => (
              <>
                <span>{error().message}</span>
                <span class="file-banner-note">
                  Showing the last valid drawing. Edits are paused until the source is fixed.
                </span>
              </>
            )}
          </Match>
          <Match when={conflictProposal()}>
            <span>The file changed on disk before your edit was saved.</span>
            <span class="file-banner-note">
              Showing the file. Your edit was kept aside; saving it replaces the newer file.
            </span>
            <span class="file-banner-actions">
              <button type="button" class="button small" onClick={keepDiskVersion}>
                Keep file
              </button>
              <button type="button" class="button ghost small" onClick={saveProposalOverDisk}>
                Save my edit over it
              </button>
            </span>
          </Match>
          <Match when={fileStatus() === 'failed'}>
            <span>Your last edit was not saved.</span>
            <span class="file-banner-actions">
              <button type="button" class="button small" onClick={retrySave}>
                Try again
              </button>
            </span>
          </Match>
          <Match when={fileStatus() === 'offline'}>
            <span>
              Lost contact with the file server. Changes on disk will appear when it is back.
            </span>
          </Match>
        </Switch>
      </div>
    </Show>
  );
}
