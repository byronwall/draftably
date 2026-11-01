import { createEffect, createSignal, For, Show } from 'solid-js';
import { setTool } from '../state/actions';
import { commandEnabled, runCommand, type CommandId } from '../state/commands';
import { doc, saveStatus, transact } from '../state/document';
import {
  exampleMode,
  fileMode,
  fileSession,
  fileStatus,
  fileStatusText,
} from '../state/file-session';
import { tool, type Tool } from '../state/editor';
import { layoutBusy, layoutTarget, cancelLayout } from '../state/layout';
import { brushActive, timelineOpen } from '../state/sculpt';
import { filesShown, inspectorOpen, menu, objectsOpen, openMenu } from '../state/ui';
import { AppNav, Brand } from './Brand';
import { startUrl, workspace } from '../state/launch';
import { CommandButton, IconButton, tip } from './controls';
import { Icon } from './Icon';
import { MenuBar } from './MenuBar';
import './toolbar.css';

type ToolInfo = [Tool, string, string, string, string];

const NAV_TOOLS: ToolInfo[] = [
  ['select', 'cursor', 'Select', 'V', 'Click to select, drag to move. Dragging empty space pans.'],
  ['pan', 'hand', 'Pan', 'H', 'Drag anywhere to move around. Nothing can be edited by accident.'],
];
const DRAW_TOOLS: ToolInfo[] = [
  ['box', 'box', 'Rectangle', 'R', 'Click or drag on the canvas to add a rectangle.'],
  ['diamond', 'diamond', 'Diamond', 'D', 'Click or drag to add a decision diamond.'],
  ['circle', 'circle', 'Ellipse', 'O', 'Click or drag to add an ellipse.'],
  ['text', 'text', 'Text', 'T', 'Click to add a label with no box.'],
  ['container', 'group', 'Container', 'G', 'Drag around shapes to group them in a frame.'],
  ['connect', 'connect', 'Connect', 'C', 'Click one shape, then another, to draw a line.'],
];

export function Toolbar() {
  const locked = () => timelineOpen();
  const run = (id: CommandId) => () => runCommand(id);
  const menuButton = (id: Parameters<typeof openMenu>[0]) => (e: MouseEvent) =>
    openMenu(id, e.currentTarget as HTMLElement);
  const menuOpen = (id: string) => menu()?.id === id;

  return (
    <header class="toolbar">
      <div class="toolbar-group">
        <Brand />
        <span class="divider" />
        <DocumentTitle />
        <MenuBar />
      </div>

      <div class="toolbar-scroll">
        <div class="toolbar-group" role="toolbar" aria-label="Drawing tools">
          <ToolButtons tools={NAV_TOOLS} disabled={locked()} />
          <span class="divider" />
          <ToolButtons tools={DRAW_TOOLS} disabled={locked()} />
          <span class="divider" />
          <CommandButton command="brush-toggle" pressed={brushActive()} />
        </div>
        <span class="divider" />
        <div class="toolbar-group">
          <CommandButton command="undo" />
          <CommandButton command="redo" />
        </div>

        <span class="grow" />

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
            {...tip('Tidy positions', 'L', `Small moves in ${layoutTarget()}. Undo restores them.`)}
            disabled={locked() || !commandEnabled('layout')}
            onClick={run('layout')}
          >
            <Icon name="layout" />
            Tidy positions
          </button>
        </Show>
      </div>

      <div class="toolbar-group toolbar-panels">
        <AppNav />
        <CommandButton command="palette" />
        <IconButton
          icon="palette"
          label="Appearance"
          hint="Choose the diagram's theme and node padding."
          aria-haspopup="menu"
          aria-expanded={menuOpen('appearance')}
          onClick={menuButton('appearance')}
        />
        <Show when={workspace()}>
          <CommandButton command="toggle-files" pressed={filesShown()} />
        </Show>
        <CommandButton command="toggle-objects" pressed={objectsOpen()} />
        <CommandButton command="toggle-inspector" pressed={inspectorOpen()} />
        <button
          type="button"
          class="button ghost"
          aria-label="Save and export"
          {...tip(
            'Save and export',
            undefined,
            'Save the file, copy an image or export a picture.',
          )}
          aria-haspopup="menu"
          aria-expanded={menuOpen('export')}
          onClick={menuButton('export')}
        >
          <Icon name="export" />
          <span class="label">Export</span>
        </button>
      </div>
      <div class="mobile-tools" role="toolbar" aria-label="Common tools">
        <button type="button" class="button ghost" onClick={run('add-node')} disabled={locked()}>
          <Icon name="plus" />
          Add
        </button>
        <button
          type="button"
          class="button ghost"
          aria-pressed={tool() === 'connect'}
          disabled={locked()}
          onClick={() => setTool(tool() === 'connect' ? 'select' : 'connect')}
        >
          <Icon name="connect" />
          Connect
        </button>
        <button
          type="button"
          class="button ghost"
          aria-pressed={inspectorOpen()}
          onClick={run('toggle-inspector')}
        >
          <Icon name="sliders" />
          Properties
        </button>
        <button type="button" class="button ghost" onClick={run('fit')}>
          <Icon name="fit" />
          Fit
        </button>
        <button
          type="button"
          class="button ghost"
          aria-haspopup="menu"
          aria-expanded={menuOpen('tools')}
          onClick={menuButton('tools')}
        >
          <Icon name="menu" />
          More
        </button>
      </div>
    </header>
  );
}

function ToolButtons(props: { tools: ToolInfo[]; disabled: boolean }) {
  return (
    <For each={props.tools}>
      {([id, icon, label, key, hint]) => (
        <IconButton
          icon={icon}
          label={label}
          keys={key}
          hint={hint}
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
        {...(fileSession()?.path ? tip(fileSession()!.path!, undefined, status()) : {})}
        classList={{
          'on-disk': fileMode() && !exampleMode(),
          'in-example': exampleMode(),
          warning: fileMode()
            ? fileStatus() !== 'saved' && fileStatus() !== 'saving'
            : saveStatus() === 'failed',
        }}
        aria-live="polite"
      >
        <Show when={fileMode()}>
          <Icon name={exampleMode() ? 'spark' : 'file'} size={11} />
        </Show>
        <Show when={fileMode() && !exampleMode() && workspace()}>
          {info => (
            <>
              <a
                class="status-folder"
                href={startUrl()}
                {...tip(`All diagrams in ${info().name}`, undefined, info().root)}
              >
                {info().name}
              </a>
              {' / '}
            </>
          )}
        </Show>
        {status()}
      </span>
    </div>
  );
}
