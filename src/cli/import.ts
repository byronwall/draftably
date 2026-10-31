import fs from 'node:fs';
import path from 'node:path';
import { detectSource } from '../import/detect';
import { importDot } from '../import/dot-importer';
import { LIMITS } from '../import/import-core';

/** Convert a foreign file into native source without changing the original. */
export function importFile(
  input: string,
  options: { from?: string; output?: string; acceptLossy: boolean },
): number {
  if (options.from && options.from !== 'dot') throw Error('Only --from dot is supported for now.');
  const size = fs.statSync(input).size;
  if (size > LIMITS.sourceBytes) throw Error('Input must be at most 256 KiB.');
  const source = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(input));
  const detected = detectSource(source, {
    filename: input,
    ...(options.from ? { format: 'dot' as const } : {}),
  });
  if (detected.status !== 'detected' || detected.format !== 'dot')
    throw Error('Choose a DOT file or pass --from dot. Other formats are not available yet.');
  const result = importDot(detected.source, path.basename(input, path.extname(input)));
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
