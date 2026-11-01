import { createSignal, For, Match, onCleanup, onMount, Show, Switch, type JSX } from 'solid-js';
import { RouteLab } from '../engines/routing-engine.js';
import { clamp } from '../model/geometry';
import { EXAMPLES } from '../model/examples';
import { SAMPLES } from '../model/samples';
import type { RoutingSettings } from '../model/types';
import {
  OVERRIDE_LIMITS,
  PRESETS,
  resolveAppearance,
  swatchFor,
  THEME_IDS,
  type ThemeId,
} from '../model/appearance';
import { chooseTheme, openSample, setAppearanceOverrides, setTool } from '../state/actions';
import type { Tool } from '../state/editor';
import { layoutTarget } from '../state/layout';
import { timelineOpen } from '../state/sculpt';
import { commandEnabled, commands, runCommand, type CommandId } from '../state/commands';
import { commit, doc, setDoc, snapshot } from '../state/document';
import {
  commitSource,
  fileBlocked,
  fileMode,
  fileSession,
  sourceWithRouting,
} from '../state/file-session';
import { resetRoutes, routingReport } from '../state/scene';
import { toast } from '../state/toast';
import {
  closeMenu,
  filesShown,
  inspectorOpen,
  menu,
  objectsOpen,
  openMenu,
  type MenuState,
} from '../state/ui';
import { RangeField, tip } from './controls';
import { FileTime } from './FilesPanel';
import { Icon } from './Icon';
import './menus.css';
import { exampleUrl, fileUrl, go, workspace } from '../state/launch';
import { baseName } from './workspace-files';

/** The open popover menu, positioned under its anchor. */
export function Menus() {
  return (
    <Show when={menu()} keyed>
      {state => <Popover state={state} />}
    </Show>
  );
}

function Popover(props: { state: MenuState }) {
  let el!: HTMLDivElement;
  // The popover is keyed on its state, so the anchor never changes while it is open.
  // eslint-disable-next-line solid/reactivity
  const anchor = props.state.anchor;
  const returnFocus = anchor instanceof HTMLElement ? anchor : null;

  onMount(() => {
    const width = el.offsetWidth,
      height = el.offsetHeight;
    let left: number, top: number;
    if (anchor instanceof HTMLElement) {
      const r = anchor.getBoundingClientRect();
      left = anchor.closest('.menubar') ? r.left : r.right - width;
      top = r.bottom + 4;
    } else {
      left = anchor.x;
      top = anchor.y;
    }
    el.style.left = clamp(left, 8, innerWidth - width - 8) + 'px';
    top = clamp(top, 8, innerHeight - height - 8);
    el.style.top = top + 'px';
    // A section opened later (the layout test cases) scrolls inside the menu, not off screen.
    el.style.maxHeight = innerHeight - top - 8 + 'px';
    el.querySelector<HTMLElement>('button,input,select')?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!el.contains(target) && !(returnFocus && returnFocus.contains(target))) closeMenu();
    };
    document.addEventListener('pointerdown', outside, true);
    onCleanup(() => {
      document.removeEventListener('pointerdown', outside, true);
      if (el.contains(document.activeElement)) returnFocus?.focus({ preventScroll: true });
    });
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      return;
    }
    const target = e.target as HTMLElement;
    // Left and right walk the menu bar, as they do in a desktop app.
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && anchor instanceof HTMLElement) {
      const items = [...(anchor.closest('.menubar')?.querySelectorAll('button') ?? [])];
      const next =
        items[
          (items.indexOf(anchor as HTMLButtonElement) +
            (e.key === 'ArrowRight' ? 1 : -1) +
            items.length) %
            items.length
        ];
      if (next && items.length) {
        e.preventDefault();
        next.click();
        return;
      }
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && target.tagName === 'BUTTON') {
      e.preventDefault();
      const items = [...el.querySelectorAll<HTMLElement>('button:not(:disabled),input,select')],
        i = items.indexOf(target);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div
      ref={el}
      class="popover"
      classList={{
        wide: ['routing', 'appearance', 'tools', 'file', 'layout'].includes(props.state.id),
      }}
      role="menu"
      onKeyDown={onKeyDown}
    >
      <Switch>
        <Match when={props.state.id === 'file'}>
          <FileMenu />
        </Match>
        <Match when={props.state.id === 'edit' || props.state.id === 'context'}>
          <EditMenu />
        </Match>
        <Match when={props.state.id === 'view'}>
          <ViewMenu />
        </Match>
        <Match when={props.state.id === 'layout'}>
          <LayoutMenu />
        </Match>
        <Match when={props.state.id === 'help'}>
          <HelpMenu />
        </Match>
        <Match when={props.state.id === 'export'}>
          <ExportMenu />
        </Match>
        <Match when={props.state.id === 'routing'}>
          <RoutingMenu />
        </Match>
        <Match when={props.state.id === 'appearance'}>
          <AppearanceMenu />
        </Match>
        <Match when={props.state.id === 'tools'}>
          <ToolsMenu anchor={props.state.anchor} />
        </Match>
      </Switch>
    </div>
  );
}

/** The layout actions, each saying what it changes and how to reverse it. */
function LayoutItems() {
  return (
    <>
      <MenuItem
        command="layout"
        label="Tidy positions"
        note={`Small moves in ${layoutTarget()}. Undo restores.`}
      />
      <MenuItem
        command="layout-menu"
        label="Automatic layout…"
        note="A new arrangement to preview. Undo restores."
      />
      <MenuItem command="timeline-toggle" note="Steps from the current drawing. Undo restores." />
      <MenuItem command="brush-toggle" note="Paint over shapes to move them. Undo restores." />
      <MenuItem command="compare-layouts" note="Preview only until you Apply. Undo restores." />
      <MenuItem command="reroute" note="Redraws connections. Shapes stay." />
    </>
  );
}

const MORE_TOOLS: [Tool, string, string][] = [
  ['select', 'cursor', 'Select'],
  ['pan', 'hand', 'Pan'],
  ['box', 'box', 'Rectangle'],
  ['diamond', 'diamond', 'Diamond'],
  ['circle', 'circle', 'Ellipse'],
  ['text', 'text', 'Text'],
  ['container', 'group', 'Container'],
];

function ToolsMenu(props: { anchor: MenuState['anchor'] }) {
  const submenu = (id: MenuState['id']) => () => openMenu(id, props.anchor);
  return (
    <>
      <div class="menu-scroll">
        <For each={['file', 'edit', 'view', 'layout', 'help'] as const}>
          {id => (
            <button type="button" class="menu-item" role="menuitem" onClick={submenu(id)}>
              <span class="menu-label">{id[0].toUpperCase() + id.slice(1)}</span>
              <Icon name="chevron-right" />
            </button>
          )}
        </For>
        <hr />
        <For each={MORE_TOOLS}>
          {([tool, icon, label]) => (
            <button
              type="button"
              class="menu-item"
              role="menuitem"
              disabled={timelineOpen()}
              onClick={() => {
                closeMenu();
                setTool(tool);
              }}
            >
              <span class="menu-icon">
                <Icon name={icon} />
              </span>
              <span class="menu-label">{label}</span>
            </button>
          )}
        </For>
      </div>
    </>
  );
}

function MenuItem(props: { command: CommandId; label?: string; note?: string; checked?: boolean }) {
  const command = () => commands[props.command] as { label: string; keys?: string; icon?: string };
  return (
    <button
      type="button"
      class="menu-item"
      classList={{ 'has-note': !!props.note }}
      role={props.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={props.checked}
      disabled={!commandEnabled(props.command)}
      onClick={() => {
        closeMenu();
        runCommand(props.command);
      }}
    >
      <span class="menu-icon">
        <Show when={props.checked ? 'check' : command().icon}>
          {icon => <Icon name={icon()} />}
        </Show>
      </span>
      <span class="menu-label">
        {props.label ?? command().label}
        <Show when={props.note}>
          <small class="menu-note">{props.note}</small>
        </Show>
      </span>
      <Show when={command().keys}>
        <kbd>{command().keys}</kbd>
      </Show>
    </button>
  );
}

const Heading = (props: { children: JSX.Element }) => (
  <div class="menu-heading">{props.children}</div>
);

/** Hands over to another menu, anchored where that menu usually opens. */
const openFrom = (id: MenuState['id'], selector: string) => () => {
  const anchor = document.querySelector<HTMLElement>(selector);
  if (anchor) openMenu(id, anchor);
};

/** A row that opens a list beside the menu, on hover, click or the right arrow key. */
function Submenu(props: { label: string; icon: string; children: JSX.Element }) {
  const [rect, setRect] = createSignal<DOMRect | null>(null);
  let row!: HTMLButtonElement;
  let timer = 0;
  const open = () => setRect(row.getBoundingClientRect());
  const close = () => {
    setRect(null);
    row.focus({ preventScroll: true });
  };
  onCleanup(() => clearTimeout(timer));

  const place = (el: HTMLDivElement, at: DOMRect) => {
    const width = el.offsetWidth;
    const right = at.right + 4 + width < innerWidth - 8;
    el.style.left = `${right ? at.right + 4 : at.left - width - 4}px`;
    const top = clamp(at.top - 6, 8, innerHeight - el.offsetHeight - 8);
    el.style.top = `${top}px`;
    el.style.maxHeight = `${innerHeight - top - 8}px`;
    el.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const el = e.currentTarget as HTMLElement;
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === 'ArrowLeft') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...el.querySelectorAll<HTMLElement>('button:not(:disabled)')];
      const i = items.indexOf(e.target as HTMLElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div
      onPointerEnter={() => {
        clearTimeout(timer);
        timer = window.setTimeout(open, 90);
      }}
      onPointerLeave={() => {
        clearTimeout(timer);
        timer = window.setTimeout(() => setRect(null), 200);
      }}
    >
      <button
        ref={row}
        type="button"
        class="menu-item submenu-row"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={!!rect()}
        onClick={open}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            open();
          }
        }}
      >
        <span class="menu-icon">
          <Icon name={props.icon} />
        </span>
        <span class="menu-label">{props.label}</span>
        <Icon name="chevron-right" />
      </button>
      <Show when={rect()} keyed>
        {at => (
          <div
            ref={el => queueMicrotask(() => place(el, at))}
            class="popover flyout"
            role="menu"
            onKeyDown={onKeyDown}
          >
            {props.children}
          </div>
        )}
      </Show>
    </div>
  );
}

function ExamplesSubmenu() {
  return (
    <Submenu label="Examples" icon="spark">
      <p class="menu-note">Opens a scratch copy. Nothing in a folder changes.</p>
      <For each={EXAMPLES}>
        {example => (
          <button
            type="button"
            class="menu-item"
            role="menuitem"
            aria-current={fileSession()?.example === example.id || undefined}
            {...tip(example.title, undefined, example.summary)}
            onClick={() => {
              closeMenu();
              location.assign(exampleUrl(example.id));
            }}
          >
            <span class="menu-label">{example.title}</span>
          </button>
        )}
      </For>
    </Submenu>
  );
}

/** The newest diagrams in the folder, leaving out the one already open. */
function RecentFiles() {
  const files = () =>
    [...(workspace()?.files ?? [])]
      .filter(f => f.path !== fileSession()?.file)
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 5);
  return (
    <Show when={files().length}>
      <Heading>Recent in {workspace()?.name}</Heading>
      <For each={files()}>
        {file => (
          <button
            type="button"
            class="menu-item"
            role="menuitem"
            {...tip(file.title || baseName(file.path), undefined, file.path)}
            onClick={() => {
              closeMenu();
              void go(fileUrl(file.path));
            }}
          >
            <span class="menu-icon">
              <Icon name="file" />
            </span>
            <span class="menu-label">{file.title || baseName(file.path)}</span>
            <FileTime modified={file.modified} short />
          </button>
        )}
      </For>
      <hr />
    </Show>
  );
}

/**
 * File shows what works where you are. A served folder creates and moves between its own files, so
 * it has no file dialog. Without a folder the diagram lives in the browser and comes and goes
 * through files you pick.
 */
function FileMenu() {
  return (
    <>
      <MenuItem command="new-diagram" />
      <Show when={commandEnabled('save-example')}>
        <MenuItem command="save-example" />
      </Show>
      <Show
        when={workspace()}
        fallback={
          <>
            <Show when={!fileMode()}>
              <MenuItem command="open" />
              <MenuItem command="insert-image" />
              <MenuItem command="export-json" />
            </Show>
            <MenuItem command="start" />
          </>
        }
      >
        {info => (
          <>
            <MenuItem command="find-file" />
            <MenuItem command="start" label={`All diagrams in ${info().name}`} />
          </>
        )}
      </Show>
      <MenuItem command="import-diagram" />
      <hr />
      <Show when={workspace()}>
        <RecentFiles />
      </Show>
      <button
        type="button"
        class="menu-item"
        role="menuitem"
        onClick={openFrom('export', '[aria-label="Save and export"]')}
      >
        <span class="menu-icon">
          <Icon name="export" />
        </span>
        <span class="menu-label">Export and copy…</span>
      </button>
      <Show when={workspace()}>
        <MenuItem command="export-folder" />
      </Show>
      <MenuItem command="open-playground" />
      <hr />
      <ExamplesSubmenu />
    </>
  );
}

function EditMenu() {
  return (
    <>
      <MenuItem command="undo" />
      <MenuItem command="redo" />
      <hr />
      <MenuItem command="add-node" />
      <MenuItem command="add-connected" />
      <MenuItem command="quick-build" />
      <hr />
      <MenuItem command="duplicate" />
      <MenuItem command="copy-image" />
      <MenuItem command="group" />
      <MenuItem command="ungroup" />
      <MenuItem command="reflow-group" />
      <MenuItem command="pin" />
      <MenuItem command="release-manual" />
      <Submenu label="Align and distribute" icon="layout">
        <MenuItem command="align-left" />
        <MenuItem command="align-top" />
        <MenuItem command="align-center" />
        <MenuItem command="align-middle" />
        <MenuItem command="distribute-x" />
        <MenuItem command="distribute-y" />
      </Submenu>
      <hr />
      <MenuItem command="delete" />
    </>
  );
}

function ViewMenu() {
  return (
    <>
      <Show when={workspace()}>
        <MenuItem command="toggle-files" checked={filesShown()} />
      </Show>
      <MenuItem command="toggle-objects" checked={objectsOpen()} />
      <MenuItem command="toggle-inspector" checked={inspectorOpen()} />
      <MenuItem command="toggle-panels" />
      <hr />
      <MenuItem command="fit" />
      <MenuItem command="reset-camera" />
      <MenuItem command="zoom-in" />
      <MenuItem command="zoom-out" />
      <hr />
      <button
        type="button"
        class="menu-item"
        role="menuitem"
        onClick={openFrom('appearance', '[aria-label="Appearance"]')}
      >
        <span class="menu-icon">
          <Icon name="palette" />
        </span>
        <span class="menu-label">Diagram theme…</span>
      </button>
      <MenuItem command="theme" />
    </>
  );
}

function LayoutMenu() {
  return (
    <>
      <LayoutItems />
      <hr />
      <button
        type="button"
        class="menu-item"
        role="menuitem"
        onClick={openFrom('routing', '.menubar [aria-expanded="true"]')}
      >
        <span class="menu-icon">
          <Icon name="branch" />
        </span>
        <span class="menu-label">Routing options…</span>
      </button>
      <MenuItem command="compare-routes" />
      <hr />
      <MenuItem command="timeline-reopen" />
      <MenuItem command="timeline-save" />
    </>
  );
}

function HelpMenu() {
  return (
    <>
      <MenuItem command="palette" />
      <MenuItem command="help" />
      <MenuItem command="home" />
      <MenuItem command="docs" />
      <hr />
      <Submenu label="Layout test cases" icon="layers">
        <For each={SAMPLES}>
          {sample => (
            <button
              type="button"
              class="menu-item"
              role="menuitem"
              onClick={() => {
                closeMenu();
                openSample(sample.id);
              }}
            >
              <span class="menu-icon">
                <Icon name={sample.icon} />
              </span>
              <span class="menu-label">{sample.title}</span>
            </button>
          )}
        </For>
      </Submenu>
    </>
  );
}

function ExportMenu() {
  return (
    <>
      <MenuItem command="export-json" />
      <hr />
      <MenuItem command="copy-image" />
      <Heading>Copy as</Heading>
      <MenuItem command="copy-svg" />
      <Show when={fileMode()}>
        <MenuItem command="copy-source" />
        <MenuItem command="copy-link" />
      </Show>
      <hr />
      <MenuItem command="export-png" />
      <MenuItem command="export-svg" />
      <Show when={fileMode() && workspace()}>
        <MenuItem command="export-pdf" />
      </Show>
      <p class="menu-note">
        {fileMode()
          ? 'Copy takes the selection when something is selected. An image with its source opens again as an editable diagram.'
          : 'Copy takes the selection when something is selected. Saved diagrams and exported SVGs remain editable.'}
      </p>
    </>
  );
}

const ROUTING_FIELDS: [keyof RoutingSettings, string, number, number, string][] = [
  ['crossingPenalty', 'Crossing cost', 0, 1200, 'Higher values prefer detours over crossings.'],
  ['bendPenalty', 'Bend cost', 0, 100, 'Higher values prefer simpler routes.'],
  ['clearance', 'Shape clearance', 4, 30, 'World pixels around shapes and unrelated containers.'],
  [
    'edgeGap',
    'Parallel edge gap',
    4,
    48,
    'Preferred buffer between parallel runs, independent of port spacing.',
  ],
  [
    'parallelPenalty',
    'Lane separation cost',
    0,
    60,
    'Higher values spend more route length to keep lanes apart.',
  ],
  [
    'cornerRadius',
    'Corner radius',
    0,
    16,
    'Rounded orthogonal corners; zero keeps square corners.',
  ],
  ['portGap', 'Port spacing', 6, 28, 'Minimum preferred separation on a shape side.'],
  [
    'fanoutPenalty',
    'Spread fan-out',
    0,
    160,
    'Prefer different sides for independent branches when the detour is short.',
  ],
  [
    'portStability',
    'Keep previous sides',
    0,
    150,
    'Damps port switching; never locks an automatic side.',
  ],
];
const ADVANCED_ROUTING: typeof ROUTING_FIELDS = [
  [
    'sharedPenalty',
    'Shared-path cost',
    0,
    20,
    'Penalty per world pixel of a reused route segment.',
  ],
  [
    'passes',
    'Routing passes',
    1,
    5,
    'One initial routing pass, followed by up to four conflict-repair passes.',
  ],
];

/** Routing settings are undoable edits: they change how every connection is drawn. */
function setRouting(patch: Partial<RoutingSettings>, label: string, reset = false) {
  const next = RouteLab.settings(
    reset ? { ...RouteLab.defaults, ...patch } : { ...doc.settings.routing, ...patch },
  );
  // A diagram file stores router settings in its `routing` line.
  if (fileMode()) {
    const blocked = fileBlocked();
    if (blocked) return toast(blocked);
    void commitSource(sourceWithRouting(next), label, 'routing');
    return;
  }
  const before = snapshot();
  setDoc('settings', 'routing', next);
  resetRoutes();
  commit(before, label);
}

function RoutingMenu() {
  const report = () => routingReport();
  const field = ([key, label, min, max, hint]: (typeof ROUTING_FIELDS)[number]) => (
    <RangeField
      label={label}
      min={min}
      max={max}
      hint={hint}
      value={doc.settings.routing[key]}
      onChange={value => setRouting({ [key]: value }, 'Change routing settings')}
    />
  );
  return (
    <div class="routing-menu">
      <Heading>Automatic connections</Heading>
      <p class="menu-note">Choose source and target sides together. Shapes never move.</p>
      <div class="button-row">
        <button
          type="button"
          class="button"
          onClick={() => setRouting({}, 'Change routing preset', true)}
        >
          Balanced
        </button>
        <button
          type="button"
          class="button"
          onClick={() =>
            setRouting(
              { crossingPenalty: 900, sharedPenalty: 9, portStability: 10 },
              'Change routing preset',
              true,
            )
          }
        >
          Fewer crossings
        </button>
      </div>
      <For each={ROUTING_FIELDS}>{field}</For>
      <details>
        <summary>Advanced routing</summary>
        <For each={ADVANCED_ROUTING}>{field}</For>
      </details>
      <button
        type="button"
        class="button primary full"
        onClick={() => {
          closeMenu();
          runCommand('compare-routes');
        }}
      >
        Compare ports & routes
      </button>
      <button type="button" class="button full" onClick={() => runCommand('reroute')}>
        Reroute now <kbd>⌥R</kbd>
      </button>
      <button type="button" class="button ghost full" onClick={() => runCommand('auto-ports')}>
        Use auto ports on selection
      </button>
      <p class="menu-note">
        {report().crossings} crossings · {report().lanePairs} close lane pairs · {report().bends}{' '}
        bends · {report().milliseconds} ms
      </p>
    </div>
  );
}

/**
 * Diagram theme and diagram-wide padding. Saved with the diagram (in a file, as its `theme`
 * line); the editor's own light or dark mode is separate.
 */
function AppearanceMenu() {
  const look = () => resolveAppearance(doc.appearance);
  const padding = (key: 'paddingX' | 'paddingY', label: string) => (
    <label class="field appearance-padding">
      <span class="field-label">{label}</span>
      <input
        type="number"
        aria-label={label}
        min={OVERRIDE_LIMITS[key].min}
        max={OVERRIDE_LIMITS[key].max}
        value={look()[key]}
        onChange={e => {
          const value = Number(e.currentTarget.value),
            { min, max } = OVERRIDE_LIMITS[key];
          if (!Number.isFinite(value)) return;
          const next = clamp(Math.round(value), min, max);
          setAppearanceOverrides({
            [key]: next === PRESETS[doc.appearance.theme][key] ? undefined : next,
          });
        }}
      />
    </label>
  );
  return (
    <div class="appearance-menu">
      <Heading>Diagram theme</Heading>
      <div role="group" aria-label="Diagram theme">
        <For each={THEME_IDS}>{id => <ThemeOption id={id} />}</For>
      </div>
      <hr />
      <Heading>Node padding</Heading>
      <div class="fields-2">
        {padding('paddingX', 'Horizontal padding')}
        {padding('paddingY', 'Vertical padding')}
      </div>
      <Show when={Object.keys(doc.appearance.overrides).length}>
        <button
          type="button"
          class="button ghost full"
          onClick={() => chooseTheme(doc.appearance.theme)}
        >
          Reset to {PRESETS[doc.appearance.theme].label} defaults
        </button>
      </Show>
      <p class="menu-note">
        {fileMode()
          ? 'Saved to the file’s theme line. Choosing a theme clears its overrides and keeps your own theme colors.'
          : 'Saved with the diagram. Choosing a theme clears its overrides and keeps your own colors.'}{' '}
        Light and dark editor mode is separate.
      </p>
    </div>
  );
}

/** One preset with a small drawing in its own colors and title type. */
function ThemeOption(props: { id: ThemeId }) {
  const preset = () => PRESETS[props.id];
  const look = () => resolveAppearance({ theme: props.id, overrides: {}, colors: [] });
  const selected = () => doc.appearance.theme === props.id;
  return (
    <button
      type="button"
      class="menu-item theme-option"
      role="menuitemradio"
      aria-checked={selected()}
      classList={{ selected: selected() }}
      onClick={() => {
        if (!selected() || Object.keys(doc.appearance.overrides).length) chooseTheme(props.id);
      }}
    >
      <svg class="theme-preview" viewBox="0 0 72 36" width="72" height="36" aria-hidden="true">
        <rect width="72" height="36" fill={look().canvas} />
        <rect
          x="4.5"
          y="8.5"
          width="28"
          height="19"
          rx={Math.min(look().radius, 6)}
          fill={look().node.fill}
          stroke={look().node.stroke}
        />
        <text
          x="18.5"
          y="18"
          text-anchor="middle"
          dominant-baseline="central"
          font-family={look().title.family}
          font-weight={String(look().title.weight)}
          font-size="10"
          fill={look().node.ink}
        >
          Aa
        </text>
        <path d="M33 18h6" stroke={look().connection} stroke-width="1.2" />
        <rect
          x="39.5"
          y="8.5"
          width="28"
          height="19"
          rx={Math.min(look().radius, 6)}
          fill={swatchFor(look(), 'primary', 700).fill}
        />
        <rect
          x="46"
          y="16"
          width="15"
          height="4"
          rx="2"
          fill={swatchFor(look(), 'secondary', 300).fill}
        />
      </svg>
      <span class="theme-text">
        <strong>{preset().label}</strong>
        <span>{preset().description}</span>
      </span>
    </button>
  );
}
