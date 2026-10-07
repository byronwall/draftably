/** Small form and button primitives shared by panels, menus and dialogs. */
import { For, Show, splitProps, type JSX } from 'solid-js';
import { Icon } from './Icon';

export function IconButton(
  props: {
    icon: string;
    label: string;
    keys?: string;
    pressed?: boolean;
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
) {
  const [own, rest] = splitProps(props, ['icon', 'label', 'keys', 'pressed', 'class']);
  return (
    <button
      type="button"
      class={`button ghost icon-only ${own.class ?? ''}`}
      aria-label={own.label}
      title={own.keys ? `${own.label} · ${own.keys}` : own.label}
      aria-pressed={own.pressed}
      {...rest}
    >
      <Icon name={own.icon} />
    </button>
  );
}

export function Field(props: {
  label: string;
  hint?: JSX.Element;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <label class={`field ${props.class ?? ''}`}>
      <span class="field-label">
        {props.label}
        <Show when={props.hint}>
          <small>{props.hint}</small>
        </Show>
      </span>
      {props.children}
    </label>
  );
}

export type Option<T extends string | number> = readonly [T, string] | T;

export function Select<T extends string | number>(props: {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  'aria-label'?: string;
  id?: string;
}) {
  const entries = () =>
    props.options.map(o => (Array.isArray(o) ? o : [o, String(o)]) as [T, string]);
  return (
    <select
      id={props.id}
      aria-label={props['aria-label']}
      disabled={props.disabled}
      onChange={e => {
        const raw = e.currentTarget.value;
        const match = entries().find(([v]) => String(v) === raw);
        props.onChange((match ? match[0] : raw) as T);
      }}
    >
      <For each={entries()}>
        {([value, text]) => (
          <option value={String(value)} selected={String(value) === String(props.value)}>
            {text}
          </option>
        )}
      </For>
    </select>
  );
}

export function SelectField<T extends string | number>(props: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  hint?: JSX.Element;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <Select
        value={props.value}
        options={props.options}
        onChange={props.onChange}
        disabled={props.disabled}
      />
    </Field>
  );
}

export function Checkbox(props: {
  label: JSX.Element;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label class="checkbox">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={e => props.onChange(e.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

/** A range slider that shows its value and reports the final value on release. */
export function RangeField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  /** Called while dragging; defaults to nothing so only `onChange` commits. */
  onInput?: (value: number) => void;
  onChange: (value: number) => void;
}) {
  let output!: HTMLOutputElement;
  return (
    <label class="field range-field">
      <span class="field-label">
        {props.label}
        <output ref={output}>
          {props.value}
          {props.unit ?? ''}
        </output>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        disabled={props.disabled}
        aria-label={props.label}
        onInput={e => {
          output.textContent = e.currentTarget.value + (props.unit ?? '');
          props.onInput?.(Number(e.currentTarget.value));
        }}
        onChange={e => props.onChange(Number(e.currentTarget.value))}
      />
      <Show when={props.hint}>
        <small class="hint">{props.hint}</small>
      </Show>
    </label>
  );
}

/** A number input that commits on change and rejects non-finite values. */
export function NumberField(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={props.label}>
      <input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        disabled={props.disabled}
        onChange={e => {
          const raw = e.currentTarget.value,
            n = Number(raw);
          if (raw === '' || !Number.isFinite(n)) {
            e.currentTarget.value = String(props.value);
            return;
          }
          props.onChange(n);
        }}
      />
    </Field>
  );
}

export function Kbd(props: { children: JSX.Element }) {
  return <kbd>{props.children}</kbd>;
}
