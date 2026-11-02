#!/usr/bin/env python3
"""Assemble the authored synthesis with current measured counts and stable case links.

This does not render diagrams or change case sources, reviews, or the baseline.
"""
from pathlib import Path
import collections
import csv
import json
import statistics

ROOT = Path(__file__).resolve().parents[1]
items = {}
reviews = {}
folders = {}
for path in sorted((ROOT / 'corpus').glob('*/item.json')):
    data = json.loads(path.read_text())
    cid = data['id']
    items[cid] = data
    folders[cid] = path.parent.relative_to(ROOT).as_posix()
    reviews[cid] = json.loads((path.parent / 'review.json').read_text())
items = dict(sorted(items.items()))
effort = {(r['id'], r['stage']): r for r in csv.DictReader((ROOT / 'effort.csv').open())}
summary = json.loads((ROOT / 'summary.json').read_text())
gaps = json.loads((ROOT / 'gaps.json').read_text())


def clean(text):
    return str(text).replace('|', '\\|').replace('\n', ' ')


def table(headers, rows):
    return '| ' + ' | '.join(headers) + ' |\n| ' + ' | '.join('---' for _ in headers) + ' |\n' + ''.join('| ' + ' | '.join(clean(v) for v in row) + ' |\n' for row in rows) + '\n'


def link(cid, name='audit.md'):
    return f'[{cid}]({folders[cid]}/{name})'


def publisher_group(cid):
    p = items[cid]['publisher']
    return 'Google (Chrome, web.dev, Go)' if p in ('Google / Chrome for Developers', 'web.dev', 'The Go Blog') else p


def stats(stage, key, mode='sum'):
    values = [int(effort[(cid, stage)][key]) for cid in items]
    return sum(values) if mode == 'sum' else statistics.median(values)


def write(name, body):
    (ROOT / name).write_text(body.strip() + '\n')


short_titles = {
    'E01':'TLS handshake','E02':'Synchronized retries','E03':'Blackbird query architecture',
    'E04':'Database migration panels','E05':'Fluid transport, dark','E06':'Chrome processes',
    'E07':'HTTP multiplexing','E08':'Read and compare records','E09':'Checkpoint/journal panels',
    'E10':'Security layers','E11':'Transformer stacks','E12':'LSTM recurrent cell','E13':'CQRS',
    'E14':'DNS hierarchy comic','E15':'JavaScript agent cluster','E16':'React dependency tree',
    'E17':'Go slice descriptor','E18':'Git divergent history','E19':'Pixel pipeline',
    'E20':'Compiler mountain','E21':'Open upvalue','E22':'DNS query comic',
    'E23':'Star lifecycles','E24':'El Niño decision process','E25':'Water cycle',
    'E26':'Double Diamond','E27':'Circular-economy butterfly','E28':'London Trams',
    'E29':'Plagiarism workflow','E30':'Cell cycle',
}

insights = {
    'E01':'Readable ordinal sequence; slanted timed flight and split TCP/TLS paint remain absent.',
    'E02':'Final pins restore proportional event centers; fifteen event boxes still replace fine tracks/ticks.',
    'E03':'Layer structure improves; note panels replace leaders and text remains small relative to bands.',
    'E04':'Repeated manual geometry recovers stage correspondence; database cylinders remain pills.',
    'E05':'Dark-note workaround helps; request/response paint is missing and the retained solid-arrow legend has an exception.',
    'E06':'v1 communicates better than the final valid v2; a third-cycle negative pin was rejected and preserved.',
    'E07':'Twenty-four edges represent twelve duplex links; paired routes compete and source grows.',
    'E08':'Record hierarchy remains; typographic roles, sweeping reads and possible multiplicity marks are lost.',
    'E09':'Nine scenes require repeated geometry; octagon/freeform tokens remain substitutions.',
    'E10':'Nine notes and reserved heights approximate attached captions; no pins are needed.',
    'E11':'Two colored stacks become clear; shared fanout becomes many elbows and twelve fit warnings remain.',
    'E12':'Gate structure is recognizable; author shorthand is ambiguous and one route crosses the cell header.',
    'E13':'Read/write organization improves; note leaders, italic hierarchy and compact framing remain different.',
    'E14':'Panel narrative and delegation improve; characters, balloons and handwritten emphasis are absent.',
    'E15':'Dense group composition remains compromised despite 34 pins; shared-memory routing is still awkward.',
    'E16':'Default hierarchy is strong; arrowless refinement weakens logical direction and needs pins to restore depth.',
    'E17':'Native cells preserve descriptor, array and pointer target economically; orthogonal routing is a valid alternative.',
    'E18':'History and pointers communicate clearly; v1 remains more resilient than the pinned v2.',
    'E19':'Default row is a strong explanation; contiguous chevrons are unavailable, but five sizes suffice for refinement.',
    'E20':'A useful compiler graph cannot recover the terrain metaphor; v1 is clearer than spatially forced v2.',
    'E21':'Explicit ports help, yet the return pointer still crosses the Stack title and blends with borders.',
    'E22':'Sequence v0 is concise; six-panel v2 is closer editorially and much more expensive to maintain.',
    'E23':'Mass-dependent branches improve; pictorial identity, broad loops and physical size cues remain absent.',
    'E24':'Manual stair restores reading order; inline emphasis and flat diamonds remain approximations.',
    'E25':'Twenty pins cannot restore geography or distributed physical fluxes; semantics remain 2/5.',
    'E26':'Four phase labels are merged into two composite labels to mimic the two diamonds; quality falls.',
    'E27':'Bilateral roles recover, but colored nested loop hierarchy remains missing; four crossings remain.',
    'E28':'All 39 stops remain; service identity and cartographic geometry do not. This is not an operational map.',
    'E29':'Process is useful with paraphrased guidance; caption structure and one crossing remain unresolved.',
    'E30':'Simple default ordering reads well; manual imitation splits Interphase tint and lowers quality.',
}


def build_report():
    rating_rows = []
    for axis, label in [('quality','Communication quality'),('fidelity','Reference fidelity'),('semantic','Semantic completeness')]:
        rating_rows.append([label] + [summary['ratings_by_stage'][s][axis]['median'] for s in ('v0','v1','v2')])
    report = '''# Editorial diagrams in Draftably: corpus, native attempts and findings

**Completed fixed-baseline study · 2 November 2026**

## Decision

Draftably's native defaults already provide useful sequences, cells, simple hierarchies and pipelines. Across this demanding editorial sample, the largest practical opportunity is to make text hierarchy, anchored annotations, relation styling and quiet containment easier to express and preserve in native files. Many weaknesses involve an otherwise correct graph whose visual explanation depends on those controls. A broad attempt to reproduce terrain, hand illustration and arbitrary vector artwork would address a different and substantially larger problem.

The recommendation is to fix the reproduced dark-note contrast defect first, build the recurring editorial controls next, and repair the concrete record endpoint cases with small regression fixtures. Explore saved route controls, repeated-scene geometry, selected shapes and cyclic/metric layouts as separate designs. Preserve the strong defaults and evaluate communication independently from visual matching. [Evidence: `gap-audit.md`, `implementation-plan.md`, and the case audits linked below.]

This study contains **30 accepted real references and 90 authored, validated and rendered native attempts**. All original assets, all three native stages, thirty full comparisons, thirty detail comparisons, effort counts, failed trials and command logs are included. No application, native syntax, font or renderer was changed. No missing baseline rendering step is left for Codex.

## 1. Access, scope and execution

The immutable supplied packet identifies baseline **`f14d9b891adba75de6cc172b190017ea5a5ca091`**. Its SHA-256 is `5112a74cdb9674f223914392783baaa5349c63d4fdc492b26e823436c45f9373`. All 388 supplied files are included in the baseline hash verification. The packet contains the decisive DSL, model, CLI, fonts, examples and tests required by the mission. It excludes Git metadata, dependencies and build output, so the commit identity is the packet's attestation rather than a separately verified remote Git object. [Evidence: `appendix/source-context/`, `logs/baseline-integrity.json`, `logs/final-verification.json`.]

The actual baseline CLI ran with Node 24.22.1, pnpm 11.25.0 and the supplied frozen dependency lockfile. The manifest requests pnpm 11.9.0; that environment difference is disclosed. The ordinary browser installer initially returned invalid empty archives. Downloading the matching official Chromium headless-shell archive and using the environment's approved browser-execution exception resolved the restriction. The final browser was 156.0.8078.4 / Playwright build 1248. Both setup failures and successes are retained. [Evidence: `logs/runtime.json`, install/browser/smoke logs, and per-command results.]

Each of the 90 final sources has successful `check`, JSON/metrics inspection, SVG export and supplied `shoot` execution: **360 successful final stage commands**. The successful source hash is matched to the current file. Full comparison sheets and labeled details also use the supplied screenshot script. The helper scripts only orchestrate baseline commands, collect evidence and assemble a reading index. They do not draw the native diagrams.

The corpus is **22 computing and eight adjacent references**, with **24 displayed publisher names consolidated into 22 independent editorial groups** and **16 overlapping pattern families**. Twenty-seven examples have 5–30 principal objects; the deliberate exceptions are the four-phase Double Diamond, the 34-object agent cluster and the 39-stop tram map. Principal counts describe reader-visible concepts, not every vector path. The hydrology reference has much more graphic complexity than its twenty named pools/uses suggest. [Evidence: `coverage.md`, `sources.csv`, `candidate-log.csv`.]

The candidate trail has 39 records: 30 accepted, six rejected, two not selected and one superseded acquisition. These are acquisition/decision records, not 39 unique diagrams. A duplicate light variant and a failed legacy URL do not inflate accepted coverage. Default engine-generated references, weak decorative images and unavailable originals were excluded. Every accepted item has actual retained source media and a readable preview.

The sample intentionally favors authored composition, typography, spacing, annotations and semantic visual structure. It is predominantly English and static, not a random population sample, a chart benchmark or a market-demand study. Repetition within this sample supports a qualitative product finding; it does not estimate prevalence among all diagrams.

## 2. Protocol and independent judgments

**v0** is the frozen first successful default render: straightforward declarations, native semantic recipes where useful, and no pins, nudges, manual dimensions or appearance overrides. **v1** uses documented structural and appearance controls. Its nineteen dimensional lines are all note wrap widths. **v2** allows visible manual pins, sizes and routing hints. No case exceeds three visual refinement cycles after v0. Seventeen cases use two cycles; thirteen use three. Failed and rejected refinements remain in the archive. No frozen v0 hash changed. [Evidence: `methodology.md`, `effort.csv`, `freeze-integrity.csv`, per-case `review.json` and `trials/`.]

Quality, fidelity and semantics are separate 1–5 visual judgments. A 3 is useful but visibly compromised; a 5 is publication-ready for quality, convincingly preserved visual explanation for fidelity, or preserved important content/relations/encodings for semantics. None implies pixel identity. All full comparisons retain complete images and aspect ratios in equal-width cards. Selected close-ups supplement the full views; they do not conceal the different overall proportions.

''' + table(['Median judgment, 30 cases','v0','v1','v2'],rating_rows) + '''
**Eighteen cases improve in communication quality from v0 to v2, ten are unchanged, and two are lower.** The unchanged median of 3 is therefore not evidence that refinement did nothing. The ratings are coarse, and improvements redistribute the cases within that scale. Final quality is 4 in fourteen cases and 3 in sixteen; no final 5 is claimed. Fidelity rises from a median of 2 to 3, while semantic completeness rises from 4 to 4.5. These are descriptive summaries of expert judgments, not measured comprehension or statistical estimates. [Evidence: `ratings.csv`, `summary.json`.]

The first-render readability verdict is **six comparable, twenty-four worse, zero better** relative to the original. Comparable means there are useful native gains as well as losses; it does not mean that all visual meaning was retained. The six cases are E01, E16, E17, E19, E26 and E30. The study retained its demanding reference standard rather than treating any cleaner box drawing as a win.

## 3. Strong defaults to preserve

| Evidence | Useful default behavior | Boundary that remains |
|---|---|---|
| E01 TLS handshake | A compact native sequence makes message order and participant identity easy to read with eleven non-comment lines. | Flight slope, time scaling and split phase paint are missing; ordinal order is not temporal fidelity. |
| E16 React hierarchy | Directed default layout gives the dependency tree a readable depth without pins. | Native `directed=false` weakens logical direction and caused a flatter refinement; visual arrow control needs separate semantics. |
| E17 Go slice | Cells express contiguous fields and array slots economically, with the pointer reaching the correct slot. | Exterior labels and diagonal pointer treatment differ; the orthogonal alternative is still clear. |
| E19 pixel pipeline | Five stages form a clear reading row with eleven default lines. | Separate boxes/arrows do not reproduce contiguous chevrons, but the processing order survives well. |
| E26 Double Diamond | Four named steps are easy to scan and maintain. | The default does not communicate widening and narrowing regions; trying to mimic them with two merged labels loses independent phase structure. |
| E30 cell cycle | Simple default ordering is understandable without manual geometry. | It omits radial phase extents and continuous Interphase membership; manual imitation later splits the soft tint. |

These are local strengths, not a claim that the references should be replaced. E17 particularly demonstrates why fidelity and quality need separate scores: a different pointer shape can be a valid, readable native explanation. E26 and E30 demonstrate the opposite risk: adding spatial resemblance can reduce communication quality. Their v2 quality falls from 4 to 3. E06 and E20 likewise have v1 versions that communicate more clearly than their final spatial refinements. The archive preserves the three stages instead of presenting v2 as inherently best. [Evidence: corresponding `audit.md`, `review.json` and actual images.]

Native cells, sequences, deterministic font measurement, automatic basic layout and transparent source-level geometry are assets. Replacing them with a universal canvas of pinned shapes would sacrifice concise semantics and resilience. Future controls should be opt-in and should leave these default cases stable when unused. [Source: `docs/DSL.md`; `src/dsl/compile.ts`, `src/dsl/cells.ts`; `src/model/fonts.ts`, `src/model/routes.ts`; tests for sequences, cells and DSL.]

## 4. Why the hard references remain hard

### Typography and annotation are part of the explanation

E08 distinguishes entities, fields and values through typographic roles; E10 ties component names to mechanism captions; E29 separates short visual roles from long procedural guidance. Native global title/group/annotation roles exist, but local size, weight, italic and rich-run distinctions are not generally available as native authoring controls. E12 additionally needs mathematical notation; the author's `x + previous h` shorthand risks reading as addition instead of concatenation and is explicitly scored as an authoring residual.

Annotations also carry relationships. In E03, fine leaders connect explanatory prose to services without turning the prose into a component. Native notes are useful, but their post-layout placement does not reserve space and their proximity semantics differ from anchored captions. The v0 overlap and final reserved-room workaround are visible. E10 uses nine notes and reserved heights for a pattern that should be recognizable as component-plus-caption. E29's caption-heavy process remains readable but loses that hierarchy. [Source: `src/model/note.ts::placeNotes/noteMarkup`, `src/model/labels.ts`, `src/model/heading.ts`; `tests/notes.test.ts`.]

The model already includes label-placement and leader fields, plus edge-label offsets. Native persistence explicitly rejects changed node-label placement and edge-label position. This is a narrower, more actionable diagnosis than saying the renderer has no label-placement capability. Primary-label placement, additive captions and optional space reservation should be designed separately. [Source: `src/model/types.ts::LabelLayout/EdgeLayout`; `src/dsl/translate.ts::rejectUnsupported`.]

### Lines encode category, direction and spatial meaning

E05's request/response/neutral transport distinctions, E27's biological/technical cycles and E28's tram services use route color semantically. Native edge declarations do not provide independent semantic colors and arrow-end control. A global connection color, async dashes and change-status paint are not interchangeable with those categories. E07 consequently authors twenty-four directed edges for twelve source duplex connections, multiplying both declarations and routing competition. [Source: edge allowlists in `src/dsl/syntax.ts`, `src/model/types.ts::DiagramEdge`, `src/cli/svg.ts::sceneMarkup/arrowsFor`.]

E02 illustrates a different issue: equal-order layout is not a time scale. The default represents retry order but loses exponential spacing. Fifteen pins and fifteen sizes restore proportional event centers at offsets 0, 1, 2, 4 and 8 in v2. That is a successful manual workaround, not an impossible diagram. It remains brittle because a new event requires coordinate arithmetic and because thick event boxes replace the reference's light tracks and ticks.

E21 is an actual endpoint-routing stress case rather than a missing primitive. The final return pointer still approaches a bottom endpoint from above through a Stack title/field despite explicit port sides. E22 shows that supported semantic-field targeting and port hints can repair a related case. E17 supplies a valid cell-pointer positive control. Existing interior-cell behavior intentionally permits some crossing segments; a general ban or corpus-wide clearance adjustment would be the wrong fix. [Source: `src/model/routes.ts::cellEnds/routeInput/drawRoutes`, `src/engines/routing-engine.js`, actual E21 geometry and warning.]

Internal waypoint support also exists, but native saving rejects manual bends. Exposing it requires a coordinate and edit contract: stale absolute bends can become a new maintenance problem. It would not by itself create shared transit tracks, arbitrary curves or fix default record endpoints. This is why G05 is Explore, while the narrower G11 routing regression is Build.

### Composition has a cost even when it is expressible

E04's four migration panels, E09's nine journal/checkpoint scenes and E15's mirrored agent/heap/queue bands depend on counterpart alignment. Native repeated groups can express much of that structure, but their geometry is manually duplicated. E04 needs nineteen pins and nineteen exact node sizes; E09 needs twenty-one of each plus nine minimum panel dimensions; E15 reaches 136 non-comment lines and 34 pins. Group padding and headers consume significant space in those dense designs.

Existing emphasis-state exports share layout and may reduce some repetition; they focus/fade objects rather than automatically producing arbitrary different scenes. They were not evaluated as an alternative within this bounded trial budget. The measured manual sources therefore demonstrate real burden, not an optimality proof that a template feature is the only or cheapest possible native solution. [Source: `docs/DSL.md`, emphasis states and `inspect --states`; `src/model/panels.ts`; `src/dsl/compare.ts`.]

Quiet containment has a similar distinction. `frame=soft` and `frame=none` intentionally dissolve a group's layout scope. They are not merely borderless versions of a retained layout container. E08, E14 and E15 need quiet presentation while retaining scoped organization; E30 shows a soft tint splitting around manually positioned members. Preserve the old semantics and explore an explicit appearance control on a retained scope. [Source: `src/dsl/frame.ts`, group layout in `src/dsl/compile.ts`, group rendering in `src/cli/svg.ts`.]

### Some reference meaning lives in geometry that a graph cannot preserve

E25's water-cycle cutaway conveys physical location, surface/depth relationships and distributed fluxes. The native graph retains named concepts but generalizes transfers, condenses prose and loses that geography. Its final semantic score is 2 despite twenty pins and twenty sizes. E20's mountain metaphor similarly does explanatory work that a compiler graph does not reproduce. The study treats those losses as substantive, not decorative.

E26's two directed divergence/convergence regions, E27's nested value-preservation loops and E30's annular phase bands need different path/region semantics. Rounded orthogonal corners exist but do not supply those features. E23 can preserve a useful stellar lifecycle graph while losing broad directional loops and scientifically recognizable imagery. None of these cases establishes that unrestricted vector import should replace native semantic authoring. [Evidence: preserved originals and case audits; source vocabulary in `src/dsl/syntax.ts`, native shape list and routing in `src/model/routes.ts`.]

The primitive gap also has a model/native boundary: model `ShapeKind` includes image and icon forms, while native DSL shape support is narrower and persistence rejects those content forms. The study did not use image backgrounds, hidden SVG nodes, overlays or tracing. Exact publisher fonts and handwritten treatment are recorded separately from missing local text controls. Bundled fonts remained fixed.

## 5. Every accepted case and its retained outcome

Quality is shown as v0 → v1 → v2. Final F/S means fidelity / semantic completeness, each out of five. The line count is measured non-comment v2 source; the linked audit explains its composition, type, routes, color, fidelity and maintainability. The source-title link goes to the primary source page, while the case ID opens the local audit.

'''
    rows = []
    for cid,d in items.items():
        r=reviews[cid]; q=' → '.join(str(r['stages'][s]['quality']) for s in ('v0','v1','v2'))
        v=r['stages']['v2'];held=' †' if d.get('confirmation_case') else ''
        rows.append([link(cid)+held, f'[{short_titles[cid]}]({d["page_url"]})',q,
                     f'{v["fidelity"]} / {v["semantic"]}',effort[(cid,'v2')]['non_comment_lines'],insights[cid]])
    report += table(['Case','Reference','Quality','Final F/S','v2 lines','Disposition'],rows)
    report += '''
† Confirmation cases: **E06, E10, E16, E20, E28, E30**. They are audited now but are not used to choose numerical tuning values in the future plan. Their observed gaps can confirm or challenge a chosen design. They are a small qualitative confirmation set, not a statistically powered blind test.

Each source record explains the reference's design merit and intended reading path. Particularly useful contrasts are E02's sparse shared-time alignment against E09's repeated snapshots; E17's compact memory cells against E21's object-pointer routing; E19's compact pipeline against E20's spatial metaphor; and E24's shaped decision stair against E29's caption-rich escalation process. This range helps separate a convenient default from a broadly supported editorial pattern.

## 6. Authoring cost and negative results

''' + table(['Measured source burden across 30 cases','v0','v1','v2'],[
        ['Non-comment lines, total']+[stats(s,'non_comment_lines') for s in ('v0','v1','v2')],
        ['Non-comment lines, median']+[stats(s,'non_comment_lines','median') for s in ('v0','v1','v2')],
        ['Declarations, total']+[stats(s,'declarations') for s in ('v0','v1','v2')],
        ['Layout/refinement lines, total']+[stats(s,'layout_and_refinement_lines') for s in ('v0','v1','v2')],
        ['Pins, total']+[stats(s,'pins') for s in ('v0','v1','v2')],
        ['Manual dimensional lines, total']+[stats(s,'manual_size_lines') for s in ('v0','v1','v2')],
        ['Explicit-port lines, total']+[stats(s,'explicit_port_lines') for s in ('v0','v1','v2')],
    ]) + '''
The median native source grows from **26.5 to 55 non-comment lines**. Total declarations barely change, 814 to 839, while layout/refinement lines rise from 85 to 884. This is the central cost finding: much of the additional work is visual specification rather than more semantic content. The 376 final pins and 441 dimensional lines are visible, counted native controls. Dimensional lines include note widths, minimum group dimensions and exact sizes; they are not 441 separate resized nodes. No nudges are used. Styling assignment counts are reported separately because multiple assignments can sit on one line. [Evidence: `effort.csv`, counting definitions in `methodology.md`.]

The most expensive final sources are E28 at 164 lines, E15 at 136, E29 at 112, E27 at 108, E25 at 101, E22 at 98 and E09 at 96. Some verbosity is legitimate subject matter: a 39-stop network and a long editorial process need more declarations than a five-stage pipeline. Other verbosity is workaround cost: repeated dimensions, duplicated reverse edges, manually calculated timeline positions and repeated caption-space reservations. The effort audit distinguishes them and includes exact excerpts.

Short source can still hide a poor solution. E26 v2 has only thirteen lines, but it merges four phase objects into two labels; reduced line count does not equal better semantic authoring. Likewise, the v0 graphs for E26 and E30 are more maintainable and judged clearer than their final attempts. The study does not optimize for brevity independently of the reading task.

Authoring minutes were not tracked. Command elapsed times are measured in logs, but their sum is not end-to-end wall time, human effort or a speed benchmark. Label-edit resilience is a reasoned assessment from source and geometry; no complete edit-resilience experiment was run. Expected reductions after future features remain hypotheses until measured.

The informative failures are retained: E06's negative pin was rejected on its third refinement and the previous valid v2 restored; E09's unsupported state-attribute trial failed; E26's `gap=0` was invalid and corrected within the budget; E14/E22's pre-render reserved `root` identifiers were corrected to `root_ns` before their first valid v0. Author errors are not counted as product defects. E05's final solid-arrow legend and E12's ambiguous concatenation shorthand remain explicit residuals because silently repairing them after the budget would overstate the result.

## 7. Gap incidence and priorities

Eight gap groups meet the contract's commonness rule: at least three accepted cases from at least two consolidated publishers. Four further issues have important two-case evidence and remain in a separate reproduced stress list. Incidence is based on visible examples and checked source boundaries, not the number of provisional workstream labels. [Evidence: `gaps.json`, `gap-mapping.csv`, `gap-audit.md`.]

'''
    common=[];stress=[]
    for g in gaps:
        count=len(g['cases']); pubs=len({publisher_group(cid) for cid in g['cases']})
        row=[g['id'],g['title'],f'{count} / {pubs}',g['decision'],g['reason']]
        (common if count>=3 and pubs>=2 else stress).append(row)
    report += table(['Common ID','Gap','Cases / publishers','Decision','Reason'],common)
    report += table(['Stress ID','Issue','Cases / publishers','Decision','Reason'],stress)
    report += '''
The shape-vocabulary group G07 deserves a specific caution: a cylinder, an octagon/freeform token and a chevron are each single-case motifs in this sample. Their combined inability exposes a common vocabulary boundary; the evidence does not establish that any one of those shapes is itself common. Similarly, G08's manual panel cost does not prove that existing emphasis-state exports would never help.

The highest-value build sequence is: **note contrast; bounded local text roles and anchored captions; semantic edge styling/arrow ends; quiet retained containers; targeted record endpoint repair; clearer fit diagnostics**. Saved bend persistence is Explore until its coordinate/edit contract is defined. Shared panels, curves, compact shapes and metric time need separate proofs. Defer exact publisher font matching, photographic/illustrated terrain and unconstrained vector composition. Avoid abusing diff/status colors, embedding originals, rewriting v0 or tuning to a heuristic defect index. The implementation plan names current modules, existing tests, development cases, confirmation checks and risks for every stage.

## 8. Validation is necessary and not sufficient

There are **18 literal warnings in the final v2 checks**: sixteen `text-overflow` fit warnings across E11/E24 and two `edge-through-title` warnings in E12/E21. The visible short labels fit in the sixteen compact shapes; the warnings reflect conservative measurement/padding requirements, and they are retained rather than suppressed. E30 separately has an informational soft-group diagnostic counted by the native geometry metrics. `warnings.csv` and `diagnostics.csv` preserve that distinction. Exit code zero does not mean a clean visual result.

The historical `scripts/diagram-audit.mjs` was run unchanged with a documented v1→e1, v2→e2 filename adapter. Its first environment-dependent invocation failed with an empty/missing geometry result; that trial is retained, and the successful approved run supplies the final historical audit. Its defect index is supplemental. E02 v0 can score DI 0 while losing time scaling; E26 refinements can score DI 0 while losing phase structure. Conversely, a valid bottom-entry cell pointer in E17 receives an `arrives-below` penalty. E11's upward stacks receive back-edge penalties when the script infers downward flow, and E21's real title crossing is missed by the historical title-band rule. [Evidence: `baseline-audit/`, `appendix/reviews/historical-audit-concept-review.md` and the current native outputs.]

No raw image-difference score, exact pixel-error figure or pixel-perfect claim is used. The different aspect ratios, fonts and representations are not fairly registered for that calculation. Whole-image legibility, details, semantic interpretation and source burden are more informative here. Native geometry metrics still help identify real crossings and route costs, but they cannot measure whether a water-cycle graph retained geography or a tram graph retained service identity.

## 9. Handoff and remaining work

**Completed and observed:** thirty actual originals and previews; ninety `.draft` sources; ninety successful final check/inspect/SVG/shoot command sets; all stage renders and geometry; sixty comparison sheets; source/effort/ratings/gap tables; retained failures; baseline and v0 integrity verification. The searchable `index.html` is an offline reading aid for those assets, not an alternative renderer.

**Judged or inferred:** quality/fidelity/semantic scores, v0 readability verdicts, perceived source nastiness, label-edit resilience and the practical value of the prioritized fixes. Each case records concrete residual differences so those judgments can be challenged.

**Proposed and unexecuted:** every application change, new syntax, new regression test, expected future effort reduction and confirmation outcome. Codex can replay the delivered sources locally, integrate appropriate self-authored fixtures, disposition third-party image reuse, implement selected changes and open a review PR. No commits, pushes, permission changes, author contacts or public publication were performed. There are no essential open questions blocking use of this study; publication-rights decisions and product priorities belong to the follow-on work.

## Evidence route

- [Offline comparison gallery](index.html), [coverage](coverage.md), [source inventory](sources.csv), [candidate decisions](candidate-log.csv).
- [Gap audit](gap-audit.md), [staged implementation plan](implementation-plan.md), [effort audit](effort-audit.md), [machine-readable gap mapping](gap-mapping.csv).
- [Methodology](methodology.md), [actual files read](source-read-log.md), [remaining Codex work](remaining-work.md), [file register](file-register.md).
- [Validation table](validation.csv), [native metrics](render-metrics.csv), [warnings](warnings.csv), [all diagnostics](diagnostics.csv), [ratings](ratings.csv), [frozen-source integrity](freeze-integrity.csv).

Primary source URLs and attribution are preserved for every reference in its `source.md` and `item.json`; the case-title links in the table above also lead to those original pages. License statements are observed individually, including `unknown`, and public availability is not treated as permission. The original third-party media remain distinct from the independently authored native attempts.
'''
    write('report.md',report)


def build_gaps():
    body='''# Cross-corpus gap audit

**Status:** observed fixed-baseline evidence plus source-grounded interpretation and unexecuted proposals. Baseline `f14d9b891adba75de6cc172b190017ea5a5ca091` is unchanged. No proposed fix is represented as implemented.

Stable IDs G01–G12 merge duplicate provisional findings from three workstreams. A **common** gap requires at least three accepted examples from at least two consolidated independent publishers. Google Chrome, web.dev and Go are conservatively consolidated. G01–G08 meet that rule; G09–G12 are reproduced two-case stress issues. Incidence measures this purposive sample only.

Every entry names observed case evidence, category, severity, workaround, visible native cost, source boundary, proposed proof, tests and risk. The cost table reports the full affected v2 source, not a causal estimate of how many lines the individual gap created. One case can expose several gaps, so gap costs must not be summed. `gap-mapping.csv` provides one row per gap/case incidence; `gaps.json` is the authored register.

## Disposition index

'''
    index=[];mapping=[]
    for g in gaps:
        c=len(g['cases']); p=len({publisher_group(cid) for cid in g['cases']});common=c>=3 and p>=2
        index.append([g['id'],g['title'],'Common' if common else 'Stress',c,p,g['decision']])
        for cid,evidence in g['cases'].items():
            mapping.append({'gap_id':g['id'],'gap_title':g['title'],'case_id':cid,'publisher_group':publisher_group(cid),
                'common':common,'classification':g['classification'],'severity':g['severity'],'decision':g['decision'],
                'visible_evidence':evidence,'audit':folders[cid]+'/audit.md','comparison':folders[cid]+'/comparison.png',
                'detail':folders[cid]+'/details/comparison.png','source':g['source'],
                'v2_lines':effort[(cid,'v2')]['non_comment_lines'],'v2_pins':effort[(cid,'v2')]['pins'],
                'v2_dimensions':effort[(cid,'v2')]['manual_size_lines'],'v2_port_lines':effort[(cid,'v2')]['explicit_port_lines']})
    body+=table(['ID','Gap','Evidence class','Cases','Publishers','Decision'],index)
    for g in gaps:
        c=len(g['cases']);ps=sorted({publisher_group(cid) for cid in g['cases']})
        body+=f"\n## {g['id']} — {g['title']}\n\n"
        body+=f"**{g['decision']} — {g['reason']}**\n\n"
        body+=f"**Classification:** {g['classification']}. **Severity:** {g['severity']}. **Frequency:** {c}/30 accepted cases across {len(ps)} consolidated publishers ({', '.join(ps)}). "
        body+=('This meets the commonness rule.\n\n' if c>=3 and len(ps)>=2 else 'This is important reproduced stress evidence, below the commonness threshold.\n\n')
        body+=table(['Affected case / visible evidence','Actual files'],[[link(cid)+': '+e,f'[Full comparison]({folders[cid]}/comparison.png) · [Detail]({folders[cid]}/details/comparison.png) · [v2 source]({folders[cid]}/v2.draft)'] for cid,e in g['cases'].items()])
        body+=f"**Checked source:** `{g['source']}`\n\n**Capability boundary:** {g['boundary']}\n\n**Current workaround:** {g['workaround']}\n\n**Cost interpretation:** {g['cost']}\n\n"
        body+=table(['Case','v2 lines','Pins','Dimension lines','Port lines','Cycles'],[[link(cid),effort[(cid,'v2')]['non_comment_lines'],effort[(cid,'v2')]['pins'],effort[(cid,'v2')]['manual_size_lines'],effort[(cid,'v2')]['explicit_port_lines'],reviews[cid]['refinement_cycles']] for cid in g['cases']])
        body+=f"**Proposed proof, not executed:** {g['proof']}\n\n**Relevant existing tests / proposed additions:** `{g['tests']}`\n\n**Main implementation risk:** {g['risk']}\n"
    body+='''
## Findings kept outside the product-gap count

**Authoring mistakes and choices.** E05's final legend overgeneralizes solid-arrow meaning; E12's plus shorthand can misstate concatenation; E16's use of `directed=false` intentionally changes a logical relation and weakens direction; E26 merges independent phases in order to imitate a contour. These affect ratings but are not renderer defects. E03/E08/E20 also have oversized author-chosen geometry that makes publication-width text smaller. E07's default tangle reflects both declaration/layout choices and the duplicated-edge workaround. Native failures from reserved `root` identifiers, a negative pin, `gap=0` and an unsupported state attribute are retained as authoring evidence, not asserted missing capabilities.

**Unavailable fonts and deliberate style differences.** Handwritten, publisher-specific or proprietary faces, sketch texture, gradients, shadows and pictorial medallions are recorded in fidelity residuals. The bundled deterministic fonts stayed fixed. A different but readable pointer or pipeline is acceptable on quality even when it differs in fidelity. No new font was installed to conceal the boundary.

**Pictorial and physical semantics.** E20/E25 cannot retain conceptual terrain/geographic cutaway meaning by relabeling a general graph. These cases are retained as explicit product-scope boundaries. They do not justify a broad illustration editor ahead of repeated caption, text and relation needs. E23's scientific imagery also carries recognition and scale cues that colored circles do not replace.

**Existing native alternatives not exhausted.** Emphasis-state shared-layout export exists; compare/version panels exist; supported endpoint sides repair some routes; ordinary group/theme controls already produce clear examples. Three refinement cycles bound this study. It establishes demonstrated source burden and residual limits, not global optimality of every attempt or proof that no shorter native solution exists.

## Build, Explore, Defer, Avoid

- **Build:** G09, G01/G02, G03, G04, G11 and G12. Each has an actionable source boundary and a narrow proof that can improve practical editing or correctness without replacing the semantic model.
- **Explore:** G05, G08, G06, G07 and G10. Establish coordinate, correspondence, path/region, shape and metric-time contracts separately; do not collapse them into a generic drawing escape hatch.
- **Defer:** exact publisher fonts, decorative shadows/textures, unconstrained geographic/pictorial illustration and broad rich mathematical typesetting until a narrower need is demonstrated.
- **Avoid:** embedding reference images, hidden SVG/raster tracing, changing defaults to fit one confirmation case, misusing change-status paint, treating warnings/DI as quality, or reducing source by dropping semantics.

The implementation plan supplies the staged module/test/proof/risk sequence. The six confirmation cases E06, E10, E16, E20, E28 and E30 must not determine numerical tuning values. Their future results remain unexecuted.
'''
    write('gap-audit.md',body)
    with (ROOT/'gap-mapping.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(mapping[0]));writer.writeheader();writer.writerows(mapping)


def build_effort():
    body='''# Authoring effort and metric audit

All counts below come from the retained `.draft` sources. Authoring minutes were not tracked. Source burden is measured; cognitive difficulty, resilience to label edits and future effort reductions are judgments or proposals. The baseline and frozen defaults were not changed to improve these totals.

## Counting rules

`scripts/aggregate.py` excludes blank and comment-only lines. Declarations are node/group/edge lines. Layout/refinement counts include documented ordering, alignment, sizing, position and routing controls; their union avoids double counting overlapping categories. Pins, nudges, stays, explicit-port lines, note widths, notes, legends, styling lines and individual styling assignments remain separate columns. Manual dimensions include exact sizes, group minimums, unit widths and explicit diagram/note widths. A line can contribute to several different descriptive columns; do not sum them into an invented total effort score.

All nineteen v1 dimensional lines are note widths, not exact node sizes. V0 has zero appearance overrides, pins, nudges and manual dimensions. V2 has zero nudges: explicit pins carry all manual positions. Style assignment counts may be much larger than style-line counts because each supported attribute is counted. Declared semantic shapes are not counted as styling overrides. Full definitions appear in `methodology.md` and the actual counting implementation is included.

## Stage totals and medians

'''
    keys=[('non_comment_lines','Non-comment lines'),('declarations','Declarations'),('layout_and_refinement_lines','Layout/refinement union'),('pins','Pins'),('nudges','Nudges'),('manual_size_lines','Dimensional lines'),('styling_assignments','Styling assignments'),('explicit_port_lines','Explicit-port lines'),('notes','Notes')]
    body+=table(['Metric','v0 total / median','v1 total / median','v2 total / median'],[[name]+[f'{stats(s,key)} / {stats(s,key,"median"):g}' for s in ('v0','v1','v2')] for key,name in keys])
    body+='''
The final sources total 1,880 non-comment lines versus 953 default lines, while declarations rise by only 25. Much of the extra source therefore specifies appearance and geometry around largely unchanged content. The median doubles from 26.5 to 55 lines; that is a ratio of medians, not the median of per-case ratios. The final range is 13–164 lines. Thirteen lines can still be a lossy solution (E26), so source size is not a proxy for completeness or quality.

## Per-case source burden

`Dimensions` is the broad line count defined above. An exact-node-size count quoted in an individual audit may be smaller because that audit separates note widths and group minimums. Port lines count edge declarations containing either side attribute, not individual `from`/`to` assignments.

'''
    rows=[]
    for cid in items:
        e=effort[(cid,'v2')];rows.append([link(cid),' / '.join(effort[(cid,s)]['non_comment_lines'] for s in ('v0','v1','v2')),e['declarations'],e['layout_and_refinement_lines'],e['pins'],e['manual_size_lines'],e['explicit_port_lines'],reviews[cid]['refinement_cycles']])
    body+=table(['Case','Lines v0 / v1 / v2','v2 declarations','v2 layout/refine','Pins','Dimensions','Port lines','Cycles'],rows)
    body+='''
## How awkward did the native source become?

The following judgments were written against the actual sources and retained images. They are not measured editing-time results. A source can remain understandable while becoming geometrically brittle: fixed widths and positions mean a longer label can require several follow-up edits.

'''
    for cid in items:
        body+=f"### {cid} — {short_titles[cid]}\n\n{reviews[cid]['dsl_nastiness']}\n\n**Stop:** {reviews[cid]['stopping_reason']}. **Actual final source:** [{cid} v2]({folders[cid]}/v2.draft).\n\n"
    body+='''
## Exact native excerpts: where the burden appears

These excerpts are copied from retained v2 sources. They are supported current syntax, not proposed features.

### E02: coordinate arithmetic replaces a shared time axis

```text
pin c1e0 x=0 y=0
size c1e0 width=100 height=64
pin c1e1 x=120 y=0
size c1e1 width=100 height=64
pin c1e2 x=240 y=0
size c1e2 width=100 height=64
pin c1e3 x=480 y=0
size c1e3 width=100 height=64
pin c1e4 x=960 y=0
size c1e4 width=100 height=64
```

Those ten lines repeat for each of three client tracks. They correctly preserve the 0, 1, 2, 4, 8 event-center spacing, but the author now owns the shared-scale arithmetic. Label growth must fit the fixed 100-pixel boxes or trigger another layout decision. This is possible but laborious, rather than unsupported in every form.

### E07: one duplex connection becomes two routed declarations

```text
edge h1.t0f h1.o0 -> h1.i0 from=right to=left
edge h1.t0b h1.i0 -> h1.o0 constraint=false from=left to=right
```

The source uses twenty-four directed edges for twelve duplex connections. The workaround is transparent and preserves two-way connectivity, but it duplicates endpoints and introduces path competition. Setting `directed=false` instead would remove arrowheads and logical direction; it would not supply a two-ended arrow.

### E21: explicit sides do not guarantee a clear route

```text
edge upvalue_stack location -> a constraint=false from=bottom to=bottom
```

The retained geometry is `(700,287) → (35,287) → (35,487)`. Despite the declared sides, the route approaches the lower endpoint from above through a title/field. This is a concrete remaining routing issue, not evidence that the author omitted a side hint. Other E21 paths improved after hints; E22 was successfully repaired with semantic-field targeting and explicit sides. Do not generalize this into a ban on legitimate interior-cell crossings.

### E28: every station carries manual cartographic maintenance

```text
size wimbledon width=110 height=auto
pin wimbledon x=0 y=290
size dundonald width=110 height=auto
pin dundonald x=110 y=290
size merton width=110 height=auto
pin merton x=220 y=290
```

There are 39 stations, 39 sizes and 39 pins. Height remains automatic, but width and placement still constrain the labels. All stop names are present; route identity, exterior ticks/interchange symbols and shared service strokes remain absent. A short adjacency graph could be easier to maintain but would still not constitute a faithful operational transport map.

### E23: a palette override repairs a default note mismatch

```text
theme-color slate shade=50 fill="#172120" stroke="#344542" ink="#B8E5DF"
```

The extra line fixes the note's light panel on the dark canvas by changing that swatch's surface. It also affects any other use of the same shade. `noteMarkup` currently reads global `look.text` for note text rather than pairing it with the chosen panel's ink. E05 independently requires the same class of workaround. Both v1 failures are preserved.

## Refinement limits, failures and honest stopping

Seventeen cases used two refinement cycles after v0; thirteen used three. Stops were thirteen unsupported-primitive boundaries, eight effort limits, eight diminishing-return decisions and one good-enough result. Those are author judgments at the allowed budget, not a proof that further native work is impossible. Alternative native representations, especially emphasis states and different declaration order, were not exhaustively searched.

The retained trials include failed parsing/compilation, visually inferior refinements and intermediate valid sources. E06's final rejected negative pin did not justify a fourth attempt; the prior successful v2 was restored and revalidated. E14/E22's reserved-name errors happened before the first valid image and are not visual cycles. The v0 freeze is never rewritten during replay. A v2 label or legend may retain a candid authoring error after the limit; those errors lower semantic judgments rather than becoming fictional product gaps.

## Native geometry metrics versus visual quality

`render-metrics.csv` records current native geometry, including crossings, bends, route length, canvas size and diagnostic counts when supplied. Those metrics are useful for comparisons within a case. E25's crossings fall from thirty to seven and E27's from nineteen to four, but their key geographic or nested-loop semantics remain missing. Fewer crossings alone cannot establish success.

The unchanged historical audit is included under `baseline-audit/` with the v1→e1 and v2→e2 adapter mapping. Its first environment-dependent failed invocation is preserved under trials; the successful run is the final record. The defect index can disagree with the editorial result:

| Case | Historical metric behavior | Why the metric is insufficient |
|---|---|---|
| E02 v0 | DI 0 | Equal-spacing loses the metric retry scale despite simple geometry. |
| E26 v1/v2 | DI 0 | Diamonds/merged labels still lose four-phase divergence/convergence structure. |
| E16 v2 | DI 54 | Undirected hierarchy and inferred direction penalties do not describe its whole reading quality. |
| E17 v0/v1/v2 | DI 5 / 8 / 12 | A valid bottom-entry cell pointer receives an `arrives-below` penalty. |
| E11 v1 | Twelve back-edge counts | The script guesses downward flow while the intended stacks run upward. |
| E21 final | Historical title-band count 0 | Its terminal-segment exemption misses the real Stack-title crossing reported by the current CLI. |

The independent source/geometry review is `appendix/reviews/historical-audit-concept-review.md`. No scalar combination of that index, lines or fidelity replaces the separate judgments. Exact image-difference error is not reported because the images cannot be fairly registered and font rendering would confound it.

## Measured execution time, not authoring time

Every command result includes a UTC start and elapsed seconds. The sum of the 360 final-stage command durations is reported in `execution-summary.json`; it is a sum across concurrent processes, not wall time, human time, a speed comparison or the complete work cost. Setup, research, source reading, visual review, failed attempts and packaging are not represented by that sum. Do not infer authoring productivity from it.

Future claims such as “caption support halves source edits” require an implemented feature and a controlled label/content-edit exercise. The current study supplies suitable before sources and case-specific risks, but no fabricated future minutes or savings.
'''
    write('effort-audit.md',body)


def build_execution_summary():
    records=[]
    for cid in items:
        for stage in ('v0','v1','v2'):
            d=json.loads((ROOT/folders[cid]/f'{stage}.validation.json').read_text())
            for name,c in d['commands'].items():
                records.append({'id':cid,'stage':stage,'command':name,'elapsed_seconds':c['elapsed_seconds'],'exit_code':c['exit_code']})
    d={'final_stage_commands':len(records),'successful':sum(r['exit_code']==0 for r in records),
       'sum_command_elapsed_seconds':round(sum(r['elapsed_seconds'] for r in records),4),
       'interpretation':'Sum across final command processes, including concurrent work. Not wall time, authoring time, speed benchmark, or complete study cost.',
       'authoring_time_measured':False,'by_command':{n:{'count':sum(r['command']==n for r in records),'sum_elapsed_seconds':round(sum(r['elapsed_seconds'] for r in records if r['command']==n),4)} for n in ('check','inspect','svg','shoot')}}
    write('execution-summary.json',json.dumps(d,indent=2))


if __name__=='__main__':
    build_report();build_gaps();build_effort();build_execution_summary()
    print('Wrote report.md, gap-audit.md, gap-mapping.csv, effort-audit.md and execution-summary.json.')
