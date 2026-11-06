import { useState } from 'react';
import { DraftDiagram, type UpdateResult } from '@draftably/react';
import { DraftEditor } from '@draftably/react/editor';
import { recordChange, sources, updated } from '../../sources.js';

const record = (result: UpdateResult) =>
  ((window as { __updates?: string[] }).__updates ??= []).push(result.status);

export function App({ svgs = [] }: { svgs?: string[] }) {
  const [list, setList] = useState(sources);
  const [edits, setEdits] = useState(sources.slice(0, 2));
  return (
    <main>
      <button id="update" onClick={() => setList(l => [updated, ...l.slice(1)])}>
        Update first
      </button>
      <button id="remove" onClick={() => setList(l => l.slice(0, 2))}>
        Remove last
      </button>
      {list.map((source, i) => (
        <DraftDiagram
          key={i}
          source={source}
          label={`Diagram ${i + 1}`}
          outline={i === 0 ? 'visible' : undefined}
          svg={svgs[i]}
          onUpdate={record}
        />
      ))}
      {edits.map((source, i) => (
        <DraftEditor
          key={`editor-${i}`}
          source={source}
          style={{ height: '20rem' }}
          onChange={next => {
            recordChange(i, next);
            setEdits(all => all.map((s, j) => (j === i ? next : s)));
          }}
        />
      ))}
    </main>
  );
}
