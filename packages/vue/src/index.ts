/** `<DraftDiagram>` for Vue 3: the `<draft-diagram>` element with Vue props and an `update` event. */
import '@draftably/runtime/element';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import type { UpdateResult, ViewerOptions } from '@draftably/runtime/viewer';
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watchEffect,
  type PropType,
} from 'vue';

export type { DraftDiagramElement, UpdateResult, ViewerOptions };

export const DraftDiagram = defineComponent({
  name: 'DraftDiagram',
  props: {
    /** `.draft` source. A change redraws the diagram and keeps the camera. */
    source: { type: String, required: true },
    /** A declared emphasis state to show. */
    state: { type: String as PropType<string | null>, default: undefined },
    /** The accessible name. */
    label: { type: String, default: undefined },
    /** `'visible'` shows the item list under the drawing; `'hidden'` (default) shows it on focus. */
    outline: { type: String as PropType<'visible' | 'hidden'>, default: undefined },
    /** Static SVG from `renderSvg(source, { target: 'inline', idPrefix })`, shown until the viewer draws. */
    svg: { type: String, default: undefined },
    options: { type: Object as PropType<ViewerOptions>, default: undefined },
  },
  emits: { update: (_result: UpdateResult) => true },
  setup(props, { emit, expose }) {
    const el = ref<DraftDiagramElement>();
    const listen = (event: Event) => emit('update', (event as CustomEvent<UpdateResult>).detail);
    onMounted(() => el.value?.addEventListener('draft-update', listen));
    onBeforeUnmount(() => el.value?.removeEventListener('draft-update', listen));
    watchEffect(() => {
      if (el.value && props.options) el.value.options = props.options;
    });
    expose({ element: el });
    return () =>
      h(
        'draft-diagram',
        {
          ref: el,
          source: props.source,
          state: props.state ?? undefined,
          label: props.label,
          outline: props.outline,
        },
        props.svg ? [h('div', { innerHTML: props.svg })] : [],
      );
  },
});

export default DraftDiagram;
