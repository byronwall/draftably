/**
 * `draftably skill`: print or install the agent skill in `skills/draftably`. The repository keeps
 * the skill at its root so `npx skills add byronwall/draftably` finds it; the build copies it into
 * the npm package beside `dist/`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_NAME = 'draftably';

/** The folder of the nearest package.json above this module. */
function packageRoot() {
  let project = path.dirname(fileURLToPath(import.meta.url));
  while (!fs.existsSync(path.join(project, 'package.json')) && path.dirname(project) !== project)
    project = path.dirname(project);
  return project;
}

/** The draftably version: the installed package's, or `packages/cli`'s in this repository. */
export function cliVersion(): string {
  const root = packageRoot();
  for (const file of [
    path.join(root, 'package.json'),
    path.join(root, 'packages/cli/package.json'),
  ]) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8')) as { name?: string; version?: string };
    if (pkg.name === 'draftably' && pkg.version) return pkg.version;
  }
  return 'unknown';
}

/** The bundled skill folder: `skills/draftably` next to the nearest package.json. */
export function skillSource() {
  const dir = path.join(packageRoot(), 'skills', SKILL_NAME);
  if (!fs.existsSync(path.join(dir, 'SKILL.md')))
    throw Error('The agent skill is missing. Reinstall draftably.');
  return dir;
}

/**
 * Copy the skill into `<skills folder>/draftably`. The folder defaults to `.claude/skills` in
 * `cwd`, or in the home folder when `global` is set. Refuses to replace an existing copy unless
 * `force` is set.
 */
export function installSkill(options: {
  cwd: string;
  dir?: string;
  global?: boolean;
  force?: boolean;
  home?: string;
}) {
  const base = options.dir
    ? path.resolve(options.cwd, options.dir)
    : path.join(options.global ? (options.home ?? os.homedir()) : options.cwd, '.claude/skills');
  const target = path.join(base, SKILL_NAME);
  if (fs.existsSync(target)) {
    if (!options.force) throw Error(`${target} already exists. Use --force to replace it.`);
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.mkdirSync(base, { recursive: true });
  fs.cpSync(skillSource(), target, { recursive: true });
  return target;
}
