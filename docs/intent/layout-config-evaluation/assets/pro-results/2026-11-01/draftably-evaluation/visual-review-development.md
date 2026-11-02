# Blinded visual review: development pairs P011–P036

**Status: frozen before unblinding.** All 26 production pair PNGs were opened and visually inspected. Six additional production detail/full-size renders were also opened. No geometry trials were run for this review.

This is **one expert model assessment, not independent human validation**. Confidence values are subjective judgments, not calibrated probabilities. The reviewer knew the product source and FEEL rubric from earlier tasks but did not read the candidate identities, pair keys, numerical trial outcomes, control analysis, portfolio analysis or engine names for these pairs.

Recorded: 2026-11-01T23:33:17.989Z. Judgment JSON SHA-256: 9eafaf34317213540b976f53e9cf94b40f77eb037766a1b4fcce2f0c13230b24.

## Outcomes and scope

| A better | B better | Same | Total |
| ---: | ---: | ---: | ---: |
| 8 | 12 | 6 | 26 |

The supplied manifest contains matched renderable pairs spanning the twelve named families plus targeted witnesses. These counts describe the inspected pairs. They do not estimate overall preference, independent graph coverage, or engine win rate. Several pairs repeat a visibly similar endpoint-fan scene. Full pipeline failures could not be judged visually and remain part of the separate execution results.

The rubric is the baseline FEEL.md: visible and direct connections, clear label ownership, useful grouping and reading order, with genuine appearance differences retained even when task quality is tied. Pair severity 0–3 describes the difference between candidates; a tied pair may still have a common defect.

## Frozen pair judgments

| Pair | Family | Judgment | Severity | Confidence | Reason |
| --- | --- | --- | ---: | ---: | --- |
| P011 | pipelines | same | 0 | 0.99 | Both panels make the six-phase left-to-right sequence immediately clear. Straight connections and the two 'next' labels have equally clear ownership; small spacing differences do not change the task. |
| P012 | dags | B-better | 2 | 0.98 | B keeps Source, Build, Test and Release adjacent in a compact left-to-right overview. A separates the same stages by large vertical and horizontal gaps, requiring long scans along the three Build-to-Test and Test-to-Release connections. |
| P013 | hierarchies | A-better | 1 | 0.89 | A exposes a regular tree with aligned depth levels and paired sibling branches, making subtree boundaries easy to recognize. B remains traceable but staggers nodes of the same depth and spreads sibling groups unevenly. |
| P014 | architecture | B-better | 2 | 0.97 | B places the upstream APIs near the refresh jobs and keeps the server-to-phone story legible across adjacent groups. A puts the upstream APIs far below their callers and carries several long connections around the left perimeter. |
| P015 | cycles | same | 0 | 0.92 | Both panels show the consultation sequence, the return for another round, the saved session, and the exit clearly. A is a long horizontal strip and B is a tall vertical flow; neither orientation is specified by the task, and neither introduces a decisive tracing defect. |
| P016 | networks | same | 0 | 0.97 | Both panels clearly connect the coding agent through the CLI, viewer/API paths and server to the five storage destinations. A is a balanced top-to-bottom view and B a compact left-to-right view; connections and labels are unambiguous in each. |
| P017 | disconnected | A-better | 2 | 0.99 | A packs all eight independent items into a clear two-column overview. B spends a long vertical strip and leaves a broad empty column, making an overview of the disconnected items unnecessarily costly. |
| P018 | routing | B-better | 2 | 0.97 | B keeps the services close and makes the event bus's related calls visible in one compact region. A leaves substantial empty area inside the order service and carries cancellation and event routes over long outer paths. |
| P019 | containers | B-better | 2 | 0.92 | A is compact, but its far-right return routes visually merge against the right edges of Components 0, 5 and 10, weakening connection identity. B uses more area yet separates the returning paths sufficiently to trace their origins and destinations more reliably. |
| P020 | presentation | B-better | 2 | 0.98 | B aligns the driven adapters beside the outbound ports, completing one coherent left-to-right explanation. A drops those adapters far below the application and adds three long parallel descents without improving the visible relationships. |
| P021 | authored | same | 0 | 0.94 | Both panels preserve a legible build-and-run progression across Repository, Builder, Runner and the host. A is more compact, while B uses more vertical spacing and a stepped progression; detailed inspection shows the db.json label remains clearly attached in both. |
| P022 | recipes | A-better | 2 | 0.99 | A keeps the three schema tables near one another and makes both field-to-field references easy to inspect together. B separates adjacent tables by large empty vertical regions, so tracing two simple references requires a long scan. |
| P023 | routing | B-better | 2 | 0.97 | B brings the feedback route through the open central gap above Endpoint 6, so the two hubs can be related directly. A sends the same labelled feedback around the bottom of the entire endpoint column, adding a distracting outer detour. |
| P024 | routing | A-better | 2 | 0.97 | A routes feedback through the open central gap above Endpoint 6, keeping its ownership close to the two hubs. B runs feedback around the bottom of the full fan, creating a much longer visual excursion for the same hub-to-hub relationship. |
| P025 | routing | B-better | 2 | 0.97 | B keeps the feedback relationship near the hubs by using the central opening above Endpoint 6. A takes the feedback line around the entire bottom of the fan, requiring a substantial detour to read one connection. |
| P026 | routing | A-better | 2 | 0.97 | A uses the central open corridor for the feedback connection between the hubs. B sends that relationship around the full lower fan, requiring a long detour and moving its label far from the hub region. |
| P027 | routing | B-better | 2 | 0.97 | B makes the feedback relationship local to the hubs by crossing the clear space above Endpoint 6. A loops the same labelled connection below the entire endpoint fan, making it unnecessarily laborious to trace. |
| P028 | routing | B-better | 2 | 0.97 | B separates the two endpoint families into two readable fans around their own hubs. A interleaves all endpoints in one very tall column, producing many long paths across the shared corridor and a costly scan to discover which hub receives each connection. |
| P029 | routing | B-better | 2 | 0.97 | B keeps the labelled feedback close to both hubs by using the central corridor. A sends it around the bottom of the endpoint column, adding a conspicuous outside loop that does not help identify the connection. |
| P030 | dags | A-better | 2 | 0.99 | A presents Source, Build, Test and Release as adjacent stages, so prerequisites can be read across one coherent pipeline. B raises the Test group far above the other stages and leaves long empty runs in both the test dependencies and rollback connection. |
| P031 | authored | same | 0 | 0.98 | Both panels show the same clear local chain and the distant protected chain connected by a legible handoff. A leaves the last local item downward and B leaves it rightward; each path remains simple and its label belongs clearly to the connection. |
| P032 | authored | same | 0 | 0.98 | Both panels make the local chain, distant chain and handoff immediately traceable. A uses a rightward departure before stepping down and B departs downward before running right; this visible route difference has no reliable task advantage. |
| P033 | architecture | B-better | 2 | 0.99 | B places 'return inside group' directly on a short return loop, making its connection ownership immediate. A has a shorter straight return but leaves the label floating well above that line, which weakens the association. |
| P034 | routing | A-better | 3 | 0.99 | A visibly routes the a-to-b connection over the central blocker and preserves the other two direct connections. In B the apparent a-to-b line disappears behind the blocker, making it look as if the blocker were part of the relationship or the connection were interrupted. |
| P035 | pipelines | B-better | 2 | 0.98 | B presents all 28 phases in four ordered left-to-right rows with clear return-to-next-row links. A's single 28-item vertical strip makes the overall process difficult to survey; the full-sized B render confirms the wraps remain unambiguous. |
| P036 | networks | A-better | 2 | 0.97 | A places the neighbors around Entity 0 and keeps paired relationships near the center, communicating a network. B stacks every neighbor in a long column and sends the hub relationships around the outside, imposing an unhelpful apparent sequence and making local relationships remote. |

## Visual defect ledger

| Pair | Side | Severity | Observed cause | Visible evidence |
| --- | --- | ---: | --- | --- |
| P012 | A | 2 | related stages separated | Build, Test and Release are separated by large empty areas; their dependency paths are long despite belonging to one pipeline. |
| P013 | B | 1 | hierarchy alignment | Nodes at the same tree depth occupy noticeably different horizontal positions, making depth and sibling grouping less immediate. |
| P014 | A | 2 | remote dependent group | The upstream API group is far below the refresh jobs that use it, producing long parallel outer paths and remote labels. |
| P017 | B | 2 | unhelpful component packing | Eight unconnected items are placed in one long column despite ample unused horizontal space. |
| P018 | A | 2 | dispersed event relationships | The service actions and event bus are spread across a large vertical drawing, with remote cancellation routes and excessive empty container area. |
| P019 | A | 2 | merged routes along node borders | The rightmost vertical return paths share the same visual corridor against several component borders, so the route into one component can look continuous past another. |
| P019 | both | 1 | tangent arrival | Several vertical routes end at a box's right edge with a tiny hooked arrow rather than a clearly separated final approach. |
| P020 | A | 2 | related adapters displaced | Postgres, Stripe and Email are placed far below the ports that feed them, adding a large empty region and remote connecting paths. |
| P022 | B | 2 | related tables separated | The line_items, invoices and accounts tables occupy a tall, sparse arrangement with unnecessarily long reference routes. |
| P023 | A | 2 | remote feedback detour | The feedback connection from the right hub to the left hub loops around the entire lower fan instead of using the visible central gap. |
| P023 | both | 1 | crowded short-edge labels | Request/reply labels immediately beside Endpoints 6 and 7 have little free line length and require extra attention among adjacent hub ports. |
| P024 | B | 2 | remote feedback detour | The feedback line loops around the lower endpoint fan before returning to the left hub. |
| P024 | both | 1 | crowded short-edge labels | The short request/reply routes beside Endpoints 6 and 7 leave labels close to adjacent hub ports. |
| P025 | A | 2 | remote feedback detour | The feedback route leaves the hub region and loops around the bottom of all lower endpoints. |
| P025 | both | 1 | crowded short-edge labels | Short request/reply routes at Endpoints 6 and 7 leave labels close to the hub's adjacent connection ports. |
| P026 | B | 2 | remote feedback detour | Feedback follows a long outside path below Endpoint 11 instead of staying near the hubs. |
| P026 | both | 1 | crowded short-edge labels | The request/reply labels near Endpoints 6 and 7 have limited space among neighboring hub connections. |
| P027 | A | 2 | remote feedback detour | The feedback line runs down and around all lower endpoints before returning to the left hub. |
| P027 | both | 1 | crowded short-edge labels | Labels on the short request/reply routes near Endpoints 6 and 7 sit close to adjacent hub ports. |
| P028 | A | 2 | interleaved fan membership | Endpoints for two hubs are interleaved in a single column, so their routes repeatedly traverse the same central corridor. |
| P028 | B | 2 | remote inter-hub detours | Return and handoff take long routes across the top of the full drawing despite the large visible gap between the two fans. |
| P028 | both | 1 | crowded fan ports | Many edges arrive on the top and bottom of each hub, making the final approach locally dense. |
| P029 | A | 2 | remote feedback detour | Feedback loops below the lower fan and its label sits far from both hub endpoints. |
| P029 | both | 1 | crowded short-edge labels | Short request/reply connections around Endpoints 6 and 7 leave labels close to the neighboring hub ports. |
| P030 | B | 2 | related stages separated | Test is distant from Build and Release, and Roll back is remote from production, so the simple dependency story requires several large scans. |
| P033 | A | 2 | detached label ownership | The return label floats in the space above the a-to-b gap while the actual return line runs at the boxes' mid-height. |
| P034 | B | 3 | connection hidden by obstacle | The horizontal a-to-b connection is occluded by the central blocker and cannot be followed continuously through open space. |
| P035 | A | 2 | unwieldy process overview | A very long one-column chain forces a large vertical scan to compare early and late phases. |
| P036 | B | 2 | network forced into long column | The hub is far from most neighbors and its connections wrap around a tall stack, obscuring the intended neighborhood overview. |
| P036 | A | 1 | crowded central routes | Several short hub connections share a tight region beside Entity 0 and near Entities 7 and 8. |

## What the images establish

Several compact arrangements make related stages or objects substantially easier to survey: the CI/CD pipeline, application adapters, schema references, disconnected items, and large fan scene. This is not a blanket preference for smaller area. P019 favors the larger drawing because its return routes retain their identities more clearly. P028 favors separate fan families while still recording its long inter-hub detours as a defect.

P015 and P016 remain ties despite large orientation and aspect differences. P031 and P032 remain ties despite visible bend-placement changes. The stated task supplies no universal preferred aspect, and both routes are simple enough to read. A numerical geometry difference alone would therefore be insufficient to call these useful alternatives.

P033 shows a short straight path with a detached label losing to a slightly longer path with immediate label ownership. P034 shows an obstacle-occluded connection losing to a visible detour. These visual observations are deliberately not claims about hard-gate agreement; that comparison must happen after this file is frozen and the parent joins the key and measured metrics.

The repeated fan scenes P023–P027 and P029 favor keeping feedback near the two hubs instead of around the bottom of the entire fan. Their repeated appearance is evidence of a consistent visual judgment on that scene, not six independent corpus discoveries.

Static pictures cannot verify pin preservation, edit scope, displacement from prior state, stability across edits, latency, or source/undo fidelity. P021, P031 and P032 therefore make no such claims. These require the separate execution and interaction evidence.

## Additional inspection

| Pair | Artifact | Purpose |
| --- | --- | --- |
| P019 | renders/blinded/P019-A-detail.png; P019-B-detail.png | Inspect routes tangent to component borders and shared return corridors. |
| P021 | renders/blinded/P021-A-detail.png; P021-B-detail.png | Check db.json label clearance and ownership inside the host. Both remained legible. |
| P028 | renders/blinded/P028-B-full.png | Resolve the large two-fan drawing and the return/handoff routes at full size. |
| P035 | renders/blinded/P035-B-full.png | Confirm the 28-phase wrapped sequence remains ordered and unambiguous. |

All supplementary images were made from the permitted named SVGs with the unchanged repository scripts/shoot.mjs and the documented browser fallback. They did not invoke layout or routing. The exact PNG hashes and dimensions are stored in the JSON.

## Appearance notes retained for later equivalence analysis

- **P011:** Small changes in gap lengths are visible but do not create a useful preference.
- **P012:** B's rollback path goes back upward, while A's final rollback is below; the much stronger stage overview still favors B.
- **P013:** A needs more horizontal extent and its overview text is smaller; B offers larger labels in a taller shape. The preference is modest and concerns structural regularity, not a mandated orientation.
- **P014:** Both panels preserve nested group ownership and readable boundary crossings; B has some empty container area but a shorter explanatory scan.
- **P015:** The aspect ratios differ substantially. A's labels are smaller at the paired overview scale, while B requires a longer vertical scan. Treat this as a presentation choice rather than a universal quality win.
- **P016:** The terminal fan is arranged horizontally in A and vertically in B; both group the related destinations usefully.
- **P018:** Both retain distinguishable service colors and readable labels. The preference is for the shorter explanatory scan, not a claim that B has no congested ports.
- **P019:** Both preserve nested title ownership and the labelled group endpoint. Detail crops confirmed the problematic right-edge approaches; B's larger footprint is a real tradeoff.
- **P021:** Static images do not establish whether authored pins or local edit scope were preserved. That constraint question is deliberately left to the separate measurements.
- **P028:** The full-sized B render was inspected. B's clearer family separation outweighs its poor inter-hub routing, but the latter remains a visible defect.
- **P031:** The bend placement and label location differ visibly. The static pair does not establish prior authored coordinates or whether a protected region moved.
- **P032:** The static picture is insufficient to judge preservation of authored pins or edit scope; no such claim is made here.
- **P033:** Both external connections leave the group clearly and the container border yields at the crossings. The added short loop in B is worth its label-ownership benefit.
- **P035:** A is locally simple and has shorter individual links. B's row-return paths are longer, but they preserve a clear reading sequence and produce a much more usable overview.

## Later analysis

Preserve the original JSON and its hash. Join candidate identities and metrics only after this freeze, and record agreement, disagreements, false alarms, and candidate implications in a separate unblinding analysis. No verdict in this file may be silently changed to improve metric agreement or a policy result.
