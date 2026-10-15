/**
 * Fail a pull request that changes what the `draftably` package ships but adds no changeset.
 *
 * The CLI's code lives in the private root package, so `changeset status` cannot tell when it
 * changed. This lists the branch's changes against the base and looks for shipped paths.
 *
 *   node scripts/check-changeset.ts [base]   (default: origin/main)
 */
import { execFileSync } from 'node:child_process';

/** Paths that end up in the published package (see scripts/build-cli.ts). */
const SHIPPED = [/^src\//, /^index\.html$/, /^examples\//, /^docs\/DSL\.md$/, /^packages\/cli\//];
/** Release bookkeeping, written by the Version Packages pull request. */
const BOOKKEEPING = [/^packages\/cli\/CHANGELOG\.md$/, /^packages\/cli\/package\.json$/];

const base = process.argv[2] ?? 'origin/main';
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });
const lines = (text: string) => text.split('\n').filter(Boolean);

const changed = lines(git('diff', '--name-only', `${base}...HEAD`));
const shipped = changed.filter(
  f => SHIPPED.some(p => p.test(f)) && !BOOKKEEPING.some(p => p.test(f)),
);
const added = lines(git('diff', '--name-only', '--diff-filter=A', `${base}...HEAD`)).filter(
  f => /^\.changeset\/.+\.md$/.test(f) && !f.endsWith('README.md'),
);

if (!shipped.length) {
  console.log('No shipped files changed; no changeset needed.');
} else if (added.length) {
  console.log(`Changeset found: ${added.join(', ')}`);
} else {
  console.error(`These changes ship in the draftably package but the branch adds no changeset:
${shipped.map(f => `  ${f}`).join('\n')}

Add one with:  pnpm changeset:add <patch|minor|major> "Release note"
If the change needs no release (a refactor or internal tooling), add an empty one with:
  pnpm changeset add --empty`);
  process.exitCode = 1;
}
