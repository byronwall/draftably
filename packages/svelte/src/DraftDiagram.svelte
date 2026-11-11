<!-- `<DraftDiagram>` for Svelte 5: the `<draft-diagram>` element with Svelte props and event props. -->
<script>
  import '@draftably/runtime/element';
  import { listenHostEvents } from './events.js';

  /** @type {import('./index').DraftDiagramProps} */
  let {
    source,
    state: emphasis = null,
    label,
    outline,
    svg,
    options = {},
    element = $bindable(),
    class: className,
    style,
    children,
    ...events
  } = $props();

  $effect(() => listenHostEvents(element, events));
</script>

<draft-diagram bind:this={element} {source} state={emphasis ?? undefined} {label} {outline} {options} class={className} {style}>
  {#if svg}<div>{@html svg}</div>{/if}
  {@render children?.()}
</draft-diagram>
