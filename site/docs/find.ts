/** Full-text search over the docs: one entry per page section, ranked by where the words match. */
import type { Tokens } from 'marked';
import { PAGES, plain, type Page } from './content';

export interface Entry {
  page: Page;
  /** The section's heading, or undefined for the text above the first heading. */
  heading?: string;
  id?: string;
  text: string;
  /** Lowercase text outside code blocks. */
  prose: string;
  /** Lowercase text of the code blocks. */
  code: string;
  /** The first word of each table row, in lowercase: what the row defines. */
  keys: string;
}

const ENTRIES: Entry[] = PAGES.flatMap(page => {
  const lead = plain(page.lead);
  const out: Entry[] = [{ page, text: lead, prose: lead.toLowerCase(), code: '', keys: '' }];
  for (const t of page.tokens) {
    if (t.type === 'heading') {
      const h = page.headings.find(h => h.id === (t as { id?: string }).id);
      const heading = h?.text ?? plain(t.text);
      out.push({ page, heading, id: h?.id, text: '', prose: '', code: '', keys: '' });
    } else if (t.type !== 'space') {
      const last = out[out.length - 1];
      const body = plain(t.type === 'code' ? (t as { text: string }).text : t.raw);
      last.text += ' ' + body;
      if (t.type === 'code') last.code += ' ' + body.toLowerCase();
      else last.prose += ' ' + body.toLowerCase();
      if (t.type === 'table') {
        for (const row of (t as Tokens.Table).rows)
          last.keys += ' ' + plain(row[0].text).split(' ')[0].toLowerCase();
      }
    }
  }
  return out;
});

/**
 * Words a visitor types, and the words the docs use for them. The typed word still counts first,
 * so a heading that uses it outranks these.
 */
const TASK_WORDS: Record<string, string[]> = {
  arrow: ['edge'],
  'back edge': ['feedback'],
  box: ['node'],
  change: ['pick', 'set', 'edit'],
  clipboard: ['paste', 'copy'],
  'class diagram': ['entity', 'cells'],
  codex: ['agent skill'],
  colour: ['color'],
  cycle: ['feedback'],
  dark: ['blueprint'],
  'dark mode': ['dark', 'blueprint'],
  delete: ['rm'],
  dotted: ['dashed'],
  download: ['export'],
  engine: ['choose'],
  'er diagram': ['entity', 'cells'],
  flowchart: ['flow'],
  'github actions': ['ci'],
  grey: ['gray'],
  'group layout': ['scopes'],
  horizontal: ['direction=right', 'direction'],
  hotkey: ['shortcut', 'keyboard'],
  icon: ['shape'],
  'keyboard shortcuts': ['shortcut', 'keyboard'],
  'layout a group': ['scopes'],
  logo: ['shape'],
  mcp: ['agent skill'],
  move: ['refinements', 'near', 'drag'],
  'not working': ['troubleshoot', 'problem', 'conflicts', 'error'],
  offline: ['browser storage'],
  pan: ['zoom'],
  'pick a layout': ['choose', 'engine'],
  privacy: ['browser storage'],
  remove: ['rm'],
  rename: ['mv'],
  save: ['export', 'download'],
  shortcut: ['keyboard'],
  spacing: ['gap'],
  swimlane: ['swim'],
  troubleshoot: ['problem', 'conflicts', 'error'],
  uml: ['sequence diagrams', 'entity'],
  update: ['install'],
  upgrade: ['update', 'install'],
  vertical: ['direction=down', 'direction'],
  'which engine': ['choose', 'engine'],
  'which layout': ['choose', 'engine'],
  zoom: ['pan'],
};

const PHRASES = Object.keys(TASK_WORDS).filter(k => k.includes(' '));

/** Words that say nothing about the task, ignored next to a word that does. */
const FILLER = new Set(['a', 'an', 'the', 'my', 'to', 'how', 'do', 'i']);

/** One list per thing the query asks for: the typed word, then the words the docs use for it. */
function wanted(query: string): string[][] {
  let rest = query.toLowerCase();
  const out: string[][] = [];
  for (const phrase of PHRASES) {
    if (!rest.includes(phrase)) continue;
    out.push([phrase, ...TASK_WORDS[phrase]]);
    rest = rest.replace(phrase, ' ');
  }
  const typed = rest.split(/\s+/).filter(w => w.length > 0);
  const kept = typed.filter(w => !FILLER.has(w));
  for (const w of kept.length || out.length ? kept : typed)
    out.push([w, ...(TASK_WORDS[w] ?? TASK_WORDS[w.replace(/s$/, '')] ?? [])]);
  return out;
}

/** The words to mark in a result, including the words the docs use for the typed ones. */
export const words = (query: string) => wanted(query).flat();

const literal = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A term as a whole word, or its plural. */
const whole = (term: string) =>
  new RegExp(`(?<![a-z0-9])${literal(term)}(?:e?s)?(?![a-z0-9])`, 'g');

/** A term inside a word. A short term must start the word, so `rm` does not match `format`. */
const inside = (term: string) =>
  term.length > 3 ? literal(term) : `(?<![a-z0-9])${literal(term)}`;

const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;

/** How well one term fits an entry: a heading beats a table row, prose, then sample code. */
function fit(entry: Entry, term: string): number {
  const word = whole(term);
  const part = new RegExp(inside(term));
  const title = entry.page.title.toLowerCase();
  const heading = entry.heading?.toLowerCase() ?? '';
  let score = 0;
  if (count(title, word)) score += entry.heading ? 4 : 12;
  if (count(heading, word)) score += 12;
  else if (part.test(heading)) score += 3;
  if (` ${entry.keys} `.includes(` ${term} `)) score += 6;
  const inProse = count(entry.prose, word);
  if (inProse) score += 2 + Math.min(3, inProse);
  if (count(entry.code, word)) score += 1;
  if (score) return score;
  return part.test(title) || part.test(entry.prose) || part.test(entry.code) ? 0.5 : 0;
}

export interface Hit {
  entry: Entry;
  snippet: string;
}

export function search(query: string, limit = 40): Hit[] {
  const asks = wanted(query);
  if (!asks.length) return [];
  const terms = asks.flat();
  const hits: { hit: Hit; score: number }[] = [];
  for (const entry of ENTRIES) {
    let score = 0;
    for (const [typed, ...others] of asks) {
      const best = Math.max(fit(entry, typed), ...others.map(t => 0.75 * fit(entry, t)));
      if (!best) {
        score = -1;
        break;
      }
      score += best;
    }
    if (score < 0) continue;
    // A heading that starts with the query's verb, such as "Export a PNG", is the task itself.
    if (terms.includes(entry.heading?.toLowerCase().split(/\W/)[0] ?? '')) score += 10;
    hits.push({ hit: { entry, snippet: snippet(entry.text, terms) }, score });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(h => h.hit);
}

/** About 150 characters of the text around the first match. */
function snippet(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  const first = (find: (term: string) => number) =>
    Math.min(...terms.map(find).filter(i => i >= 0), text.length);
  const word = first(t => lower.search(whole(t)));
  const at = word < text.length ? word : first(t => lower.search(inside(t)));
  if (at >= text.length) return text.slice(0, 150).trim();
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, at - 50)));
  const end = Math.min(text.length, start + 150);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

/** Split text into plain and matched runs, for `<mark>`. */
export function marks(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (!terms.length) return [{ text, match: false }];
  const longest = [...terms].sort((a, b) => b.length - a.length);
  const re = new RegExp(longest.map(inside).join('|'), 'gi');
  const out: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), match: false });
    out.push({ text: m[0], match: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}
