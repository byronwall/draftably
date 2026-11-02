# Corpus coverage and selection accounting

## Contract and actual sample

The corpus contains **30 accepted external references: 22 software/computing diagrams and 8 adjacent examples**. All accepted IDs E01–E30 have current `corpus/<slug>/item.json` records. This coverage summary uses those records as the authority for titles, publishers, principal-object counts, pattern tags and confirmation flags; the linked [source inventory](sources.csv) and each case’s `source.md` provide exact primary URLs, attribution and observed licenses.

| Requirement | Actual coverage | Interpretation |
|---|---:|---|
| Accepted references | 30 | No target shortfall. Each accepted reference has actual local source media. |
| Software/computing | 22 / 30 (73.3%) | E01–E22: infrastructure, protocols, data, runtime/memory, algorithms and conceptual explanations. |
| Adjacent | 8 / 30 (26.7%) | E23–E30: astronomy, climate classification, hydrology, design process, material flows, transport, publishing ethics and cell biology. |
| Named publisher labels | 24 | Count of distinct `publisher` values in current item metadata. |
| Consolidated source groups | 22 | Chrome for Developers, web.dev and The Go Blog count together as one Google ecosystem source group. |
| Normalized pattern families | 16 | Overlapping visual families listed below; literal tag spelling does not inflate this count. |
| Principal counts in the target 5–30 range | 27 / 30 (90%) | E26 is intentionally smaller; E15 and E28 exceed 30. Counts have explicit scope caveats below. |
| Reserved confirmation cases | 6 | E06, E10, E16, E20, E28 and E30. |
| Candidate/acquisition log records | 39 | 30 accepted, 6 rejected, 2 not selected, 1 superseded acquisition. These are records, not 39 unique reference diagrams. |

The sample was chosen for editorial design and capability pressure. It is not an engine-speed benchmark, a random survey of diagrams, or a claim about how often these patterns occur in the world.

## Candidate and exclusion accounting

[candidate-log.csv](candidate-log.csv) consolidates **13 infrastructure records, 15 conceptual/computing records and 11 adjacent records**. It retains all 39 original records, including accepted decisions. The normalized `status` field uses `accepted`, `rejected`, `not_selected`, and `superseded_acquisition`; `original_status` retains each source spelling. `source_log` and `source_row` identify provenance, and `original_record_json` preserves every field/value of the original row. Accepted titles, publishers and URLs are refreshed from current item metadata; historical selection reasons remain unchanged.

The six rejected records cover a decorative multiplayer hero image, an article without a qualifying static figure, a duplicate light variant of E05, a Graphviz-generated ownership figure, an unavailable original image, and an inadequate NOAA thumbnail. Two further candidates were not selected: a small recurrent-network precursor and a Parliament process page without an accepted preserved figure. The remaining record documents failed legacy COPE acquisition routes resolved by the accepted current E29 PDF.

The duplicate Vercel variant and legacy COPE acquisition record are not independent diagram candidates and do not inflate the accepted count. The candidate log is the retained decision trail from this search, not an exhaustive inventory of every search result, page impression or downloaded decorative asset. The log records whether an excluded candidate image was downloaded or a download failed. Rejected-candidate images and page caches were working evidence and are not all included in this archive; every accepted original is included. No reference was accepted from a URL alone.

## Visual pattern coverage

These 16 normalized families group spelling variants such as `comparison-panels` and `comparison panels`. A reference can belong to more than one family; the columns are not independent experimental strata. Every accepted case appears at least once.

| Normalized pattern family | Accepted cases | What it exercises |
|---|---|---|
| Architecture and deployment boundaries | [E03](corpus/github-blackbird-query/audit.md), [E05](corpus/vercel-fluid-transport/audit.md), [E06](corpus/chrome-process-architecture/audit.md) | Component responsibility, nested boundaries, process isolation and multiplicity. |
| Layered stacks and capability grids | [E03](corpus/github-blackbird-query/audit.md), [E10](corpus/github-security-layers/audit.md), [E11](corpus/e11-transformer-stacks/audit.md) | Full-width bands, repeated processing towers, and layer/component/caption hierarchy. |
| Message sequences and protocol flights | [E01](corpus/cloudflare-tls-handshake/audit.md), [E22](corpus/e22-dns-query/audit.md) | Time/order, direction, bundled messages and actor identity across exchanges. |
| Request, data and material flow | [E05](corpus/vercel-fluid-transport/audit.md), [E13](corpus/e13-cqrs/audit.md), [E27](corpus/E27-emf-butterfly/audit.md) | Distinct read/write or request/response paths and flow through functional roles. |
| Timelines, synchronization and history | [E02](corpus/stripe-synchronized-retries/audit.md), [E09](corpus/figma-journal-checkpoints/audit.md), [E18](corpus/e18-git-divergent-history/audit.md) | Shared temporal alignment, repeated snapshots, and time distinct from pointer direction. |
| Comparison panels and state transitions | [E04](corpus/figma-database-migration/audit.md), [E07](corpus/cloudflare-http2-multiplexing/audit.md), [E09](corpus/figma-journal-checkpoints/audit.md) | Corresponding objects must align while small relationship or state changes remain visible. |
| Recurrent computation and lifecycle | [E12](corpus/e12-lstm-recurrent-cell/audit.md), [E23](corpus/E23-nasa-star-life/audit.md), [E30](corpus/E30-openstax-cell-cycle/audit.md) | Feedback, repeated stages, mass/phase branches, and cyclic rather than purely linear reading. |
| Dependencies and conceptual hierarchies | [E14](corpus/e14-dns-hierarchy/audit.md), [E16](corpus/e16-react-dependency-tree/audit.md), [E18](corpus/e18-git-divergent-history/audit.md) | Tree depth, delegation/ownership, shared route trunks and pointer hierarchy. |
| Records, cells, memory and object pointers | [E08](corpus/stripe-read-compare/audit.md), [E15](corpus/e15-js-agent-cluster/audit.md), [E17](corpus/e17-go-slice/audit.md), [E21](corpus/e21-open-upvalue/audit.md), [E22](corpus/e22-dns-query/audit.md) | Field/value structure, contiguous storage, interior references, shared memory and aliasing. |
| Pipelines and branching compilation | [E19](corpus/e19-pixel-pipeline/audit.md), [E20](corpus/e20-compiler-mountain/audit.md) | Joined consecutive stages and alternative branches with different destination artifacts. |
| Decision trees and escalation processes | [E24](corpus/E24-noaa-enso/audit.md), [E29](corpus/E29-cope-plagiarism/audit.md) | Conditional branching, common collectors, long evidence text and terminal actions. |
| Explanatory comics | [E14](corpus/e14-dns-hierarchy/audit.md), [E22](corpus/e22-dns-query/audit.md) | Numbered narrative panels, dialogue, recurring actors and colored emphasis. |
| Transport service/network maps | [E28](corpus/E28-tfl-tram/audit.md) | Service identity, one-way circulation, shared tracks, station symbols and external labels. |
| Scientific cutaways and distributed fluxes | [E25](corpus/E25-usgs-water-cycle/audit.md) | Geography, elevation/depth, continuous regions and local physical flow marks. |
| Divergent/convergent process regions | [E26](corpus/E26-design-double-diamond/audit.md) | Nonrectangular boundaries themselves encode expansion and narrowing. |
| Nested recovery loops | [E27](corpus/E27-emf-butterfly/audit.md) | Loop ordering and bilateral color identity convey value preservation beyond adjacency. |


This is broader than a collection of box-and-arrow architectures, while computing remains dominant. Several families deliberately overlap: E12 is both recurrent and computational, E18 separates temporal order from dependency direction, and E22 combines a sequence, comic narrative and records. The grouping keeps those distinctions visible rather than counting every tag as an independent family.

## Publisher and independent-author diversity

The 22 consolidated groups below include 14 groups in the computing subset and eight adjacent publishers. Multiple articles or authors from one publisher count once here. The three Google-associated publication labels are conservatively consolidated, rather than claiming Chrome, web.dev and Go as three independent sources. Other groups represent publishing/editorial voices, not an exhaustive corporate-ownership or public-funding classification; NASA, NOAA and USGS are distinct agency publishers, for example.

| Consolidated publisher / independent author group | Count | Accepted cases |
|---|---:|---|
| Christopher Olah | 1 | [E12](corpus/e12-lstm-recurrent-cell/audit.md) |
| Cloudflare | 2 | [E01](corpus/cloudflare-tls-handshake/audit.md), [E07](corpus/cloudflare-http2-multiplexing/audit.md) |
| Committee on Publication Ethics | 1 | [E29](corpus/E29-cope-plagiarism/audit.md) |
| Crafting Interpreters | 2 | [E20](corpus/e20-compiler-mountain/audit.md), [E21](corpus/e21-open-upvalue/audit.md) |
| Design Council | 1 | [E26](corpus/E26-design-double-diamond/audit.md) |
| Ellen MacArthur Foundation | 1 | [E27](corpus/E27-emf-butterfly/audit.md) |
| Figma | 2 | [E04](corpus/figma-database-migration/audit.md), [E09](corpus/figma-journal-checkpoints/audit.md) |
| GitHub | 2 | [E03](corpus/github-blackbird-query/audit.md), [E10](corpus/github-security-layers/audit.md) |
| Google ecosystem (Chrome, web.dev, Go) | 3 | [E06](corpus/chrome-process-architecture/audit.md), [E17](corpus/e17-go-slice/audit.md), [E19](corpus/e19-pixel-pipeline/audit.md) |
| Jay Alammar | 1 | [E11](corpus/e11-transformer-stacks/audit.md) |
| MDN Web Docs | 1 | [E15](corpus/e15-js-agent-cluster/audit.md) |
| Martin Fowler | 1 | [E13](corpus/e13-cqrs/audit.md) |
| NASA Science | 1 | [E23](corpus/E23-nasa-star-life/audit.md) |
| NOAA Climate.gov | 1 | [E24](corpus/E24-noaa-enso/audit.md) |
| OpenStax / Rice University | 1 | [E30](corpus/E30-openstax-cell-cycle/audit.md) |
| Pro Git | 1 | [E18](corpus/e18-git-divergent-history/audit.md) |
| React | 1 | [E16](corpus/e16-react-dependency-tree/audit.md) |
| Stripe | 2 | [E02](corpus/stripe-synchronized-retries/audit.md), [E08](corpus/stripe-read-compare/audit.md) |
| Transport for London | 1 | [E28](corpus/E28-tfl-tram/audit.md) |
| U.S. Geological Survey | 1 | [E25](corpus/E25-usgs-water-cycle/audit.md) |
| Vercel | 1 | [E05](corpus/vercel-fluid-transport/audit.md) |
| Wizard Zines | 2 | [E14](corpus/e14-dns-hierarchy/audit.md), [E22](corpus/e22-dns-query/audit.md) |


The repeated publishers supply different visual mechanisms: Cloudflare contributes flight timing and multiplexing; Stripe contributes synchronized time and nested record comparison; Figma contributes migration panels and incremental-state snapshots; GitHub contributes a layer architecture and captioned security grid; Wizard Zines contributes hierarchy and protocol dialogue; Crafting Interpreters contributes a conceptual terrain map and a compact object-pointer diagram. This avoids filling the quota with near-identical variants from one article.

## Principal-object distribution and counting caveats

Current item metadata gives a range of **4–39 principal objects**, with a descriptive median of **14**. **27 cases fall between 5 and 30**. The explicit exceptions are:

- **E26, Double Diamond: 4 phase labels.** This deliberately small figure is valuable because two continuous nonrectangular process regions and sloped labels do substantial explanatory work. Final native v2 merges the four phases into two composite node labels; that loss is audited rather than changing the reference count to make the attempt look complete.
- **E15, JavaScript agent cluster: 34 principal objects.** This is a dense runtime/containment stress case involving mirrored agents, heaps, realms, stacks, queues and shared memory.
- **E28, London Trams: 39 named stops.** This is a dense transport stress case. Service lines, interchange symbols, stop marks and direction cues add semantic marks beyond the counted stops.

The counts are selection-scale descriptors, not identical measurement units. Some references count participants plus message flights (E01), some count stage panels plus repeated components (E04), and others count named phases or stores while excluding group labels and decorative marks. Native declaration totals therefore need not match principal-object counts. Per-case effort records count actual native declarations separately.

Low counts can hide high graphic complexity. E25 has 20 principal pools/use sites, but also a continuous terrain cutaway, weather, water phases, repeated flux marks, subsurface structures and explanatory prose. E20’s 15 principal concepts sit on a meaningful terrain metaphor. E27’s 22 roles participate in nested paths whose order carries information. These are substantive stress cases even below the numerical 30-object threshold. The corpus does not pretend that preserving their labels preserves all their physical or spatial meaning.

## Appearance, composition and density

The source set includes three clearly dark references: **E05 Fluid transport, E16 React dependency tree and E23 stellar lifecycles**. E04’s saturated green and E09’s lavender canvases add deliberate colored-page compositions. The other references are predominantly light, including pale gray/cream surfaces and monochrome line drawings. These are source-image appearance observations, independent of the native theme selected during refinement.

Monochrome and restrained linework are represented by E06, E13, E20 and E21. Meaningful color has several jobs: phase distinction in E01/E30, client identity in E02, component roles in E04, new versus prior state in E09, material-cycle identity in E27 and transport-service identity in E28. A diagram whose colors carry meaning is not treated as semantically complete merely because all labels were copied.

Compact references include the five-stage E19 ribbon, E17’s small descriptor/backing-array layout, E26’s four-phase outline and E18’s short history graph. Spacious diagrams include E03’s broad bands, E05’s dark architecture, E23’s paired loops and E27’s biological/technical split. Dense or unusual examples include E15’s agent cluster, E22’s narrative protocol panels, E25’s landscape cutaway, E28’s full transit network and E29’s long guidance/escalation process. Portrait, wide horizontal, near-square, multi-panel and radial compositions are all present.

Full images and publication-width comparison sheets preserve original aspect ratios and complete content. Detail comparisons expose selected labels, route mechanisms and containment losses; they supplement the full views. A compact native render is not automatically judged better, and a more literal native render can be less useful than its default version.

## Confirmation set

These six cases were audited now and reserved for confirming future changes. They are excluded from choosing numerical routing/layout/type tuning values in the proposed plan; “confirmation” does not mean they were unseen during this descriptive study.

| ID | Publisher group | Distinct confirmation pressure |
|---|---|---|
| [E06](corpus/chrome-process-architecture/audit.md) | Google ecosystem | Monochrome process multiplicity, stack treatment, exterior captions and missing thread/activity content. |
| [E10](corpus/github-security-layers/audit.md) | GitHub | Three-layer grid, component/caption association and note containment. |
| [E16](corpus/e16-react-dependency-tree/audit.md) | React | Dark hierarchy, shared dependency trunks and large module-name typography. |
| [E20](corpus/e20-compiler-mountain/audit.md) | Crafting Interpreters | Illustrated conceptual terrain, branching compiler routes and spatial semantics. |
| [E28](corpus/E28-tfl-tram/audit.md) | Transport for London | Dense undirected/one-way topology, service colors, route geometry and exterior station labels. |
| [E30](corpus/E30-openstax-cell-cycle/audit.md) | OpenStax / Rice University | Radial grouping, circular arrows, phase sectors and split native soft containment. |

The confirmation set spans computing and adjacent fields, dark and light sources, compact and dense cases, conventional grouping and unusual spatial mechanisms. It is a small qualitative holdout, not a statistically powered test set.

## Complete reference map

| ID | Reference | Category | Principal objects | Main source pattern tags | Confirmation |
|---|---|---|---:|---|---|
| [E01](corpus/cloudflare-tls-handshake/source.md) | TLS handshake: TCP and TLS message flights | Computing | 8 | sequence, protocol, timing | — |
| [E02](corpus/stripe-synchronized-retries/source.md) | Synchronized retries and the thundering herd | Computing | 15 | timeline, parallel-process, timing | — |
| [E03](corpus/github-blackbird-query/source.md) | Blackbird query architecture | Computing | 9 | layered-stack, architecture, annotation | — |
| [E04](corpus/figma-database-migration/source.md) | Prepare, replicate, pause, reroute | Computing | 23 | comparison-panels, migration, deployment | — |
| [E05](corpus/vercel-fluid-transport/source.md) | Fluid custom transport layer (dark figure) | Computing | 7 | architecture, request-response, deployment-boundary | — |
| [E06](corpus/chrome-process-architecture/source.md) | Chrome multi-process architecture, Figure 8 | Computing | 5 | architecture, multiplicity, process-boundary | Yes |
| [E07](corpus/cloudflare-http2-multiplexing/source.md) | HTTP/1.1 and HTTP/2 multiplexing | Computing | 16 | comparison-panels, protocol, multiplexing | — |
| [E08](corpus/stripe-read-compare/source.md) | Online migration: read and compare results | Computing | 10 | record-layout, migration, convergence | — |
| [E09](corpus/figma-journal-checkpoints/source.md) | Checkpoints and incremental journal entries | Computing | 28 | comparison-panels, state-snapshots, timeline | — |
| [E10](corpus/github-security-layers/source.md) | Agentic Workflows security layers | Computing | 12 | layered-stack, taxonomy, type-hierarchy | Yes |
| [E11](corpus/e11-transformer-stacks/source.md) | Transformer encoder and decoder stacks | Computing | 15 | layered stack, fanout, neural architecture | — |
| [E12](corpus/e12-lstm-recurrent-cell/source.md) | Expanded LSTM cell with recurrent context | Computing | 18 | computational graph, recurrent state, mathematical notation | — |
| [E13](corpus/e13-cqrs/source.md) | CQRS: separate query and command models | Computing | 13 | architecture, comparison panels, annotation leaders, request/data flow | — |
| [E14](corpus/e14-dns-hierarchy/source.md) | The DNS hierarchy comic | Computing | 20 | explanatory comic, hierarchy, comparison panels, annotations | — |
| [E15](corpus/e15-js-agent-cluster/source.md) | JavaScript agent cluster execution model | Computing | 34 | runtime memory, containment, data flow, parallel agents | — |
| [E16](corpus/e16-react-dependency-tree/source.md) | React module dependency tree — dark illustration | Computing | 7 | dependency tree, dark editorial, shared routing trunks | Yes |
| [E17](corpus/e17-go-slice/source.md) | Go slice descriptor and backing array after reslicing | Computing | 10 | memory layout, cells, interior cell reference | — |
| [E18](corpus/e18-git-divergent-history/source.md) | Git divergent history and branch pointers | Computing | 8 | timeline, dependency graph, pointer hierarchy | — |
| [E19](corpus/e19-pixel-pipeline/source.md) | The browser pixel pipeline | Computing | 5 | pipeline, contiguous stages, meaningful color | — |
| [E20](corpus/e20-compiler-mountain/source.md) | Compiler routes across a conceptual mountain | Computing | 15 | conceptual map, branching pipeline, annotation leaders, illustrated metaphor | Yes |
| [E21](corpus/e21-open-upvalue/source.md) | Open upvalue and closure object graph | Computing | 16 | memory layout, cells, pointer graph, annotation | — |
| [E22](corpus/e22-dns-query/source.md) | Life of a DNS query comic | Computing | 24 | sequence, protocol, explanatory comic, record tables | — |
| [E23](corpus/E23-nasa-star-life/source.md) | Life Cycles of Sun-like and Massive Stars | Adjacent | 12 | scientific lifecycle, branching, circular feedback, dark composition | — |
| [E24](corpus/E24-noaa-enso/source.md) | How do we decide if El Niño conditions are present? | Adjacent | 11 | decision tree, staircase composition, scientific classification, semantic color | — |
| [E25](corpus/E25-usgs-water-cycle/source.md) | The Water Cycle | Adjacent | 20 | scientific physical system, geographic cutaway, labeled fluxes, dense stress case, human/natural comparison | — |
| [E26](corpus/E26-design-double-diamond/source.md) | The Double Diamond | Adjacent | 4 | conceptual process, divergence/convergence, nonrectangular containment, minimal typography | — |
| [E27](corpus/E27-emf-butterfly/source.md) | Circular economy butterfly diagram | Adjacent | 22 | industrial material flow, nested feedback loops, bilateral comparison, flow hierarchy | — |
| [E28](corpus/E28-tfl-tram/source.md) | London Trams service map | Adjacent | 39 | transport map, branching network, one-way cycle, external labels, dense stress case | Yes |
| [E29](corpus/E29-cope-plagiarism/source.md) | Plagiarism in a submitted manuscript | Adjacent | 24 | publishing process, decision tree, long annotations, escalation workflow | — |
| [E30](corpus/E30-openstax-cell-cycle/source.md) | The cell cycle | Adjacent | 6 | scientific cycle, radial bands, phase containment, sector annotation | Yes |


## Purposeful sample limitations

Selection was subjective and demanding: legibility, type hierarchy, deliberate spacing, meaningful color, annotation and composition mattered more than fitting the existing tool. Strong reference standards were retained even when a faithful native recreation was unlikely. Acquisition availability still influenced the sample: blocked or missing originals were excluded, while original high-resolution PNG/SVG/PDF assets were preferred.

The sample is mostly English-language and desktop/publication oriented. It does not systematically cover multilingual typography, accessibility alternatives, responsive behavior, animation or interaction. It is not a statistical-chart gallery, and it does not claim full coverage of circuit schematics, UML conventions, mathematical proofs, every network-map style or domain-specific CAD. Static slices of complex explanations cannot establish how well a tool supports the complete interactive article.

References come from a finite set of editorial voices, with an intentional bias toward software explanations. A recurring issue in three examples from two publishers meets this study’s “common gap” threshold; it does not establish market prevalence. Rare high-value cases remain stress cases. No single scalar score or crossing count is allowed to erase scientific, temporal, physical or semantic losses.

All originals remain third-party material with the observed license/permission state recorded individually. Preservation for this study is not a blanket publication license. This coverage analysis neither publishes the corpus nor alters third-party permissions.

## Reproduction of this accounting

The current coverage/candidate merge was built from the 30 item records and the three preserved originals in `appendix/candidates/` by `scripts/build-coverage.py`. Run that script from any working directory; it locates this archive using its own path and needs only Python 3 standard-library modules. It writes `coverage.md`, `candidate-log.csv`, and `appendix/coverage-counts.json`. No excluded `working/` directory is required. The script asserts the accepted ID set, all 39 unique log-record IDs, the six confirmation flags and complete pattern-family coverage. It does not modify any native attempt or baseline source. Original candidate rows remain losslessly represented in the consolidated CSV, so normalization decisions are reviewable.
