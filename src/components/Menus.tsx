import { For, Match, onCleanup, onMount, Show, Switch, type JSX } from 'solid-js';
import { RouteLab } from '../engines/routing-engine.js';
import { clamp } from '../model/geometry';
import { SAMPLES } from '../model/samples';
import type { RoutingSettings } from '../model/types';
import { openSample, setTool } from '../state/actions';
import type { Tool } from '../state/editor';
import { timelineOpen } from '../state/sculpt';
import { commandEnabled, commands, runCommand, type CommandId } from '../state/commands';
import { commit, doc, setDoc, snapshot } from '../state/document';
import { commitSource, fileBlocked, fileMode, sourceWithRouting } from '../state/file-session';
import { resetRoutes, routingReport } from '../state/scene';
import { toast } from '../state/toast';
import { closeMenu, menu, openMenu, type MenuState } from '../state/ui';
import { RangeField } from './controls';
import { Icon } from './Icon';
import './menus.css';

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
      left = props.state.id === 'file' ? r.left : r.right - width;
      top = r.bottom + 6;
    } else {
      left = anchor.x;
      top = anchor.y;
    }
    el.style.left = clamp(left, 8, innerWidth - width - 8) + 'px';
    el.style.top = clamp(top, 8, innerHeight - height - 8) + 'px';
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
      classList={{ wide: props.state.id === 'routing' }}
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
        <Match when={props.state.id === 'export'}>
          <ExportMenu />
        </Match>
        <Match when={props.state.id === 'routing'}>
          <RoutingMenu />
        </Match>
        <Match when={props.state.id === 'tools'}>
          <ToolsMenu anchor={props.state.anchor} />
        </Match>
      </Switch>
    </div>
  );
}

const MORE_TOOLS: [Tool, string, string][] = [
  ['select', 'cursor', 'Select'],
  ['pan', 'hand', 'Navigate'],
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
        <MenuItem command="undo" />
        <MenuItem command="redo" />
        <button type="button" class="menu-item" role="menuitem" onClick={submenu('edit')}>
          Edit selection…
        </button>
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
        <MenuItem command="add-connected" />
        <MenuItem command="quick-build" />
        <hr />
        <MenuItem command="layout" label="Tidy positions" />
        <MenuItem command="layout-menu" label="Automatic layout…" />
        <MenuItem command="timeline-toggle" />
        <MenuItem command="brush-toggle" />
        <MenuItem command="compare-layouts" />
        <MenuItem command="reroute" />
        <button type="button" class="menu-item" role="menuitem" onClick={submenu('routing')}>
          Routing options…
        </button>
        <MenuItem command="toggle-objects" />
        <MenuItem command="help" />
      </div>
    </>
  );
}

function MenuItem(props: { command: CommandId; label?: string }) {
  const command = () => commands[props.command] as { label: string; keys?: string; icon?: string };
  return (
    <button
      type="button"
      class="menu-item"
      role="menuitem"
      disabled={!commandEnabled(props.command)}
      onClick={() => {
        closeMenu();
        runCommand(props.command);
      }}
    >
      <span class="menu-icon">
        <Show when={command().icon}>{icon => <Icon name={icon()} />}</Show>
      </span>
      <span class="menu-label">{props.label ?? command().label}</span>
      <Show when={command().keys}>
        <kbd>{command().keys}</kbd>
      </Show>
    </button>
  );
}

const Heading = (props: { children: JSX.Element }) => (
  <div class="menu-heading">{props.children}</div>
);

function FileMenu() {
  return (
    <>
      <MenuItem command="start" />
      <MenuItem command="new-diagram" />
      <MenuItem command="quick-build" />
      <MenuItem command="open" />
      <MenuItem command="insert-image" />
      <hr />
      <MenuItem command="timeline-reopen" />
      <MenuItem command="timeline-save" />
      <hr />
      <Heading>Layout test cases</Heading>
      <div class="menu-scroll">
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
      </div>
      <hr />
      <MenuItem command="theme" />
      <MenuItem command="help" />
    </>
  );
}

function EditMenu() {
  return (
    <>
      <MenuItem command="quick-build" />
      <MenuItem command="add-node" />
      <MenuItem command="add-connected" />
      <hr />
      <MenuItem command="duplicate" />
      <MenuItem command="group" />
      <MenuItem command="ungroup" />
      <MenuItem command="reflow-group" />
      <MenuItem command="pin" />
      <MenuItem command="release-manual" />
      <MenuItem command="delete" />
      <hr />
      <Heading>Arrange selection</Heading>
      <MenuItem command="align-left" />
      <MenuItem command="align-top" />
      <MenuItem command="align-center" />
      <MenuItem command="align-middle" />
      <MenuItem command="distribute-x" />
      <MenuItem command="distribute-y" />
    </>
  );
}

function ExportMenu() {
  return (
    <>
      <MenuItem command="export-json" />
      <MenuItem command="export-svg" />
      <MenuItem command="export-png" />
      <p class="menu-note">Saved diagrams and exported SVGs remain editable. PNG is image-only.</p>
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
