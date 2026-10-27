/**
 * Draftably command line: check, format and inspect `.draft` files, or edit them in the viewer.
 * Built with `vite build --ssr` so it shares the editor's model code; run it with `pnpm draftably`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compile, type Diagnostic } from '../dsl/compile';
import { compareDetailed } from '../dsl/compare';
import { hintMoves, sceneConflicts } from '../dsl/conflicts';
import { statusLabel, usedStatuses, withState } from '../model/status';
import type { Diagram } from '../model/types';
import { canonicalGeometry, projectScene } from '../dsl/project';
import { DslError, formatSource } from '../dsl/syntax';
import { embedSvgSource, isImageName, readImageSource } from '../model/embed';
import { renderSvg } from './svg';
import { linkNotes, svgHref } from './links';

const USAGE = `Usage: draftably <command> <file.draft> [options]

Any <file> may also be a PNG or SVG that Draftably exported: its embedded source is read.

Commands:
  check <file>              Report source errors, layout diagnostics and drawing conflicts
       [--hints]            (a line through a box, overlapping boxes or labels). Exits 1 on
                            errors. --hints adds how far each refinement moved its target.
  format <file> [--write]   Print the formatted source, or rewrite the file in place.
  inspect <file> [--json]   Print canonical node and route geometry. --json prints it on one
       [--hints]            line; with --hints it adds the unrefined position (raw) of every
                            node a refinement moved.
  inspect <file> --svg      Print a plain SVG drawing of the compiled diagram.
       [--state <id>]       Draw it in one emphasis state (also with --png).
       [--states]           Draw every emphasis state as its own aligned panel.
  inspect <file> --png <out.png> [--scale 2]
                            Save the drawing as a PNG (needs Chrome or Chromium).
                            PNG and SVG output embed the source; --no-source leaves it out.
  compare <before> <after>  Print one file holding both versions, with + - ~ change marks.
       [--write <file>]     Save it instead of printing it.
       [--svg]              Print it as an SVG drawing instead.
       [--png <out.png>]    Save it as a PNG instead; --scale as for inspect.
  extract <image>           Print the .draft source embedded in a PNG or SVG export.
       [--write <file>]     Save it instead of printing it.
  open [file|folder]        Edit diagrams in the viewer; saves go back to the file.
       [--port N]           Without a file, start on a picker for the folder's diagrams,
                            a new diagram, or an example. --no-open skips the browser.
                            Uses the first free port from 5180 unless --port is given;
                            --port 0 picks any free port. The Viewer line has the URL.
  skill install             Install the agent skill for writing .draft files into
       [--global]           ./.claude/skills/draftably, or ~/.claude/skills with --global.
       [--dir <folder>]     --dir picks another skills folder (e.g. .agents/skills);
       [--force]            --force replaces an existing copy.
  skill print               Print the skill's SKILL.md.
`;

const describe = (d: Diagnostic) =>
  `${d.level.padEnd(7)} ${d.line ? `line ${d.line}: ` : ''}${d.message}${d.level === 'warning' ? ` [${d.code}]` : ''}`;

/** `check --hints`: one row per refinement target, then objects pushed by them. */
function hintTable({ rows, pushed }: Awaited<ReturnType<typeof hintMoves>>) {
  if (!rows.length) return 'No refinements.';
  const xy = (p: { x: number; y: number }) => `${Math.round(p.x)},${Math.round(p.y)}`;
  const table = [
    ['id', 'refinement', 'raw x,y', 'final x,y', 'delta'],
    ...rows.map(r => [r.id, `${r.hint} line ${r.line}`, xy(r.raw), xy(r.final), `${r.delta}px`]),
  ];
  const widths = table[0].map((_, i) => Math.max(...table.map(row => row[i].length)));
  const lines = table.map(row =>
    row
      .map((c, i) => c.padEnd(widths[i]))
      .join('  ')
      .trimEnd(),
  );
  if (pushed.length)
    lines.push(`Also moved by refinements: ${pushed.map(p => `${p.id} ${p.delta}px`).join(', ')}.`);
  return lines.join('\n');
}

/** A file's source; a PNG or SVG export gives the source embedded in it. */
async function read(file: string | undefined) {
  if (!file) throw new UsageError('A .draft file is required.');
  if (!isImageName(file)) return fs.readFileSync(path.resolve(file), 'utf8');
  const source = await readImageSource(fs.readFileSync(path.resolve(file)));
  if (source === null)
    throw Error(
      `${file} has no embedded Draftably source. It was exported with --no-source, by another tool, or recompressed by a host.`,
    );
  return source;
}

class UsageError extends Error {}

/** The value after `name` in `args`, if the option is given. */
function option(args: string[], name: string) {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const value = args[at + 1];
  if (!value || value.startsWith('--')) throw new UsageError(`${name} needs a value.`);
  return value;
}

/** The document in emphasis state `id`, or as it is without one. */
function drawnState(doc: Diagram, id: string | undefined) {
  if (id === undefined) return doc;
  const ids = doc.appearance.states?.map(s => s.id) ?? [];
  if (!ids.includes(id))
    throw new UsageError(
      ids.length ? `No state ${id}. States: ${ids.join(', ')}.` : 'The file has no state lines.',
    );
  return withState(doc, id);
}

/** Save `svg` as a PNG when `--png` is given, with `source` in it; true if it was. */
async function maybePng(svg: () => string | Promise<string>, args: string[], source?: string) {
  const out = option(args, '--png');
  if (!out) return false;
  const scale = Number(option(args, '--scale') ?? 2);
  if (!(scale > 0 && scale <= 8)) throw new UsageError('--scale must be from 0 to 8.');
  const { writePng } = await import('./png');
  await writePng(await svg(), out, scale, source);
  console.log(`Wrote ${out}.`);
  return true;
}

export async function main(argv: string[]): Promise<number> {
  const [command, file, ...rest] = argv;
  const flag = (name: string) => rest.includes(name);
  /** The source to embed in an exported image, unless `--no-source` is given. */
  const embed = (source: string) => (flag('--no-source') ? undefined : formatSource(source));
  const withSource = (svg: string, source: string) => {
    const kept = embed(source);
    return kept === undefined ? svg : embedSvgSource(svg, kept);
  };
  try {
    switch (command) {
      case 'check': {
        const source = await read(file),
          scene = await compile(source);
        const diagnostics = [
          ...scene.diagnostics,
          ...linkNotes(scene, file),
          ...sceneConflicts(scene),
        ];
        const errors = diagnostics.filter(d => d.level === 'error'),
          warnings = diagnostics.filter(d => d.level === 'warning');
        for (const d of diagnostics) console.log(describe(d));
        if (flag('--hints')) console.log(hintTable(await hintMoves(source, scene)));
        const nodes = scene.objects.filter(o => o.type === 'node').length;
        console.log(
          `${errors.length ? 'Problems' : warnings.length ? 'Warnings' : 'OK'}: ${nodes} nodes, ${scene.objects.length - nodes} groups, ${scene.edges.length} connections.`,
        );
        return errors.length ? 1 : 0;
      }
      case 'format': {
        const formatted = formatSource(await read(file));
        if (flag('--write')) {
          if (isImageName(file!))
            throw new UsageError('format --write rewrites a .draft file only.');
          fs.writeFileSync(path.resolve(file), formatted);
          console.log(`Formatted ${file}.`);
        } else process.stdout.write(formatted);
        return 0;
      }
      case 'inspect': {
        const source = await read(file),
          scene = await compile(source),
          doc = drawnState(projectScene(scene), option(rest, '--state')),
          opts = { href: svgHref(scene, file), states: flag('--states') };
        if (opts.states) {
          if (!doc.appearance.states?.length) throw new UsageError('The file has no state lines.');
          if (doc.appearance.compare)
            throw new UsageError('--states draws panels, and so does compare; use one at a time.');
        }
        if (await maybePng(() => renderSvg(doc, opts), rest, embed(source))) return 0;
        if (flag('--svg')) process.stdout.write(withSource(renderSvg(doc, opts), source));
        else if (flag('--json') && flag('--hints')) {
          const geometry = canonicalGeometry(doc),
            { rows, pushed } = await hintMoves(source, scene);
          const raw = new Map([...rows, ...pushed].filter(r => r.delta).map(r => [r.id, r.raw]));
          for (const n of geometry.nodes)
            if (raw.has(n.id)) Object.assign(n, { raw: raw.get(n.id) });
          console.log(JSON.stringify(geometry));
        } else console.log(JSON.stringify(canonicalGeometry(doc), null, flag('--json') ? 0 : 2));
        return 0;
      }
      case 'compare': {
        const { merged, moved } = compareDetailed(await read(file), await read(rest[0]));
        const doc = projectScene(await compile(merged)),
          draw = async () => renderSvg(doc);
        const out = option(rest, '--write');
        // The size of the change goes to stderr, so stdout stays a clean file or drawing.
        const sizes = usedStatuses(doc).filter(s => s.status !== 'context');
        console.error(sizes.length ? sizes.map(statusLabel).join(', ') + '.' : 'No changes.');
        if (moved.length)
          console.error(
            `Groups moved to another container: ${moved.join(', ')}. Both panels draw them where they are now.`,
          );
        if (await maybePng(draw, rest, embed(merged))) return 0;
        if (out) {
          fs.writeFileSync(path.resolve(out), merged);
          console.log(`Wrote ${out}.`);
        } else if (flag('--svg')) process.stdout.write(withSource(await draw(), merged));
        else process.stdout.write(merged);
        return 0;
      }
      case 'extract': {
        if (!file || !isImageName(file)) throw new UsageError('extract needs a .png or .svg file.');
        const source = await read(file),
          out = option(rest, '--write');
        if (out) {
          fs.writeFileSync(path.resolve(out), source);
          console.log(`Wrote ${out}.`);
        } else process.stdout.write(source);
        return 0;
      }
      case 'open': {
        const { openSession } = await import('./open');
        const args = [file, ...rest].filter((a): a is string => !!a);
        const at = args.indexOf('--port');
        const port = at >= 0 ? Number(args[at + 1]) : 5180;
        if (!Number.isInteger(port) || port < 0 || port > 65535)
          throw new UsageError('--port must be an integer from 0 to 65535.');
        let target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');
        // An image opens through a .draft beside it, since the viewer saves edits to a file.
        if (target && isImageName(target)) {
          const source = await read(target),
            draft = target.replace(/\.\w+$/, '.draft');
          if (!fs.existsSync(draft)) {
            fs.writeFileSync(draft, source);
            console.log(`Wrote ${draft} from the source in ${target}.`);
          } else if (fs.readFileSync(draft, 'utf8') !== source)
            throw Error(
              `${draft} already exists with other content. Use extract --write to pick a new name.`,
            );
          target = draft;
        }
        await openSession(path.resolve(target ?? '.'), {
          port,
          portGiven: at >= 0,
          launch: !args.includes('--no-open'),
        });
        return -1;
      }
      case 'skill': {
        const { installSkill, skillSource } = await import('./skill');
        if (file === 'print') {
          process.stdout.write(fs.readFileSync(path.join(skillSource(), 'SKILL.md'), 'utf8'));
          return 0;
        }
        if (file !== 'install') throw new UsageError('Use skill install or skill print.');
        const at = rest.indexOf('--dir');
        const dir = at >= 0 ? rest[at + 1] : undefined;
        if (at >= 0 && (!dir || dir.startsWith('--')))
          throw new UsageError('--dir needs a folder.');
        const target = installSkill({
          cwd: process.cwd(),
          dir,
          global: flag('--global'),
          force: flag('--force'),
        });
        console.log(`Installed the draftably skill to ${target}.`);
        return 0;
      }
      default:
        console.log(USAGE);
        return command && command !== 'help' && command !== '--help' ? 2 : 0;
    }
  } catch (error) {
    if (error instanceof DslError) console.error(`error   ${error.message}`);
    else if (error instanceof UsageError) console.error(error.message + '\n\n' + USAGE);
    else console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

// Tests import `main` and call it themselves.
if (!process.env.VITEST)
  void main(process.argv.slice(2)).then(code => {
    if (code >= 0) process.exitCode = code;
  });
