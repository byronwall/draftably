/** Full-text search over the docs: one entry per page section, ranked by where the words match. */
import { PAGES, plain, type Page } from './content';

export interface Entry {
  page: Page;
  /** The section's heading, or undefined for the text above the first heading. */
  heading?: string;
  id?: string;
  text: string;
}

const ENTRIES: Entry[] = PAGES.flatMap(page => {
  const out: Entry[] = [{ page, text: plain(page.lead) }];
  for (const t of page.tokens) {
    if (t.type === 'heading') {
      const h = page.headings.find(h => h.id === (t as { id?: string }).id);
      out.push({ page, heading: h?.text ?? plain(t.text), id: h?.id, text: '' });
    } else if (t.type !== 'space') {
      const last = out[out.length - 1];
      last.text += ' ' + plain(t.type === 'code' ? (t as { text: string }).text : t.raw);
    }
  }
  return out;
});

export const words = (query: string) =>
  query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0);

/** Words a visitor types for the verb a task heading starts with. */
const VERBS: Record<string, string[]> = { save: ['export', 'download'], download: ['export'] };

export interface Hit {
  entry: Entry;
  snippet: string;
}

export function search(query: string, limit = 40): Hit[] {
  const terms = words(query);
  if (!terms.length) return [];
  const hits: { hit: Hit; score: number }[] = [];
  const verbs = new Set(terms.flatMap(t => [t, ...(VERBS[t] ?? [])]));
  for (const entry of ENTRIES) {
    const title = `${entry.page.title} ${entry.heading ?? ''}`.toLowerCase();
    const text = entry.text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const inTitle = title.includes(term);
      const at = text.indexOf(term);
      if (!inTitle && at < 0) {
        score = -1;
        break;
      }
      if (entry.page.title.toLowerCase().includes(term)) score += entry.heading ? 4 : 12;
      if (entry.heading?.toLowerCase().includes(term)) score += 8;
      if (at >= 0) score += 1 + Math.min(3, text.split(term).length - 2);
    }
    if (score < 0) continue;
    // A heading that starts with the query's verb, such as "Export a PNG", is the task itself.
    if (verbs.has(entry.heading?.toLowerCase().split(/\W/)[0] ?? '')) score += 10;
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
  const at = Math.min(...terms.map(t => lower.indexOf(t)).filter(i => i >= 0), text.length);
  if (at >= text.length) return text.slice(0, 150).trim();
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, at - 50)));
  const end = Math.min(text.length, start + 150);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

/** Split text into plain and matched runs, for `<mark>`. */
export function marks(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (!terms.length) return [{ text, match: false }];
  const re = new RegExp(terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
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
