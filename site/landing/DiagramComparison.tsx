import { A } from '@solidjs/router';

/** A small, inspectable evaluation rather than a claim of a universal winner. */
export function DiagramComparison() {
  return (
    <section class="examples" id="diagram-comparison">
      <div class="section-head">
        <h2>One prompt. Five diagram formats.</h2>
        <A href="/docs/agent-diagram-evaluation">See the comparison</A>
      </div>
      <p>
        We gave independent agent contexts the same three diagram tasks using Mermaid, Draftably,
        D2, Graphviz DOT and raw SVG. All fifteen initial sources rendered, but titles, edge clarity
        and label placement still varied.
      </p>
      <p>
        One feedback response fixed missing titles and a detached label, but introduced one syntax
        failure: fourteen of fifteen after-response sources rendered.
      </p>
      <p>
        See the actual drawings, native source and image-review notes, with prompts and limitations
        published. This is a small workflow evaluation, not a ranking of every feature or a
        benchmark of model quality.
      </p>
    </section>
  );
}
