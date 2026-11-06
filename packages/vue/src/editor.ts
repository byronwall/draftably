/** `<DraftEditor>` for Vue 3: drag boxes and lines, and get the `.draft` source back. */
import type { DraftEditorElement } from '@draftably/editor/element';
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';

export type { DraftEditorElement };

export const DraftEditor = defineComponent({
  name: 'DraftEditor',
  props: {
    /** `.draft` source. Passing back the text from `change` does not redraw. */
    source: { type: String, required: true },
  },
  emits: { change: (_source: string) => true },
  setup(props, { emit, expose }) {
    const el = ref<DraftEditorElement>();
    const listen = (event: Event) => emit('change', (event as CustomEvent<string>).detail);
    onMounted(() => {
      // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
      void import('@draftably/editor/element');
      el.value?.addEventListener('draft-change', listen);
    });
    onBeforeUnmount(() => el.value?.removeEventListener('draft-change', listen));
    expose({ element: el });
    return () => h('draft-editor', { ref: el, source: props.source });
  },
});
