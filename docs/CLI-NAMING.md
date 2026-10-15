# CLI naming shortlist

## Current shortlist: second pass

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
