// Two editors on one page, for `pnpm prove:editors`. Each reports its source changes.
import { mountEditor, type MountedEditor } from '../../src/editor';

const source = (name: string) =>
  `diagram "${name}" version=1\nnode a "${name} start"\nnode b "${name} end"\nedge ab a -> b\n`;

const changes: string[][] = [[], []];
const editors: MountedEditor[] = ['Left', 'Right'].map((name, i) =>
  mountEditor(document.getElementById(name.toLowerCase())!, {
    source: source(name),
    onChange: next => changes[i].push(next),
  }),
);

Object.assign(window, { editors, changes });
