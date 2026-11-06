import { defineComponent, h, ref } from 'vue';
import { DraftDiagram, type UpdateResult } from '@draftably/vue';
import { sources, updated } from '../../sources.js';

const record = (result: UpdateResult) =>
  ((window as { __updates?: string[] }).__updates ??= []).push(result.status);

export const App = defineComponent({
  props: { svgs: { type: Array as () => string[], default: () => [] } },
  setup(props) {
    const list = ref(sources);
    return () =>
      h('main', [
        h(
          'button',
          { id: 'update', onClick: () => (list.value = [updated, ...list.value.slice(1)]) },
          'Update first',
        ),
        h(
          'button',
          { id: 'remove', onClick: () => (list.value = list.value.slice(0, 2)) },
          'Remove last',
        ),
        ...list.value.map((source, i) =>
          h(DraftDiagram, {
            key: i,
            source,
            label: `Diagram ${i + 1}`,
            svg: props.svgs[i],
            onUpdate: record,
          }),
        ),
      ]);
  },
});
