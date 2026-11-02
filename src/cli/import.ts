import fs from 'node:fs';
import path from 'node:path';
import { detectSource } from '../import/detect';
import { importDot } from '../import/dot-importer';
import { LIMITS } from '../import/import-core';
import { importInWorker } from './import-provider';

/** Convert a foreign file into native source without changing the original. */
export async function importFile(
  input: string,
  options: { from?: string; output?: string; acceptLossy: boolean },
  entry: URL,
): Promise<number> {
  if (options.from && !['dot', 'mermaid', 'd2'].includes(options.from))
    throw Error('Use --from dot, mermaid or d2.');
  const size = fs.statSync(input).size;
  if (size > LIMITS.sourceBytes) throw Error('Input must be at most 256 KiB.');
  const source = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(input));
  const detected = detectSource(source, {
    filename: input,
    ...(options.from ? { format: options.from as 'dot' | 'mermaid' | 'd2' } : {}),
  });
  if (detected.status !== 'detected' || !['dot', 'mermaid', 'd2'].includes(detected.format))
    throw Error('Choose a DOT, Mermaid or D2 file, or pass --from to select one.');
  const title = path.basename(input, path.extname(input));
  const result =
    detected.format === 'dot'
      ? importDot(detected.source, title)
      : await importInWorker(entry, detected.format as 'mermaid' | 'd2', detected.source, title);
  for (const diagnostic of result.diagnostics)
    console.error(`${diagnostic.severity}: ${diagnostic.message} [${diagnostic.code}]`);
  if (!result.nativeSource || result.status === 'failed') return 1;
  if (result.status === 'needs-review' && !options.acceptLossy) {
    console.error('Review the warnings, then pass --accept-lossy to import.');
    return 1;
  }
  if (!options.output) {
    process.stdout.write(result.nativeSource);
    return 0;
  }
  const output = path.resolve(options.output);
  if (output === path.resolve(input)) throw Error('The input and output must be different files.');
  if (path.extname(output) !== '.draft') throw Error('Output must have a .draft extension.');
  const fd = fs.openSync(output, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, result.nativeSource, 'utf8');
  } catch (error) {
    fs.closeSync(fd);
    fs.unlinkSync(output);
    throw error;
  }
  fs.closeSync(fd);
  console.error(`Wrote ${options.output}`);
  return 0;
}
