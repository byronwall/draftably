import { createSignal, For } from 'solid-js';
import { DraftDiagram, type UpdateResult } from '@draftably/solid';
import { DraftEditor } from '@draftably/solid/editor';
import { recordChange, sources, updated } from '../../sources.js';

const record = (result: UpdateResult) =>
  ((window as { __updates?: string[] }).__updates ??= []).push(result.status);

export function App(props: { svgs?: string[] }) {
  const [list, setList] = createSignal(sources);
  const [edits, setEdits] = createSignal(sources.slice(0, 2));
  return (
    <main>
      <button id="update" onClick={() => setList(l => [updated, ...l.slice(1)])}>
        Update first
      </button>
      <button id="remove" onClick={() => setList(l => l.slice(0, 2))}>
        Remove last
      </button>
      <For each={list()}>
        {(source, i) => (
          <DraftDiagram
            source={source}
            label={`Diagram ${i() + 1}`}
            svg={props.svgs?.[i()]}
            onUpdate={record}
          />
        )}
      </For>
      <For each={edits()}>
        {(source, i) => (
          <DraftEditor
            source={source}
            style={{ height: '20rem' }}
            onChange={next => {
              recordChange(i(), next);
              setEdits(all => all.map((s, j) => (j === i() ? next : s)));
            }}
          />
        )}
      </For>
    </main>
  );
}
