import fs from 'node:fs';
import path from 'node:path';

export function clearReports(outDir) {
  for (const name of ['compare.md', 'coverage.md', 'review.html', 'review.pdf'])
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

// Match the audit's selected slug and variant rules. A summary alone does not prove completion.
export function selectedInputs(dir, only) {
  return fs
    .readdirSync(dir)
    .filter(slug => fs.statSync(path.join(dir, slug)).isDirectory())
    .filter(slug => !only || only.includes(slug))
    .flatMap(slug =>
      fs
        .readdirSync(path.join(dir, slug))
        .filter(file => /^(v0|e\d+)\.draft$/.test(file))
        .map(file => `${slug}/${file}`),
    );
}

export function assertResults(results, expected) {
  const keys = results.map(r => `${r.slug}/${r.file}`);
  const actual = new Set(keys);
  if (
    actual.size !== keys.length ||
    actual.size !== expected.length ||
    expected.some(key => !actual.has(key))
  )
    throw new Error('Audit results do not match selected inputs');
  return results;
}
