import { calendarFor } from '../../dsl/calendar-layout';
import { createSignal, For, Show, untrack } from 'solid-js';
import { setAttr } from '../../dsl/source-edits';
import {
  timelineLayout,
  writeTimelineDrafts,
  type TimelineDraft,
  type TimelineDraftIssue,
} from '../../dsl/timeline-settings';
import { bare, printSource, readSource } from '../../dsl/syntax';
import { closeDialog } from '../../state/ui';
import { useDiagramSession } from '../session-context';
import { Modal } from '../Dialogs';
import './settings.css';

export function TimelineSettings() {
  const s = useDiagramSession();
  const original = s.currentSource();
  const model = s.fileScene()!.model;
  const nodes = model.objects.filter(o => o.type === 'node');
  const initial = nodes.find(o => s.selectedIds().includes(o.id)) ?? nodes[0];
  const [id, setId] = createSignal(initial?.id ?? '');
  const [label, setLabel] = createSignal('');
  const selected = () => nodes.find(o => o.id === id());
  const [today, setToday] = createSignal(model.timeline?.today ?? '');
  const [view, setView] = createSignal(model.timeline?.view ?? 'focus');
  const [lo, setLo] = createSignal(model.timeline?.zoom?.[0] ?? '');
  const [hi, setHi] = createSignal(model.timeline?.zoom?.[1] ?? '');
  const [error, setError] = createSignal('');
  const [issue, setIssue] = createSignal<TimelineDraftIssue>();
  const [busy, setBusy] = createSignal(false);
  const [kind, setKind] = createSignal('point');
  const [start, setStart] = createSignal('');
  const [end, setEnd] = createSignal('');
  const [unknown, setUnknown] = createSignal(false);
  const [open, setOpen] = createSignal(false);
  const [steps, setSteps] = createSignal('');
  const [startBadInput, setStartBadInput] = createSignal(false);
  const inputs: Partial<Record<TimelineDraftIssue['field'], HTMLInputElement>> = {};
  let zoomFromInput: HTMLInputElement | undefined;
  let zoomThroughInput: HTMLInputElement | undefined;
  const drafts = new Map<string, TimelineDraft>();
  const currentDraft = (): TimelineDraft => ({
    kind: kind(),
    start: start(),
    end: end(),
    unknown: unknown(),
    open: open(),
    steps: steps(),
    label: label(),
    startBadInput: startBadInput() || inputs.start?.validity.badInput === true,
  });
  function showDraft(d: TimelineDraft) {
    setLabel(d.label);
    setKind(d.kind);
    setStart(d.start);
    setEnd(d.end);
    setUnknown(d.unknown);
    setOpen(d.open);
    setSteps(d.steps);
    setStartBadInput(d.startBadInput ?? false);
  }
  function remember(key = id()) {
    if (key) drafts.set(key, currentDraft());
  }
  function load(key: string, saveCurrent = true) {
    setError('');
    setIssue(undefined);
    if (saveCurrent) remember();
    setId(key);
    const saved = drafts.get(key);
    if (saved) return showDraft(saved);
    const d = selected()?.dates;
    showDraft({
      kind:
        key === ':new'
          ? 'point'
          : d?.milestone
            ? 'milestone'
            : d?.from
              ? 'span'
              : d?.at
                ? 'point'
                : 'undated',
      start: d?.at ?? d?.from?.replace(/^\?/, '') ?? '',
      end: d?.to === 'open' ? '' : (d?.to ?? ''),
      steps: d?.steps.join(',') ?? '',
      unknown: !!d?.from?.startsWith('?'),
      open: d?.to === 'open',
      label: '',
    });
  }
  function discardNewDraft() {
    drafts.delete(':new');
    load('', false);
  }
  untrack(() => load(id(), false));
  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (busy()) return;
    if (original !== s.currentSource() || s.fileBlocked())
      return setError('The diagram changed. Reopen settings to edit its current dates.');
    if (inputs.snapshot?.validity.badInput) {
      setError('Enter a complete snapshot date or clear it.');
      inputs.snapshot.focus();
      return;
    }
    if (zoomFromInput?.validity.badInput) {
      setError('Enter a complete detail start date or clear it.');
      zoomFromInput.focus();
      return;
    }
    if (zoomThroughInput?.validity.badInput) {
      setError('Enter a complete detail end date or clear it.');
      zoomThroughInput.focus();
      return;
    }
    if (!!lo() !== !!hi() || (lo() && lo() >= hi()))
      return setError('Choose a start and a later end for the detail window.');
    const doc = readSource(s.currentSource());
    remember();
    const root = timelineLayout(doc);
    setAttr(root, 'view', view() === 'log' ? bare('log') : undefined);
    setAttr(root, 'today', today() ? bare(today()) : undefined);
    setAttr(root, 'zoom', lo() ? bare(lo() + '..' + hi()) : undefined);
    const invalid = writeTimelineDrafts(doc, drafts);
    if (invalid) {
      load(invalid.id, false);
      setIssue(invalid);
      setError(invalid.message);
      setTimeout(() => inputs[invalid.field]?.focus(), 0);
      return;
    }
    const next = printSource(doc);
    setBusy(true);
    try {
      if (
        next !== s.currentSource() &&
        !(await s.commitSource(next, 'Edit timeline', 'timeline updated'))
      )
        return setError('Check the dates and source diagnostic before saving.');
      closeDialog();
      const c = calendarFor(s.doc);
      if (c) s.frameCalendar(c);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Timeline settings">
      <form class="timeline-settings" novalidate onSubmit={save}>
        <fieldset>
          <legend>Time axis</legend>
          <label>
            Presentation
            <select
              value={view()}
              onChange={e => setView(e.currentTarget.value === 'log' ? 'log' : 'focus')}
            >
              <option value="focus">Focus + context</option>
              <option value="log">Event log</option>
            </select>
          </label>
          <label>
            Snapshot date
            <input
              type="date"
              value={today()}
              ref={el => (inputs.snapshot = el)}
              onInput={e => setToday(e.currentTarget.value)}
            />
          </label>
          <label>
            Detail from
            <input
              type="date"
              value={lo()}
              ref={el => (zoomFromInput = el)}
              onInput={e => setLo(e.currentTarget.value)}
            />
          </label>
          <label>
            Detail through
            <input
              type="date"
              value={hi()}
              ref={el => (zoomThroughInput = el)}
              onInput={e => setHi(e.currentTarget.value)}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>Diagram item</legend>
          <label>
            Item
            <select value={id()} onChange={e => load(e.currentTarget.value)}>
              <option value="">Time axis only</option>
              <option value=":new">Add new item…</option>
              <For each={nodes}>{n => <option value={n.id}>{n.label}</option>}</For>
            </select>
          </label>
          <Show when={id() === ':new'}>
            <label>
              Item name
              <input
                value={label()}
                ref={el => (inputs.label = el)}
                onInput={e => setLabel(e.currentTarget.value)}
              />
            </label>
          </Show>
          <Show when={id()}>
            <label>
              Mark
              <select value={kind()} onChange={e => setKind(e.currentTarget.value)}>
                <option value="undated">Undated</option>
                <option value="point">Event</option>
                <option value="milestone">Milestone</option>
                <option value="span">Duration</option>
              </select>
            </label>
          </Show>
          <Show when={id() && kind() !== 'undated'}>
            <label>
              {kind() === 'span' ? 'Start' : 'Date'}
              <input
                required={id() !== ':new'}
                type="date"
                value={start()}
                ref={el => (inputs.start = el)}
                onInput={e => {
                  setStart(e.currentTarget.value);
                  setStartBadInput(e.currentTarget.validity.badInput);
                }}
              />
            </label>
          </Show>
          <Show when={kind() === 'span'}>
            <label>
              <input
                type="checkbox"
                checked={unknown()}
                onChange={e => setUnknown(e.currentTarget.checked)}
              />
              Began before start date
            </label>
            <label>
              <input
                type="checkbox"
                checked={open()}
                onChange={e => setOpen(e.currentTarget.checked)}
              />
              Still open at snapshot
            </label>
            <Show when={!open()}>
              <label>
                End
                <input
                  required
                  type="date"
                  value={end()}
                  ref={el => (inputs.end = el)}
                  onInput={e => setEnd(e.currentTarget.value)}
                />
              </label>
            </Show>
            <label>
              Partial steps
              <input
                placeholder="YYYY-MM-DD, YYYY-MM-DD"
                value={steps()}
                ref={el => (inputs.steps = el)}
                onInput={e => setSteps(e.currentTarget.value)}
              />
            </label>
          </Show>
        </fieldset>
        <Show when={error()}>
          <p role="alert">{error()}</p>
        </Show>
        <Show when={issue()?.id === ':new'}>
          <button type="button" class="button" onClick={discardNewDraft}>
            Discard incomplete new item
          </button>
        </Show>
        <button type="submit" class="button primary" disabled={busy()}>
          Apply timeline
        </button>
      </form>
    </Modal>
  );
}
