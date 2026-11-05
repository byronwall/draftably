import { realpath, readFile, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

function within(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export async function resolveSource(
  src: string,
  documentPath: string,
  rootDir: string,
): Promise<{ source: string; path: string }> {
  if (
    !src ||
    src.includes('\0') ||
    src.startsWith('/') ||
    src.startsWith('\\') ||
    /^[A-Za-z][A-Za-z\d+.-]*:/.test(src) ||
    /^[A-Za-z]:/.test(src)
  ) {
    throw new Error('src must be a relative local path.');
  }
  const root = await realpath(rootDir);
  const lexical = resolve(documentPath, '..', src);
  if (!within(resolve(rootDir), lexical))
    throw new Error('src is outside the configured content root.');
  let canonical: string;
  try {
    canonical = await realpath(lexical);
  } catch (error) {
    // Check the nearest existing parent before recording a missing dependency.
    let parent = lexical;
    let watchPath: string | undefined;
    while (parent !== resolve(parent, '..')) {
      try {
        const actual = await realpath(parent);
        if (!within(root, actual))
          throw new Error('src resolves outside the configured content root.', { cause: error });
        watchPath = actual;
        break;
      } catch (parentError) {
        if (parentError instanceof Error && parentError.message.includes('outside'))
          throw parentError;
        parent = resolve(parent, '..');
      }
    }
    throw Object.assign(new Error('Included .draft file does not exist.', { cause: error }), {
      missingPath: lexical,
      watchPath,
    });
  }
  if (!within(root, canonical))
    throw new Error('src resolves outside the configured content root.');
  if (!canonical.endsWith('.draft')) throw new Error('src must name a .draft file.');
  const info = await stat(canonical);
  if (!info.isFile()) throw new Error('src must name a regular file.');
  if (info.size > 1_000_000) throw new Error('Included .draft file exceeds 1 MB.');
  const bytes = await readFile(canonical);
  if (bytes.byteLength > 1_000_000) throw new Error('Included .draft file exceeds 1 MB.');
  return { source: new TextDecoder('utf-8', { fatal: true }).decode(bytes), path: canonical };
}
