import { createSignal, Index, onCleanup, Show } from 'solid-js';
import { fileMode, liveSource } from '../state/file-session';
import { toast } from '../state/toast';
import { Icon } from './Icon';
import { tip } from './controls';
import './source.css';

/** The open file's .draft text, read-only, kept current as canvas edits rewrite it. */
export function SourcePanel() {
  let code!: HTMLPreElement;
  const [copied, setCopied] = createSignal(false);
  let timer = 0;
  onCleanup(() => clearTimeout(timer));
  const lines = () => liveSource().replace(/\n$/, '').split('\n');

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(liveSource());
      setCopied(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error));
    }
  };

  // Keys and copies in the text belong to the text, not to the editor's shortcuts.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return;
    e.stopPropagation();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      getSelection()?.selectAllChildren(code);
    }
  };

  return (
    <Show
      when={fileMode()}
      fallback={
        <p class="source-empty">
          Only a .draft file has source. Open one with <code>draftably open</code> to see it here.
        </p>
      }
    >
      <div class="source-panel">
        <div class="source-bar">
          <span class="source-count">
            {lines().length} {lines().length === 1 ? 'line' : 'lines'}
          </span>
          <button
            type="button"
            class="button ghost source-copy"
            classList={{ copied: copied() }}
            {...tip('Copy all', undefined, 'Copy the whole .draft text.')}
            onClick={() => void copyAll()}
          >
            <Icon name={copied() ? 'check' : 'copy'} />
            Copy all
          </button>
        </div>
        <pre
          ref={code}
          class="source-text"
          tabindex="0"
          aria-label=".draft source"
          on:keydown={onKey}
          on:copy={e => e.stopPropagation()}
        >
          {/* Each line ends in its newline, so a selection copies blank lines too. */}
          <Index each={lines()}>{line => <span class="source-line">{`${line()}\n`}</span>}</Index>
        </pre>
      </div>
    </Show>
  );
}
