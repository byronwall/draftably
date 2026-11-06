<!-- `<DraftDiagram>` for Svelte 5: the `<draft-diagram>` element with Svelte props and `onupdate`. -->
<script>
  import '@draftably/runtime/element';

  /** @type {import('./index').DraftDiagramProps} */
  let { source, state: emphasis = null, label, svg, options, onupdate, class: className, style } = $props();
  /** @type {import('@draftably/runtime/element').DraftDiagramElement | undefined} */
  let el = $state();

  $effect(() => {
    if (el && options) el.options = options;
  });

  $effect(() => {
    if (!el || !onupdate) return;
    const node = el;
    const listen = event => onupdate(event.detail);
    node.addEventListener('draft-update', listen);
    return () => node.removeEventListener('draft-update', listen);
  });
</script>

<draft-diagram bind:this={el} {source} state={emphasis ?? undefined} {label} class={className} {style}>
  {#if svg}<div>{@html svg}</div>{/if}
</draft-diagram>
