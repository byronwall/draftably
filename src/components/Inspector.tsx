import { For, Match, Show, Switch, type JSX } from 'solid-js';
import * as edits from '../model/edits';
import {
  ancestors,
  descendants,
  findEdge,
  findGroup,
  findNode,
  isGroup,
  styleOf,
} from '../model/graph';
import { nodeLabel } from '../model/labels';
import { COLOR_KEYS, colorTokens, NODE_ICONS, SHAPE_LABELS, SHAPES } from '../model/styles';
import type { ColorKey, IntentRole, LabelMode, PortSide, ShapeKind } from '../model/types';
import { setColor, setLayoutIntent } from '../state/actions';
import { runCommand, type CommandId } from '../state/commands';
import { doc, selectedIds, selectItems, transact } from '../state/document';
import { geometry, routesById } from '../state/scene';
import { timelineOpen } from '../state/sculpt';
import { setInspectorOpen } from '../state/ui';
import { Checkbox, Field, IconButton, NumberField, SelectField } from './controls';

/** Properties of the selection, or diagram-wide preferences when nothing is selected. */
export function Inspector() {
  const ids = () => selectedIds();
  return (
    <aside class="panel inspector-panel" aria-label="Inspector">
      <header class="panel-header">
        <h2>Inspector</h2>
        <IconButton
          icon="close"
          label="Close inspector"
          keys="]"
          onClick={() => setInspectorOpen(false)}
        />
      </header>
      <fieldset class="panel-scroll inspector" disabled={timelineOpen()}>
        <Switch fallback={<NothingSelected />}>
          <Match when={ids().length > 1}>
            <MultipleSelected count={ids().length} />
          </Match>
          <Match when={ids().length === 1 && findEdge(doc, ids()[0]) && ids()[0]}>
            {id => <EdgeInspector id={id()} />}
          </Match>
          <Match when={ids().length === 1 && ids()[0]}>{id => <ObjectInspector id={id()} />}</Match>
        </Switch>
      </fieldset>
      <footer class="panel-footer">
        <span>Toggle panels</span>
        <kbd>\</kbd>
      </footer>
    </aside>
  );
}

const edit = (label: string, fn: Parameters<typeof transact>[1]) => transact(label, fn);

function Section(props: { title?: string; children: JSX.Element }) {
  return (
    <section class="inspector-section">
      <Show when={props.title}>
        <h3>{props.title}</h3>
      </Show>
      {props.children}
    </section>
  );
}

function Heading(props: { title: string; pill?: string; pinned?: boolean }) {
  return (
    <div class="inspector-heading">
      <strong>{props.title}</strong>
      <Show when={props.pill}>
        <span class="pill" classList={{ accent: props.pinned }}>
          {props.pill}
        </span>
      </Show>
    </div>
  );
}

function CommandButton(props: { command: CommandId; children: JSX.Element; class?: string }) {
  return (
    <button
      type="button"
      class={`button ${props.class ?? ''}`}
      onClick={() => runCommand(props.command)}
    >
      {props.children}
    </button>
  );
}

function Swatches(props: { selected?: ColorKey }) {
  return (
    <div class="swatches" role="group" aria-label="Object color">
      <For each={COLOR_KEYS}>
        {key => (
          <button
            type="button"
            classList={{ selected: props.selected === key }}
            aria-label={key}
            aria-pressed={props.selected === key}
            title={key}
            style={{ background: colorTokens(key, doc.theme).ink }}
            onClick={() => setColor(key)}
          />
        )}
      </For>
    </div>
  );
}

function TextField(props: { label: string; value: string; onCommit: (value: string) => void }) {
  return (
    <Field label={props.label}>
      <input value={props.value} onChange={e => props.onCommit(e.currentTarget.value)} />
    </Field>
  );
}

function NothingSelected() {
  return (
    <>
      <IntentSummary />
      <div class="blank-state">
        <strong>Select a shape, connection, or container.</strong>
        <p>Its appearance and geometry will be available here.</p>
      </div>
      <Section>
        <Checkbox
          label="Snap to nearby shapes"
          checked={doc.settings.snap}
          onChange={v => edit('Edit snap', d => void (d.settings.snap = v))}
        />
        <Checkbox
          label="Show manual position badges"
          checked={doc.settings.showManual}
          onChange={v => edit('Edit showManual', d => void (d.settings.showManual = v))}
        />
      </Section>
      <div class="stack">
        <CommandButton command="layout-menu" class="full">
          Layout options
        </CommandButton>
        <CommandButton command="help" class="ghost full">
          Keyboard shortcuts <kbd>?</kbd>
        </CommandButton>
      </div>
    </>
  );
}

function MultipleSelected(props: { count: number }) {
  return (
    <>
      <Heading title={`${props.count} selected`} pill="Selection" />
      <Section>
        <div class="fields-2">
          <CommandButton command="layout">Arrange</CommandButton>
          <CommandButton command="group">Wrap container</CommandButton>
          <CommandButton command="duplicate">Duplicate</CommandButton>
          <CommandButton command="pin">Pin</CommandButton>
        </div>
      </Section>
      <Section title="Align">
        <div class="fields-2">
          <CommandButton command="align-left">Left</CommandButton>
          <CommandButton command="align-top">Top</CommandButton>
          <CommandButton command="align-center">Horizontal center</CommandButton>
          <CommandButton command="align-middle">Vertical center</CommandButton>
          <CommandButton command="distribute-x">Distribute X</CommandButton>
          <CommandButton command="distribute-y">Distribute Y</CommandButton>
        </div>
      </Section>
      <Section title="Color">
        <Swatches selected={styleOf(doc, selectedIds()[0]).color} />
      </Section>
      <CommandButton command="delete" class="danger ghost full">
        Delete selection
      </CommandButton>
    </>
  );
}

const SIDE_OPTIONS: PortSide[] = ['auto', 'left', 'right', 'top', 'bottom'];

function EdgeInspector(props: { id: string }) {
  const edge = () => findEdge(doc, props.id)!;
  const cfg = () => doc.layout.edges[props.id] || {};
  const route = () => routesById().get(props.id);
  return (
    <>
      <Heading title="Connection" />
      <Section>
        <TextField
          label="Label"
          value={edge().label}
          onCommit={v => edit('Edit label', d => edits.setEdgeLabel(d, props.id, v))}
        />
        <Checkbox
          label="Arrow"
          checked={edge().directed}
          onChange={v => edit('Edit directed', d => edits.setEdge(d, props.id, { directed: v }))}
        />
        <Checkbox
          label="Dashed"
          checked={edge().dashed}
          onChange={v => edit('Edit dashed', d => edits.setEdge(d, props.id, { dashed: v }))}
        />
        <Checkbox
          label="Emphasis"
          checked={edge().emphasis}
          onChange={v => edit('Edit emphasis', d => edits.setEdge(d, props.id, { emphasis: v }))}
        />
      </Section>
      <Section title="Ports">
        <div class="fields-2">
          <SelectField
            label="From"
            value={cfg().fromSide || 'auto'}
            options={SIDE_OPTIONS}
            onChange={v =>
              edit('Edit fromSide', d => edits.setEdgeLayout(d, props.id, { fromSide: v }))
            }
          />
          <SelectField
            label="To"
            value={cfg().toSide || 'auto'}
            options={SIDE_OPTIONS}
            onChange={v =>
              edit('Edit toSide', d => edits.setEdgeLayout(d, props.id, { toSide: v }))
            }
          />
        </div>
        <p class="hint">
          Resolved: {route()?.fromSide ?? '—'} → {route()?.toSide ?? '—'}. Auto ports can switch to
          avoid crossings.
        </p>
        <div class="fields-2">
          <CommandButton command="reverse-edge">Reverse</CommandButton>
          <CommandButton command="reset-route">Reset bends</CommandButton>
          <CommandButton command="auto-ports">Use auto ports</CommandButton>
          <CommandButton command="insert-step">Insert step · Tab</CommandButton>
        </div>
        <p class="hint">
          Double-click a line to add a bend. Double-click a bend to remove it. Alt-drag a label to
          move it.
        </p>
      </Section>
      <CommandButton command="delete" class="danger ghost full">
        Delete connection
      </CommandButton>
    </>
  );
}

function ObjectInspector(props: { id: string }) {
  const container = () => isGroup(doc, props.id);
  const object = () => findNode(doc, props.id) ?? findGroup(doc, props.id)!;
  const style = () => styleOf(doc, props.id);
  const rect = () => geometry(props.id);
  return (
    <>
      <Heading
        title={container() ? 'Container' : 'Shape'}
        pill={rect().pinned ? 'Pinned' : rect().manual ? 'Manual' : 'Automatic'}
        pinned={rect().pinned}
      />
      <Section>
        <TextField
          label="Label"
          value={object().title}
          onCommit={v => edit('Edit title', d => edits.setTitle(d, props.id, v))}
        />
        <Field label="Color">
          <Swatches selected={style().color} />
        </Field>
        <Show when={!container()}>
          <SelectField<ShapeKind>
            label="Shape"
            value={style().shape}
            options={SHAPES.map(s => [s, SHAPE_LABELS[s]] as const)}
            onChange={shape => edit('Edit shape', d => edits.setStyle(d, props.id, { shape }))}
          />
        </Show>
      </Section>
      <Section title="Position">
        <GeometryFields id={props.id} />
        <PinControl id={props.id} />
      </Section>
      <Show when={container()} fallback={<ShapeSections id={props.id} />}>
        <ContainerSections id={props.id} />
      </Show>
      <div class="fields-2">
        <CommandButton command="duplicate">Duplicate</CommandButton>
        <CommandButton command="delete" class="danger ghost">
          Delete
        </CommandButton>
      </div>
    </>
  );
}

function GeometryFields(props: { id: string }) {
  const r = () => geometry(props.id);
  const field = (label: string, key: 'x' | 'y' | 'w' | 'h') => (
    <NumberField
      label={label}
      value={Math.round(r()[key])}
      onChange={v => edit('Edit ' + key, d => edits.setGeometry(d, props.id, key, v))}
    />
  );
  return (
    <div class="fields-2">
      {field('X', 'x')}
      {field('Y', 'y')}
      {field('Width', 'w')}
      {field('Height', 'h')}
    </div>
  );
}

function PinControl(props: { id: string }) {
  const r = () => geometry(props.id);
  const inherited = () => ancestors(doc, props.id).find(a => geometry(a).pinned);
  const note = () => {
    const parent = inherited();
    if (parent) return `Protected by pinned container “${findGroup(doc, parent)?.title}”.`;
    if (r().pinned) return 'Layout keeps this position. You can still drag it.';
    if (r().manual)
      return (
        'Moved by hand. ' +
        (doc.settings.respectManual
          ? '“Keep manual positions” is on.'
          : 'Layout may move it. Pin to protect it.')
      );
    return 'Layout is free to move this object.';
  };
  return (
    <>
      <Checkbox
        label="Pin during layout"
        checked={!!r().pinned}
        onChange={v => edit('Edit pinned', d => void (d.layout.nodes[props.id].pinned = v))}
      />
      <p class="hint">{note()}</p>
    </>
  );
}

function ParentSelect(props: { id: string }) {
  const options = () => {
    const excluded = new Set([
      props.id,
      ...(isGroup(doc, props.id) ? descendants(doc, props.id) : []),
    ]);
    return [
      ['', 'No container'] as const,
      ...doc.graph.groups.filter(g => !excluded.has(g.id)).map(g => [g.id, g.title] as const),
    ];
  };
  const object = () => findNode(doc, props.id) ?? findGroup(doc, props.id);
  return (
    <SelectField
      label="Container"
      value={object()?.parentId || ''}
      options={options()}
      onChange={v => edit('Edit parentId', d => edits.setParent(d, props.id, v || null))}
    />
  );
}

const LABEL_MODES: LabelMode[] = ['center', 'top', 'bottom', 'left', 'right', 'detached'];

function ShapeSections(props: { id: string }) {
  const style = () => styleOf(doc, props.id);
  const labelMode = () =>
    nodeLabel(doc, props.id, findNode(doc, props.id)!.title, geometry(props.id)).mode;
  return (
    <>
      <IntentSection id={props.id} />
      <details class="inspector-section">
        <summary>Label & icon</summary>
        <SelectField
          label="Label position"
          value={labelMode()}
          options={LABEL_MODES}
          onChange={mode => edit('Edit mode', d => edits.setLabelMode(d, props.id, mode))}
        />
        <SelectField
          label="Icon"
          value={style().icon || ''}
          options={[['', 'None'], ...NODE_ICONS.map(i => [i, i] as const)]}
          onChange={icon => edit('Edit icon', d => edits.setStyle(d, props.id, { icon }))}
        />
        <Show when={style().shape === 'image'}>
          <CommandButton command="replace-image" class="full">
            Replace image
          </CommandButton>
        </Show>
      </details>
      <Section>
        <ParentSelect id={props.id} />
        <CommandButton command="add-connected" class="full">
          Add connected box <kbd>⇧ Enter</kbd>
        </CommandButton>
      </Section>
    </>
  );
}

function ContainerSections(props: { id: string }) {
  const cfg = () => doc.layout.containers[props.id];
  return (
    <>
      <Section title="Contents">
        <SelectField
          label="Arrange contents"
          value={cfg()?.direction || 'inherit'}
          options={[
            ['inherit', 'Follow diagram'],
            ['RIGHT', 'Left to right'],
            ['DOWN', 'Top to bottom'],
          ]}
          onChange={direction =>
            edit('Edit direction', d => edits.setContainer(d, props.id, { direction }))
          }
        />
        <NumberField
          label="Inner padding"
          value={cfg()?.padding || 24}
          min={12}
          max={80}
          onChange={padding =>
            edit('Edit padding', d => edits.setContainer(d, props.id, { padding }))
          }
        />
        <div class="fields-2">
          <CommandButton command="layout">Layout inside</CommandButton>
          <CommandButton command="fit-container">Fit contents</CommandButton>
        </div>
        <p class="hint">
          Drag any edge or corner to resize the frame. Its contents stay put. Drag inside the empty
          frame to move the whole container.
        </p>
      </Section>
      <Section>
        <ParentSelect id={props.id} />
        <div class="fields-2">
          <CommandButton command="collapse-selected">
            {doc.collapsed.includes(props.id) ? 'Expand' : 'Collapse'}
          </CommandButton>
          <CommandButton command="ungroup">Ungroup</CommandButton>
        </div>
      </Section>
    </>
  );
}

const roleOf = (id: string): IntentRole | null =>
  doc.layout.intent.start?.id === id ? 'start' : doc.layout.intent.end?.id === id ? 'end' : null;

function IntentSection(props: { id: string }) {
  return (
    <Section title="Layout intent">
      <Show
        when={roleOf(props.id)}
        fallback={
          <div class="fields-2">
            <CommandButton command="mark-start">Start here</CommandButton>
            <CommandButton command="mark-end">End here</CommandButton>
          </div>
        }
      >
        {role => (
          <>
            <div class="row between">
              <span class="intent-role">{role() === 'start' ? 'Start' : 'End'}</span>
              <button
                type="button"
                class="button ghost small"
                onClick={() => setLayoutIntent(role(), null)}
              >
                Clear
              </button>
            </div>
            <SelectField
              label="Preferred area"
              value={doc.layout.intent[role()]!.placement}
              options={edits
                .intentPlacements(role())
                .map(p => [p, edits.INTENT_LABELS[p]] as const)}
              onChange={placement => setLayoutIntent(role(), props.id, placement)}
            />
          </>
        )}
      </Show>
      <p class="hint">
        A preferred area, not a fixed coordinate. Pins and container boundaries still win.
      </p>
    </Section>
  );
}

/** Start and end preferences for the whole diagram. Also shown in the layout lab. */
export function IntentSummary() {
  const entries = () =>
    (['start', 'end'] as const).flatMap(role =>
      doc.layout.intent[role] ? [[role, doc.layout.intent[role]!] as const] : [],
    );
  return (
    <Section title="Drawing intent">
      <For
        each={entries()}
        fallback={
          <p class="hint">
            Select a shape to mark a start or end and choose its preferred area. This helps resolve
            feedback loops without pinning coordinates.
          </p>
        }
      >
        {([role, hint]) => (
          <div class="intent-entry">
            <div class="row">
              <span class="intent-role">{role}</span>
              <button
                type="button"
                class="button ghost grow truncate"
                onClick={() => selectItems([hint.id])}
              >
                {findNode(doc, hint.id)?.title || hint.id}
              </button>
              <IconButton
                icon="close"
                label={`Clear ${role}`}
                onClick={() => setLayoutIntent(role, null)}
              />
            </div>
            <p class="hint">{edits.INTENT_LABELS[hint.placement]}</p>
          </div>
        )}
      </For>
    </Section>
  );
}
