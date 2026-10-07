import { normalize, uid } from './document';
import type { Diagram } from './types';

const files = import.meta.glob<{ default: unknown }>('../samples/*.json', { eager: true });

export interface SampleInfo {
  id: string;
  title: string;
  icon: string;
}

/** Examples in menu order. Each id names a file in `src/samples/`. */
export const SAMPLES: SampleInfo[] = [
  { id: 'guided-process', title: 'Guided feedback flow', icon: 'branch' },
  { id: 'centered-branches', title: 'Centered branches', icon: 'layers' },
  { id: 'automatic-ports', title: 'Automatic ports', icon: 'branch' },
  { id: 'nested-services', title: 'Nested services', icon: 'server' },
  { id: 'boundary-terminals', title: 'Boundary alignment', icon: 'layers' },
  { id: 'process', title: 'Approval flow', icon: 'branch' },
  { id: 'architecture', title: 'App & services', icon: 'server' },
  { id: 'platform', title: 'Dependencies', icon: 'layers' },
  { id: 'dataflow', title: 'Data pipeline', icon: 'database' },
  { id: 'branches', title: 'Branching pipeline', icon: 'branch' },
  { id: 'cycle', title: 'Feedback & islands', icon: 'layers' },
  { id: 'chain', title: 'Long sequence', icon: 'branch' },
  { id: 'overlaps', title: 'Overlap repair', icon: 'layers' },
];

export const DEFAULT_SAMPLE = 'automatic-ports';

/** A fresh copy of an example, with its own document id. */
export function loadSample(id: string): Diagram {
  const file = files[`../samples/${id}.json`];
  if (!file) throw Error('Unknown example: ' + id);
  return { ...normalize(file.default), id: uid('doc') };
}
