/**
 * Render each ```draft fence in the given Markdown files to an SVG beside the file, and keep an
 * image link to it directly under the fence.
 *
 *   node render.mjs <draftably-bin> <file.md>...
 *
 * The link sits under a marker comment, so a rerun replaces it instead of adding another one.
 * Files and SVGs are written only when their content changes.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';

const [bin, ...files] = process.argv.slice(2);
const MARKER = /^<!-- draftably: (.+\.svg) -->$/;
const temp = mkdtempSync(join(tmpdir(), 'draftably-'));
let changed = 0;
let failed = 0;

function write(path, text) {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  writeFileSync(path, text);
  console.log(`wrote ${path}`);
  changed++;
}

/** Reads key="value" pairs from a fence's {...} options, the same syntax @draftably/markdown uses. */
function options(info) {
  const result = {};
  for (const [, key, value] of info.matchAll(/([A-Za-z][\w-]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g))
    result[key] = value.replace(/\\(["\\])/g, '$1');
  return result;
}

function render(source, state) {
  const file = join(temp, 'fence.draft');
  writeFileSync(file, source);
  const args = ['inspect', file, '--svg', ...(state ? ['--state', state] : [])];
  return execFileSync(bin, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function renderFile(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const stem = basename(path, extname(path)).toLowerCase();
  const out = [];
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const open = /^(`{3,}|~{3,})draft(\s.*)?$/.exec(lines[i]);
    if (!open) continue;
    const close = lines.findIndex(
      (line, j) =>
        j > i &&
        line.startsWith(open[1][0].repeat(open[1].length)) &&
        !line.slice(open[1].length).trim(),
    );
    if (close === -1) break;
    const body = lines.slice(i + 1, close);
    out.push(...body, lines[close]);
    i = close;
    count++;

    const opts = options(open[2] ?? '');
    const name = `${opts.id ?? `${stem}-${count}`}.svg`;
    let svg;
    try {
      svg = render(`${body.join('\n')}\n`, opts.state);
    } catch (error) {
      console.error(`::error file=${path},line=${close + 1}::${error.stderr || error.message}`);
      failed++;
      continue;
    }
    write(join(dirname(path), name), svg);

    // Drop the link a previous run left: the marker and the image, each after an optional blank
    // line. The blank lines match what Prettier writes.
    let next = i + 1;
    if (lines[next] === '' && MARKER.test(lines[next + 1] ?? '')) next++;
    if (MARKER.test(lines[next] ?? '')) {
      i = next++;
      if (lines[next] === '' && lines[next + 1]?.startsWith('![')) next++;
      if (lines[next]?.startsWith('![')) i = next;
    }
    const title = /<title>([^<]*)<\/title>/
      .exec(svg)?.[1]
      .replace(
        /&(lt|gt|quot|#39|amp);/g,
        (_, e) => ({ lt: '<', gt: '>', quot: '"', '#39': "'", amp: '&' })[e],
      );
    const alt = opts.alt ?? (title && title !== 'Untitled diagram' ? title : 'Diagram');
    out.push('', `<!-- draftably: ${name} -->`, '', `![${alt.replace(/[[\]]/g, '\\$&')}](${name})`);
  }
  write(path, out.join('\n'));
  return count;
}

let fences = 0;
for (const file of files) fences += renderFile(file);
rmSync(temp, { recursive: true, force: true });
console.log(`${fences} fence(s) in ${files.length} file(s), ${changed} file(s) written`);
if (failed) {
  console.error(`${failed} fence(s) failed to render`);
  process.exit(1);
}
