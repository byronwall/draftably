import { open, unlink } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import type { ImportResult } from './import-core.js';

/** Create-only CLI handoff. Native validation is mandatory and runs before any write.
 * The foreign file is never opened for writing. Existing paths, including links,
 * are refused by wx; there is deliberately no force or overwrite option.
 */
export async function writeImportedDraft(options: {
  inputPath: string;
  outputPath: string;
  result: ImportResult;
  acceptLossy?: boolean;
  validateNative: (source: string) => Promise<void> | void;
}): Promise<string> {
  const { result } = options;
  if (result.status === 'failed' || result.nativeSource === undefined)
    throw new Error('IMPORT_FAILED: no native source is available.');
  if (result.status === 'needs-review' && !options.acceptLossy)
    throw new Error('IMPORT_REVIEW_REQUIRED: review diagnostics or explicitly accept the reported loss.');
  const input = resolve(options.inputPath);
  const output = resolve(options.outputPath);
  if (input === output) throw new Error('IMPORT_SAME_PATH: foreign input cannot be the output.');
  if (extname(output) !== '.draft')
    throw new Error('IMPORT_OUTPUT_EXTENSION: output must have the .draft extension.');
  await options.validateNative(result.nativeSource);
  const handle = await open(output, 'wx', 0o600);
  try {
    await handle.writeFile(result.nativeSource, 'utf8');
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await unlink(output).catch(() => undefined);
    throw error;
  }
  await handle.close();
  return output;
}
