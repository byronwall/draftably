/**
 * `draftably vary`: write layout variants of a file as one contact sheet, one PNG each and
 * `variants.json`, and print a ranked table; `--apply` writes one variant back to the file.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { formatSource } from '../dsl/syntax';
import {
  applyEdits,
  FITS,
  vary,
  type Edit,
  type LineChange,
  type Metrics,
  type Variant,
  type VaryOptions,
  type VaryResult,
} from './variants';
import { writePng } from './png';

const hash = (source: string) => createHash('sha256').update(source).digest('hex').slice(0, 16);

/** Where a file's variants go unless `--out` names a folder: `<name>.vary/` beside the file. */
export const outDir = (file: string, out?: string) =>
  path.resolve(out ?? file.replace(/\.\w+$/, '') + '.vary');

interface Saved {
  file: string;
  source: string;
  mode: VaryResult['mode'];
  prefer: string;
  recommended: string;
  failed: VaryResult['failed'];
  tried: number;
  skipped: number;
  shape: VaryResult['shape'];
  variants: Array<Variant & { png: string }>;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const sizeText = (m: Metrics) => `${m.width}×${m.height}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A change from the current file, signed: `+2`, `-8%`. */
function delta(now: number, base: number, percent = false) {
  if (now === base) return '';
  if (!percent) return ` (${now > base ? '+' : ''}${now - base})`;
  const p = Math.round(((now - base) / base) * 100);
  return p ? ` (${p > 0 ? '+' : ''}${p}%)` : '';
}

/** One SVG with every variant as a labeled tile, rasterized once. */
function contactSheet(result: VaryResult) {
  const list = result.variants,
    cols = list.length <= 2 ? list.length : list.length <= 4 ? 2 : list.length <= 9 ? 3 : 4,
    rows = Math.ceil(list.length / cols),
    tw = 560,
    th = 380,
    band = 52,
    pad = 20;
  const w = cols * (tw + pad) + pad,
    h = rows * (th + band + pad) + pad;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="${w}" height="${h}" fill="#f4f4f1"/>`,
  ];
  list.forEach((v, i) => {
    const x = pad + (i % cols) * (tw + pad),
      y = pad + Math.floor(i / cols) * (th + band + pad),
      svg = result.drawn.get(v.id)!.svg,
      m = v.metrics!,
      chosen = v.id === result.recommended;
    out.push(
      `<rect x="${x}" y="${y}" width="${tw}" height="${th + band}" rx="8" fill="#fff" stroke="${chosen ? '#2f6fde' : '#d4d4ce'}" stroke-width="${chosen ? 3 : 1}"/>`,
      `<text x="${x + 14}" y="${y + 22}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#1d1d1b">${esc(`${v.id} · ${v.title}`)}${chosen ? ' ★' : ''}</text>`,
      `<text x="${x + 14}" y="${y + 42}" font-family="system-ui, sans-serif" font-size="13" fill="#5d5d58">${esc(`${plural(m.crossings, 'crossing')} · ${plural(m.bends, 'bend')} · ${sizeText(m)} · ${plural(m.warnings, 'warning')}`)}</text>`,
      `<image x="${x + 8}" y="${y + band}" width="${tw - 16}" height="${th - 8}" preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"/>`,
    );
  });
  out.push('</svg>');
  return out.join('\n');
}

/** The stdout table: one row per variant, with changes from the current file. */
function table(result: VaryResult, file: string, dir: string, opts: RunOptions) {
  const base = result.variants[0].metrics!,
    fit = opts.fit;
  const rows = [
    [
      'id',
      'change',
      'crossings',
      'bends',
      'size',
      ...(fit ? ['aspect'] : []),
      'warnings',
      'moved',
      'notes',
    ],
    ...result.variants.map(v => {
      const m = v.metrics!;
      return [
        v.id,
        v.title,
        `${m.crossings}${delta(m.crossings, base.crossings)}`,
        `${m.bends}${delta(m.bends, base.bends)}`,
        `${sizeText(m)}${delta(m.width * m.height, base.width * base.height, true)}`,
        ...(fit ? [(m.width / m.height).toFixed(2)] : []),
        `${m.warnings}${delta(m.warnings, base.warnings)}`,
        v.id === 'v0' ? '' : `${m.moved}px`,
        v.tags.join(', '),
      ];
    }),
  ];
  const widths = rows[0].map((_, i) => Math.max(...rows.map(r => r[i].length)));
  const lines = rows.map(r =>
    r
      .map((c, i) => c.padEnd(widths[i]))
      .join('  ')
      .trimEnd(),
  );
  const rel = path.relative(process.cwd(), dir) || '.';
  const kept = ['suggest', 'from'].includes(result.mode)
      ? `${result.variants.length - 1} kept`
      : `${result.mode}`,
    goal = [
      ...(opts.from ? [`around ${opts.from.id}`] : []),
      ...(fit ? [`fit ${fit} (aspect ${FITS[fit]})`] : []),
      ...(opts.prefer ? [`prefer ${opts.prefer}`] : []),
    ];
  lines.unshift(
    `${result.tried} variants tried (${kept}${goal.length ? '; ' + goal.join(', ') : ''}). Sheet: ${path.join(rel, 'contact-sheet.png')}`,
  );
  for (const v of result.variants.slice(1)) lines.push(`${v.id}: ${v.why}.`);
  for (const f of result.failed) lines.push(`Failed: ${f.title}: ${f.error}`);
  if (result.skipped)
    lines.push(
      `Budget ran out: ${result.skipped} more variant${result.skipped > 1 ? 's' : ''} not tried. Raise --budget to try them.`,
    );
  lines.push(
    result.recommended === 'v0'
      ? `Recommended: keep the current layout; no variant is as good on warnings, crossings and ${fit ? `fit to ${fit}` : 'size'}.`
      : `Recommended: ${result.recommended}. Apply: draftably vary ${file} --apply ${result.recommended}`,
  );
  return lines.join('\n');
}

export interface RunOptions extends VaryOptions {
  out?: string;
  json?: boolean;
  /** Leave the source out of the PNGs. */
  noSource?: boolean;
}

/** Generate, measure and write variants of `file`. */
export async function runVary(file: string, source: string, opts: RunOptions) {
  // One line per variant on stderr as it finishes, so a long run shows it is working and stdout
  // stays the table (or JSON).
  const result = await vary(source, {
    progress: ({ title, metrics: m, error, ms }, left) =>
      console.error(
        `  ${title}: ${m ? `${plural(m.crossings, 'crossing')}, ${sizeText(m)}` : `failed (${error})`}, ${(ms / 1000).toFixed(1)}s${left ? `; ${left} to go` : ''}`,
      ),
    ...opts,
  });
  const dir = outDir(file, opts.out);
  fs.mkdirSync(dir, { recursive: true });
  for (const old of fs.readdirSync(dir))
    if (/^v\d+\.png$/.test(old)) fs.rmSync(path.join(dir, old));
  await Promise.all([
    writePng(contactSheet(result), path.join(dir, 'contact-sheet.png'), 1),
    ...[...result.drawn].map(([id, d]) =>
      writePng(
        d.svg,
        path.join(dir, `${id}.png`),
        2,
        opts.noSource ? undefined : formatSource(d.source),
      ),
    ),
  ]);
  const saved: Saved = {
    file: path.resolve(file),
    source: hash(source),
    mode: result.mode,
    prefer: opts.prefer ?? 'fewer-crossings',
    recommended: result.recommended,
    failed: result.failed,
    tried: result.tried,
    skipped: result.skipped,
    shape: result.shape,
    variants: result.variants.map(v => ({ ...v, png: path.join(dir, `${v.id}.png`) })),
  };
  fs.writeFileSync(path.join(dir, 'variants.json'), JSON.stringify(saved, null, 2) + '\n');
  console.log(opts.json ? JSON.stringify(saved, null, 2) : table(result, file, dir, opts));
}

/**
 * Variant `id` (or `best`) from the last run on `file`. Refuses when the file changed since that
 * run, since the variant's numbers no longer describe it.
 */
export function savedVariant(file: string, source: string, id: string, out?: string) {
  const at = path.join(outDir(file, out), 'variants.json');
  if (!fs.existsSync(at)) throw Error(`No variants for ${file}. Run draftably vary ${file} first.`);
  const saved = JSON.parse(fs.readFileSync(at, 'utf8')) as Saved;
  if (saved.source !== hash(source))
    throw Error(`${file} changed since its variants were made. Run draftably vary ${file} again.`);
  const pick = id === 'best' ? saved.recommended : id,
    v = saved.variants.find(x => x.id === pick);
  if (!v) throw Error(`No variant ${pick}. Variants: ${saved.variants.map(x => x.id).join(', ')}.`);
  return v;
}

const describe = (c: LineChange) =>
  [
    ...(c.before !== undefined ? [`- ${c.line ? `line ${c.line}: ` : ''}${c.before}`] : []),
    ...(c.after !== undefined ? [`+ ${c.line ? `line ${c.line}: ` : 'new: '}${c.after}`] : []),
  ].join('\n');

/**
 * Write variant `id` (or `best`, the recommended one) from the last run back to `file`. Returns
 * the changed lines. Refuses when the file changed since that run, since the variant's numbers
 * no longer describe it.
 */
export function applyVariant(file: string, source: string, id: string, out?: string) {
  const v = savedVariant(file, source, id, out),
    pick = v.id;
  if (!v.edits.length)
    return {
      id: pick,
      changes: [] as LineChange[],
      text: 'v0 is the current file; nothing to change.',
    };
  const { source: next, changes } = applyEdits(source, v.edits as Edit[]);
  fs.writeFileSync(path.resolve(file), next);
  return { id: pick, changes, text: changes.map(describe).join('\n') };
}
