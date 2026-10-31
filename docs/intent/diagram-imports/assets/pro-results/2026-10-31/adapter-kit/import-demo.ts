/** Executable research harness, NOT a patch to draftably's production CLI.
 * Run compiled JS with node --import tsx so the trusted native checkout can load TS.
 */
import { open } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { detectSource, type KnownFormat } from './detect.js';
import { LIMITS, type ImportResult } from './import-core.js';
import { writeImportedDraft } from './safe-output.js';

async function readBounded(path: string): Promise<string> {
  const handle = await open(path, 'r');
  try {
    if (!(await handle.stat()).isFile()) throw new Error('Input must be a regular text file.');
    const buffer = Buffer.alloc(LIMITS.sourceBytes + 1);
    let length = 0;
    while (length < buffer.length) {
      const read = await handle.read(buffer, length, buffer.length - length, length);
      if (read.bytesRead === 0) break;
      length += read.bytesRead;
    }
    if (length > LIMITS.sourceBytes) throw new Error('Input exceeds 256 KiB.');
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length));
  } finally { await handle.close(); }
}

async function run(): Promise<number> {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    from: { type: 'string' }, output: { type: 'string', short: 'o' },
    'native-root': { type: 'string' }, 'accept-lossy': { type: 'boolean' },
    'experimental-d2': { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help || positionals.length !== 1) {
    process.stderr.write('Usage: node --import tsx dist/import-demo.js input [--from dot|mermaid|d2] [-o new.draft] [--accept-lossy] [--native-root /trusted/draftably] [--experimental-d2]\n');
    return values.help ? 0 : 2;
  }
  if (values.from && !['dot', 'mermaid', 'd2'].includes(values.from))
    throw new Error('--from must be dot, mermaid, or d2.');
  const input = resolve(positionals[0]!);
  const detection = detectSource(await readBounded(input), {
    filename: input, format: values.from as KnownFormat | undefined,
  });
  if (detection.status !== 'detected') throw new Error('Choose a single source block and an explicit --from format.');
  const title = basename(input).replace(/\.[^.]+$/, '');
  let result: ImportResult;
  if (detection.format === 'dot') {
    const { importDot } = await import('./dot-importer.js');
    result = importDot(detection.source, title);
  } else if (detection.format === 'mermaid') {
    const [{ parseMermaidFlowNode }, { importMermaidFlow }, { makePlainLabel }, { JSDOM }] =
      await Promise.all([import('./mermaid-node.js'), import('./mermaid-importer.js'),
        import('./mermaid-facade.js'), import('jsdom')]);
    const parsed = await parseMermaidFlowNode(detection.source);
    const dom = new JSDOM('');
    try { result = importMermaidFlow(parsed, makePlainLabel(dom.window.document), title); }
    finally { dom.window.close(); }
  } else if (detection.format === 'd2' && values['experimental-d2']) {
    process.stderr.write('Experimental D2 compiler: this harness has no hard outer worker deadline. Use controlled fixtures only.\n');
    const { importD2Experimental } = await import('./d2-importer.js');
    result = await importD2Experimental(detection.source, title);
  } else throw new Error('This harness supports DOT core, Mermaid flowchart, and explicitly enabled experimental D2 graphs.');
  for (const diagnostic of result.diagnostics) process.stderr.write(JSON.stringify(diagnostic) + '\n');
  if (result.status === 'failed') return 1;
  if (result.status === 'needs-review' && !values['accept-lossy']) {
    process.stderr.write('Review the diagnostics; --accept-lossy accepts only nonfatal reported losses.\n');
    return 3;
  }
  const nativeRoot = values['native-root'] ?? process.env.DRAFTABLY_ROOT;
  if (!nativeRoot) throw new Error('Set DRAFTABLY_ROOT or --native-root to a trusted exact-ref checkout for native validation.');
  const { checkSource } = await import(pathToFileURL(join(resolve(nativeRoot), 'src/dsl/compile.ts')).href);
  const validateNative = (source: string) => {
    const scene = checkSource(source) as { diagnostics: Array<{ level: string; message: string }> };
    const errors = scene.diagnostics.filter(d => d.level === 'error');
    if (errors.length) throw new Error('Native validation failed: ' + errors.map(d => d.message).join('; '));
  };
  if (values.output) await writeImportedDraft({
    inputPath: input, outputPath: values.output, result, acceptLossy: values['accept-lossy'], validateNative,
  });
  else { validateNative(result.nativeSource!); process.stdout.write(result.nativeSource!); }
  return 0;
}

run().then(code => { process.exitCode = code; }, error => {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
  process.exitCode = 1;
});
