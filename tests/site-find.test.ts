import { describe, expect, it } from 'vitest';
import { search } from '../site/docs/find';

// Task searches lead to the browser steps, not to format internals.
describe('docs search', () => {
  it.each([
    ['export png', 'export-a-png-svg-or-draft-file'],
    ['save diagram', 'export-a-png-svg-or-draft-file'],
    ['reopen image', 'reopen-a-diagram-from-an-image-or-file'],
  ])('%s', (query, id) => {
    const top = search(query)
      .slice(0, 3)
      .map(h => `${h.entry.page.slug}#${h.entry.id ?? ''}`);
    expect(top[0], top.join('\n')).toBe(`saving#${id}`);
  });
});
