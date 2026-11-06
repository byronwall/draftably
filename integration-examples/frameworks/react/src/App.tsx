import { useState } from 'react';
import { DraftDiagram, type UpdateResult } from '@draftably/react';
import { sources, updated } from '../../sources.js';

const record = (result: UpdateResult) =>
  ((window as { __updates?: string[] }).__updates ??= []).push(result.status);

export function App({ svgs = [] }: { svgs?: string[] }) {
  const [list, setList] = useState(sources);
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
          svg={svgs[i]}
          onUpdate={record}
        />
      ))}
    </main>
  );
}
