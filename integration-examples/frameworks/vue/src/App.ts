import { defineComponent, h, ref } from 'vue';
import { DraftDiagram, type UpdateResult } from '@draftably/vue';
import { DraftEditor } from '@draftably/vue/editor';
import {
  editorOptions,
  recordChange,
  recordElement,
  recordEvent,
  sources,
  updated,
  viewerOptions,
} from '../../sources.js';

const record = (result: UpdateResult) =>
  ((window as { __updates?: string[] }).__updates ??= []).push(result.status);

export const App = defineComponent({
  props: { svgs: { type: Array as () => string[], default: () => [] } },
  setup(props) {
    const list = ref(sources);
    const edits = ref(sources.slice(0, 2));
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
            outline: i === 0 ? 'visible' : undefined,
            svg: props.svgs[i],
            ...(i === 0
              ? {
                  ref: (c: unknown) =>
                    recordElement((c as { element?: HTMLElement } | null)?.element),
                }
              : {}),
            options: i === 1 ? viewerOptions() : undefined,
            onUpdate: record,
            onCamera: () => recordEvent('camera'),
          }),
        ),
        ...edits.value.map((source, i) =>
          h(DraftEditor, {
            key: `editor-${i}`,
            source,
            style: { height: '20rem' },
            options: editorOptions(),
            onChange: ({ source: next }: { source: string }) => {
              recordChange(i, next);
              edits.value = edits.value.map((s, j) => (j === i ? next : s));
            },
          }),
        ),
      ]);
  },
});
