/**
 * Read the files a `.draft` file's `src=` code nodes name, for the CLI and the viewer's file
 * server. Paths are relative to the `.draft` file and must stay inside `root`, the folder the
 * viewer serves (or the file's git root for the CLI), as `workspace.ts` requires of `.draft` paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CodeFiles } from '../model/code-src';
import { srcPaths } from '../dsl/inline-sources';

/** Larger files are refused: a code node shows an excerpt, not a whole bundle. */
const MAX_BYTES = 1_000_000;

const inside = (root: string, full: string) => full === root || full.startsWith(root + path.sep);

/** The full path `src` names from the `.draft` at `draft`, or an error when it leaves `root`. */
export function srcFile(draft: string, root: string, src: string) {
  const full = path.resolve(path.dirname(draft), src);
  if (!inside(root, full))
    return {
      error: `src="${src}" is outside ${root}, the folder draftably serves; it reads files inside it only.`,
    };
  return { full };
}

/** The text of every file `source` names with `src=`, read from beside `draft`. */
export function readCodeFiles(source: string, draft: string, root: string): CodeFiles {
  const files: CodeFiles = {};
  let paths: string[];
  try {
    paths = srcPaths(source);
  } catch {
    return files; // The compiler reports the syntax error.
  }
  for (const src of paths) {
    const at = srcFile(draft, root, src);
    if ('error' in at) {
      files[src] = { error: at.error! };
      continue;
    }
    try {
      // A link inside the folder may point out of it.
      if (!inside(fs.realpathSync(root), fs.realpathSync(at.full)))
        files[src] = {
          error: `src="${src}" links outside ${root}; draftably reads files inside it only.`,
        };
      else if (fs.statSync(at.full).size > MAX_BYTES)
        files[src] = { error: `src="${src}" is over 1 MB. Point it at a smaller file.` };
      else files[src] = { text: fs.readFileSync(at.full, 'utf8') };
    } catch {
      files[src] = { error: `src="${src}": no such file next to the .draft.` };
    }
  }
  return files;
}

/** The folders holding the files `source` names, to watch for changes. */
export function codeFolders(source: string, draft: string, root: string): string[] {
  try {
    return [
      ...new Set(
        srcPaths(source).flatMap(src => {
          const at = srcFile(draft, root, src);
          return 'full' in at && at.full ? [path.dirname(at.full)] : [];
        }),
      ),
    ];
  } catch {
    return [];
  }
}
