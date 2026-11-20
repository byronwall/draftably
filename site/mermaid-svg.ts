/** Mermaid's own drawing of a source, as a site that uses Mermaid shows it today. */
let load: Promise<typeof import('mermaid').default> | undefined;
let renders = 0;

export async function mermaidSvg(source: string) {
  load ??= import('mermaid').then(m => {
    m.default.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
    return m.default;
  });
  const mermaid = await load;
  return (await mermaid.render(`mermaid-svg-${++renders}`, source)).svg;
}
