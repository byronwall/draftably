# Current-main coverage addendum

The Pro package describes `af70d8317797d5a522acffdd604819376a3ec893`.
Upstream advanced to `ce7f65648e7e63021bd93f7d38a7bcc81db9fd68` during the review.
Keep the [original coverage](assets/pro-results/2026-11-01/coverage.csv) and its counts unchanged.

## R031: directed connections and the Arrow control

The original inventory omitted the native Inspector's **Arrow** checkbox.
That control exists in the pinned source at `src/components/Inspector.tsx`.
Current main also adds its source representation, `directed=false`, to `src/dsl/syntax.ts`.
This adds one canonical control to the reviewed scope: **198 entries**, including three derived behaviors.

| Contract     | Current behavior                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Source       | `edge relation a -> b "related" directed=false`                                                     |
| Values       | Omitted or `directed=true`: directed. `directed=false`: undirected.                                 |
| Editor label | Arrow, in the selected connection's Inspector                                                       |
| Layout       | Undirected edges do not rank nodes in built-in flow or lanes. Engines still receive the connection. |
| Drawing      | The connection has no arrowhead when false.                                                         |
| Persistence  | The flag survives source translation, projection, and SVG export on current main.                   |
| Visual       | A matched omitted/true/false comparison, plus an Arrow toggle and reopen action recipe.             |

The existing `->` still separates the endpoint IDs when `directed=false`.
Do not confuse the flag with `constraint=false`, which controls ranking without removing the arrowhead.
Do not confuse it with `kind=async`, which changes the stroke style.

The three [source companions](current-main-examples/directed-omitted.draft) keep the same nodes, labels, connection, and declaration order.
Only the directed attribute changes; each title identifies the variant.
The directed connection ranks Target before Source. The undirected version keeps Source before Target.
Omitted and explicit true should have equal object and route geometry.
The titles differ, so exported file bytes need not match.

These companions require current main. The historical baseline rejects the new source attribute.
Local execution status is recorded in [verification.md](verification.md).

## Recommendation LR-035: Build complete Arrow coverage

Add R031 to the production coverage contract and source/native reference map.
Add all three source states and the native toggle action to the routing or ports lesson.
Update the R015 explanation that says source connections are always directed.
Keep this content work in M1/M2/M7. It needs no new engine behavior.

The remaining decisive defect paths are unchanged in current main: the layout and routing engines,
layout serializer, cells implementation, and source Compare implementation have no upstream changes.
Compiler changes add undirected-edge ranking rules. They do not repair the reported scope or sequence defects.

Current main also adds importers and editor tooltips. Import language coverage and unrelated appearance controls remain outside this initiative.
