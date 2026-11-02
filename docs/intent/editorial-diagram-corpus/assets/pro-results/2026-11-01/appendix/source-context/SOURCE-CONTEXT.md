# Source context

Repository: https://github.com/byronwall/draftably
Baseline: f14d9b891adba75de6cc172b190017ea5a5ca091

This packet contains tracked application source, bundled fonts, engine reference source, CLI package files, scripts, tests, examples, the native-language skill, and selected architecture and quality docs. It excludes dependencies, builds, Git metadata, unrelated intent assets, secrets, and private account data.

The prompt is PRO-PROMPT.md. Use pnpm and Node >=22.21. pnpm install --frozen-lockfile installs dependencies when network and runtime permit it. pnpm draftably inspect example.draft --svg runs the actual renderer. pnpm shoot uses Playwright Chromium for PNGs; report missing browser/runtime honestly. The packet is for research and evaluation, not application patches.

The root tsconfig also mentions site/; that directory is omitted because it is not needed for native CLI rendering. Full site builds require the repository. Do not mistake this packet boundary for a product defect.
