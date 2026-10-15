# CLI naming shortlist

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

Knotdraft is the recommendation. It connects diagram structure with work that people can keep editing.
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
