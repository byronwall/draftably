# Audit issue register

Checked open and closed repository issues before filing. All 13 independent browser findings have a tracking issue. Eight issues were created; five existing issues were reused.

| Finding                              | Issue                                                     | Disposition                                                                            |
| ------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| U01: Editor navigation               | [#250](https://github.com/byronwall/draftably/issues/250) | Existing exact match                                                                   |
| U02: Narrow Playground layout        | [#249](https://github.com/byronwall/draftably/issues/249) | Existing exact match                                                                   |
| U03: Edited landing source transfer  | [#251](https://github.com/byronwall/draftably/issues/251) | Existing exact match                                                                   |
| U04: Example fitting                 | [#257](https://github.com/byronwall/draftably/issues/257) | Created                                                                                |
| U05: Expanded drawing focus          | [#254](https://github.com/byronwall/draftably/issues/254) | Existing exact match                                                                   |
| U06: Playground resume after Docs    | [#248](https://github.com/byronwall/draftably/issues/248) | Reused source-recovery issue; added Docs round-trip reproduction and acceptance checks |
| U07: Browser-first onboarding        | [#258](https://github.com/byronwall/draftably/issues/258) | Created                                                                                |
| U08: Narrow accessible names         | [#259](https://github.com/byronwall/draftably/issues/259) | Created                                                                                |
| U09: Editor return paths             | [#260](https://github.com/byronwall/draftably/issues/260) | Created                                                                                |
| U10: Task search results             | [#261](https://github.com/byronwall/draftably/issues/261) | Created                                                                                |
| U11: Example catalog and blank start | [#262](https://github.com/byronwall/draftably/issues/262) | Created                                                                                |
| U12: Documentation teaching sequence | [#263](https://github.com/byronwall/draftably/issues/263) | Created; separate from routing reference completeness in #253                          |
| U13: Saved-work explanation          | [#264](https://github.com/byronwall/draftably/issues/264) | Created                                                                                |

Issue bodies preserve the audit's severity, observations, uncertainty, suggested changes, and acceptance checks. Existing screenshot evidence remains on the matching issues. Generated audit screenshots remain in ignored storage for the report PR.

## Pro reconciliation and current status

Checked all open and closed issues again during collection. Five additional issues cover distinct Pro findings. Search focus evidence was added to #254. No duplicate issue was created for a closed repair.

| Pro finding                                 | Tracking                                                  | Collection status                                                     |
| ------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| F01 / U01: Editor entry                     | #250                                                      | Closed; ordinary current-site navigation succeeded                    |
| F02: Failed Playground lazy load            | [#304](https://github.com/byronwall/draftably/issues/304) | New; intermittent historical evidence, current recurrence unconfirmed |
| F03: New promises retention in example mode | [#305](https://github.com/byronwall/draftably/issues/305) | New; reproduced on active deployment                                  |
| F04: Invalid-source image export            | #256                                                      | Closed; current source contains repair                                |
| F05 / U03: Landing source transfer          | #251                                                      | Closed; current source contains repair                                |
| F06 / U05: Search and drawing focus         | #254                                                      | Open; added Search evidence to existing issue                         |
| F07: Space activation                       | [#306](https://github.com/byronwall/draftably/issues/306) | New; reproduced on active deployment                                  |
| F08 / U02 / U08: Narrow layout and names    | #249 / #259                                               | Closed; current source contains repairs                               |
| F09 / U13: Storage explanation              | #264                                                      | Open; distinct from scratch-reload warning #265                       |
| F10 / U07: Browser-first onboarding         | #258                                                      | Open                                                                  |
| F11 / U10: Reopen search                    | #261                                                      | Open                                                                  |
| F12: Layout tool progression                | [#307](https://github.com/byronwall/draftably/issues/307) | New; expert assessment, broader grouping needs exploration            |
| F13: Expanded stale drawing context         | [#308](https://github.com/byronwall/draftably/issues/308) | New; separate from export and focus defects                           |
| F14 / U06: Example identity after Undo      | #248                                                      | Closed; source now derives identity from current text                 |
| F15: Copy-link clipboard                    | No defect issue                                           | Inconclusive tooling result; Explore only                             |
| U04: Example fitting                        | #257                                                      | Closed                                                                |
| U09: Editor return routes                   | #260                                                      | Open                                                                  |
| U11: Example catalog and blank start        | #262                                                      | Open                                                                  |
| U12: Teaching sequence                      | #263                                                      | Closed                                                                |

Status was checked during collection, against `origin/main` at `d6f359d`. It can change after this report. See [summary.md](summary.md) for evidence limits and dispositions. Issues contain acceptance checks. This audit PR does not close them.
