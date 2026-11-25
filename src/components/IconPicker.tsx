import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { iconData, iconMarkup, loadAllIconSets, searchIcons, starterIcons } from '../model/iconify';

/** A picture of an icon from a loaded set, in the text color. */
function IconPreview(props: { name: string; size?: number }) {
  const size = () => props.size ?? 20;
  return (
    <svg
      viewBox={`0 0 ${size()} ${size()}`}
      width={size()}
      height={size()}
      aria-hidden="true"
      // Icon bodies come from the bundled Lucide set or the local server's installed sets.
      // eslint-disable-next-line solid/no-innerhtml
      innerHTML={(() => {
        const d = iconData(props.name);
        return d ? iconMarkup(d, 0, 0, size(), 'currentColor') : '';
      })()}
    />
  );
}

/**
 * Search the installed icon sets and pick one: the choice writes `icon=` on the object's line.
 * A node also picks where the icon sits (`icon-pos=`).
 */
export function IconPicker(props: {
  icon?: string;
  pos?: 'left' | 'top';
  node: boolean;
  /** The object's label, whose words pick the icons offered before anything is typed. */
  label: string;
  onChange: (icon: string | undefined, pos?: 'left' | 'top') => void;
}) {
  const [query, setQuery] = createSignal('');
  const [ready, setReady] = createSignal(false);
  onMount(() => void loadAllIconSets().then(() => setReady(true)));
  const results = createMemo(() =>
    !ready() ? [] : query().trim() ? searchIcons(query(), 48) : starterIcons(props.label),
  );
  return (
    <div class="icon-picker">
      <Show when={props.icon}>
        {icon => (
          <div class="icon-current">
            <IconPreview name={icon()} size={22} />
            <span class="icon-name" title={icon()}>
              {icon()}
            </span>
            <button
              type="button"
              class="button small ghost"
              onClick={() => props.onChange(undefined)}
            >
              Remove
            </button>
          </div>
        )}
      </Show>
      <Show when={props.node && props.icon}>
        <div class="segmented full" role="group" aria-label="Icon position">
          <button
            type="button"
            aria-pressed={props.pos !== 'top'}
            onClick={() => props.onChange(props.icon, 'left')}
          >
            Before label
          </button>
          <button
            type="button"
            aria-pressed={props.pos === 'top'}
            onClick={() => props.onChange(props.icon, 'top')}
          >
            Above label
          </button>
        </div>
      </Show>
      <input
        type="search"
        placeholder="Search icons: database, user, cloud…"
        aria-label="Search icons"
        value={query()}
        onInput={e => setQuery(e.currentTarget.value)}
      />
      <div class="icon-grid" role="listbox" aria-label="Icons">
        <For each={results()}>
          {name => (
            <button
              type="button"
              role="option"
              aria-selected={name === props.icon}
              classList={{ selected: name === props.icon }}
              title={name}
              aria-label={name}
              onClick={() => props.onChange(name, props.pos)}
            >
              <IconPreview name={name} />
            </button>
          )}
        </For>
      </div>
      <Show when={ready() && query() && !results().length}>
        <p class="hint">No icon matches “{query()}”.</p>
      </Show>
    </div>
  );
}
