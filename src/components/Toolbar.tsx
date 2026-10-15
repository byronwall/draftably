import { createEffect, createSignal, For, Show } from 'solid-js';
import { LayoutLab } from '../engines/layout-engine.js';
import type { LayoutAlgorithmId } from '../model/types';
import { setTool } from '../state/actions';
import { commandEnabled, runCommand, type CommandId } from '../state/commands';
import { doc, saveStatus, transact } from '../state/document';
import { fileMode, fileStatus, fileStatusText } from '../state/file-session';
import { tool, type Tool } from '../state/editor';
import { layoutBusy, cancelLayout, updateLayoutSettings } from '../state/layout';
import { brushActive, timelineOpen } from '../state/sculpt';
import { inspectorOpen, layoutLabOpen, menu, objectsOpen, openMenu } from '../state/ui';
import { IconButton } from './controls';
import { Icon } from './Icon';
import './toolbar.css';

const NAV_TOOLS: [Tool, string, string, string][] = [
  ['select', 'cursor', 'Edit / select', 'V'],
  ['pan', 'hand', 'Navigate', 'H'],
];
const DRAW_TOOLS: [Tool, string, string, string][] = [
  ['box', 'box', 'Rectangle', 'R'],
  ['diamond', 'diamond', 'Diamond', 'D'],
  ['circle', 'circle', 'Ellipse', 'O'],
  ['text', 'text', 'Text', 'T'],
  ['container', 'group', 'Container', 'G'],
  ['connect', 'connect', 'Connect', 'C'],
];

/** Layout approaches grouped as in the layout lab. */
const NESTED = ['compound-flow', 'boundary-align', 'compound-spring'];

export function Toolbar() {
  const locked = () => timelineOpen();
  const run = (id: CommandId) => () => runCommand(id);
  const menuButton = (id: Parameters<typeof openMenu>[0]) => (e: MouseEvent) =>
    openMenu(id, e.currentTarget as HTMLElement);
  const menuOpen = (id: string) => menu()?.id === id;

  return (
    <header class="toolbar">
      <div class="toolbar-group">
        <IconButton
          icon="menu"
          label="File and examples"
          aria-haspopup="menu"
          aria-expanded={menuOpen('file')}
          onClick={menuButton('file')}
        />
        <DocumentTitle />
      </div>

      <div class="toolbar-scroll">
        <div class="toolbar-group" role="toolbar" aria-label="Drawing tools">
          <ToolButtons tools={NAV_TOOLS} disabled={locked()} />
          <span class="divider" />
          <ToolButtons tools={DRAW_TOOLS} disabled={locked()} />
        </div>
        <span class="divider" />
        <div class="toolbar-group">
          <IconButton
            icon="undo"
            label="Undo"
            keys="⌘Z"
            disabled={!commandEnabled('undo')}
            onClick={run('undo')}
          />
          <IconButton
            icon="redo"
            label="Redo"
            keys="⇧⌘Z"
            disabled={!commandEnabled('redo')}
            onClick={run('redo')}
          />
          <button
            type="button"
            class="button ghost"
            title="Duplicate, group, align, pin, delete"
            aria-haspopup="menu"
            aria-expanded={menuOpen('edit')}
            onClick={menuButton('edit')}
          >
            Edit
            <Icon name="chevron" />
          </button>
          <IconButton
            icon="layers"
            label="Build from a list"
            keys="B"
            onClick={run('quick-build')}
          />
        </div>

        <span class="grow" />

        <div class="toolbar-group layout-group">
          <select
            class="algorithm-select"
            aria-label="Layout approach"
            disabled={locked()}
            onChange={e =>
              updateLayoutSettings({ algorithm: e.currentTarget.value as LayoutAlgorithmId })
            }
          >
            <optgroup label="Nested systems">
              <For each={LayoutLab.algorithms.filter(a => NESTED.includes(a.id))}>
                {a => (
                  <option value={a.id} selected={a.id === doc.settings.algorithm}>
                    {a.name}
                  </option>
                )}
              </For>
            </optgroup>
            <For each={LayoutLab.algorithms.filter(a => !NESTED.includes(a.id))}>
              {a => (
                <option value={a.id} selected={a.id === doc.settings.algorithm}>
                  {a.name}
                </option>
              )}
            </For>
          </select>
          <div class="split-button">
            <Show
              when={!layoutBusy()}
              fallback={
                <button type="button" class="button danger" onClick={cancelLayout}>
                  Cancel
                </button>
              }
            >
              <button
                type="button"
                class="button primary"
                title="Improve layout · L"
                disabled={locked() || !commandEnabled('layout')}
                onClick={run('layout')}
              >
                <Icon name="layout" />
                <span class="label keep">Improve</span>
                <kbd>L</kbd>
              </button>
            </Show>
            <IconButton
              variant="primary"
              icon="chevron"
              label="Layout options"
              keys="⌥L"
              aria-expanded={layoutLabOpen()}
              onClick={run('layout-menu')}
            />
          </div>
          <button
            type="button"
            class="button ghost"
            title="Layout timeline · ⌥T"
            aria-pressed={timelineOpen()}
            onClick={run('timeline-toggle')}
          >
            <Icon name="journey" />
            <span class="label">Timeline</span>
          </button>
          <IconButton
            icon="brush"
            label="Layout brush"
            keys="W"
            pressed={brushActive()}
            onClick={run('brush-toggle')}
          />
          <button
            type="button"
            class="button ghost"
            title="Compare layouts and routing parameters · ⌥E"
            onClick={run('compare-layouts')}
          >
            <Icon name="compare" />
            <span class="label">Compare</span>
          </button>
          <div class="split-button">
            <IconButton
              icon="branch"
              label="Reroute connections"
              keys="⌥R"
              onClick={run('reroute')}
            />
            <IconButton
              icon="chevron"
              label="Routing options"
              aria-haspopup="menu"
              aria-expanded={menuOpen('routing')}
              onClick={menuButton('routing')}
            />
          </div>
        </div>
      </div>

      <div class="toolbar-group">
        <IconButton
          icon="panel-left"
          label="Objects"
          keys="["
          pressed={objectsOpen()}
          onClick={run('toggle-objects')}
        />
        <IconButton
          icon="panel-right"
          label="Inspector"
          keys="]"
          pressed={inspectorOpen()}
          onClick={run('toggle-inspector')}
        />
        <IconButton icon="help" label="Keyboard shortcuts" keys="?" onClick={run('help')} />
        <button
          type="button"
          class="button ghost"
          aria-haspopup="menu"
          aria-expanded={menuOpen('export')}
          onClick={menuButton('export')}
        >
          <Icon name="export" />
          <span class="label">Export</span>
        </button>
      </div>
    </header>
  );
}

function ToolButtons(props: { tools: [Tool, string, string, string][]; disabled: boolean }) {
  return (
    <For each={props.tools}>
      {([id, icon, label, key]) => (
        <IconButton
          icon={icon}
          label={label}
          keys={key}
          pressed={tool() === id}
          disabled={props.disabled}
          onClick={() => setTool(id)}
        />
      )}
    </For>
  );
}

/** Editable diagram title. Commits on Enter or when focus leaves. */
function DocumentTitle() {
  const [draft, setDraft] = createSignal(doc.title);
  let editing = false;
  createEffect(() => {
    const title = doc.title;
    if (!editing) setDraft(title);
  });
  const commit = () => {
    editing = false;
    const title = draft().trim() || 'Untitled diagram';
    setDraft(title);
    if (title !== doc.title)
      transact('Rename diagram', d => {
        d.title = title;
      });
  };
  const status = () =>
    fileMode()
      ? fileStatusText()
      : {
          saved: 'Saved',
          saving: 'Saving…',
          preview: 'Preview · not saved',
          failed: 'Not saved · export a backup',
        }[saveStatus()];
  return (
    <div class="title-block">
      <input
        class="title-input"
        aria-label="Diagram title"
        spellcheck={false}
        value={draft()}
        disabled={timelineOpen()}
        onFocus={() => (editing = true)}
        onInput={e => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
            (document.querySelector('.canvas') as SVGElement | null)?.focus();
          }
        }}
      />
      <span
        class="save-status"
        classList={{
          warning: fileMode()
            ? fileStatus() !== 'saved' && fileStatus() !== 'saving'
            : saveStatus() === 'failed',
        }}
        aria-live="polite"
      >
        {status()}
      </span>
    </div>
  );
}
