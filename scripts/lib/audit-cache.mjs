import fs from 'node:fs';
import path from 'node:path';

export function clearReports(outDir) {
  for (const name of ['compare.md', 'review.html', 'review.pdf'])
    fs.rmSync(path.join(outDir, name), { force: true });
}

export async function baselineCache(dir, render, load) {
  const valid = () => {
    try {
      return fs.existsSync(path.join(dir, 'summary.md')) && !load(dir).some(r => r.error);
    } catch {
      return false;
    }
  };
  if (valid()) return true;
  fs.rmSync(dir, { recursive: true, force: true });
  try {
    await render();
    if (!valid()) {
      let errors;
      try {
        errors = load(dir)
          .filter(r => r.error)
          .map(r => `${r.slug ?? ''}/${r.file ?? ''}: ${r.error}`)
          .join('\n');
      } catch {
        errors = 'missing or invalid metrics';
      }
      throw new Error(`Baseline contains render errors: ${dir}\n${errors}`);
    }
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw error;
  }
  return false;
}
