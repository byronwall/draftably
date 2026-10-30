/**
 * `draftably docs [topic]`: print the language guide that ships with this version. The package
 * holds it as `DSL.md` beside `dist/`; in this repository it is `docs/DSL.md`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { packageRoot } from './skill';

/** The installed guide's path. */
export function guidePath() {
  const root = packageRoot();
  const file = [path.join(root, 'DSL.md'), path.join(root, 'docs/DSL.md')].find(f =>
    fs.existsSync(f),
  );
  if (!file) throw Error('The language guide is missing. Reinstall draftably.');
  return file;
}

interface Topic {
  name: string;
  depth: number;
  indent: number;
  start: number;
  end: number;
}

/**
 * The guide's topics: each heading, and each paragraph that opens with a bold head such as
 * `**Legend.**`. A topic runs to the next heading at its depth or above; a bold head is one level
 * below its heading and also ends at the next bold head.
 */
export function topics(text: string) {
  const lines = text.split('\n'),
    found: Topic[] = [];
  let fenced = false,
    level = 1;
  lines.forEach((line, i) => {
    if (line.startsWith('```')) fenced = !fenced;
    if (fenced) return;
    const heading = /^(#{1,6}) (.+)/.exec(line),
      bold = /^\*\*([^*]+?)\.?\*\*/.exec(line);
    if (heading) {
      level = heading[1].length;
      found.push({
        name: heading[2].replace(/`/g, ''),
        depth: level,
        indent: level - 2,
        start: i,
        end: 0,
      });
    } else if (bold && (i === 0 || !lines[i - 1].trim()))
      found.push({ name: bold[1], depth: 7, indent: level - 1, start: i, end: 0 });
  });
  for (const [i, t] of found.entries()) {
    const next = found.slice(i + 1).find(n => n.depth <= t.depth || (t.depth === 7 && n.depth < 7));
    t.end = next ? next.start : lines.length;
  }
  return { lines, found };
}

/** What `docs` prints: the table of contents, the whole guide (`all`) or the topics that match. */
export function docs(topic?: string) {
  const file = guidePath(),
    text = fs.readFileSync(file, 'utf8');
  const { lines, found } = topics(text);
  if (topic === 'all') return text;
  const contents = found
    .filter(t => t.depth > 1)
    .map(t => `${'  '.repeat(t.indent)}${t.name}`)
    .join('\n');
  if (!topic)
    return `${file}\n\n${contents}\n\nRun draftably docs <topic> for one section, or docs all for the whole guide.\n`;
  const want = topic.toLowerCase(),
    exact = found.filter(t => t.name.toLowerCase() === want),
    picked = exact.length ? exact : found.filter(t => t.name.toLowerCase().includes(want));
  if (!picked.length) throw Error(`No topic matches "${topic}". Topics:\n${contents}`);
  // A heading's own range already holds the bold heads inside it.
  const outer = picked.filter(
    t => !picked.some(o => o !== t && o.start < t.start && t.start < o.end),
  );
  return outer.map(t => lines.slice(t.start, t.end).join('\n').trimEnd() + '\n').join('\n');
}
