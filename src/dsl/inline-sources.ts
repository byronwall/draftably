/**
 * Exports embed a self-contained `.draft`: `inlineSources` swaps each `src=` on a code node for an
 * inline body read from the files the host gave the compiler.
 */
import { CODE_TAB } from '../model/code';
import { langOf, parseSrc, srcBody, type CodeFiles } from '../model/code-src';
import { formatSource, printSource, readSource } from './syntax';

/** The paths every `src=` in `source` names, once each. */
export function srcPaths(source: string): string[] {
  const out = new Set<string>();
  for (const s of readSource(source).lines)
    if (s.kind === 'statement' && s.command === 'node') {
      const v = s.attrs.find(([k]) => k === 'src')?.[1].value,
        ref = v && parseSrc(v);
      if (ref) out.add(ref.path);
    }
  return [...out];
}

/** A closing tag that no body line equals. */
function tagFor(lines: string[]) {
  for (let n = 0; ; n++) {
    const tag = n ? `CODE${n}` : 'CODE';
    if (!lines.some(l => l.trim() === tag)) return tag;
  }
}

/**
 * `source` with each readable `src=` replaced by an inline body, formatted: what an export
 * embeds, so the image opens again without the original files. `lang=` and `start=` are written
 * when the file implied them, so the colors, line numbers and `range lines=` stay the same.
 * A `src=` whose file is missing stays as written.
 */
export function inlineSources(source: string, files: CodeFiles | undefined): string {
  if (!files || !Object.keys(files).length) return formatSource(source);
  const doc = readSource(source);
  for (const s of doc.lines) {
    if (s.kind !== 'statement' || s.command !== 'node') continue;
    const at = s.attrs.findIndex(([k]) => k === 'src');
    if (at < 0 || s.body) continue;
    const word = s.attrs[at][1],
      ref = parseSrc(word.value),
      file = ref && files[ref.path];
    if (!ref || !file || 'error' in file) continue;
    const tab = Number(s.attrs.find(([k]) => k === 'tab')?.[1].value ?? CODE_TAB),
      body = srcBody(word.value, ref, file, tab);
    if (body.placeholder) continue;
    const attrs = s.attrs.filter(([k]) => k !== 'src' && k !== 'tab'),
      has = (k: string) => attrs.some(([key]) => key === k),
      lang = langOf(ref.path),
      plain = (value: string) => ({ ...word, value, quoted: false });
    if (!has('lang') && lang) attrs.push(['lang', plain(lang)]);
    if (!has('start') && body.start !== 1) attrs.push(['start', plain(String(body.start))]);
    const tag = tagFor(body.lines);
    s.attrs = attrs;
    s.body = {
      tag,
      lines: body.lines.map(l => (l ? '  ' + l : '')),
      close: tag,
    };
  }
  return formatSource(printSource(doc));
}
