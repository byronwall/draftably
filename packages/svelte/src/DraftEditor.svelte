<!-- `<DraftEditor>` for Svelte 5: drag boxes and lines, and get the `.draft` source back. -->
<script>
  /** @type {import('./editor').DraftEditorProps} */
  let { source, onchange, class: className, style } = $props();
  /** @type {import('@draftably/editor/element').DraftEditorElement | undefined} */
  let el = $state();

  // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
  $effect(() => void import('@draftably/editor/element'));

  $effect(() => {
    if (!el || !onchange) return;
    const node = el;
    const listen = event => onchange(event.detail);
    node.addEventListener('draft-change', listen);
    return () => node.removeEventListener('draft-change', listen);
  });
</script>

<draft-editor bind:this={el} {source} class={className} {style}></draft-editor>
