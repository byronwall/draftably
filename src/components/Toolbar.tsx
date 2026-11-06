import { createEffect, createSignal, For, Show } from 'solid-js';

import { commandEnabled, runCommand, type CommandId } from '../state/commands';

import { type Tool } from '../state/session/editor';

import {
  arrangeOpen,
  filesShown,
  menu,
  objectsOpen,
  openMenu,
  propertiesOpen,
  sourceOpen,
} from '../state/ui';
import { AppNav, Brand } from './Brand';
import { startUrl, workspace } from '../state/launch';
import { CommandButton, IconButton, tip } from './controls';
import { Icon } from './Icon';
import { MenuBar } from './MenuBar';
import './toolbar.css';
import { useDiagramSession } from './session-context';

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
  const s = useDiagramSession();
  const locked = () => s.timelineOpen();
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
        </div>
        <span class="divider" />
        <div class="toolbar-group">
          <CommandButton command="undo" />
          <CommandButton command="redo" />
        </div>

        <span class="grow" />

        <Show
          when={!s.layoutBusy()}
          fallback={
            <button type="button" class="button danger" onClick={s.cancelLayout}>
              Cancel
            </button>
          }
        >
          <button
            type="button"
            class="button primary"
            {...tip(
              'Tidy',
              'L',
              s.movesBlocked() ??
                `Small moves in ${s.layoutTarget()} that shorten long lines. Undo restores them.`,
            )}
            disabled={locked() || !commandEnabled('layout')}
            onClick={run('layout')}
          >
            <Icon name="layout" />
            Tidy
          </button>
        </Show>
        <button
          type="button"
          class="button ghost"
          aria-pressed={arrangeOpen()}
          {...tip(
            'Arrange',
            '⌥L',
            'Lay out again, or choose a direction, a format and how connections run.',
          )}
          onClick={run('layout-menu')}
        >
          Arrange
        </button>
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
        <CommandButton command="toggle-sidebar" pressed={filesShown() || objectsOpen()} />
        <CommandButton command="toggle-inspector" pressed={propertiesOpen()} />
        <CommandButton command="toggle-source" pressed={sourceOpen()} />
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
          aria-pressed={s.tool() === 'connect'}
          disabled={locked()}
          onClick={() => s.setTool(s.tool() === 'connect' ? 'select' : 'connect')}
        >
          <Icon name="connect" />
          Connect
        </button>
        <button
          type="button"
          class="button ghost"
          aria-pressed={propertiesOpen()}
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
  const s = useDiagramSession();
  return (
    <For each={props.tools}>
      {([id, icon, label, key, hint]) => (
        <IconButton
          icon={icon}
          label={label}
          keys={key}
          hint={hint}
          pressed={s.tool() === id}
          disabled={props.disabled}
          onClick={() => s.setTool(id)}
        />
      )}
    </For>
  );
}

/** Editable diagram title. Commits on Enter or when focus leaves. */
function DocumentTitle() {
  const s = useDiagramSession();
  const [draft, setDraft] = createSignal(s.doc.title);
  let editing = false;
  createEffect(() => {
    const title = s.doc.title;
    if (!editing) setDraft(title);
  });
  const commit = () => {
    editing = false;
    const title = draft().trim() || 'Untitled diagram';
    setDraft(title);
    if (title !== s.doc.title)
      s.transact('Rename diagram', d => {
        d.title = title;
      });
  };
  const status = () =>
    s.fileMode()
      ? s.fileStatusText()
      : {
          saved: 'Saved',
          saving: 'Saving…',
          preview: 'Preview · not saved',
          failed: 'Not saved · export a backup',
        }[s.saveStatus()];
  return (
    <div class="title-block">
      <input
        class="title-input"
        aria-label="Diagram title"
        spellcheck={false}
        value={draft()}
        disabled={s.timelineOpen()}
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
        {...(s.fileSession()?.path ? tip(s.fileSession()!.path!, undefined, status()) : {})}
        classList={{
          'on-disk': s.fileMode() && !s.exampleMode(),
          'in-example': s.exampleMode(),
          warning: s.fileMode()
            ? s.fileStatus() !== 'saved' && s.fileStatus() !== 'saving'
            : s.saveStatus() === 'failed',
        }}
        aria-live="polite"
      >
        <Show when={s.fileMode()}>
          <Icon name={s.exampleMode() ? 'spark' : 'file'} size={11} />
        </Show>
        <Show when={s.fileMode() && !s.exampleMode() && workspace()}>
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
