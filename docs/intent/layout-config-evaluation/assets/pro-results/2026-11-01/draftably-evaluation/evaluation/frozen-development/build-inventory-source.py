"""Replayable source inventory. Does not run or replace product algorithms."""
import json, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=ROOT/'baseline'
OUT=ROOT/'deliverables'
rows=[]
def source(path,symbol):
    text=(BASE/path).read_text().splitlines()
    hit=next((i for i,x in enumerate(text,1) if symbol in x),None)
    return f'{path}:{hit or "?"} ({symbol})'
def add(id,category,name,job,surfaces,default,range,condition,refs,decision='Keep',replacement='None',placement='advanced/source',runtime='Not separately measured yet',uncertainty='Measured marginal value pending root evaluation',retention='Retain',**kw):
    rows.append(dict(recommendation_id=id,category=category,name=name,user_job=job,surfaces=surfaces,default=default,range=range,effective_conditions=condition,decision=decision,replacement=replacement,implementation_retention=retention,proposed_placement=placement,witness_case='See targeted witness requirement; root evaluation attaches measured cases',marginal_gain_loss='No deletion claim from source tracing alone',runtime_impact=runtime,uncertainty=uncertainty,source_symbols='; '.join(source(*r) for r in refs),evidence_type='Source fact plus provisional disposition; measured annotation pending',**kw))
L='src/engines/layout-engine.js';R='src/engines/routing-engine.js';X='src/engines/explorer-engine.js';S='src/dsl/syntax.ts';C='src/dsl/compile.ts';E='src/dsl/layout-edits.ts';U='src/components/LayoutLab.tsx';M='src/components/Menus.tsx';I='src/components/Inspector.tsx';P='src/state/comparison.ts';F='src/state/file-session.ts';T='src/dsl/translate.ts';A='src/state/commands.ts';D='src/model/document.ts';SC='src/engines/sculpt-engine.js';ST='src/state/sculpt.ts'
engines=[
('compound-flow','Compound flow','Directional nested architecture','Layered targets plus global leaf ranks and exact boundary links; compiler additionally packs compound-flow/group scopes', 'Retain pending portfolio evaluation'),
('boundary-align','Boundary alignment','Straighten cross-container endpoints with small warm moves','Transverse cross-boundary forces plus mild length relaxation; explicit source rebuild starts cold', 'Evaluate warm retention separately from cold portfolio'),
('compound-spring','Compound spring','Compact nested systems without rigid ranks','Leaf-endpoint springs transfer to sibling owners; compactness/aspect forces; alternates hierarchy', 'Niche candidate, do not merge by family name'),
('tidy','Local tidy','Repair stretched links while retaining arrangement','Warm local spring/alignment solver; also allowed for cold source rebuild', 'Keep warm action even if cold method is dominated'),
('stress','Stress descent','Undirected relationship distance structure','All-pairs shortest-path weighted distance objective, gradient descent; shared respectDirection still defaults true for directed edges', 'Do not identify with full stress majorization'),
('force','Spring network','Organic relationships and clusters','Quadratic pairwise repulsion and attraction; shared direction projection on directed edges', 'Niche candidate, compare against stress not presumed interchangeable'),
('flow','Directional flow','Directional reading with softer ranks','Soft directional constraints, spring relaxation and alignment; distinct from flow structural recipe', 'Must preserve engine/recipe distinction'),
('layered','Layered + fold','Readable ranked dependencies and long flows','Ranks and barycentric sweeps; flat authored-order prior; source compiler folds and packs grouped drawings', 'Separate source/cold and warm pass outputs'),
('tree','Subtree tree','Ownership hierarchies, chosen root, forest','Breadth-first spanning forest and subtree spans; keeps non-tree edges; root may alter parent choices', 'Niche root witness required'),
('grid','Soft grid','Disconnected or weakly linked overview','Greedy free-cell assignment plus relaxation; target aspect applies', 'Keep sparse-board witness'),
('separate','Separate overlaps','Remove collisions without connectivity objective','Repair on current coordinates even in rebuild mode; excluded from source ENGINES', 'Never count as eleventh cold rebuild choice')]
for key,name,job,cond,note in engines:
    add('ENG-'+key.upper(),'engine',name,job,'Layout lab Approach; Compare; JSON engine API'+('; source engine=' if key!='separate' else '; source engine= excluded'), 'tidy is document default; source default is recipe flow', 'all/pass/rebuild as applicable',cond,[(L,"id: '"+key+"'"),(S,'export const ENGINES')],decision='Hide',replacement='Goal or task entry; retain advanced override until portfolio data justifies deletion',runtime='Measured in engine screening/timing strata',uncertainty=note,setting_key=key)
recipes=[
('flow','Rank by directed relationships; preserve readable sequence','root or boxed group; fold auto by default','Root with no layout line: gap48; groups default column gap24; explicit flow: gap28','directional rank recipe plus compiler folding and label-aware spacing'),
('row','Put siblings on one row','root or boxed group','gap28','preserves declared/order hint ordering; no connectivity solver needed'),
('column','Put siblings in one column','root or boxed group','gap28; implicit group column gap24','preserves declared/order hint ordering'),
('lanes','Explain process by owner across swim lanes','root only; all top-level objects boxed groups','gap28 parsed, rank gap at least56; direction auto→right','every node belongs to a lane; rank columns align across owners; position refinements inside lanes currently ignored'),
('sequence','Explain messages in temporal order','root only; node participants and edge declaration order','participants across top; message rows top-to-bottom','sequence-specific routes, lifelines, phases; general engine replacement changes semantics'),
('cells','Draw record fields, tables, byte/bit structures','boxed group only; direct members are cells','row; columns omitted means one row (right) or column (down); unit mode supplies 16 byte / 32 bit columns','edge-to-edge cells, spans, specialized endpoints; engines may move parent as block')]
for key,job,cond,default,detail in recipes:
    add('REC-'+key.upper(),'recipe',key+' recipe',job,'source layout; CLI; source authoring',default,'See recipe attributes',cond+'; '+detail,[(S,"['flow', 'row', 'column', 'lanes', 'sequence', 'cells']"),('docs/DSL.md','## '+{'flow':'Layout engines','row':'Refinements','column':'Refinements','lanes':'Swim lanes','sequence':'Sequence diagrams','cells':'Cells'}[key])],placement='specialist Structure chooser / source',uncertainty='Semantics support retention independently of soft score')
add('REC-IMPLICIT','recipe-baseline','No layout line','Immediate first render','source omission','root flow gap48; groups column gap24','Not an engine', 'Compiler layoutFor supplies defaults; stable production baseline',[(C,'export function layoutFor')],placement='default',uncertainty='Compare as separate method; do not equate to engine=flow')
# Core LayoutSettings rows. Source attrs are mapped to runtime keys without double-counting aliases.
settings=[
('algorithm','tidy','11 IDs','Select engine','An operation chooses actual engine; source permits10','Approach selector plus Diagram type alias', 'Merge'),
('direction','RIGHT','RIGHT/DOWN; source auto/right/down','Choose reading order','Raw shared direction objective; source auto resolves right; explicit right/down additionally informs per-edge routing','direction', 'Keep'),
('mode','pass','pass/rebuild','Choose small repair or new arrangement','Invocation mode; normalize forces stored mode pass; source compile explicitly rebuilds','Actions, JSON API','Merge'),
('maxMove',48,'4–300 engine;8–192 UI','Bound local displacement','pass only; one global displacement disc includes moved descendants','Small passes; Compare pass axis','Automate'),
('stability',65,'0–100','Stay near the current drawing','soft anchor only in pass; redundant in cold and warm settled rebuild','Small passes; Compare pass axis','Hide'),
('iterations',32,'4–160 engine rounded;8–96 UI','Bound small-pass solver effort','settle=false pass; rebuild without settle uses max(80,3*iterations); settled mode uses maxIterations instead','Small passes; Compare pass axis','Automate'),
('nodeGap',24,'4–160 engine/source;8–96 UI','Separate sibling boxes','All engines, collision projection and target geometry; parents may add group gap','Minimum shape gap; source node-gap; Compare','Merge'),
('rankGap',52,'12–220 engine/source;16–180 UI','Space directional ranks','Target ranks and common direction projections; consumed beyond listed algorithm controls','rank-gap; Rank spacing; Compare','Merge'),
('edgeLength',88,'20–260 engine/source;20–220 UI','Give links breathing room','Springs and stress; boundary-align consumes despite omission from its controls metadata','edge-length; Link breathing room; Compare','Hide'),
('repulsion',45,'0–100','Spread organic network nodes','force only','repulsion; Repulsion; Compare','Hide'),
('flowStrength',65,'0–100','Enforce reading order softly','flow-specific relaxation and all connective algorithms while respectDirection true','flow-strength; Forward pressure; Compare','Automate'),
('alignment',55,'0–100','Align neighbours/endpoints','tidy, flow, boundary-align forces; compound objective also references it','alignment; Alignment; Compare','Hide'),
('compactness',35,'0–100','Compact network and match shape','tidy,stress,force,grid,compound-spring; excluded for flow/tree/layered/compound-flow/boundary-align','compactness; Compactness / aspect pull; Compare','Automate'),
('gridStrength',45,'0–100','Control attraction to grid slots','grid only; geometry remains movable','grid-strength; Grid attraction; Compare','Automate'),
('aspect','1.6','canvas/1/1.333/1.6/2/0.75; source excludes canvas','Fit a target shape','Grid targets/compactness/engine fold; frame ratio overrides inner scope; source compiler has separate fit search','aspect; Target aspect; Compare','Merge'),
('fold','never','auto/never','Shorten a long run by wrapping','Raw engine local fold forced never when respectDirection true; source layered and compound-flow packing later fold unless explicit params.fold=never','fold; Long sequences; Compare','Keep'),
('respectDirection',True,'boolean','Preserve forward order vs network freedom','All connective engines; suppresses raw fold; not source ENGINE_PARAMS; not serialized by engineAttrs','Respect arrow direction; Compare; JSON','Automate'),
('ordering','stable','stable/crossings','Reorder ranks to reduce crossing','warm pass layered targets; cold mode always sweeps and so ignores distinction; DSL accepts it but compiler has no other consumer','ordering; Within-rank ordering; Compare','Hide'),
('rootId','','node ID','Choose hierarchy root','tree spanning forest; layout intent.start overrides invocation root; source remaps aliases','root; Root selector; not Explorer layoutParams','Keep'),
('respectManual',False,'boolean','Protect hand-moved objects','only nodes marked manual; pins already always fixed; descendants anchor groups; file source rebuild does not serialize it','Treat Manual markers as fixed; Compare; JSON','Merge'),
('growContainers',False,'boolean','Let constrained frames grow','right/down only; fixed group or pinned descendant prevents growth; compiler engineArrangement forces true','Allow containers to grow; Compare; JSON','Automate'),
('boundaryPull',65,'0–100','Align linked children across group borders','three compound algorithms; only cross-parent links use this coefficient; same-parent coefficient .35','boundary-pull; Cross-boundary pull; Compare','Hide'),
('hierarchySweeps',2,'1–4 rounded','Alternate inner/outer optimisation','three compound algorithms only; multiplicative nested solve passes','hierarchy-sweeps; Hierarchy sweeps; Compare','Automate'),
('groupGap',48,'12–180 engine/source;12–160 UI','Space sibling frames','compound pair separation; compound-flow rankGap max; source packed layered/compound-flow frames','group-gap; Between-container gap; Compare','Merge')]
for key,default,rg,job,condition,surf,decision in settings:
    specs=[(L,'function settings'),(L,'async function compute'),(U,'export function LayoutLab'),(E,'export function engineAttrs')]
    add('LAY-'+re.sub('([A-Z])',r'-\1',key).upper(),'layout-setting',key,job,surf,str(default),rg,condition,specs,decision=decision,replacement='Task-scoped preset with exact source override; do not rewrite stored values',placement='main' if key == 'direction' else 'advanced/source',runtime='Screened by settings/interaction stages; effort controls may change work',setting_key=key)
route=[
('clearance',10,'4–30','Keep lines away from obstacles','Obstacle inflation used for path search; some title/own-end escape paths are special; infeasible routes can be marked blocked','Shape clearance','Hide'),
('portGap',16,'6–28','Separate endpoints on a shape side','Auto port pitches and routing grid; fan offsets often use max(portGap,edgeGap)','Port spacing','Merge'),
('edgeGap',16,'4–48','Separate parallel routes','Routing grid candidates, lane deficit and tidy pitch; source compiler also widens packed group channels','Parallel edge gap','Merge'),
('bendPenalty',32,'0–100','Prefer simpler paths','Cost per turn, adds to path length; no effect where path choice constrained','Bend cost','Automate'),
('crossingPenalty',360,'0–1200','Trade detour against crossings','A* and candidate/global repair costs; higher can yield large detour','Crossing cost','Automate'),
('sharedPenalty',8,'0–20','Separate unrelated shared paths','Per-pixel shared length cost; interaction with passes','Shared-path cost (advanced)','Automate'),
('parallelPenalty',18,'0–60','Give parallel lanes room','Lane deficit cost against edgeGap; interaction can matter when one-factor screen is quiet','Lane separation cost','Automate'),
('portStability',20,'0–150','Keep previous endpoint sides after edit','First pass uses rawOptions.previous matching edge IDs; improvement passes use current route sides as old even without external history; nonbinding preference','Keep previous sides','Automate'),
('fanoutPenalty',50,'0–160','Spread branches over usable sides','Side reuse and fan packing cost; facing-fan rules constrain allowed alternatives','Spread fan-out','Automate'),
('passes',3,'1–5 rounded','Repair conflicts after initial routing','Initial pass plus up to4 repair passes; quick mode forces1 and skips repair/tidy','Routing passes (advanced)','Automate'),
('cornerRadius',6,'0–16','Choose rounded vs square appearance','Raw routing geometry does not consume it; drawRoutes calls roundedPath with radius','Corner radius','Merge'),
('standoff',20,'0–40','Avoid hugging a box or border','Soft near-obstacle cost, own-end stubs, title-band lip and final tidy; zero disables preference','No editor slider; no Explorer axis','Hide')]
for key,default,rg,job,condition,label,decision in route:
    refs=[(R,'const defaults'),(R,'function compute'),(S,'export const ROUTING_PARAMS'),(M,'const ROUTING_FIELDS')]
    if key=='cornerRadius': refs.append(('src/model/routes.ts','radius = doc.settings.routing'))
    add('RTE-'+re.sub('([A-Z])',r'-\1',key).upper(),'routing-setting',key,job,'source routing; JSON/API; '+label+('' if key=='standoff' else '; Compare axis'),default,rg,condition,refs,decision=decision,replacement='Routing goals/presets; preserve exact source numeric override',placement='Appearance' if key=='cornerRadius' else 'advanced/source',runtime='Measured fixed-position routing stage; corner radius only rendering',setting_key=key)
# Recipe-only and source structural attributes, counted independently from engine aliases.
extra=[
('FIT','fit','Target output shape','unset','wide2/slide1.78/square1/page.77/tall.6','root layout only; evaluates as-written then2directions×2fold values; no sweep for sequence/lanes/cells','Keep','Main Format',C,'function fitVariants'),
('RECIPE-GAP','recipe gap','Minimum space between recipe siblings',28,'8–300','not engine attr; lanes enforce56 minimum; root implicit default48/group24','Merge','Spacing preset + source',S,"gap: num('gap'"),
('RECIPE-FOLD','flow recipe fold','Wrap long ranked flows','auto','auto/never','flow only; distinct default from raw engine fold; uses fixed render context and label-free plan','Keep','Advanced wrapping + source',C,'export function foldRanks'),
('MIN-WIDTH','min-width','Reserve minimum scope/frame width',0,'0–10000','source layout attr; content larger than minimum dominates','Hide','Source',S,"minWidth: num('min-width'"),
('MIN-HEIGHT','min-height','Reserve minimum scope/frame height',0,'0–10000','source layout attr; content larger than minimum dominates','Hide','Source',S,"minHeight: num('min-height'"),
('CELL-COLUMNS','columns','Set record grid or packet width','unset: one row (right) or column (down)','1–512','cells only; unit byte/bit defaults16/32 when unspecified','Keep','Specialist structure',S,"columns: num('columns'"),
('CELL-UNIT','unit','Size packet fields by bytes/bits','unset','byte/bit','cells only; unit spans wrap; not an aesthetic layout engine setting','Keep','Specialist structure',S,"unit: choice('unit'"),
('CELL-UNIT-WIDTH','unit-width','Scale units in a byte/bit diagram','byte48/bit24','8–200','only when unit specified; parser uses24 but cells module distinguishes explicit/source default','Hide','Advanced structure/source','src/dsl/cells.ts','unitWidth'),
('CELL-RULER','ruler','Show unit positions','on','on/off','byte/bit cells only; affects title/ruler geometry','Keep','Specialist structure',S,"ruler: choice('ruler'"),
('GROUP-FOLD','group fold','Keep one long group unwrapped','unset','never','compiler packed downflow tall-group heuristic; distinct from parent layout fold','Keep','Group advanced/source',C,"tall.fold === 'never'"),
('GROUP-FRAME','frame','Distinguish boxed/soft/unframed containment','box','box/soft/none','soft/none membership still semantic; no own layout or refinements; nearest boxed ancestor arranges members','Keep','Group inspector/source',S,'export function layoutParent'),
]
for id,name,job,df,rg,condition,decision,placement,path,symbol in extra:
    add('LAY-'+id,'recipe-setting',name,job,'source layout/group; proposed contextual UI',df,rg,condition,[(path,symbol)],decision=decision,placement=placement,uncertainty='Semantic authored control; deletion changes task capability')
# Authored constraints. Coordinates and strength dimensions are individual entries.
authored=[
('FROM','from= / fromSide','Force source endpoint side','auto','auto,left,right,top,bottom','edge; explicit side must be preserved or blocked reported','Keep','Connection Inspector',S,"from: choice('from'"),
('TO','to= / toSide','Force target endpoint side','auto','auto,left,right,top,bottom','edge; explicit side is a hard authored constraint','Keep','Connection Inspector',S,"to: choice('to'"),
('CONSTRAINT','constraint=false','Draw feedback without influencing layout','true','true/false','compiler filters from ranking and raw engine graph; still routes','Keep','Connection advanced/source',C,'const loose = new Set'),
('DIRECTED','directed','Distinguish causal/order edge from undirected relation','true','true/false','undirected adjacency attracts without directional rank constraint','Keep','Connection Inspector',S,"choice('directed'"),
('ORDER','order scope ids...','Set stable sibling/participant/cell order','declaration order','ordered list of valid children','soft ordering; flat layered authored prior may yield when sweep removes clear crossing margin','Keep','Reorder action/source',C,'function authoredOrder'),
('NEAR-SIDE','near side','Place a node on named side of reference','right','right,left,above,below','same effective scope or reference in sibling group; soft unless required','Keep','Direct manipulation/source',S,"side: choice('side', 'right'"),
('NEAR-GAP','near gap','Choose local neighbour distance',28,'0–2000','near relation; may yield for collision safety unless required','Keep','Direct manipulation/source',S,"gap: num('gap', 28, 0, 2000)"),
('NEAR-OFFSET','near offset','Offset alignment across neighbour direction',0,'-100000–100000','relative refinement','Hide','Source',S,"offset: num('offset'"),
('NEAR-STRENGTH','near strength','Make neighbour position required','prefer','prefer/required','required near becomes constraint, contradictions diagnostic','Keep','Advanced/source',S,"strength: choice('strength', 'prefer'"),
('NUDGE-DX','nudge dx','Shift from automatic horizontal position',0,'-100000–100000','soft, parent local; removed by rebuild','Hide','Source',S,"dx: num('dx'"),
('NUDGE-DY','nudge dy','Shift from automatic vertical position',0,'-100000–100000','soft, parent local; removed by rebuild','Hide','Source',S,"dy: num('dy'"),
('STAY-X','stay x','Preserve horizontal placement across edits',0,'-100000–100000','soft arrangement coordinates relative to parent content; stale anchors can be discarded with diagnostic','Keep','Internal writeback/source',S,"x: num('x', 0)"),
('STAY-Y','stay y','Preserve vertical placement across edits',0,'-100000–100000','soft arrangement coordinates; rewritten for moved objects by writeArrangement','Keep','Internal writeback/source',S,"y: num('y', 0)"),
('STAY-WEIGHT','stay weight','Control how strongly soft positions resist changes',8,'1–100','only stay refinement; does not make a hard pin','Hide','Source',S,"weight: num('weight'"),
('PIN-X','pin x','Lock exact horizontal coordinate',0,'0–100000','hard pin; parent-content coordinate; nested origin may move parent while preserving local pin semantics','Keep','Pin + geometry/source',S,"x: num('x', 0, 0)"),
('PIN-Y','pin y','Lock exact vertical coordinate',0,'0–100000','hard pin; inconsistent pin constraints diagnostic','Keep','Pin + geometry/source',S,"y: num('y', 0, 0)"),
('SIZE-WIDTH','size width','Set exact shape width',164,'40–1200','explicit width may clip title and report; diamond square at larger side','Keep','Resize/Inspector/source',S,"width: num('width'"),
('SIZE-HEIGHT','size height','Set exact or text-fitting height',56,'24–1200 or auto','auto keeps explicit width and fits title','Keep','Resize/Inspector/source',S,"height: num('height'"),
('ALIGN-AXIS','align x/y','Align sibling centers','explicit','x/y','soft by default; requires >=2 siblings','Keep','Align action/source',S,"case 'align'"),
('ALIGN-STRENGTH','align strength','Make center alignment required','prefer','prefer/required','required alignment kept through recipe replacement','Keep','Advanced/source',E,"getAttr(s, 'strength')"),
('PARENT','in= / parentId','Own an object in a container','root','valid noncyclic group ID','containment affects scopes/routes; soft groups flatten for layout only','Keep','Group/Container selector/source',I,'function ParentSelect'),
('SPAN','span','Make table/packet field span columns/units',1,'1–4096 or var in unit cells','cells only; source remains node metadata','Keep','Cell Inspector/source',S,"attrs.has('span')"),
('PHASE','phase message ids','Group contiguous sequence messages','none','named phase with message IDs','sequence only; one phase per message; row bands are semantic structure','Keep','Sequence/source',S,"case 'phase'"),
('MANUAL','manual marker','Remember hand movement','false','boolean','marker alone does not fix; respectManual controls effect; source derived from refinements','Merge','Pin/protection status',I,'function PinControl'),
('COLLAPSE','collapsed group','Inspect a large drawing with hidden contents','expanded','set of group IDs','view state; routes proxy endpoints; hidden nodes not lost objects','Keep','Group action',L,'const visible ='),
('CONTAINER-DIRECTION','container direction','Choose local reading orientation','inherit','inherit/RIGHT/DOWN','JSON raw engine inheritance; source uses nested layout direction instead','Merge','Nested source recipe',L,'const inheritedDirection'),
('CONTAINER-PADDING','container padding','Leave space inside manually sized frames',24,'12–80 normalized and UI','raw frame boundary constraints; compiler has separate fixed GROUP_INSET; source writeback omits unsupported config','Hide','JSON advanced only',D,'padding: finite(cfg.padding)'),
('WAYPOINTS','edge waypoints','Force a hand-drawn route','none','up to40 finite points','JSON/editor only; source translateEdit explicitly rejects bends','Hide','Advanced canvas with capability notice',T,'Connection bends are not saved'),
('LABEL-DX','edge label dx','Move a route label horizontally',0,'finite number','JSON/editor only; source translator rejects label offsets','Hide','Advanced canvas with capability notice',T,'Connection label positions are not saved'),
('LABEL-DY','edge label dy','Move a route label vertically',0,'finite number','JSON/editor only; source translator rejects label offsets','Hide','Advanced canvas with capability notice',T,'Connection label positions are not saved'),
('INTENT-START','start object / placement','Choose preferred reading start or central hub','unset','node +9positions','soft hint; can alter cycle handling and bilateral tree; source translator rejects','Hide','Advanced JSON only',L,'if (intent.start) s.rootId'),
('INTENT-END','end object / placement','Choose preferred endpoint area','unset','node +9positions','soft hint; pins/frames/scope win; source translator rejects','Hide','Advanced JSON only',T,'Start and end preferences are not saved'),
]
for id,name,job,df,rg,cond,decision,placement,path,symbol in authored:
    add('AUTH-'+id,'authored-constraint',name,job,'source and/or context inspector as specified',df,rg,cond,[(path,symbol)],decision=decision,placement=placement,uncertainty='Authored constraints are not expendable because an automatic policy sometimes matches them')
# Runtime options and UI policy controls.
options=[
('SCOPE','Scope','all API;auto editor','all/selection/neighbourhood/container','Selection requires siblings; container needs group ID; source rebuild only root or one container','Keep','Main contextual scope',L,"const scope = opts.scope"),
('WARM-START','Warm start','false API;true journey','boolean','Preserves positions while settle changes objective; not same as source rebuild','Merge','Improve vs Rearrange actions',L,'!opts.warmStart'),
('SETTLE','Settle','false API;true compiler/compare','boolean','Enables convergence/plateau stopping and maxIterations cap','Automate','Internal',L,'const steps = opts.settle'),
('MAX-ITERATIONS','Maximum settled effort',640,'80–1200 engine clamp;UI320/640/1200','per solve; actual work multiplied by hierarchy; source compile constant640 ignores Compare control','Automate','Internal/debug',L,'clamp(Math.round(opts.maxIterations'),
('FIXED-IDS','Brush/session holds',[],'valid object IDs','Hard operation constraints; does not persist as source recipe','Keep','Contextual Hold',L,'const extraFixed'),
('VIEWPORT','Canvas dimensions','1200×760 raw;1100×720 source','finite positive dimensions','Only aspect=canvas uses raw viewport; source fixed context for deterministic geometry','Automate','Internal',L,"s.aspect === 'canvas'"),
('QUICK-ROUTES','Quick drag routing',False,'boolean','Locks prior sides first,1pass and skips tidy; final routing must rerun','Automate','Internal',R,'rawOptions.quick'),
('PRIOR-ROUTES','Shared route history',[],'edge ID/fromSide/toSide','Required for stability comparison; candidate runs must share same prior','Keep','Internal',R,'const previous = new Map'),
('SNAP','Snap to nearby shapes',True,'boolean','Direct manipulation; not solver gap or constraint','Keep','Editor preference',I,'label="Snap to nearby shapes"'),
('SHOW-MANUAL','Show manual badges',True,'boolean','Appearance only; does not change protection','Hide','Editor preference',I,'label="Show manual position badges"'),
('COMPARE-MODE','Comparison type','layout','layout/routing','Routing comparison freezes positions only on engine path; source policy still compiles same source','Keep','Compare contextual tabs',P,'function defaultConfig'),
('COMPARE-KIND','Comparison kind','algorithms','algorithms/parameters','Parameter grid supports2axes and <=12candidates','Hide','Advanced Compare',X,'function specs'),
('COMPARE-ALGORITHMS','Approaches in Compare','compound-flow,layered,flow,tree,stress,force','11checkbox choices','First six auto-generate on opening; loose selection rebuild invalid in file mode','Merge','Up to3 named alternatives; advanced full pool',P,'const DEFAULT_ALGORITHMS'),
('COMPARE-AXIS-A','Column parameter','nodeGap layout / edgeGap route','effective layout keys or11routing keys','1–6comma values; root absent; standoff absent','Hide','Advanced Compare',X,'const LAYOUT_PARAMS'),
('COMPARE-AXIS-B','Row parameter','direction layout / bendPenalty route','none or different effective key','Product<=12; same axis rejected','Hide','Advanced Compare',X,'config.axisA === config.axisB'),
('COMPARE-VALUES-A','Column values','12,24,44 layout /10,18,28 route','1–6values','Finite parsed numbers; candidate checks clamped mismatch as error','Hide','Advanced Compare',X,'function parseValues'),
('COMPARE-VALUES-B','Row values','RIGHT,DOWN layout /16,64 route','1–6values','Disabled with no second axis','Hide','Advanced Compare',X,'function parseValues'),
('RELEASE-PORTS','Release fixed port sides',False,'boolean','Engine candidate resets authored sides; source candidate ignores flag at baseline','Remove','Explicit Use auto ports action',X,'if (config.autoPorts)'),
('COMPARE-CAMERAS','Grid navigation','sync','sync/focus/independent','Visual comparison only; no geometry change','Keep','Compare inspect',P,'export function setCameraMode'),
('COMPARE-PRESENTATION','Presentation','grid','grid/overlay','Overlay translation anchor does not change applied geometry','Keep','Compare inspect',P,'export function setPresentation'),
('COMPARE-LAYER-VISIBILITY','Layer visibility','true','per candidate boolean','Overlay only; visual aid','Keep','Advanced Compare',P,'export const setLayerVisible'),
('COMPARE-LAYER-OPACITY','Layer opacity','.85 first;.3others','.05–1','Overlay only; visual aid','Hide','Advanced Compare',P,'export const setLayerOpacity'),
('COMPARE-LABELS','Labels in every layer',False,'boolean','Overlay only; active-layer labels default','Hide','Advanced Compare',P,'export const setAllLabels'),
('COMPARE-ANCHOR','Comparison anchor','selected/start/first node','visible object ID','Translate views to same object; no candidate geometry mutation','Keep','Compare inspect',P,'export function chooseAnchor')]
for id,name,df,rg,cond,decision,placement,path,symbol in options:
    add('UI-'+id,'runtime-or-ui-control',name,name,'Editor / invocation API as specified',str(df),rg,cond,[(path,symbol)],decision=decision,placement=placement,replacement='Context-specific action/preset' if decision!='Keep' else 'None',uncertainty='Source-path behavior must be verified in UI integration tests')
# Brush controls are not global layout algorithm parameters.
for key,df,rg,cond,decision in [
('mode','tidy','tidy/flow/space/restore/protect','Five local goals; protect produces holds and no movement','Keep'),
('radius',190,'40–600','world radius may be derived from screen radius/zoom','Keep'),
('strength',35,'1–100','scales per-dab movement budget','Hide'),
('softness',75,'0–100','smooth falloff near radius','Automate'),
('step',18,'1–64','maximum per-dab scaling; API/internal only','Automate'),
('holdRestored',True,'boolean','Restored nodes become session holds for later layout','Keep')]:
    add('BRUSH-'+re.sub('([A-Z])',r'-\1',key).upper(),'brush-setting',key,'Local repair or protection','Brush dock (except step internal);SculptLab API',str(df),rg,cond,[(SC,'const defaults'),(SC,'function settings'),('src/components/sculpt/BrushDock.tsx','export function BrushDock')],decision=decision,placement='Advanced local tools',uncertainty='Cannot infer brush value from cold engine screening')
# Every layout/routing action separately, without counting it as a numerical setting.
actions=[
('TIDY','Tidy positions','One bounded repair','layout','Uses selected algorithm, not hard-coded tidy; default algorithm tidy; source writes stays and anchors surroundings','Keep','Main Improve'),
('PREVIEW-TIDY','Preview tidy','See bounded repair before applying','layout-preview','Same pass geometry with pending preview and hold-before','Merge','Improve preview default'),
('REBUILD','Preview automatic layout','Replace arrangement','layout-rebuild','File mode writes engine recipe, removes soft position refinements; only whole diagram/group','Keep','Main Rearrange'),
('KEEP','Keep layout','Accept candidate','layout-accept','One history edit; source commit on Keep','Keep','Preview'),
('DISCARD','Discard','Cancel pending geometry','layout-discard','Restores before document and routes','Keep','Preview'),
('HOLD-BEFORE','Hold before','Compare prior placement','layout-accept','Temporary geometry view only, keyboard/pointer accessible','Keep','Preview'),
('COMPARE-LAYOUTS','Compare layouts','Compare cold or warm alternatives','compare-layouts','Six default algorithms; candidates from same starting doc;source candidates recompile','Keep','Main Compare'),
('COMPARE-ROUTES','Compare ports & routes','Choose routing tradeoff','compare-routes','Fixed raw geometry; file-specific source pipeline; preserve authored sides','Merge','Compare Connections'),
('REROUTE','Reroute now','Recompute routes without moving shapes','reroute','Clears adopted/cached route state via actions; settings unchanged','Keep','Connections'),
('AUTO-PORTS','Use auto ports','Deliberately release authored endpoints','auto-ports','Selection only; source explicit ports removed by translated edit','Keep','Connection Inspector'),
('CHECKPOINT','Capture checkpoint','Capture scratch arrangement','layout-checkpoint','Disabled for file sessions; source undo already history','Hide','Advanced scratch tools'),
('RESTORE','Restore checkpoint','Return to captured scratch state','layout-restore','Disabled file sessions; full snapshot', 'Hide','Advanced scratch tools'),
('TIMELINE','Layout timeline','Inspect actual intermediate solver states','timeline-toggle','Warm settled by default; reports recorded not optimality percentage','Hide','Advanced local tools'),
('TIMELINE-REOPEN','Reopen last timeline','Return to prior recorded search','timeline-reopen','Same document identity; session/browser archive','Hide','Advanced local tools'),
('TIMELINE-SAVE','Save timeline','Persist experimental search trace','timeline-save','Artifact includes baseline/settings/frames; not source recipe','Hide','Advanced local tools'),
('BRUSH','Layout brush','Tidy one physical area','brush-toggle','Hover preview then stroke commit; source arrangement writeback','Hide','Advanced local tools'),
('PIN','Pin during layout','Protect intentional position','pin','Hard within operation, inherited from parent; source pin coordinate','Keep','Context Inspector'),
('CLEAR-MANUAL','Clear manual markers','Release authored soft positioning','release-manual','Source translator clears manual refinements; not equivalent to unpin','Merge','Reset arrangement action'),
('ALIGN-LEFT','Align left','Align selected edges','align-left','Geometric edit; source translation can write positions','Keep','Context Align'),
('ALIGN-TOP','Align top','Align selected edges','align-top','Geometric edit','Keep','Context Align'),
('ALIGN-CENTER','Align horizontal centers','Align selected centers','align-center','Geometric edit','Keep','Context Align'),
('ALIGN-MIDDLE','Align vertical centers','Align selected centers','align-middle','Geometric edit','Keep','Context Align'),
('DISTRIBUTE-X','Distribute horizontally','Even local spacing','distribute-x','Selection geometry edit','Keep','Context Align'),
('DISTRIBUTE-Y','Distribute vertically','Even local spacing','distribute-y','Selection geometry edit','Keep','Context Align'),
('FIT-CONTAINER','Fit contents','Resize manual frame to contents','fit-container','Disabled in file mode; compiler automatically fits','Hide','Context scratch only'),
('REFLOW-GROUP','Reflow group','Remove soft refinements in one group','reflow-group','Keeps pins; anchors surrounding objects; source only','Keep','Context Rearrange contents'),
('COLLAPSE','Collapse/expand','Focus on hierarchy','collapse-selected','View state; proxies child endpoints without changing meaning','Keep','Context Group'),
('REVERSE-EDGE','Reverse','Change edge meaning and orientation','reverse-edge','Authored edge reversal; not just routing aesthetic','Keep','Connection Inspector'),
('RESET-BENDS','Reset bends','Release manual path','reset-route','Source disabled; JSON editor paths only','Keep','Advanced connection when supported'),
('MARK-START','Start here','Set preferred start','mark-start','Source disabled; warm engine intent only','Hide','Advanced scratch tools'),
('MARK-END','End here','Set preferred end','mark-end','Source disabled; warm engine intent only','Hide','Advanced scratch tools'),
('FIT-VIEW','Fit diagram','See entire drawing','fit','Camera only; different from layout fit attribute','Keep','Canvas navigation'),
]
for id,name,job,command,condition,decision,placement in actions:
    refs=[(A,"'"+command+"'" if '-' in command else command+':')]
    if id=='HOLD-BEFORE':refs=[('src/components/LayoutPreviewBar.tsx','Hold before')]
    add('ACT-'+id,'action',name,job,'Editor command/menu/keyboard','User invoked','Not numeric',condition,refs,decision=decision,placement=placement,uncertainty='Action remains distinct from its chosen engine; integration tests required')
# Related interaction-only actions not in central command registry.
for id,name,cond,path,symbol,placement in [
('COMPARE-APPLY','Apply comparison','Signature checked;file applies candidate source;other modes use one arrangement undo',P,'export function applyCandidate','Compare'),
('COMPARE-GENERATE','Generate/Regenerate','Does not mutate editor; per candidate timeout30s; errors stay in cells',P,'export async function generate','Advanced Compare'),
('COMPARE-CANCEL','Stop generation','Keeps completed candidates',P,'export function cancelGeneration','Compare'),
('TIMELINE-KEEP','Keep & edit / Keep & brush','Applies selected recorded step as arrangement',ST,'export function keepStep','Advanced local tools'),
('BRUSH-REFERENCE','Use current restore reference','Session geometry, no source meaning',ST,'export function useCurrentAsReference','Advanced local tools'),
('BRUSH-CLEAR-HOLDS','Clear holds','Releases session protections, not authored pins',ST,'export function clearHolds','Advanced local tools'),
('UNDO-REDO','Undo / redo','File history uses before/after source versions; raw settings preferences not layout edits',F,"function historyStep",'Main editor'),
('ROUTING-BALANCED','Balanced routing','Resets all12 settings to defaults',M,'function RoutingMenu','Connections'),
('ROUTING-FEWER-CROSSINGS','Fewer crossings routing','Resets all12 then sets crossing900/shared9/stability10; tradeoff may add detour',M,'crossingPenalty: 900','Connections'),
]:
    add('ACT-'+id,'action',name,name,'Editor', 'User invoked','Not numeric',cond,[(path,symbol)],placement=placement,decision='Keep' if placement in ['Compare','Main editor','Connections'] else 'Hide',uncertainty='Scripted UI proxy, not user study')
# Diagnostic flags are recorded but excluded from public surface totals.
for key,cond in [('facing','default true; constrains source/target facing sides and fans'),('titleBands','default true; protects group titles with straight-through exceptions'),('window','default true; local search then full grid'),('tidy','default true; final fan/corridor refinement'),('jogs','default true; remove short steps in tidy')]:
    add('DEBUG-ROUTE-'+key.upper(),'internal-diagnostic',key,'Ablate routing stages','Router API only',True,'boolean',cond,[(R,'rawOptions.'+key)],decision='Hide',placement='Internal diagnostic only',uncertainty='Not a proposed user control')
add('DEBUG-ORDER-PRIOR','internal-diagnostic','orderPrior','Compare flat layered authored-order prior','Raw engine API only',True,'boolean','false restores older parity behavior; no source attr',[(L,'opts.orderPrior !== false')],decision='Hide',placement='Internal diagnostic only')
add('LEGACY-ALGORITHM-ALIASES','legacy-input','radial / compact aliases','Read existing older saved input','Layout settings normalization','radial→tree;compact→layered','2aliases; not2extra algorithms','Compatibility already present; source ENGINES rejects these names',[(L,"s.algorithm === 'radial'"),(D,"supplied.algorithm === 'compact'")],decision='Hide',placement='Existing input normalization',uncertainty='Do not create new compatibility machinery; remove only with evidence no retained saved inputs need it')
OUT.mkdir(exist_ok=True)
(OUT/'inventory-source.json').write_text(json.dumps(rows,indent=2)+'\n')
counts={k:sum(r['category']==k for r in rows) for k in sorted({r['category'] for r in rows})}
(OUT/'evaluation'/'inventory-counts.json').write_text(json.dumps({'rows':len(rows),'categories':counts,'surface_counts':{'engine_ids':11,'source_rebuild_engines':10,'named_recipes':6,'implicit_recipe_baselines':1,'layout_settings_in_model':24,'engine_params_source':15,'routing_params_source':12,'layout_lab_basic_fields':4,'layout_lab_unique_setting_inputs':23,'routing_menu_immediate_sliders':9,'routing_menu_advanced_sliders':2,'routing_explorer_axes':11,'layout_explorer_axes':21,'comparison_default_candidates':6,'brush_visible_fields':5,'brush_internal_step':1},'notes':'Do not sum aliases, commands, or overlapping surface registries.'},indent=2)+'\n')
print(json.dumps({'rows':len(rows),'categories':counts}))
