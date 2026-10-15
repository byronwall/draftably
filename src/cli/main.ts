/**
 * Draftably command line: check, format and inspect `.meld` files, or edit them in the viewer.
 * Built with `vite build --ssr` so it shares the editor's model code; run it with `pnpm meld`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compile, type Diagnostic } from '../dsl/compile';
import { canonicalGeometry, projectScene } from '../dsl/project';
import { DslError, formatSource } from '../dsl/syntax';
import { renderSvg } from './svg';

const USAGE = `Usage: draftably <command> <file.meld> [options]

Commands:
  check <file>              Report source errors and layout diagnostics. Exits 1 on errors.
  format <file> [--write]   Print the formatted source, or rewrite the file in place.
  inspect <file> [--json]   Print canonical node and route geometry.
  inspect <file> --svg      Print a plain SVG drawing of the compiled diagram.
  open [file|folder]        Edit diagrams in the viewer; saves go back to the file.
       [--port N]           Without a file, start on a picker for the folder's diagrams,
                            a new diagram, or an example. --no-open skips the browser.
`;

const describe = (d: Diagnostic) =>
  `${d.level.padEnd(7)} ${d.line ? `line ${d.line}: ` : ''}${d.message}`;

function read(file: string | undefined) {
  if (!file) throw new UsageError('A .meld file is required.');
  return fs.readFileSync(path.resolve(file), 'utf8');
}

class UsageError extends Error {}

export async function main(argv: string[]): Promise<number> {
  const [command, file, ...rest] = argv;
  const flag = (name: string) => rest.includes(name);
  try {
    switch (command) {
      case 'check': {
        const scene = compile(read(file));
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
        const doc = projectScene(compile(read(file)));
        if (flag('--svg')) process.stdout.write(renderSvg(doc));
        else console.log(JSON.stringify(canonicalGeometry(doc), null, flag('--json') ? 0 : 2));
        return 0;
      }
      case 'open': {
        const { openSession } = await import('./open');
        const args = [file, ...rest].filter((a): a is string => !!a);
        const at = args.indexOf('--port');
        const port = at >= 0 ? Number(args[at + 1]) : 5180;
        if (!Number.isInteger(port) || port < 1 || port > 65535)
          throw new UsageError('--port must be an integer from 1 to 65535.');
        const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');
        await openSession(path.resolve(target ?? '.'), {
          port,
          launch: !args.includes('--no-open'),
        });
        return -1;
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
