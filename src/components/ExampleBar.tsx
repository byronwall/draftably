import { createSignal, Show } from 'solid-js';
import { downloadText } from '../lib/svg-export';
import {
  currentSource,
  exampleEdited,
  exampleRestored,
  fileSession,
  scratchName,
  markExampleSaved,
  resetExample,
} from '../state/file-session';
import {
  cameFromPlayground,
  createDiagramFile,
  fileUrl,
  siteUrl,
  startUrl,
  workspace,
} from '../state/launch';
import { Icon } from './Icon';

/**
 * Shown for as long as an example is open, so it is never mistaken for a file on disk. It offers
 * the ways out: save the example as a new file, reset it, or go back to the start screen.
 */
export function ExampleBar() {
  const [saving, setSaving] = createSignal(false);
  const [path, setPath] = createSignal('');
  const [error, setError] = createSignal('');
  const id = () => fileSession()?.example ?? 'example';
  const fromPlay = cameFromPlayground();

  const startSave = () => {
    setPath(`${id()}.draft`);
    setError('');
    setSaving(true);
  };
  const save = async (e: Event) => {
    e.preventDefault();
    setError('');
    try {
      const created = await createDiagramFile(path().trim(), currentSource());
      // Leave without the unsaved-edits prompt: the edits are in the new file.
      markExampleSaved();
      location.assign(fileUrl(created));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div class="example-bar" role="status">
      <span class="example-badge">
        <Icon name="spark" />
        {scratchName()}
      </span>
      <Show
        when={saving()}
        fallback={
          <>
            <span class="example-text">
              <strong>{fileSession()?.name}</strong>
              <span class="example-note">
                {exampleRestored() && exampleEdited()
                  ? 'Restored your unsaved edits from this browser. Save as a file to keep them.'
                  : exampleEdited()
                    ? 'Your edits are kept in this browser only. Save as a file to keep them.'
                    : 'A scratch copy. Edits stay in this browser and are not written to disk.'}
              </span>
              <a class="example-help" href={siteUrl('docs/saving')} target="_blank" rel="noopener">
                Where is my work saved?
              </a>
            </span>
            <span class="example-actions">
              <Show
                when={workspace()}
                fallback={
                  <button
                    type="button"
                    class="button small"
                    onClick={() => downloadText(currentSource(), `${id()}.draft`, 'text/plain')}
                  >
                    <Icon name="download" />
                    Download .draft
                  </button>
                }
              >
                <button type="button" class="button small primary" onClick={startSave}>
                  <Icon name="file" />
                  Save as file…
                </button>
              </Show>
              <button
                type="button"
                class="button small ghost"
                disabled={!exampleEdited()}
                onClick={resetExample}
              >
                Reset
              </button>
              <Show
                when={fromPlay}
                fallback={
                  <a class="button small ghost" href={startUrl()}>
                    Close {scratchName().toLowerCase()}
                  </a>
                }
              >
                {/* Back keeps the Playground as it was left; the link covers a reloaded tab. */}
                <a
                  class="button small ghost"
                  href={siteUrl('play')}
                  onClick={e => {
                    if (history.length < 2) return;
                    e.preventDefault();
                    history.back();
                  }}
                >
                  Back to Playground
                </a>
              </Show>
            </span>
          </>
        }
      >
        <form class="example-save" onSubmit={save}>
          <label for="example-path">Save to</label>
          <input
            id="example-path"
            class="mono"
            value={path()}
            spellcheck={false}
            ref={el =>
              requestAnimationFrame(() => {
                el.focus();
                el.select();
              })
            }
            onInput={e => setPath(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Escape' && setSaving(false)}
          />
          <span class="example-note">in {workspace()?.root}</span>
          <span class="example-error" role="alert">
            {error()}
          </span>
          <span class="example-actions">
            <button type="button" class="button small ghost" onClick={() => setSaving(false)}>
              Cancel
            </button>
            <button type="submit" class="button small primary" disabled={!path().trim()}>
              Save file
            </button>
          </span>
        </form>
      </Show>
    </div>
  );
}
