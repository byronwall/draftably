# Codex verification and case review

The delivered corpus was replayed against the unchanged local baseline on 1 November 2026,
Eastern time. Pro's original records use 2 November UTC. Both refer to this same study.

## Independent local execution

| Check                                       |        Result |
| ------------------------------------------- | ------------: |
| Original ZIP entries preserved              |         3,248 |
| Supplied manifest entries verified          | 3,247 / 3,247 |
| Original reference hashes verified          |       30 / 30 |
| Native attempts replayed                    |       90 / 90 |
| Local check/inspect/SVG/PNG commands passed |     360 / 360 |
| Geometry matches with Pro                   |       90 / 90 |
| SVG byte matches with Pro                   |       90 / 90 |
| PNG dimension matches with Pro              |       90 / 90 |

The archive manifest does not list itself. Its ZIP CRC and safe-path checks also passed.
The uploaded input packet hash matches the one Pro recorded.

The replay used Node 22.21.1, pnpm 11.9.0, the supplied lockfile, and the local installed Chromium.
It ran `pnpm --silent draftably` and `pnpm --silent shoot` through a locally authored command runner.
No downloaded program was executed. No application, DSL, font, layout, or renderer source changed.

[Local command records](local-validation/commands.csv) and [full replay summary](local-validation/summary.json)
identify all sources, hashes, commands, and exit codes. Complete stdout/stderr and local PNGs are
included in the final ZIP under `codex/local-replay/`. Original Pro logs remain in the asset folder.

PNG files differ between the two environments. Equal SVG bytes establish matching vector output;
PNG file identity or registered pixel error is not claimed. Selected local PNGs were inspected.

Independent source counts reproduce the reported totals: 953, 1,146, and 1,880 non-comment lines;
median 26.5, 30.5, and 55; and 376 final pins. Authoring time remains unmeasured.

The final repository `pnpm check` passed after integration: 480 unit tests, engine regressions,
320 parity comparisons, typecheck, lint, formatting, and the production build.

## Visual review

All 30 full reference/default/final sheets were viewed. Selected detail sheets and local stage
PNGs were inspected for captions, fanout, record endpoints, transit labels, and dark notes.
The table records independent integration observations, not a new set of numerical scores.

| Case                    | Observation                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| E01 TLS                 | Default messages are readable; final phase bands still lose source transit slope and split paint.       |
| E02 retries             | Final positions restore widening intervals; boxes replace the simpler reference tracks.                 |
| E03 Blackbird           | Final bands improve composition, but small type and boxed captions weaken the result.                   |
| E04 migration           | Final stages correspond clearly; repeated coordinates and substitute database shapes remain.            |
| E05 transport           | Dark-note failure reproduces locally. Final color categories and legend remain imperfect.               |
| E06 processes           | Names and multiplicity survive. Responsibility illustrations disappear; final layout is over-tall.      |
| E07 multiplexing        | Default routes are tangled. Final paired edges improve meaning with substantial source cost.            |
| E08 records             | Final quiet colors help, but nested type hierarchy and large empty panels remain weak.                  |
| E09 checkpoints         | Final scenes preserve incremental color; identical-object geometry is manually repeated.                |
| E10 layers              | Final notes recover captions. Their treatment still differs from the original attached card captions.   |
| E11 Transformer         | Final two-column stacks recover the reading path. Fanout needs many elbows and port hints.              |
| E12 LSTM                | Manual placement helps recognition; notation ambiguity and header crossing remain disclosed.            |
| E13 CQRS                | Final read/write organization is clearer. Callout relationships remain less direct.                     |
| E14 DNS hierarchy       | Panel structure improves. Uniform boxes lose dialogue hierarchy and explanatory characters.             |
| E15 agents              | Final grouping improves substantially; dense reference paths and repeated geometry remain costly.       |
| E16 React               | The default establishes hierarchy well. Arrowless appearance changes logical direction in later source. |
| E17 Go slice            | Cells and exact pointer target work well. Bottom entry is a valid convention here.                      |
| E18 Git history         | Final chronology is clear; the softer v1 deserves retention beside pinned v2.                           |
| E19 pixel pipeline      | Default order is clear. Final colors help; joined chevrons remain unavailable.                          |
| E20 compiler terrain    | A graph preserves compiler concepts but loses the original explanatory landscape.                       |
| E21 upvalue             | The local final pointer crosses the Stack title and follows record borders. Side hints do not solve it. |
| E22 DNS query           | A sequence is concise. Panel reconstruction is more editorial and much larger in source.                |
| E23 stellar life        | Final branches are useful. The local v1 note has the same contrast failure as E05.                      |
| E24 El Niño             | Final stair is substantially closer. Short-label padding warnings need a precise explanation.           |
| E25 water cycle         | Manual placement reduces clutter but cannot recover physical terrain and distributed fluxes.            |
| E26 Double Diamond      | Final silhouette is closer, but four independent phases are reduced to two labels.                      |
| E27 butterfly           | Bilateral placement helps; nested return-path meaning remains absent.                                   |
| E28 trams               | Names remain, but service identity, station marks, and shared tracks do not.                            |
| E29 publishing workflow | Final branching is clearer; long guidance loses icon/caption hierarchy.                                 |
| E30 cell cycle          | Final resemblance splits Interphase membership. Default ordering communicates more clearly.             |

The original numerical judgments remain attributable to Pro. They are neither measured comprehension
results nor proof that the bounded attempts found the best possible native source.

## Decisive code checks

- `src/model/note.ts::noteMarkup` pairs slate-50 panel fill with global text color. Both dark failures reproduce.
- `src/model/types.ts` already stores label modes, leaders, edge-label offsets, and waypoints.
- `src/dsl/translate.ts::rejectUnsupported` explicitly rejects saving changed label positions and bends.
- `src/dsl/syntax.ts` and `compile.ts::dissolved` confirm that soft/none groups relinquish their layout scope.
- The native theme controls expose global type roles; the reported local hierarchy control gap is distinct.

Primary-source spot checks confirmed the original Stripe retry article, Go slice article, and Chrome
architecture article. Their URLs and figure provenance are retained in the original source records.

## Review limits

The offline gallery's local links were checked statically. Its downloaded JavaScript was not run.
The original archive remains byte-identical; imported Python and shell companions were not executed.
No controlled label-edit exercise, reader study, authoring-time study, or future product fix was tested.
Third-party licenses remain those observed per image. The corpus does not confer general reuse rights.
