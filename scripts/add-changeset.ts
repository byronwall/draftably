import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [bump, ...words] = process.argv.slice(2);
const summary = words.join(" ").trim();
if (!["patch", "minor", "major"].includes(bump) || !summary) {
  console.error('Usage: pnpm changeset:add <patch|minor|major> "Release note"');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("packages/cli/package.json", "utf8"));
if (pkg.private) {
  console.error("Activate the CLI package first. See docs/RELEASING.md.");
  process.exit(1);
}
const path = `.changeset/${randomUUID()}.md`;
writeFileSync(path, `---\n${JSON.stringify(pkg.name)}: ${bump}\n---\n\n${summary}\n`);
console.log(`Wrote ${path}`);
