# Source packet

Repository: https://github.com/byronwall/draftably
Baseline: af70d8317797d5a522acffdd604819376a3ec893
Read pro-prompt.md first. Repository sources are unchanged from the baseline.
The packet contains current app, DSL, engines, editor controls, CLI, site/docs, tests, examples, and build scripts.
It omits dependency folders, build output, Git metadata, historical audit assets, and unrelated private data.
Bundled font assets remain for real CLI SVG rendering.

## Locally verified visual evidence

All ten file engines ran on evidence/grouped.draft through the actual CLI.
Read evidence/engine-variants.json for exact variants, source, geometry metrics, and edits.
The separate PNG contact sheet shows these actual renders.
Boundary alignment removes one crossing while increasing area by 82%.
Compound spring removes one crossing while increasing area by 91%.
Layered equals compound-flow on this graph. Tidy and flow also look nearly identical.
These observations concern this fixture only, not universal engine rankings.

Commands run:
- pnpm install --frozen-lockfile
- pnpm draftably --help
- pnpm draftably vary tmp/pro/layout-routing-atlas/grouped.draft --try engine=compound-flow,boundary-align,compound-spring,tidy,stress,force,flow,layered,tree,grid --budget 60s --out tmp/pro/layout-routing-atlas/engine-baseline
- pnpm shoot https://draftably.dev/docs/layout-engines tmp/pro/layout-routing-atlas/layout-engines-before.png

Browser observation: published engine lesson has one editable diagram and a table of ten engines.
No engine code changes have been made. Full repository checks are pending.
