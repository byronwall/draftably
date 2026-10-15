/**
 * Fail a pull request that changes the `.draft` language but leaves the agent skill alone.
 *
 * `skills/draftably/SKILL.md` teaches agents the language, so a new statement, option or rule in
 * the parser or the language guide needs a matching edit there. `tests/skill.test.ts` catches
 * missing words; this catches changed meaning. A branch whose change needs no skill edit can say
 * so with a `Skill-unchanged: <reason>` trailer in any of its commit messages.
 *
 *   node scripts/check-skill.ts [base]   (default: origin/main)
 */
import { execFileSync } from 'node:child_process';

/** The language's definition: the parser and the guide. */
const LANGUAGE = [/^src\/dsl\/syntax\.ts$/, /^docs\/DSL\.md$/];

const base = process.argv[2] ?? 'origin/main';
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });

const changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
const language = changed.filter(f => LANGUAGE.some(p => p.test(f)));
const waiver = git('log', '--format=%B', `${base}..HEAD`).match(/^Skill-unchanged:\s*(.+)$/m);

if (!language.length) {
  console.log('The language did not change; the skill needs no update.');
} else if (changed.some(f => f.startsWith('skills/draftably/'))) {
  console.log('The language and the agent skill both changed.');
} else if (waiver) {
  console.log(`Skill left unchanged: ${waiver[1]}`);
} else {
  console.error(`The .draft language changed but skills/draftably/SKILL.md did not:
${language.map(f => `  ${f}`).join('\n')}

Update the skill to match. If the change does not affect what agents write (a typo or a refactor),
add a trailer to a commit message on this branch:
  Skill-unchanged: <reason>`);
  process.exitCode = 1;
}
