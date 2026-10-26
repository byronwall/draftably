/**
 * Draftably command line: check, format and inspect `.draft` files, or edit them in the viewer.
 * Built with `vite build --ssr` so it shares the editor's model code; run it with `pnpm draftably`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compile, type Diagnostic } from '../dsl/compile';
import { compareSources } from '../dsl/compare';
import { canonicalGeometry, projectScene } from '../dsl/project';
import { DslError, formatSource } from '../dsl/syntax';
import { renderSvg } from './svg';

const USAGE = `Usage: draftably <command> <file.draft> [options]

Commands:
  check <file>              Report source errors and layout diagnostics. Exits 1 on errors.
  format <file> [--write]   Print the formatted source, or rewrite the file in place.
  inspect <file> [--json]   Print canonical node and route geometry.
  inspect <file> --svg      Print a plain SVG drawing of the compiled diagram.
  inspect <file> --png <out.png> [--scale 2]
                            Save the drawing as a PNG (needs Chrome or Chromium).
  compare <before> <after>  Print one file holding both versions, with + - ~ change marks.
       [--write <file>]     Save it instead of printing it.
       [--svg]              Print it as an SVG drawing instead.
       [--png <out.png>]    Save it as a PNG instead; --scale as for inspect.
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
  `${d.level.padEnd(7)} ${d.line ? `line ${d.line}: ` : ''}${d.message}`;

function read(file: string | undefined) {
  if (!file) throw new UsageError('A .draft file is required.');
  return fs.readFileSync(path.resolve(file), 'utf8');
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

/** Save `svg` as a PNG when `--png` is given; true if it was. */
async function maybePng(svg: () => string | Promise<string>, args: string[]) {
  const out = option(args, '--png');
  if (!out) return false;
  const scale = Number(option(args, '--scale') ?? 2);
  if (!(scale > 0 && scale <= 8)) throw new UsageError('--scale must be from 0 to 8.');
  const { writePng } = await import('./png');
  writePng(await svg(), out, scale);
  console.log(`Wrote ${out}.`);
  return true;
}

export async function main(argv: string[]): Promise<number> {
  const [command, file, ...rest] = argv;
  const flag = (name: string) => rest.includes(name);
  try {
    switch (command) {
      case 'check': {
        const scene = await compile(read(file));
        const errors = scene.diagnostics.filter(d => d.level === 'error');
        for (const d of scene.diagnostics) console.log(describe(d));
        const nodes = scene.objects.filter(o => o.type === 'node').length;
        console.log(
          `${errors.length ? 'Problems' : 'OK'}: ${nodes} nodes, ${scene.objects.length - nodes} groups, ${scene.edges.length} connections.`,
        );
        return errors.length ? 1 : 0;
      }
      case 'format': {
        const formatted = formatSource(read(file));
        if (flag('--write')) {
          fs.writeFileSync(path.resolve(file), formatted);
          console.log(`Formatted ${file}.`);
        } else process.stdout.write(formatted);
        return 0;
      }
      case 'inspect': {
        const doc = projectScene(await compile(read(file)));
        if (await maybePng(() => renderSvg(doc), rest)) return 0;
        if (flag('--svg')) process.stdout.write(renderSvg(doc));
        else console.log(JSON.stringify(canonicalGeometry(doc), null, flag('--json') ? 0 : 2));
        return 0;
      }
      case 'compare': {
        const merged = compareSources(read(file), read(rest[0]));
        const draw = async () => renderSvg(projectScene(await compile(merged)));
        const out = option(rest, '--write');
        if (await maybePng(draw, rest)) return 0;
        if (out) {
          fs.writeFileSync(path.resolve(out), merged);
          console.log(`Wrote ${out}.`);
        } else if (flag('--svg')) process.stdout.write(await draw());
        else process.stdout.write(merged);
        return 0;
      }
      case 'open': {
        const { openSession } = await import('./open');
        const args = [file, ...rest].filter((a): a is string => !!a);
        const at = args.indexOf('--port');
        const port = at >= 0 ? Number(args[at + 1]) : 5180;
        if (!Number.isInteger(port) || port < 0 || port > 65535)
          throw new UsageError('--port must be an integer from 0 to 65535.');
        const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');
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

void main(process.argv.slice(2)).then(code => {
  if (code >= 0) process.exitCode = code;
});
