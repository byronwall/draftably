/**
 * `check` advice for file links: a relative `href` whose file is not at the link base, with the
 * path that probably meant, so an agent can fix it. The link itself is never changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Diagnostic, Scene } from '../dsl/compile';
import { linkTarget } from '../model/link';
import { gitRoot } from '../server/file-session';

/** Folders a search for a misplaced link never enters. */
const SKIP = new Set(['node_modules', 'dist', 'build', 'coverage', 'tmp']);
const MAX_FILES = 20_000;

/** Every file under `root`, relative to it with forward slashes. */
function filesUnder(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (out.length >= MAX_FILES) return;
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out;
}

export function linkNotes(scene: Scene, file: string): Diagnostic[] {
  const dir = path.dirname(path.resolve(file)),
    repo = gitRoot(dir),
    setBase = scene.model.appearance.config?.linkBase,
    base = setBase === undefined ? repo : path.resolve(dir, setBase),
    notes: Diagnostic[] = [];
  let files: string[] | undefined;
  for (const o of scene.objects) {
    if (!o.href) continue;
    const t = linkTarget(o.href);
    if (t.kind === 'url' || fs.existsSync(path.resolve(base, t.path))) continue;
    // The likely meaning: the path from the diagram's own folder, or the one file in the
    // repository whose path ends the same way.
    const fromDir = path.relative(base, path.resolve(dir, t.path)).split(path.sep).join('/');
    let guess = fs.existsSync(path.resolve(dir, t.path)) ? fromDir : undefined;
    if (!guess) {
      files ??= filesUnder(repo);
      const tail = t.path.replace(/^(\.\.?\/)+/, ''),
        hits = files.filter(f => f === tail || f.endsWith('/' + tail));
      if (hits.length === 1)
        guess = path
          .relative(base, path.join(repo, hits[0]))
          .split(path.sep)
          .join('/');
    }
    const line = t.line ? `:${t.line}${t.col ? `:${t.col}` : ''}` : '';
    notes.push({
      level: 'warning',
      code: 'link-missing',
      message:
        `${o.id} links to ${t.path}, which is not in ${path.relative(process.cwd(), base) || '.'}.` +
        (guess
          ? ` Did you mean href="${guess}${line}"?`
          : ' Relative links start at the git root; set config link-base= to change that.'),
      line: o.line,
      ids: [o.id],
    });
  }
  return notes;
}
