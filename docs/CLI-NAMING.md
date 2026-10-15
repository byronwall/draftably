# CLI naming shortlist

## Current shortlist: fourth pass

Byron wants diagrams implied, without the word diagram. Exclude Helm and Rails because of Kubernetes and Ruby on Rails.
Keep guided organization, automation, and user control. The same naming worker ran three more comparison rounds.

Round 1 compared GraphSteer, BoxNudge, ChartCourse, and Guided Lines.
GraphSteer and BoxNudge had stronger diagram and user-control cues.
ChartCourse competed with navigation and an existing agent skill. Guided Lines suggested drawing lessons.

Round 2 compared BoxGlide, ChartGlide, BoxLane, and LineGlide for easy arrangement.
Glide gave a stronger automation cue. BoxLane also suggested packaging and swimlanes.

Round 3 combined these meanings with collision checks. Scores range from 0 (no cue) to 10 (immediate cue).

| Name | Implied diagrams | Guided layout | User control | Evidence and tradeoff |
| --- | ---: | ---: | ---: | --- |
| **GraphSteer** | 9 | 7 | 10 | [npm 404](https://registry.npmjs.org/graphsteer). Only an [empty exact-name repository](https://github.com/CallieSardina/GraphSteer) surfaced. Strong control cue; automation is less clear. |
| **BoxNudge** | 8 | 7 | 9 | [npm 404](https://registry.npmjs.org/boxnudge). Worker found no public repository-name or distinct product matches. Small manual adjustments fit the workflow. |
| **BoxGlide** | 8 | 9 | 6 | [npm 404](https://registry.npmjs.org/boxglide). An [old Megatouch puzzle game](https://www.meritgames.com/Support_Center/manuals/PM0378-07.pdf) used the name. Strong ease cue; weaker control cue. |
| ChartGlide | 8 | 9 | 6 | [npm 404](https://registry.npmjs.org/chartglide). Worker found zero repository-name matches and no distinct product. May suggest data charts. |
| LineGlide | 7 | 9 | 6 | [npm 404](https://registry.npmjs.org/lineglide). Partial repository-name matches and a synthesizer parameter surfaced. Weaker diagram cue. |

The pool also included BoxGuide, BoxAlign, BoxSteer, BoxRoute, BoxTrain, BoxTrack, LinePilot,
LineGuide, LineBound, LinePath, LinkDraft, LinkGuide, LinkRoute, GraphDraft, GraphGuide,
GraphTrack, FlowGuide, FlowGlide, FlowDraft, FlowNudge, FlowSteer, FlowRoute, FlowTrack,
FlowShape, ChartSteer, ChartPath, ChartRoute, Clear Path, In Line, Shape Up, and On Course.

Reject [GraphGlide](https://github.com/Automeltic/graphglide): an existing CLI watches interactive dependency diagrams.
Reject [FlowDraft](https://github.com/tu10ng/flowdraft): an existing diagram DSL uses it.
Other collisions included BoxGuide (research model), FlowGlide, FlowNudge, GraphLane, LinePilot, and LineCraft.

The parent repeated the main three npm checks and wider web searches.
The worker used authenticated GitHub API searches after anonymous searches reached their rate limit.
No name is selected or reserved. Registry 404s do not guarantee publication rights or npm acceptance.

## Earlier shortlist: third pass

Byron clarified the name must imply diagrams, organization, user control, and easy guided automation.
Train rails and autopilot are useful metaphors. Boxdraft is acceptable but does not meet the full goal.
GPT-6.1 Sol at Medium reasoning ran three more `consider-contrast` rounds.

Round 1 compared the product word. Diagram scored 10 for immediate diagram recognition.
Graph scored 8 because it also suggests databases. Flow scored 7 because it also suggests workflow software.
Box scored 6 because it also suggests storage and packaging. Advance Diagram compounds.

The pool included DiagramRails, DiagramRail, DiagramPilot, DiagramGuide, DiagramLane, DiagramRoute,
DiagramTrack, DiagramPath, DiagramHelm, DiagramDrive, DiagramSteer, DiagramCoach, and DiagramCruise.
The worker also explored Graph, Chart, Flow, and Box variants with rail, pilot, guide, route, and helm.

Round 2 compared the metaphors. Scores range from 0 (no cue) to 10 (immediate cue).

| Name | Diagram recognition | Guided layout | User steering | Tradeoff |
| --- | ---: | ---: | ---: | --- |
| DiagramRails | 10 | 10 | 7 | User sets the rails; layout follows them. Can suggest Ruby on Rails. |
| DiagramPilot | 10 | 8 | 9 | Strong meaning, but an existing diagram CLI uses it. |
| DiagramHelm | 10 | 6 | 10 | Strong user control cue; weaker automation cue. Can suggest Kubernetes Helm. |
| DiagramLane | 10 | 9 | 7 | Clear organization, but may imply only swimlane diagrams. |

Round 3 added collision evidence and compared against Boxdraft.
DiagramRails best meets the whole brief. DiagramHelm gives more weight to user control.
Boxdraft has a weaker diagram cue (6), guided layout cue (5), and a reasonable user editing cue (8).

| Rank | Name and command | npm registry | Existing use and search findings |
| --- | --- | --- | --- |
| 1 | **DiagramRails**, `diagramrails` | [404](https://registry.npmjs.org/diagramrails) | Worker found zero public GitHub repository-name matches and no distinct exact-name software product. Spaced searches find Ruby Rails diagram tools. |
| 2 | **DiagramHelm**, `diagramhelm` | [404](https://registry.npmjs.org/diagramhelm) | Worker found zero public GitHub repository-name matches and no distinct exact-name software product. Spaced searches find Kubernetes Helm diagram tools. |
| 3 | DiagramLane, `diagramlane` | [404](https://registry.npmjs.org/diagramlane) | Worker found zero public GitHub repository-name matches. An existing [Syncfusion diagram API class](https://help.syncfusion.com/cr/aspnetcore-js2/Syncfusion.EJ2.Diagrams.DiagramLane.html) uses the name. |

Keep DiagramRails and DiagramHelm as the serious options. DiagramLane has a weaker distinctness result.
The parent repeated exact-name web searches and npm checks. GitHub API rate limits prevented a parent repeat of repository-name checks.

Reject DiagramPilot: an existing [diagram compiler and CLI](https://github.com/StiensWout/DiagramPilot) uses it, including an [npm package](https://registry.npmjs.org/diagrampilot).
Reject [GraphPilot](https://github.com/graphpilot-oss/graphpilot), [FlowRail](https://registry.npmjs.org/flowrail),
and [ChartPilot](https://chartpilot.live/) because software already uses them.
DiagramGuide is generic and also appears as a chart-wizard label in [LibreOffice](https://help.libreoffice.org/latest/da/text/schart/01/choose_chart_type.html).

Checks ran on October 14, 2026, Indianapolis time. No name is selected or reserved.
An npm 404 does not guarantee npm acceptance. Web and public repository searches do not establish worldwide uniqueness.

## Earlier shortlist: second pass

Byron rejected the first shortlist. Weft was unfamiliar, and knot suggested tangles.
This pass favors familiar words and clear, ordered diagrams.
GPT-6.1 Sol at Medium reasoning ran three new comparison rounds.

Scores range from 0 (poor fit) to 10 (strong fit).

### Round 1: directions

| Direction | Clear, ordered diagram cue | Familiar spoken spelling | Fits a general diagram tool | Reason |
| --- | ---: | ---: | ---: | --- |
| Natural phrases: Well Drawn, On Paper, In Order | 8 | 10 | 9 | Familiar phrases state an outcome. |
| Drafting: Boxdraft, Draftboard, Draftshape | 9 | 9 | 8 | Direct words state the drawing activity. |
| Clear structure: Plainplot, Neatline, Clearframe | 9 | 9 | 8 | Strong clarity cues, but many names already exist. |
| Workspaces: Lineyard, Plotdesk, Frameyard | 5 | 8 | 7 | These metaphors add little diagram meaning. |

Carry natural phrases and direct drafting names forward.

The generated pool also included All Set, Well Set, Good Form, Outline, Linework,
Straightedge, Sightline, Mapdraft, Draftlane, Draftwell, Neatdraft, Drawplan, Open Draft,
Neatdraw, Plainframe, Clearplot, Clearline, Plainshape, Neatframe, Evenline, Goodlines,
Drawclear, Planframe, Framewise, Lineset, Shapeplot, Leveldraw, Neatmap, Squareline,
Setpiece, Linedesk, Plotlane, Inkframe, Inkgrid, Paperline, Plotroom, and Paperplan.
Generated names are not availability claims.

### Round 2: meaning before availability

| Name | Clear diagram cue | Familiar spoken spelling | Reason |
| --- | ---: | ---: | --- |
| Well Drawn | 9 | 10 | Natural phrase describing a good drawing. |
| Boxdraft | 9 | 9 | Direct cue for boxes and connections. |
| Neatline | 9 | 9 | Strong meaning; check existing visual software. |
| Draftshape | 8 | 9 | Familiar words, but a less natural compound. |
| Plainplot | 7 | 9 | Clear visual output, but suggests charts. |
| On Paper | 7 | 10 | Familiar phrase; check existing software. |
| Lineyard | 5 | 8 | Weak diagram meaning; drop it. |

### Round 3: collision screening

The final shortlist has two names. We did not add weaker names to fill the list.

| Rank | Name and command | Evidence | Tradeoff |
| --- | --- | --- | --- |
| 1 | **Well Drawn**, `welldrawn` | [npm](https://registry.npmjs.org/welldrawn): 404. [GitHub repository-name query](https://api.github.com/search/repositories?q=welldrawn+in%3Aname): 0. | Natural and broad. A [greeting-card business](https://www.welldrawn.com.au/products/bah-humpug) uses the name outside software. |
| 2 | **Boxdraft**, `boxdraft` | [npm](https://registry.npmjs.org/boxdraft): 404. GitHub found one [empty repository](https://github.com/tls00020/boxDraft). | More specific to box diagrams; less broad than Well Drawn. |

Well Drawn is the strongest natural name. Boxdraft is the strongest direct CLI name.
Neither name is selected or reserved. Both executable spellings are proposals.
The parent repeated the npm and GitHub checks and broader web searches.
Checks ran on October 14, 2026, Indianapolis time.

Reserve names have weaker results:

- Draftshape: npm 404 and zero GitHub repository-name matches. A developer uses [DraftShape-PyroDev](https://forums.unrealengine.com/t/how-to-make-a-character-selection-screen-that-doesnt-immediately-spawn-you-into-the-game/247356).
- Plainplot: npm 404 and zero GitHub repository-name matches. It names an [ngspice option](https://sources.debian.org/src/ngspice/34%2Bds-1/FAQ).

Rejected collisions include [Neatline](https://www.neatline.org/), [NeatDraw](https://github.com/ShaikZYaseen/NeatDraw),
[Plainframe](https://plainframe-ui.com/), [Clearplot](https://pypi.org/project/clearplot/),
[Linecraft](https://registry.npmjs.org/linecraft), [Draftwell](https://www.draftwell.ai/),
[Frameyard](https://github.com/AksharP5/frameyard), [WellSet](https://github.com/kinhikars/wellset-webmcp),
[OnPaper](https://onpaperhq.com/), and [DrawClear](https://www.draw-clear.com/check).

These checks support relatively unused software names. They do not guarantee npm acceptance or worldwide uniqueness.

## Rejected first pass

The following records the rejected naming pass. Its recommendation is no longer current.

GPT-6.1 Sol at Medium reasoning generated and compared names in three rounds.
The review used the local `consider-contrast` skill.
Checks ran on October 14, 2026, Indianapolis time.

The tool combines a diagram DSL, repeatable layout, saved placement rules, and a local viewer.
An agent and a person edit the same file.
The shortlist does not select or reserve a package name.

## Round 1: naming direction

Scores range from 0 (poor fit) to 10 (strong fit).

| Direction and examples | Graph relationships | Saved placement | Human and agent editing | Reason |
| --- | ---: | ---: | ---: | --- |
| Merge: Meld, Intermeld, Comeld | 5 | 3 | 9 | Shared editing fits; layout meaning is weak. |
| Placement: Pindraft, Pinquill, Pinloom | 6 | 10 | 6 | Pins fit, but relative rules matter too. |
| Weaving: Relweft, Nodebraid, Edgeweft | 9 | 7 | 8 | Connected structure fits the diagram model. |
| Drafting: Knotdraft, Linkdraft, Frameweft | 8 | 8 | 9 | Editable source and diagram work both fit. |

Carry weaving and drafting names into the next round.
Other generated names: Linkstitch, Pinbraid, Knotframe, Graphstitch, Draftweft, Knotfolio,
Linkspindle, Gridmend, Framebraid, Nodequill, and Plotstitch.
These are generated options, not availability claims.

## Round 2: candidate names

| Name | Diagram meaning | Relative placement and pin cue | Spoken CLI spelling | Reason |
| --- | ---: | ---: | ---: | --- |
| Knotdraft | 9 | 7 | 8 | Connected nodes and editable work; silent K can cause spelling errors. |
| Nodebraid | 10 | 6 | 9 | Clear graph meaning; Node can suggest Node.js. |
| Relweft | 8 | 8 | 6 | Relations and structure fit; weft needs explanation. |
| Frameweft | 7 | 8 | 7 | Spatial structure fits; graph meaning is less clear. |

Screen these names against existing software. Add similar candidates only if they survive that check.

Existing uses removed these options:

- Meld: established [diff and merge tool](https://meldmerge.org/).
- Nodebraid: existing [Git client repository](https://github.com/langrenlibai/Nodebraid).
- Edgeweft: existing [npm graph package](https://www.npmjs.com/package/@provausio/edgeweft).
- Pinquill: existing [Pinterest desktop software](https://www.pinquill.com/en).
- Pinbraid: existing [harness mapping utility](https://shadowfetch-ios-apps.pages.dev/pinbraid/support/).
- Pinloom: existing [connect-the-pins game](https://play.google.com/store/apps/details?id=com.pinloom.brain.board404).
- Edgequill: two public GitHub repository-name matches and other established web uses surfaced.

## Round 3: final shortlist

Software distinctness scores reflect the checks below. A 10 means no conflicting software use surfaced.
These scores do not prove worldwide uniqueness.

| Rank | Name | Diagram meaning | Saved layout cue | CLI spelling | Observed software distinctness |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | **Knotdraft** | 9 | 7 | 8 | 10 |
| 2 | **Relweft** | 8 | 8 | 6 | 10 |
| 3 | **Frameweft** | 7 | 8 | 7 | 10 |

The first pass recommended Knotdraft. Byron rejected it because knots suggest tangles.
Relweft gives a stronger cue about relations, but is harder to spell from speech.
Frameweft suggests spatial structure, but has less diagram meaning.

| Proposed package and command | npm registry check | GitHub public repository-name check | Wider web search |
| --- | --- | --- | --- |
| `knotdraft` | [Registry](https://registry.npmjs.org/knotdraft): 404 | [Query](https://api.github.com/search/repositories?q=knotdraft%20in%3Aname): 0 | Only joined words in a [boat specification](https://www.flickr.com/photos/hkkbs/4883053346/) surfaced. |
| `relweft` | [Registry](https://registry.npmjs.org/relweft): 404 | [Query](https://api.github.com/search/repositories?q=relweft%20in%3Aname): 0 | No exact-name result surfaced. |
| `frameweft` | [Registry](https://registry.npmjs.org/frameweft): 404 | [Query](https://api.github.com/search/repositories?q=frameweft%20in%3Aname): 0 | Only an apparent OCR error for framework in a [university paper](https://research.tue.nl/files/129036408/610230.pdf) surfaced. |

The worker also found zero npm full-text search results for each name.
The parent review repeated the exact web searches and the registry and GitHub checks.
The command spelling would match the package name. These commands do not exist yet.
Web indexes can miss software. Public repository-name checks do not search private code or every package registry.
An npm 404 does not guarantee that npm will accept the name. Check again before the first release.
