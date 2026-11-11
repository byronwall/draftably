<!-- `<DraftEditor>` for Svelte 5: drag boxes and lines, and get the `.draft` source back. -->
<script>
  import { applyAttributes, elementAttributes, listenHostEvents } from './events.js';

  /** @type {import('./editor').DraftEditorProps} */
  let { source, options = {}, element = $bindable(), class: className, style, children, ...rest } = $props();

  $effect(() => listenHostEvents(element, rest));
  // Not a spread: the element registers after this render, see `applyAttributes`.
  $effect(() => applyAttributes(element, elementAttributes(rest)));

  // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
  $effect(() => {
    import('@draftably/editor/element').catch(error => {
      element?.setAttribute('status', 'error');
      element?.setAttribute('data-error', String(error));
    });
  });
</script>

<draft-editor bind:this={element} {source} {options} class={className} {style}>{@render children?.()}</draft-editor>
