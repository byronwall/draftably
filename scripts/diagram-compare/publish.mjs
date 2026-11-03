#!/usr/bin/env node
/** Publish the measured initial artifacts, not hand-recreated showcase diagrams. */
import fs from 'node:fs/promises';
const base = 'docs/evaluations/agent-diagrams';
const results = JSON.parse(await fs.readFile(`${base}/results.json`, 'utf8'));
const visual = JSON.parse(await fs.readFile(`${base}/visual-review.json`, 'utf8'));
const repairedVisual = JSON.parse(await fs.readFile(`${base}/repair-visual-review.json`, 'utf8'));
const labels = {
  mermaid: 'Mermaid',
  draftably: 'Draftably',
  d2: 'D2',
  dot: 'Graphviz DOT',
  svg: 'Raw SVG',
};
const titles = {
  workflow: 'Order approval workflow',
  architecture: 'Checkout service architecture',
  state: 'Publishing state machine',
};
const out = 'site/public/evaluations/agent-diagrams';
await fs.mkdir(out, { recursive: true });
let md = `# Agent diagram comparison\n\nThree identical prompts, five native formats, fifteen actual first-pass outputs. Inspect the drawings, source and limitations together.\n\n## What this compares\n\nIndependent agent contexts attempted a workflow, grouped architecture and cyclic state machine in Mermaid, Draftably, D2, Graphviz DOT and raw SVG. The exact task prompt was shared; only the format and short syntax reference changed. Each had one response, a 200-line limit and no render feedback.\n\nThis is a small controlled-prompt case study. Nine cells were generated before a maintenance interruption and six afterward. The backend model ID and configuration continuity were unavailable, so this is not a verified same-model benchmark. There are no cost or speed rankings.\n\n[Read the full report](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/REPORT.md), [protocol](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/PROTOCOL.md), [exact prompts](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tasks.json) and [replay instructions](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/README.md).\n\n## Main observations\n\nAll fifteen sources rendered, but rendering success did not guarantee task compliance: D2’s requested titles were absent in all three initial images. The grouped architecture exposed routing and label-placement problems in several formats. Draftably had the shortest source in each task, while raw SVG gave direct geometry control with more source bytes. These are observations from three samples per format, not an overall ranking.\n\n## Measured first-pass results\n\n${results.cells.filter(c => c.initial.status === 'success').length} of 15 native rendering attempts produced an SVG. Source audits and visual judgments are separate: successful rendering does not establish readable labels, clear arrows or correct visible group membership.\n\n| Task | Format | Render | Source lines | Source bytes |\n| --- | --- | --- | ---: | ---: |\n`;
for (const c of results.cells)
  md += `| ${titles[c.task]} | ${labels[c.tool]} | ${c.initial.status} | ${c.sourceLines} | ${c.sourceBytes} |\n`;
if (results.repairedRenderRun)
  md += `\nAfter one optional repair response per cell, ${results.cells.filter(c => c.repair.render.status === 'success').length}/15 rendered. Architecture/Mermaid regressed from a successful initial drawing to a native parse error; that failed response is preserved. Eight sources changed and seven were retained. Each image below links its separate after-response result or diagnostic.\n`;
md +=
  '\nSource size describes verbosity, not quality or measured editing effort. All numbers above come from the committed sources and actual renderer outcomes.\n';
for (const [task, title] of Object.entries(titles)) {
  md += `\n## ${{ workflow: 'Workflow task', architecture: 'Architecture task', state: 'State-machine task' }[task]}\n\n`;
  for (const c of results.cells.filter(c => c.task === task)) {
    md += `### ${labels[c.tool]}\n\n`;
    if (c.initial.status === 'success') {
      const name = `${task}-${c.tool}.svg`;
      await fs.copyFile(c.initial.svgPath, `${out}/${name}`);
      md += `![${title}: actual initial ${labels[c.tool]} output](/evaluations/agent-diagrams/${name})\n\n`;
    } else md += `Native render failed. The source and complete diagnostic are retained.\n\n`;
    const review = visual.cells.find(r => r.task === task && r.tool === c.tool);
    if (review) md += `**Image review:** ${review.notes}\n\n`;
    md += `[Native source](https://github.com/byronwall/draftably/blob/main/${base}/${c.source}) · [Renderer record](https://github.com/byronwall/draftably/blob/main/${c.initial.evidenceRecord})\n\n`;
    if (c.repair?.render) {
      md += `**One repair response:** ${c.repair.decision}. ${c.repair.rationale}\n\n`;
      const afterReview = repairedVisual.cells.find(r => r.task === task && r.tool === c.tool);
      if (afterReview) md += `**After-response review:** ${afterReview.notes}\n\n`;
      if (c.repair.render.status === 'success') {
        const repairedName = `${task}-${c.tool}-repaired.svg`;
        await fs.copyFile(c.repair.render.svgPath, `${out}/${repairedName}`);
        md += `[View the result after the repair response](/evaluations/agent-diagrams/${repairedName}) · `;
      } else md += `The repaired source failed to render; the failure is preserved. `;
      md += `[Repaired source](https://github.com/byronwall/draftably/blob/main/${base}/${c.repair.source}) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/${c.repair.render.evidenceRecord})\n\n`;
    }
  }
}
md += `## Reading the comparison\n\nThe drawings above are the captured first pass, not manually improved examples. Read the full report for image-review scores and concrete defects. Native formats expose different editing surfaces: graph languages express nodes and relations, while raw SVG gives direct geometry control and requires coordinate maintenance. Those are source-level observations, not measured editing times.\n\nThree tasks do not cover sequence diagrams, large graphs, accessibility, interactive editing or every layout engine. Curated syntax references, non-blinded agent review, one sample per cell and browser/font differences limit generalization. A syntax or layout defect in this setup is not proof a format cannot handle the task.\n`;
await fs.writeFile('site/docs/pages/agent-diagram-evaluation.md', md);
console.log('Published actual initial SVGs and generated docs page.');
