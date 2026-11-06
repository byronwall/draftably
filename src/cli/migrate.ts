import fs from 'node:fs';
import path from 'node:path';
import type { ImportResult } from '../import/import-core';
import { importInWorker } from './import-provider';

type Convert = (source: string) => Promise<ImportResult>;

/** What happened to one ```mermaid fence. `line` is the fence's opening line. */
export interface FenceReport {
  line: number;
  status: 'converted' | 'kept' | 'skipped' | 'failed';
  family: string;
  messages: string[];
}

const DRAFTABLE = /^\s*(?:flowchart|graph|sequenceDiagram)\b/;
const OUTCOME = {
  converted: 'converted',
  kept: 'stays Mermaid (warnings; --accept-lossy converts it)',
  skipped: 'stays Mermaid (no Draftably conversion)',
  failed: 'stays Mermaid (import failed)',
};
const MARKDOWN = new Set(['.md', '.mdx', '.markdown']);

/**
 * Rewrite flowchart and sequence ```mermaid fences in Markdown text as ```draft fences.
 * Other families stay as they are. A fence with importer warnings stays unless `acceptLossy`.
 */
export async function migrateText(
  text: string,
  convert: Convert,
  acceptLossy = false,
): Promise<{ text: string; fences: FenceReport[] }> {
  const lines = text.split('\n');
  const out: string[] = [];
  const fences: FenceReport[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^( {0,3})(`{3,}|~{3,})\s*mermaid\s*\r?$/i.exec(lines[i]!);
    const closes = (l: string) => {
      const m = l.trimEnd().replace(/^ {0,3}/, '');
      return m.length >= open![2]!.length && [...m].every(c => c === open![2]![0]);
    };
    const close = open && lines.findIndex((l, j) => j > i && closes(l));
    if (!open || close === null || close < 0) {
      out.push(lines[i]!);
      continue;
    }
    const [, indent, mark] = open;
    const body = lines
      .slice(i + 1, close)
      .map(l => l.replace(new RegExp(`^ {0,${indent!.length}}`), ''));
    const source = body.join('\n').replace(/\r$/gm, '');
    const firstLine = body.find(l => l.trim() && !l.trimStart().startsWith('%%')) ?? '';
    const report: FenceReport = {
      line: i + 1,
      status: 'skipped',
      family: firstLine.trim().split(/\s+/)[0] || 'empty',
      messages: [],
    };
    fences.push(report);
    let converted: string | undefined;
    if (DRAFTABLE.test(firstLine)) {
      const result = await convert(source);
      report.messages = result.diagnostics.map(d => `${d.severity}: ${d.message} [${d.code}]`);
      if (!result.nativeSource || result.status === 'failed') report.status = 'failed';
      else if (result.status === 'needs-review' && !acceptLossy) report.status = 'kept';
      else {
        report.status = 'converted';
        // Mermaid fences have no title; a placeholder would draw above every diagram.
        converted = result.nativeSource.replace(/^diagram "Imported Mermaid".*\n/, '').trimEnd();
      }
    }
    if (converted === undefined) out.push(...lines.slice(i, close + 1));
    else
      out.push(
        `${indent}${mark}draft`,
        ...converted.split('\n').map(l => (l ? indent + l : l)),
        lines[close]!,
      );
    i = close;
  }
  return { text: out.join('\n'), fences };
}

/** Markdown files named by paths, folders (searched recursively) or glob patterns. */
export function markdownFiles(patterns: string[]): string[] {
  const files = patterns.flatMap(p => {
    if (/[*?[{]/.test(p)) return fs.globSync(p);
    if (fs.statSync(p).isDirectory())
      return fs.globSync('**/*.{md,mdx,markdown}', { cwd: p }).map(f => path.join(p, f));
    return [p];
  });
  return [...new Set(files)]
    .filter(f => !f.split(path.sep).includes('node_modules'))
    .filter(f => MARKDOWN.has(path.extname(f).toLowerCase()) && fs.statSync(f).isFile())
    .sort();
}

/** `draftably migrate`: print what would change, or rewrite the files with `write`. */
export async function migrateFiles(
  patterns: string[],
  options: { write: boolean; acceptLossy: boolean },
  entry: URL,
): Promise<number> {
  const files = markdownFiles(patterns);
  if (!files.length) throw Error('No Markdown files match.');
  const convert: Convert = source => importInWorker(entry, 'mermaid', source, 'Imported Mermaid');
  const totals = { converted: 0, kept: 0, skipped: 0, failed: 0 };
  let changed = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    if (!/mermaid/i.test(before)) continue;
    const { text, fences } = await migrateText(before, convert, options.acceptLossy);
    if (!fences.length) continue;
    const count = (s: FenceReport['status']) => fences.filter(f => f.status === s).length;
    for (const s of ['converted', 'kept', 'skipped', 'failed'] as const) totals[s] += count(s);
    console.log(
      `${file}: ${fences.length} mermaid, ${count('converted')} converted` +
        (count('kept') ? `, ${count('kept')} kept for warnings` : '') +
        (count('skipped') ? `, ${count('skipped')} other families` : '') +
        (count('failed') ? `, ${count('failed')} failed` : ''),
    );
    for (const f of fences) {
      console.log(`  line ${f.line} ${f.family}: ${OUTCOME[f.status]}`);
      for (const m of f.messages) console.log(`    ${m}`);
    }
    if (text !== before) {
      changed++;
      if (options.write) fs.writeFileSync(file, text);
    }
  }
  const verb = options.write ? 'Rewrote' : 'Would rewrite';
  console.log(
    `${verb} ${changed} file${changed === 1 ? '' : 's'}: ${totals.converted} converted, ` +
      `${totals.kept} kept for warnings, ${totals.skipped} other families, ${totals.failed} failed.`,
  );
  if (!options.write && changed) console.log('Pass --write to apply.');
  if (totals.kept) console.log('Pass --accept-lossy to convert fences with warnings.');
  return totals.failed ? 1 : 0;
}
