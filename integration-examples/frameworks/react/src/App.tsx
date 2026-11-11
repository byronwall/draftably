import { useState } from 'react';
import { DraftDiagram, type UpdateResult } from '@draftably/react';
import { DraftEditor } from '@draftably/react/editor';
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
          ref={i === 0 ? recordElement : undefined}
          options={i === 1 ? viewerOptions() : undefined}
          onUpdate={record}
          onCamera={() => recordEvent('camera')}
        />
      ))}
      {edits.map((source, i) => (
        <DraftEditor
          key={`editor-${i}`}
          source={source}
          style={{ height: '20rem' }}
          options={editorOptions()}
          onChange={({ source: next }) => {
            recordChange(i, next);
            setEdits(all => all.map((s, j) => (j === i ? next : s)));
          }}
        />
      ))}
    </main>
  );
}
