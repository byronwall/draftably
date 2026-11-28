---
origin: repo-reading-brief
source_edition: 2026-11-04
source_url: https://chatgpt.com/space/page_bc20477ccbf081919c387315867aa6b7
topic_id: draftably.agent-evaluation-lineage.v1
artifact_type: assistant-generated-research
activity_ranking: excluded
status: proposed-investigation
reviewed_at: 2026-11-04
repository_baseline: 3fd351dc5e49c342e270a74ad477b5df6f8f9f28
---

# Trace each agent comparison claim to its run

Investigate whether a reader can recover the exact generation, rendering and review evidence
behind each published agent-diagram claim. Start with a small reconciliation worksheet over the
existing artifacts and Git history. This note proposes no new tracking service, model run,
benchmark or application change. The investigation below has not been run.

The [November 4 Repo Reading Brief](https://chatgpt.com/space/page_bc20477ccbf081919c387315867aa6b7) selected this reading after the
independent product changes in [#420](https://github.com/byronwall/draftably/pull/420) and
[#421](https://github.com/byronwall/draftably/pull/421). Those changes improve page-width guidance,
layout-error recovery and the explanation of `direction=` with `fit=`. The comparison's existing
single-sample and unequal-reference limits are already stated. The additional question here is
which exact records support a claim after only some arms are generated again or a source is
rendered with a newer tool.

## Reading and transfer limits

Luc Moreau and Paolo Missier, editors,
[PROV-DM The PROV Data Model](https://www.w3.org/TR/2013/REC-prov-dm-20130430/),
W3C Recommendation, April 30, 2013. Read sections 2.1.1–2.2.2, 5.1.3–5.1.4, 5.2.1–5.2.2,
5.4 and 5.5 on November 4, 2026.

PROV separates entities with fixed aspects from activities that use and generate them. An
expanded derivation can identify the particular input, output, activity and usage/generation
events. A revision produces another entity. Specialization distinguishes a dated version from
an evolving resource. A named bundle holds provenance descriptions and can itself have recorded
provenance, including who supplied those descriptions.

The useful caution is in section 2.1.2: an activity's use of an input is insufficient to establish
that every output derives from it. Sections 5.2 and 5.5 distinguish derivation from merely
describing related versions. This is a vocabulary and data model, not an empirical study of
agent evaluation. It does not establish causal improvement, unbiased judgment or reproducibility
of a remote model. The worksheet below is a local proposal, not a PROV requirement. No RDF
serialization or full PROV implementation is needed to try it.

## What the inspected tree contains

These are static observations at commit
[`3fd351d`](https://github.com/byronwall/draftably/commit/3fd351dc5e49c342e270a74ad477b5df6f8f9f28),
not results from executing the generation or replay scripts.

1. [REPORT.md](REPORT.md) describes an initial 15-cell study and one repair response, with
   15/15 initial renders and 14/15 after repair. Its scope section says exact model continuity
   could not be verified. [README.md](README.md), [results.json](results.json) and the
   [site page](../../../site/docs/pages/agent-diagram-evaluation.md) describe a different
   45-cell arrangement: bare, reference and tooled arms. The current results name
   `claude-opus-5-5`; the three failed cells are bare Draftably outputs. Different studies can
   legitimately have different counts. The report's current-tree relative links do not resolve
   to a complete study snapshot; its linked CI artifacts have not been checked here.
2. REPORT's relative targets `PROTOCOL.md`, `EXECUTION.md`, `source-audit.json`,
   `visual-review.json`, `cells/` and `runs/` are absent from this commit's tree. No claim is made
   about whether old Git objects or remote CI artifacts retain them. A missing current-tree
   target and irretrievable evidence are different findings.
3. [generate.mjs](../../../scripts/diagram-compare/generate.mjs) writes fixed arm/task/format
   paths, replaces rows for the selected arms and preserves the others. It then updates one
   top-level `generated` date. The current manifest says November 4; the site says the bare
   arm ran on November 3. None of the 45 cell records has its own generation date or run ID.
   The global date therefore cannot be read as every cell's generation date. The script also
   trims the response, optionally removes a Markdown fence and appends a newline before saving
   source. Record that extraction separately from the original response when both are available.
4. [tooled.mjs](../../../scripts/diagram-compare/tooled.mjs) can replace selected cells. Its
   transcript filenames under `tmp/diagram-tooled/` do not include an attempt identifier.
   [replay.mjs](../../../scripts/diagram-compare/replay.mjs) can render without generation;
   `--publish` updates the same cells' renderer, outcome and image/error fields. A later render
   is therefore another event even when the generated source stays byte-identical.

Git already supplies versioned trees. The question is whether a reader can identify the right
tree, artifact and event for a specific statement without reconstructing the whole development
history. This note does not suggest that the current native-render counts are fabricated or
that a page-width improvement failed.

## Proposed record boundaries

Try a Markdown worksheet first. For each selected claim, record only what the retained evidence
actually supplies. Mark absent information as unknown; do not backfill an observed model version
from a requested alias or infer a successful run from a saved file.

| Record             | Minimum questions for this investigation                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published claim    | Which exact sentence or table cell, in which document revision, is being checked? What population and outcome does it describe?                                                                          |
| Generation attempt | Which task, arm, prompt/reference version, requested model, observed model metadata, tool configuration and stop outcome produced the source? Where is the original response or transcript, if retained? |
| Source artifact    | Which immutable Git revision/path or content hash identifies the bytes? Is it a fresh generation, retained output or edited successor?                                                                   |
| Render attempt     | Which source bytes, renderer version/configuration and environment produced which image or failure? Was this a rerender rather than a new generation?                                                    |
| Judgment           | Which exact image at which display width was inspected, by whom or what, under which rubric? Was a statement measured, observed by a reviewer or inferred?                                               |
| Evidence inventory | Who assembled the mapping, from which records, and which links or fields remain unavailable?                                                                                                             |

One claim can use several records, and one source can have several renders. Keep successful and
failed attempts identifiable. Retained cells should keep their original generation identity when
other cells are replaced. A convenient current gallery can still exist as an index over explicit
versions. Content hashes identify bytes, but neither prove authenticity nor recover missing
configuration or observations.

## A bounded investigation

Use three existing cases. No new paid generation, corpus expansion or renderer installation is
needed for this document review.

1. **Locate the older study.** Follow REPORT's cited commits or CI runs and Git history to see
   which snapshot owns its 15-cell initial/repair claims. Inventory reachable, missing and
   unverified artifacts separately. Decide whether an explicit historical-study link is enough
   or whether an archived snapshot is needed. Do not silently replace its numbers with the
   current 45-cell results.
2. **Follow a partial rerun.** Trace one retained bare cell and the reference/tooled Draftably
   state-machine cells across the changes in #419 and #420. Fill the worksheet with the actual
   source and reference revisions. The current global date must not be the only answer to when
   each cell was generated. Missing transcripts remain an explicit limitation.
3. **Separate source and renderer changes.** Identify a source retained across a replay, if the
   history supplies one. Link each render result to its own tool version and image. Then trace
   the site's statement about the wide reference state machine and #421's narrower warning
   example. #421 explicitly says the comparison was not rerun: the new diagnostic example must
   not become a new comparison result by implication.

For each case, ask a second reader to recover the cited source, render and scope from the
worksheet alone, without access to scratch files. Record success, ambiguity and missing evidence.
This is a proposed review exercise, not a completed reader study or a statistical test.

The investigation succeeds if the mapping can be reconstructed with existing Git links and a
small explanatory index, or if it isolates the exact information that cannot be recovered.
Keeping the current scripts is an acceptable outcome. Only then decide whether durable run IDs
and per-attempt records would justify a separate implementation proposal.

## Claim limits and ownership

A verified mapping to retained run evidence establishes where a reported observation came from.
It does not show that one
format is generally best, that a warning caused a better drawing, or that the same prompt/model
will repeat the result. #420 changed tool behavior and the agent-facing reference/skill between
runs. Preserve those interventions and the existing single-sample limitations when describing
the evidence. Generation, successful parsing, semantic fidelity and page-width readability
remain separate outcomes.

This note does not reopen the work already owned by:

- [#105](https://github.com/byronwall/draftably/pull/105), routing-corpus validity and held-out
  evaluation, or [#220](https://github.com/byronwall/draftably/pull/220), routing stopping policy.
- [#116](https://github.com/byronwall/draftably/pull/116), source meaning in comparison panels,
  or [#158](https://github.com/byronwall/draftably/pull/158), diagnostic attribution and verified
  repair.
- [#422](https://github.com/byronwall/draftably/pull/422), embedding and Markdown distribution.

No application code, scripts, existing results, generated sources, prompts, DSL, dependencies,
release files or public-site content are changed. Proposed records and review cases are not
implemented or executed. Formatting, link and repository checks validate only this documentation
change, not the proposed investigation or the earlier comparison's conclusions.

This assistant-generated research document, its branch, commits, PR and eventual merge are
excluded from future substantive-activity ranking. Later independent user feedback,
implementation or evaluation can provide a new signal. Publishing the draft supplies no
implementation, merge, auto-merge or deployment authorization.
