/**
 * One-line help for each statement, read from the statement table in docs/DSL.md so the editor's
 * hover help and the language reference never disagree.
 */
import dsl from '../../docs/DSL.md?raw';

export interface StatementHelp {
  /** The statement as the table writes it, such as `edge id source -> target "label"`. */
  syntax: string;
  /** Plain text: Markdown links and emphasis removed. */
  meaning: string;
  /** The docs section the row points to with "See [...](#anchor)", if any. */
  anchor?: string;
}

const plain = (md: string) =>
  md
    .replace(/\\\|/g, '|')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();

/** Help rows by command, in table order. `layout` has several. */
export const HELP = new Map<string, StatementHelp[]>();

for (const row of dsl.split('\n')) {
  const m = /^\|\s*`([^`]+)`\s*\|(.*)\|\s*$/.exec(row);
  if (!m) continue;
  const syntax = m[1].replace(/\\\|/g, '|');
  const command = syntax.split(/\s+/)[0];
  if (!/^[a-z][a-z-]*$/.test(command)) continue;
  const list = HELP.get(command) ?? [];
  list.push({
    syntax,
    // The "See …" pointer becomes the row's Read more link.
    meaning: plain(m[2].replace(/\s*See \[[^\]]+\]\([^)]+\)\.?/g, '')),
    anchor: /\]\(#([\w-]+)\)/.exec(m[2])?.[1],
  });
  HELP.set(command, list);
}
