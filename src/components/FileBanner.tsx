import { Match, Show, Switch } from 'solid-js';

import { useDiagramSession } from './session-context';

/** Explains why a file-backed drawing is not following its source, and what to do about it. */
export function FileBanner() {
  const s = useDiagramSession();
  const visible = () =>
    s.fileMode() &&
    (!!s.sourceError() || !!s.conflictProposal() || ['offline', 'failed'].includes(s.fileStatus()));
  return (
    <Show when={visible()}>
      <div class="file-banner" role="status">
        <strong>{s.fileSession()!.name}</strong>
        <Switch>
          <Match when={s.sourceError()}>
            {error => (
              <>
                <span>{error().message}</span>
                <span class="file-banner-note">
                  Showing the last valid drawing. Edits are paused until the source is fixed.
                </span>
              </>
            )}
          </Match>
          <Match when={s.conflictProposal()}>
            <span>The file changed on disk before your edit was saved.</span>
            <span class="file-banner-note">
              Showing the file. Your edit was kept aside; saving it replaces the newer file.
            </span>
            <span class="file-banner-actions">
              <button type="button" class="button small" onClick={s.keepDiskVersion}>
                Keep file
              </button>
              <button type="button" class="button ghost small" onClick={s.saveProposalOverDisk}>
                Save my edit over it
              </button>
            </span>
          </Match>
          <Match when={s.fileStatus() === 'failed'}>
            <span>Your last edit was not saved.</span>
            <span class="file-banner-actions">
              <button type="button" class="button small" onClick={s.retrySave}>
                Try again
              </button>
            </span>
          </Match>
          <Match when={s.fileStatus() === 'offline'}>
            <span>
              Lost contact with the file server. Changes on disk will appear when it is back.
            </span>
          </Match>
        </Switch>
      </div>
    </Show>
  );
}
