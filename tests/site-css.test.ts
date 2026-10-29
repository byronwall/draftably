import fs from 'node:fs';
import { expect, it } from 'vitest';

// A merge that drops one closing brace nests every rule after it inside the rule before, and CSS
// nesting accepts that silently: the site loses its styles with no error anywhere.
it('site.css opens no rule inside an ordinary rule', () => {
  const css = fs
    .readFileSync(new URL('../site/site.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const open: boolean[] = [];
  const nested: string[] = [];
  let text = '';
  for (const c of css) {
    if (c === '{') {
      const head = text.trim();
      if (open.at(-1) === false) nested.push(head);
      open.push(head.startsWith('@'));
      text = '';
    } else if (c === '}') {
      open.pop();
      text = '';
    } else if (c === ';') text = '';
    else text += c;
  }
  expect(nested).toEqual([]);
});
