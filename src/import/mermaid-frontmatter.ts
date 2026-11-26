/**
 * Where Mermaid frontmatter ends, by Mermaid 12.2.0's own rule (a port of `matchFrontMatter` in
 * its `src/diagram-api/frontmatter.ts`). Detection, the Markdown fence check and the importer all
 * use this, so each one finds the diagram where Mermaid does. No dependencies: the editor's
 * detection loads it.
 */

const space = /\s/;
const isBreak = (c: string | undefined) => c === '\n' || c === '\r';

/** The index of the last line break in the whitespace run from `from`, or -1. */
function lastBreak(text: string, from: number) {
  let index = -1;
  for (let i = from; i < text.length && space.test(text[i]); i++) if (isBreak(text[i])) index = i;
  return index;
}

export interface FrontmatterBlock {
  /** The opening fence's indentation, which Mermaid removes from each body line. */
  indent: string;
  /** The YAML text between the fences. */
  body: string;
  /** Characters the block takes, through the line break after the closing fence. */
  length: number;
}

/** Mermaid's text as its preprocessor sees it: no BOM, `\n` line breaks. */
export const mermaidText = (source: string) => source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

/** The frontmatter block at the start of `text`, or undefined when Mermaid would see none. */
export function matchFrontmatter(text: string): FrontmatterBlock | undefined {
  let cursor = 0;
  while (cursor < text.length && space.test(text[cursor]) && !isBreak(text[cursor])) cursor++;
  const indent = text.slice(0, cursor);
  if (!text.startsWith('---', cursor)) return undefined;
  const openingEnds: number[] = [];
  for (let i = cursor + 3; i < text.length && space.test(text[i]); i++)
    if (isBreak(text[i])) openingEnds.push(i);
  if (!openingEnds.length) return undefined;
  const fence = indent + '---';
  const closingEnd = (i: number) =>
    isBreak(text[i]) && text.startsWith(fence, i + 1) ? lastBreak(text, i + 1 + fence.length) : -1;
  let lastFence = -1;
  for (let i = openingEnds[0] + 1; i < text.length; i++) if (closingEnd(i) !== -1) lastFence = i;
  if (lastFence === -1) return undefined;
  let openingEnd = openingEnds[0];
  for (const candidate of openingEnds) if (candidate < lastFence) openingEnd = candidate;
  const bodyStart = openingEnd + 1;
  for (let i = bodyStart; i <= lastFence; i++) {
    const end = closingEnd(i);
    if (end !== -1) return { indent, body: text.slice(bodyStart, i), length: end + 1 };
  }
  return undefined;
}

/** The diagram text after any frontmatter, for family checks. */
export function afterFrontmatter(source: string): string {
  const text = mermaidText(source);
  return text.slice(matchFrontmatter(text)?.length ?? 0);
}
