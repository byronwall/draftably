from pathlib import Path
import csv,json,collections,statistics

ROOT=Path(__file__).resolve().parents[1]
items={j['id']:j for p in (ROOT/'corpus').glob('*/item.json') for j in [json.loads(p.read_text())]}
assert set(items)=={f'E{i:02}' for i in range(1,31)},set(items)
inputs=['appendix/candidates/infra-e01-e10.csv','appendix/candidates/concept-e11-e22.csv','appendix/candidates/adjacent-e23-e30.csv']
group_map={'Google / Chrome for Developers':'Google ecosystem (Chrome, web.dev, Go)','The Go Blog':'Google ecosystem (Chrome, web.dev, Go)','web.dev':'Google ecosystem (Chrome, web.dev, Go)'}
def source_group(publisher):return group_map.get(publisher,publisher)

normalized=[]
for file in inputs:
    with (ROOT/file).open(newline='') as f:
        for n,r in enumerate(csv.DictReader(f),start=2):
            key=r['candidate_id'];accepted=r['status'].strip().lower()=='accepted'
            j=items[key] if accepted else {}
            raw_status=r['status'];status=raw_status.strip().lower().replace(' ','_').replace('-','_')
            publisher=j.get('publisher',r.get('publisher',''))
            normalized.append({
                'candidate_id':key,'status':status,'original_status':raw_status,
                'title':j.get('title',r.get('title','')),
                'publisher':publisher,'publisher_group':source_group(publisher),
                'category':('software/computing' if int(key[1:])<=22 else 'adjacent') if accepted else 'candidate/acquisition record',
                'page_url':j.get('page_url',r.get('page_url','')),
                'image_url':j.get('image_url',r.get('image_url','')),
                'reason':r.get('reason',''),
                'acquisition':r.get('acquisition',r.get('image_status','')),
                'notes':r.get('notes',''),
                'accepted_id':key if accepted else '',
                'accepted_slug':j.get('slug',''),
                'source_log':file,'source_row':n,
                'original_record_json':json.dumps(r,ensure_ascii=False,sort_keys=True,separators=(',',':'))
            })
normalized.sort(key=lambda r:(r['status']!='accepted',r['candidate_id']))
assert len(normalized)==39
assert len({r['candidate_id'] for r in normalized})==39
assert {r['accepted_id'] for r in normalized if r['status']=='accepted'}==set(items)
with (ROOT/'candidate-log.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(normalized[0]));w.writeheader();w.writerows(normalized)

groups=collections.defaultdict(list)
for eid,j in sorted(items.items()):groups[source_group(j['publisher'])].append(eid)
assert len(groups)==22
confirm=[eid for eid,j in sorted(items.items()) if j.get('confirmation_case')]
assert confirm==['E06','E10','E16','E20','E28','E30']
counts=[j['principal_objects'] for j in items.values()]
statuses=collections.Counter(r['status'] for r in normalized)

def refs(ids):return ', '.join(f"[{eid}](corpus/{items[eid]['slug']}/audit.md)" for eid in ids)
families=[
 ('Architecture and deployment boundaries',['E03','E05','E06'],'Component responsibility, nested boundaries, process isolation and multiplicity.'),
 ('Layered stacks and capability grids',['E03','E10','E11'],'Full-width bands, repeated processing towers, and layer/component/caption hierarchy.'),
 ('Message sequences and protocol flights',['E01','E22'],'Time/order, direction, bundled messages and actor identity across exchanges.'),
 ('Request, data and material flow',['E05','E13','E27'],'Distinct read/write or request/response paths and flow through functional roles.'),
 ('Timelines, synchronization and history',['E02','E09','E18'],'Shared temporal alignment, repeated snapshots, and time distinct from pointer direction.'),
 ('Comparison panels and state transitions',['E04','E07','E09'],'Corresponding objects must align while small relationship or state changes remain visible.'),
 ('Recurrent computation and lifecycle',['E12','E23','E30'],'Feedback, repeated stages, mass/phase branches, and cyclic rather than purely linear reading.'),
 ('Dependencies and conceptual hierarchies',['E14','E16','E18'],'Tree depth, delegation/ownership, shared route trunks and pointer hierarchy.'),
 ('Records, cells, memory and object pointers',['E08','E15','E17','E21','E22'],'Field/value structure, contiguous storage, interior references, shared memory and aliasing.'),
 ('Pipelines and branching compilation',['E19','E20'],'Joined consecutive stages and alternative branches with different destination artifacts.'),
 ('Decision trees and escalation processes',['E24','E29'],'Conditional branching, common collectors, long evidence text and terminal actions.'),
 ('Explanatory comics',['E14','E22'],'Numbered narrative panels, dialogue, recurring actors and colored emphasis.'),
 ('Transport service/network maps',['E28'],'Service identity, one-way circulation, shared tracks, station symbols and external labels.'),
 ('Scientific cutaways and distributed fluxes',['E25'],'Geography, elevation/depth, continuous regions and local physical flow marks.'),
 ('Divergent/convergent process regions',['E26'],'Nonrectangular boundaries themselves encode expansion and narrowing.'),
 ('Nested recovery loops',['E27'],'Loop ordering and bilateral color identity convey value preservation beyond adjacency.')
]
covered=set(e for _,ids,_ in families for e in ids)
assert covered==set(items),set(items)-covered

family_table='| Normalized pattern family | Accepted cases | What it exercises |\n|---|---|---|\n'
for name,ids,why in families:family_table+=f'| {name} | {refs(ids)} | {why} |\n'
publisher_table='| Consolidated publisher / independent author group | Count | Accepted cases |\n|---|---:|---|\n'
for name,ids in sorted(groups.items()):publisher_table+=f'| {name} | {len(ids)} | {refs(ids)} |\n'

matrix='| ID | Reference | Category | Principal objects | Main source pattern tags | Confirmation |\n|---|---|---|---:|---|---|\n'
for eid,j in sorted(items.items()):
    cat='Computing' if int(eid[1:])<=22 else 'Adjacent'
    matrix+=f"| [{eid}](corpus/{j['slug']}/source.md) | {j['title']} | {cat} | {j['principal_objects']} | {', '.join(j['patterns'])} | {'Yes' if j.get('confirmation_case') else '—'} |\n"

text=f'''# Corpus coverage and selection accounting

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

{family_table}

This is broader than a collection of box-and-arrow architectures, while computing remains dominant. Several families deliberately overlap: E12 is both recurrent and computational, E18 separates temporal order from dependency direction, and E22 combines a sequence, comic narrative and records. The grouping keeps those distinctions visible rather than counting every tag as an independent family.

## Publisher and independent-author diversity

The 22 consolidated groups below include 14 groups in the computing subset and eight adjacent publishers. Multiple articles or authors from one publisher count once here. The three Google-associated publication labels are conservatively consolidated, rather than claiming Chrome, web.dev and Go as three independent sources. Other groups represent publishing/editorial voices, not an exhaustive corporate-ownership or public-funding classification; NASA, NOAA and USGS are distinct agency publishers, for example.

{publisher_table}

The repeated publishers supply different visual mechanisms: Cloudflare contributes flight timing and multiplexing; Stripe contributes synchronized time and nested record comparison; Figma contributes migration panels and incremental-state snapshots; GitHub contributes a layer architecture and captioned security grid; Wizard Zines contributes hierarchy and protocol dialogue; Crafting Interpreters contributes a conceptual terrain map and a compact object-pointer diagram. This avoids filling the quota with near-identical variants from one article.

## Principal-object distribution and counting caveats

Current item metadata gives a range of **{min(counts)}–{max(counts)} principal objects**, with a descriptive median of **{statistics.median(counts):g}**. **27 cases fall between 5 and 30**. The explicit exceptions are:

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
| {refs(['E06'])} | Google ecosystem | Monochrome process multiplicity, stack treatment, exterior captions and missing thread/activity content. |
| {refs(['E10'])} | GitHub | Three-layer grid, component/caption association and note containment. |
| {refs(['E16'])} | React | Dark hierarchy, shared dependency trunks and large module-name typography. |
| {refs(['E20'])} | Crafting Interpreters | Illustrated conceptual terrain, branching compiler routes and spatial semantics. |
| {refs(['E28'])} | Transport for London | Dense undirected/one-way topology, service colors, route geometry and exterior station labels. |
| {refs(['E30'])} | OpenStax / Rice University | Radial grouping, circular arrows, phase sectors and split native soft containment. |

The confirmation set spans computing and adjacent fields, dark and light sources, compact and dense cases, conventional grouping and unusual spatial mechanisms. It is a small qualitative holdout, not a statistically powered test set.

## Complete reference map

{matrix}

## Purposeful sample limitations

Selection was subjective and demanding: legibility, type hierarchy, deliberate spacing, meaningful color, annotation and composition mattered more than fitting the existing tool. Strong reference standards were retained even when a faithful native recreation was unlikely. Acquisition availability still influenced the sample: blocked or missing originals were excluded, while original high-resolution PNG/SVG/PDF assets were preferred.

The sample is mostly English-language and desktop/publication oriented. It does not systematically cover multilingual typography, accessibility alternatives, responsive behavior, animation or interaction. It is not a statistical-chart gallery, and it does not claim full coverage of circuit schematics, UML conventions, mathematical proofs, every network-map style or domain-specific CAD. Static slices of complex explanations cannot establish how well a tool supports the complete interactive article.

References come from a finite set of editorial voices, with an intentional bias toward software explanations. A recurring issue in three examples from two publishers meets this study’s “common gap” threshold; it does not establish market prevalence. Rare high-value cases remain stress cases. No single scalar score or crossing count is allowed to erase scientific, temporal, physical or semantic losses.

All originals remain third-party material with the observed license/permission state recorded individually. Preservation for this study is not a blanket publication license. This coverage analysis neither publishes the corpus nor alters third-party permissions.

## Reproduction of this accounting

The current coverage/candidate merge was built from the 30 item records and the three preserved originals in `appendix/candidates/` by `scripts/build-coverage.py`. Run that script from any working directory; it locates this archive using its own path and needs only Python 3 standard-library modules. It writes `coverage.md`, `candidate-log.csv`, and `appendix/coverage-counts.json`. No excluded `working/` directory is required. The script asserts the accepted ID set, all 39 unique log-record IDs, the six confirmation flags and complete pattern-family coverage. It does not modify any native attempt or baseline source. Original candidate rows remain losslessly represented in the consolidated CSV, so normalization decisions are reviewable.
'''
(ROOT/'coverage.md').write_text(text)
summary={'accepted':len(items),'software':22,'adjacent':8,'publisher_labels':len({j['publisher'] for j in items.values()}),'publisher_groups':len(groups),'pattern_families':len(families),'principal_objects':{'min':min(counts),'median':statistics.median(counts),'max':max(counts),'within_5_30':sum(5<=v<=30 for v in counts)},'confirmation_ids':confirm,'candidate_records':len(normalized),'candidate_statuses':dict(statuses)}
(ROOT/'appendix/coverage-counts.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
