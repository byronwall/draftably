/* eslint-disable solid/no-innerhtml -- Mermaid's SVG of the visitor's own source */
import { createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { mermaidSvg } from '../mermaid-svg';
import type { Imported } from './foreign';

/**
 * One line over the source for Mermaid or DOT text: in preview it offers Convert; after a convert
 * it offers Undo. Compare opens a popover with the original format's own drawing and what the
 * import changed, over the editor, so nothing below moves.
 */
export function ImportNotice(props: {
  found: Imported & { text?: string };
  converted: boolean;
  onConvert: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = createSignal(false);
  let wrap!: HTMLDivElement;
  const changes = () => props.found.warnings.length;
  const label = () =>
    changes() === 0 ? 'Compare' : `Compare · ${changes()} change${changes() === 1 ? '' : 's'}`;

  const outside = (e: PointerEvent) => {
    if (!wrap.contains(e.target as Node)) setOpen(false);
  };
  const esc = (e: KeyboardEvent) => e.key === 'Escape' && open() && setOpen(false);
  onMount(() => {
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
  });
  onCleanup(() => {
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('keydown', esc);
  });

  return (
    <div class="play-import" role="status" ref={wrap}>
      <span class="play-import-text">
        <Show when={props.found.native} fallback={`${props.found.name}: ${props.found.error}`}>
          <Show when={props.converted} fallback={`${props.found.name} · showing its import`}>
            Converted from {props.found.name}
          </Show>
        </Show>
      </span>
      <Show when={props.found.native}>
        <button
          type="button"
          class="tool quiet"
          aria-expanded={open()}
          aria-haspopup="dialog"
          onClick={() => setOpen(o => !o)}
        >
          {label()}
        </button>
        <Show
          when={props.converted}
          fallback={
            <button type="button" class="tool primary" onClick={() => props.onConvert()}>
              Convert to draftably
            </button>
          }
        >
          <button type="button" class="tool" onClick={() => props.onUndo()}>
            Undo convert
          </button>
          <button
            type="button"
            class="play-notice-close"
            aria-label="Dismiss"
            onClick={() => props.onDismiss()}
          >
            ×
          </button>
        </Show>
      </Show>
      <Show when={open()}>
        <ComparePopover found={props.found} />
      </Show>
    </div>
  );
}

function ComparePopover(props: { found: Imported & { text?: string } }) {
  const text = () => props.found.text ?? '';
  const [svg] = createResource(
    () => (props.found.format === 'mermaid' && text()) || undefined,
    mermaidSvg,
  );
  return (
    <div class="play-compare" role="dialog" aria-label={`Compare with ${props.found.name}`}>
      <Show when={props.found.format === 'mermaid'}>
        <p class="play-compare-label">{props.found.name} draws it like this</p>
        <div class="play-compare-drawing">
          <Show when={!svg.error} fallback={<span>Mermaid could not draw this.</span>}>
            <Show when={svg()} fallback={<span>Drawing with Mermaid…</span>}>
              {out => <div innerHTML={out()} />}
            </Show>
          </Show>
        </div>
      </Show>
      <p class="play-compare-label">
        {props.found.warnings.length ? 'What the import changes' : 'The import keeps every detail.'}
      </p>
      <Show when={props.found.warnings.length}>
        <ul>
          <For each={props.found.warnings}>{w => <li>{w}</li>}</For>
        </ul>
      </Show>
    </div>
  );
}
