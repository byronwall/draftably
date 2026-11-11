<!-- `<DraftEditor>` for Svelte 5: drag boxes and lines, and get the `.draft` source back. -->
<script>
  import { listenHostEvents } from './events.js';

  /** @type {import('./editor').DraftEditorProps} */
  let { source, options = {}, element = $bindable(), class: className, style, ...events } = $props();

  $effect(() => listenHostEvents(element, events));

  // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
  $effect(() => {
    import('@draftably/editor/element').catch(error => {
      element?.setAttribute('status', 'error');
      element?.setAttribute('data-error', String(error));
    });
  });
</script>

<draft-editor bind:this={element} {source} {options} class={className} {style}></draft-editor>
