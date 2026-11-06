import { createEffect, createSignal, Index, onCleanup, Show } from 'solid-js';

import { toast } from '../state/toast';
import { Icon } from './Icon';
import { tip } from './controls';
import './source.css';
import { useDiagramSession } from './session-context';

/** How long typing pauses before the text is drawn. */
const TYPE_DELAY = 300;

/** The open file's .draft text. Typing redraws the canvas; canvas edits rewrite the text. */
export function SourcePanel() {
  const s = useDiagramSession();
  let area!: HTMLTextAreaElement;
  const [copied, setCopied] = createSignal(false);
  const text = () => s.sourceDraft() ?? s.liveSource();
  const [value, setValue] = createSignal(text());
  let copyTimer = 0,
    typeTimer = 0,
    burst = 0;
  onCleanup(() => {
    clearTimeout(copyTimer);
    flush();
  });
  const lines = () => value().replace(/\n$/, '').split('\n');
  const width = () => Math.max(...lines().map(l => l.length));
  // The message without its "Line N:" prefix; the line is marked in the gutter.
  const error = () => {
    const e = s.sourceError();
    if (!e) return null;
    return { line: e.line, message: e.message.replace(/^Line \d+(, column \d+)?: /, '') };
  };

  // Follow the source as canvas edits, undo and the disk rewrite it. Typed text is never replaced:
  // while it is pending or invalid it is the draft, which this shows as is.
  createEffect(() => {
    const next = text();
    // Keys typed since the last flush are newer than any text this could bring.
    if (!area || typeTimer || next === area.value) return;
    const { selectionStart: start, selectionEnd: end } = area;
    area.value = next;
    setValue(next);
    if (document.activeElement === area) area.setSelectionRange(start, end);
  });

  function flush() {
    if (!typeTimer) return;
    clearTimeout(typeTimer);
    typeTimer = 0;
    void s.typeSource(area.value, burst);
  }

  const onInput = () => {
    setValue(area.value);
    clearTimeout(typeTimer);
    typeTimer = window.setTimeout(flush, TYPE_DELAY);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(area.value);
      setCopied(true);
      clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error));
    }
  };

  const showLine = (line: number) => {
    const at =
      area.value
        .split('\n')
        .slice(0, line - 1)
        .join('\n').length + (line > 1 ? 1 : 0);
    area.focus();
    area.setSelectionRange(at, at);
    area.parentElement!.parentElement!.querySelector(`[data-line="${line}"]`)?.scrollIntoView({
      block: 'nearest',
    });
  };

  // Keys in the text belong to the text. Escape still returns to the canvas.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return flush();
    e.stopPropagation();
    if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      // execCommand keeps the field's own undo.
      document.execCommand('insertText', false, '  ');
    }
  };

  return (
    <Show
      when={s.fileMode()}
      fallback={
        <p class="source-empty">
          Only a .draft file has source. Open one with <code>draftably open</code> to see it here.
        </p>
      }
    >
      <div class="source-panel">
        <div class="source-bar">
          <Show
            when={error()}
            fallback={
              <span class="source-count">
                {lines().length} {lines().length === 1 ? 'line' : 'lines'}
              </span>
            }
          >
            {e => (
              <button
                type="button"
                class="source-error-jump"
                {...tip('Go to the error', undefined, e().message)}
                onClick={() => e().line && showLine(e().line)}
              >
                <Icon name="alert" />
                {e().line ? `Error on line ${e().line}` : 'Source error'}
              </button>
            )}
          </Show>
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
        <div class="source-scroll">
          <div class="source-body" style={{ '--rows': value().split('\n').length }}>
            <div class="source-gutter" aria-hidden="true">
              <Index each={lines()}>
                {(_, i) => (
                  <span
                    data-line={i + 1}
                    classList={{ 'source-number': true, bad: error()?.line === i + 1 }}
                  >
                    {i + 1}
                  </span>
                )}
              </Index>
            </div>
            <div class="source-field">
              <Show when={error()?.line ? error() : null}>
                {e => (
                  <div
                    class="source-error"
                    style={{
                      '--line': e().line - 1,
                      '--at': `${lines()[e().line - 1]?.length ?? 0}ch`,
                    }}
                  >
                    <span>{e().message}</span>
                  </div>
                )}
              </Show>
              <textarea
                ref={area}
                class="source-text"
                style={{ '--cols': `${width()}ch` }}
                wrap="off"
                spellcheck={false}
                autocapitalize="off"
                autocomplete="off"
                aria-label=".draft source"
                aria-invalid={!!error()}
                on:input={onInput}
                on:keydown={onKey}
                on:copy={e => e.stopPropagation()}
                on:cut={e => e.stopPropagation()}
                on:paste={e => e.stopPropagation()}
                onFocus={() => burst++}
                onBlur={flush}
              />
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
