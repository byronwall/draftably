# Draftably embedding: evidence and primary source register

**Repository baseline:** `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5`, as recorded by the supplied source packet. **Research access date for every external entry below:** **2026-11-03, America/Indianapolis**; the corresponding tool session crossed 2026-11-04 UTC. Versions describe the material actually inspected, not an assumption about a consumer’s installed dependency.

This register contains **68 external primary-documentation/source entries and 15 repository evidence groups**. It supports [the design report](embedding-ecosystem-report.md), [implementation plan](embedding-implementation-plan.md), and [recommendation ledger](embedding-recommendations.md). Stable S/R identifiers are shared across those files; numbering gaps are intentional.

## How to interpret the evidence

- **Observed repository facts** come from the supplied archive at its recorded baseline. Existing tests are readable contracts, not newly executed test results.
- **Observed external facts** come from official project documentation, maintainer source, vendor platform policies and web-platform documentation. W3C specifications/guidance and MDN implementation references are identified separately; MDN pages are not presented as normative W3C specifications.
- **Inferences** explain consequences of those facts, such as why npm installation isolation requires a package boundary or why an installed plugin does not confer native host support.
- **Proposals** include all new Draftably package names, exports, signatures, fence options, worker protocols, defaults, limits, host bridges, proofs and milestone commitments. A cited external API does not mean the proposed integration was built.
- **No execution evidence is implied.** No uploaded project code, dependency installation, project test suite, package build, browser exploit, benchmark or proposed consumer example was run. File/inventory/metadata checks are not runtime measurements. Proposed numeric limits and deadlines are policies to verify, not measured capacity.

### Retrieval methods and version boundaries

**Web** means relevant primary content was retrieved through web search/open/find. It does not mean every line of a long website was audited. **GitHub source** means the official repository file was read through the GitHub connector, retaining its ref and content identity.

The public web fetch did not expose the decisive tagged VitePress files or the pinned Astro files reliably. The team used the GitHub connector successfully for S25A–S25B and S56–S56C instead of claiming the inaccessible pages were read. S25C was likewise inspected as repository source. The rendered GitHub URLs below are audit permalinks; the successful retrieval channel was the connector.

VitePress observations are explicitly scoped to `v2.0.0-alpha.21`. Astro’s implementation checks use commit `e71c038f31194280b44515bf53cf449a5313baf9`; the inspected manifests identify `astro` 7.4.5 and `@astrojs/markdown-remark` 7.3.5, without establishing release-channel status. Its inspected Node requirement is `>=22.23.4`; the proposed runtime floor of Node 22.21 does not promise that every current host runs at that floor.

Current documentation can drift after this date. The Mermaid docs badge 12.3.0, Draftably’s baseline Mermaid dependency 12.2.0, and GitLab’s documented Mermaid major 12 are separate observations. GitHub’s deployed Mermaid version remains unspecified by the reviewed page. Compatibility recipes must identify the versions they actually prove.

## External source register

All rows use the shared access date above. Claim scopes are deliberately narrow; none is a live deployment or adoption test.

### Diagram runtimes and distribution models

| Source | Version and retrieval | Supported claim and limit |
| --- | --- | --- |
| **S01** · [Mermaid usage](https://mermaid.js.org/config/usage.html) | Docs identify 12.3.0; CDN examples use major 12. **Web.** | npm/CDN loading, explicit render/run/parse APIs and the documented release badge. The library version is not the version deployed by every Markdown host. |
| **S02** · [Mermaid configuration and API](https://mermaid.js.org/config/setup/README.html) | Current official documentation; async API details also in S01. **Web.** | Configuration and API boundaries. Read with S01 for the asynchronous call shape; this does not establish per-instance isolation or browser-free Node rendering. |
| **S03** · [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) | Official repository README, unpinned. **Web.** | CLI SVG/PNG/PDF output and Markdown-to-image conversion. CLI behavior is distinct from the library API and is not a performance comparison. |
| **S03A** · [Mermaid CLI: already installed Chromium](https://github.com/mermaid-js/mermaid-cli/blob/master/docs/already-installed-chromium.md) | Official repository documentation, unpinned. **Web.** | Puppeteer launch configuration and an existing browser executable. Supports the browser requirement; does not certify every Chromium or Puppeteer combination. |
| **S09** · [Mermaid accessibility](https://mermaid.js.org/config/accessibility) | Current official diagram metadata guidance. **Web.** | Accessible SVG title/description metadata as a diagram-library precedent. Metadata alone does not demonstrate complete diagram accessibility across consuming hosts. |
| **S10** · [D2 JavaScript package](https://www.npmjs.com/package/@d2lang/d2) | Official package README, 0.1.34 observed. **Web.** | Browser/Node WASM, compile/render, worker disposal and virtual-file input. Describes D2’s architecture, not a required Draftably dependency or measured comparison. |
| **S11** · [Viz.js API](https://viz-js.com/api/) | Current official API; exact WASM/Graphviz release not pinned. **Web.** | Reusable Graphviz WASM instances, structured outcomes, SVG strings and DOM convenience. Exact bundled Graphviz version and relative performance were not established. |
| **S12** · [Kroki usage](https://docs.kroki.io/kroki/setup/usage/) | Current official HTTP rendering protocol. **Web.** | HTTP diagram rendering via encoded GET or POST and output negotiation. Source leaves the caller; privacy and deployment recommendations are design conclusions. |
| **S13** · [Kroki installation](https://docs.kroki.io/kroki/setup/install/) | Current official self-hosting/backend guidance. **Web.** | Self-hosted gateway, supported backends and companion containers. The reviewed list does not establish a Draftably backend or automatic host enablement. |
| **S14** · [nomnoml](https://github.com/skanaar/nomnoml) | Official repository README, unpinned. **Web.** | Node SVG output, browser drawing and a library separate from its application. It does not demonstrate native hosted Markdown adoption. |
| **S15** · [bpmn-js walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/) | Current official Viewer/Modeler guidance. **Web.** | Separate prepackaged Viewer and customizable Modeler paths. Supports viewer/editor separation as a precedent, not an estimate of Draftably extraction effort. |

### Hosted Markdown, package registries and chat

| Source | Version and retrieval | Supported claim and limit |
| --- | --- | --- |
| **S04** · [GitHub: Creating diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams) | Current platform policy; deployed Mermaid version unspecified. **Web.** | Native diagram syntaxes and GitHub surfaces, plus checking the deployed Mermaid version. Repository owners cannot infer an arbitrary fenced-renderer extension point. |
| **S04A** · [GitHub Markup](https://github.com/github/markup/blob/master/README.md) | Official processing-pipeline documentation. **Web.** | Parsing, sanitization, highlighting and GitHub-specific filters are separate stages. A syntax grammar or npm package does not confer native diagram support. |
| **S05** · [GitLab Flavored Markdown](https://docs.gitlab.com/user/markdown/) | Current docs name Mermaid major 12. **Web.** | GitLab’s documented Mermaid major version and separate diagram integrations. Deployment and administrator settings remain distinct from the upstream library release. |
| **S05A** · [GitLab: Kroki integration](https://docs.gitlab.com/administration/integration/kroki/) | Self-Managed and Dedicated; administrator enabled. **Web.** | Administrator enablement, supported GitLab offerings and the Kroki source-transfer/access-control boundary. A new backend is not automatically a GitLab.com feature. |
| **S06** · [npm: About package README files](https://docs.npmjs.com/about-package-readme-files/) | Current README processing documentation. **Web.** | Package README handling through GitHub-flavored Markdown. This does not prove parity with all github.com diagram filters or behavior in other registries. |
| **S07** · [Slack: Formatting message text](https://docs.slack.dev/messaging/formatting-message-text/) | Current messaging platform documentation. **Web.** | Slack-specific mrkdwn and code formatting. It provides no general promise of custom fenced diagram rendering across Slack clients. |
| **S07A** · [Slack: Image block](https://docs.slack.dev/reference/block-kit/blocks/image-block/) | Current Block Kit image formats. **Web.** | Documented raster image formats and alternative-text fields. SVG is not in the documented supported-format list; app automation is a separate integration. |

### Packaging and browser builds

| Source | Version and retrieval | Supported claim and limit |
| --- | --- | --- |
| **S18** · [npm package.json dependencies](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) | npm CLI v11 docs. **Web.** | Dependency installation and package metadata semantics. Install-time dependencies are different from code removed by a consumer’s bundler. |
| **S19** · [Node.js packages](https://nodejs.org/api/packages.html) | Current official docs; retrieved header v26.13.0, not proposed runtime floor. **Web.** | Package exports, supported entry points and module formats. The current documentation header does not determine the proposed runtime’s minimum Node version. |
| **S20** · [Vite 6 library build](https://v6.vite.dev/guide/build) | Vite 6 official versioned guide, matched to snapshot tooling. **Web.** | Library-build and asset behavior for the repository’s Vite major. Do not substitute newer toolchain option names without a deliberate upgrade. |

### Markdown syntax and processor contracts

| Source | Version and retrieval | Supported claim and limit |
| --- | --- | --- |
| **S08** · [CommonMark fenced code blocks](https://spec.commonmark.org/0.31.2/#fenced-code-blocks) | CommonMark 0.31.2, 2024-01-28. **Web.** | Fenced blocks and info-string syntax. CommonMark does not assign diagram-rendering semantics to draft or standardize the proposed metadata grammar. |
| **S21** · [unified transformer API](https://github.com/unifiedjs/unified#transformer) | Official maintained repository documentation. **Web.** | Promise-returning transformers and asynchronous processing. Supports the proposed build-time adapter shape; no Draftably plugin was executed or published. |
| **S22** · [mdast-util-to-hast node fields](https://github.com/syntax-tree/mdast-util-to-hast#fields-on-nodes) | Official syntax-tree project documentation. **Web.** | Structured mdast-to-HAST customization fields. These are conversion hooks, not permission to trust arbitrary HTML or bypass a host sanitizer. |
| **S23** · [Extending MDX](https://mdxjs.com/docs/extending-mdx/) | Current official MDX pipeline guidance. **Web.** | MDX’s extension pipeline and plugin integration. Proposed Draftably transformations still need real HTML/MDX compatibility fixtures. |
| **S23A** · [MDX package API](https://mdxjs.com/packages/mdx/) | Current official compile API. **Web.** | MDX compile/evaluate API and plugin options. MDX is executable content; adding a diagram adapter does not make untrusted MDX safe to evaluate. |
| **S24** · [markdown-it asynchronous rules guidance](https://github.com/markdown-it/markdown-it/blob/master/docs/development.md#i-need-async-rule-how-to-do-it) | Official development guide, unpinned. **Web.** | Collect asynchronous work and await it outside ordinary synchronous renderer rules. Returning a Promise from a normal fence rule is not the proposed integration. |
| **S24A** · [markdown-it MarkdownIt API](https://markdown-it.github.io/markdown-it/interfaces/MarkdownIt.html) | Current official generated API. **Web.** | Parse, token and renderer interfaces used by parse–prepare–render composition. API availability does not prove a host exposes every stage. |
| **S31** · [PyMdown SuperFences](https://facelessuser.github.io/pymdown-extensions/extensions/superfences/) | Official project documentation; custom fence/attribute extension. **Web.** | Custom fenced blocks and attribute conventions, including the attribute-list relationship. This is an extension contract, not CommonMark-wide behavior. |
| **S32** · [MkDocs plugins](https://www.mkdocs.org/dev-guide/plugins/) | Current official plugin events. **Web.** | Plugin events such as on_page_markdown as bridge points. No MkDocs Draftably plugin or process bridge was implemented in this mission. |
| **S33** · [Pandoc fenced attributes](https://pandoc.org/MANUAL.html#extension-fenced_code_attributes) | Current manual; reader extensions matter. **Web.** | Language shorthand combined with fenced attributes and reader-extension requirements. Adapter normalization must reconcile identifier fields and key/value attributes. |
| **S33A** · [Pandoc Lua filters](https://pandoc.org/lua-filters.html) | Current official AST/filter documentation. **Web.** | CodeBlock AST/filter mechanisms for producing image references. Output-writer image compatibility is separate; a filter does not supply a renderer by itself. |
| **S48** · [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) | Official project README, current. **Web.** | Sanitization schema behavior and safe extension considerations. Enabling diagram output must not disable sanitization for unrelated author content. |
| **S54** · [hast-util-from-html](https://github.com/syntax-tree/hast-util-from-html) | Official docs; HTML fragment and SVG space, explicitly not a general XML parser. **Web.** | HTML-fragment/HAST parsing with SVG context. It is explicitly not a general XML parser; generated-image XML validity requires a separate check. |

### Documentation frameworks and pinned implementation checks

| Source | Version and retrieval | Supported claim and limit |
| --- | --- | --- |
| **S25** · [VitePress site config](https://vitepress.dev/reference/site-config) | Current official docs; source scope pinned separately. **Web.** | Public Markdown configuration and build hooks. No general markdown.preprocess hook was found in the reviewed configuration; the source check is version-bounded. |
| **S25A** · [VitePress Markdown renderer](https://github.com/vuejs/vitepress/blob/v2.0.0-alpha.21/src/node/markdown/markdown.ts) | v2.0.0-alpha.21; blob eeb90ced4c25e2376e7585066af45e828b458a79. **GitHub source.** | MarkdownItAsync integration and awaitable setup/configuration. These facts apply to the inspected alpha tag, not every installed VitePress release. |
| **S25B** · [VitePress Markdown-to-Vue](https://github.com/vuejs/vitepress/blob/v2.0.0-alpha.21/src/node/markdownToVue.ts) | v2.0.0-alpha.21; blob 06ce309bde164f65d7629a419f5d008cc2fa7112. **GitHub source.** | Per-document renderAsync, environment/include handling and caching. An awaited outer render does not itself make every fence callback asynchronous. |
| **S25C** · [markdown-it-async implementation](https://github.com/antfu/markdown-it-async/blob/main/src/index.ts) | main fetched; blob 4b75430bb94c900d806ef823ce06693f1babfed2. **GitHub source.** | Asynchronous highlighting through placeholders while ordinary rendering remains synchronous. This is dependency-author source, not a recommended Draftably runtime dependency. |
| **S27** · [Docusaurus diagrams](https://docusaurus.io/docs/markdown-features/diagrams) | Docs 3.10.2. **Web.** | Docusaurus’s Mermaid-specific diagram integration. It is not a generic switch that recognizes an arbitrary draft language. |
| **S28** · [Docusaurus MDX plugins](https://docusaurus.io/docs/markdown-features/plugins) | Docs 3.10.2. **Web.** | remark/rehype plugin configuration for MDX-backed documentation. Host asset emission and watch behavior require additional integration proof. |
| **S29** · [Astro Markdown guide](https://docs.astro.build/en/guides/markdown-content/) | Current v7 processor guidance; Sätteri default. **Web.** | Current processor selection and the Sätteri default. A current recipe must deliberately select Unified when using a remark adapter. |
| **S29A** · [Astro Unified processor reference](https://docs.astro.build/en/reference/markdown-processors/unified/) | Current v7; explicit @astrojs/markdown-remark. **Web.** | The public Unified processor factory/options and @astrojs/markdown-remark integration. Pinned implementation checks appear in S56 and S56A. |
| **S29B** · [Astro v5 Markdown guide](https://v5.docs.astro.build/en/guides/markdown-content/) | Versioned v5 docs, distinct configuration. **Web.** | The older direct remarkPlugins/rehypePlugins configuration. It is a versioned compatibility reference, not a universal current recipe. |
| **S30** · [Starlight authoring content](https://starlight.astro.build/guides/authoring-content/) | Current official Markdown/MDX guidance. **Web.** | Starlight Markdown/MDX content conventions. A custom diagram recipe still depends on the chosen Astro processor and correct asset URLs. |
| **S49** · [Astro integration API](https://docs.astro.build/en/reference/integrations-reference/#astrobuilddone) | Current v7 docs; final client output dir and dev hooks. **Web.** | Astro integration hooks, including final client output and development hooks. S56B/C pin the relevant dir contract; examples remain proposed integrations. |
| **S50** · [Docusaurus lifecycle APIs](https://docusaurus.io/docs/api/plugin-methods/lifecycle-apis) | Docs 3.10.2; production postBuild. **Web.** | Docusaurus lifecycle hooks, including production postBuild. Production copying alone does not prove development serving or watch correctness. |
| **S52** · [Docusaurus static assets](https://docusaurus.io/docs/static-assets) | Docs 3.10.2. **Web.** | Docusaurus static-asset placement and URL handling. Generated assets must exist at the appropriate build/dev phase and respect the site base. |
| **S53** · [Docusaurus staticDirectories config](https://docusaurus.io/docs/api/docusaurus-config#staticdirectories) | Docs 3.10.2. **Web.** | Configured staticDirectories behavior. This is one asset route, not evidence that arbitrary late-generated files are automatically tracked and served. |
| **S56** · [Astro Unified package exports](https://github.com/withastro/astro/blob/e71c038f31194280b44515bf53cf449a5313baf9/packages/markdown/remark/src/index.ts) | Pinned commit e71c038f31194280b44515bf53cf449a5313baf9. **GitHub source.** | The package index re-exports unified from processor.js. Pinned source confirms the import spelling; source version is not a release-channel assertion. |
| **S56A** · [Astro Unified processor implementation](https://github.com/withastro/astro/blob/e71c038f31194280b44515bf53cf449a5313baf9/packages/markdown/remark/src/processor.ts) | Same pinned commit. **GitHub source.** | The unified factory and how remark/rehype options are carried into the processor. Supports the current configuration shape at the pinned commit. |
| **S56B** · [Astro public integration types](https://github.com/withastro/astro/blob/e71c038f31194280b44515bf53cf449a5313baf9/packages/astro/src/types/public/integrations.ts) | Same pinned commit. **GitHub source.** | Public astro:build:done hook types identify dir as the resolved client output URL. This differs from guessing a fixed dist directory. |
| **S56C** · [Astro build orchestration](https://github.com/withastro/astro/blob/e71c038f31194280b44515bf53cf449a5313baf9/packages/astro/src/core/build/index.ts) | Same pinned commit. **GitHub source.** | Build orchestration actually supplies outputDirectories.client to the completion hook. Confirms implementation consistency with the public integration type. |

### Editor previews and framework lifecycle

| Source | Version and retrieval | Supported claim and limit |
| --- | --- | --- |
| **S34** · [VS Code Markdown extension guide](https://code.visualstudio.com/api/extension-guides/markdown-extension) | Stable preview hooks; code-block editor API described as experimental. **Web.** | Stable markdown-it/preview-script contributions and separately experimental editor contributions. An installed extension benefits its users, not every reader of the file. |
| **S35** · [Obsidian API declarations](https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts) | Official current declarations; code-block processor since 0.9.7. **Web.** | registerMarkdownCodeBlockProcessor signature and extension mechanism. It requires a plugin; the declaration does not imply a published Draftably integration. |
| **S36** · [React useEffect](https://react.dev/reference/react/useEffect) | Current official lifecycle documentation. **Web.** | Effect setup, dependencies and cleanup for externally owned DOM/resources. The proposed React recipe still requires consumer verification. |
| **S36A** · [React StrictMode](https://react.dev/reference/react/StrictMode) | Current docs header 19.3. **Web.** | Development Strict Mode lifecycle checks relevant to remount-safe ownership. The docs header is not evidence of an installed project dependency. |
| **S37** · [Solid onMount](https://docs.solidjs.com/reference/lifecycle/on-mount) | Current official lifecycle documentation. **Web.** | Client mount lifecycle for DOM work in Solid. The viewer remains a separate imperative instance, not an imported application root. |
| **S38** · [Solid onCleanup](https://docs.solidjs.com/reference/lifecycle/on-cleanup) | Current official owner/cleanup documentation. **Web.** | Cleanup registered with the reactive owner. Supports synchronous ownership registration and disposal; no proposed Solid example was executed. |
| **S39** · [Vue composition lifecycle](https://vuejs.org/api/composition-api-lifecycle) | Current official composition API. **Web.** | Composition lifecycle registration and mounted/unmounted cleanup. Vue compatibility follows the proposed DOM contract but still needs a concrete recipe proof. |
| **S40** · [Svelte lifecycle hooks](https://svelte.dev/docs/svelte/lifecycle-hooks) | Current official lifecycle documentation. **Web.** | Mount/cleanup semantics, including the distinction between a synchronous cleanup return and an async callback’s Promise. SSR and reactive updates remain host concerns. |

### Browser boundaries, XML and accessibility

| Source | Version and retrieval | Supported claim and limit |
| --- | --- | --- |
| **S41** · [MDN: SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image) | Web-platform implementation guidance, current. **Web.** | SVG image-context restrictions differ from inline SVG and opened documents. An image context is not a universal sanitizer for the same bytes elsewhere. |
| **S42** · [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy) | Web-platform reference, current. **Web.** | CSP directives constrain scripts, styles, images, fonts and workers separately. A style nonce does not relax the other resource policies. |
| **S43** · [MDN: Worker constructor](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) | Web-platform reference, current. **Web.** | Worker construction, script origins and environment/security failures. A CDN module does not automatically make its worker entry usable from another origin. |
| **S44** · [MDN: Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) | Web-platform reference, current. **Web.** | Trusted Types and relevant DOM injection sinks. Guides a controlled DOM-writer design; it does not prove browser support or safety of arbitrary SVG strings. |
| **S45** · [MDN: Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) | Web-platform reference, current. **Web.** | Origin/source-window validation and message delivery semantics. Messaging source to a frame still discloses that source to the receiving origin. |
| **S46** · [W3C WAI: Complex images](https://www.w3.org/WAI/tutorials/images/complex/) | W3C accessibility guidance, current. **Web.** | Short alternatives and fuller explanations for complex images. Provides design guidance, not a claim of completed accessibility testing or conformance. |
| **S51** · [MDN: iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) | Current sandbox/origin guidance. **Web.** | Iframe sandbox/origin constraints, including combinations that weaken intended isolation. A frame cannot override its embedding host’s markup policy. |
| **S55** · [XML 1.0 Fifth Edition character rules](https://www.w3.org/TR/2008/REC-xml-20081126/#charsets) | W3C Recommendation, 2008-11-26. **Web.** | Permitted XML character ranges. Explains why escaping markup characters alone is insufficient for NUL, forbidden controls or lone surrogates. |

### Pinned-source identity notes

A content blob SHA identifies the bytes of one file; it is not interchangeable with a commit SHA in a GitHub `blob/<commit>/path` URL. Tagged/commit permalinks above retain the actual tree reference. The following identities preserve the decisive connector checks without implying that a moving branch remains unchanged:

| Source | Ref inspected | Content blob SHA |
| --- | --- | --- |
| S25A | VitePress `v2.0.0-alpha.21` | `eeb90ced4c25e2376e7585066af45e828b458a79` |
| S25B | VitePress `v2.0.0-alpha.21` | `06ce309bde164f65d7629a419f5d008cc2fa7112` |
| S25C | `markdown-it-async` main at retrieval | `4b75430bb94c900d806ef823ce06693f1babfed2` |
| S56 | Astro commit `e71c038f31194280b44515bf53cf449a5313baf9` | `5dcf15e444de115f99c4abc26f563198312e3919` |
| S56A | Same Astro commit | `7063ed6fe73f34c1f357b681a63583aabbc25df8` |
| S56B | Same Astro commit | `361d1afb1ac358f19552051b46ac7b64e2494bea` |
| S56C | Same Astro commit | `9c57cc6467657efcc083de24d1d2fb56ef9a5691` |

## Repository evidence groups

**Retrieval:** local reads of the supplied archive. Every group uses recorded baseline `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5` and the same research date. GitHub links identify the intended baseline locations; they do not claim that the archive was independently authenticated against the remote Git tree. Full mandatory-route coverage and narrower helper inspection are distinguished in the appendix.

### R01 — Repository intent and documentation

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/AGENTS.md). **Scope:** Project instructions, architecture/check/release expectations and documented user workflows. Instructions and stated budgets are not proof that checks ran. Some release/helper references are outside the supplied packet; see the limitations below.

**Paths:** `AGENTS.md`; `README.md`; `docs/ARCHITECTURE.md`; `docs/CHECKS.md`; `docs/RELEASING.md`.

### R02 — Packaging and build boundary

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/packages/cli/package.json). **Scope:** The private root/public CLI boundary, installed dependency declarations, bundled application/assets and existing package-proof structure. These establish the extraction work; they do not establish a published library export, measured bundle cost or verified release credentials.

**Paths:** `package.json`; `pnpm-workspace.yaml`; `packages/cli/package.json`; `scripts/build-cli.ts`; `scripts/check-cli-package.ts`; `scripts/prove-package.ts`.

### R03 — Native parser, compiler and projection

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/dsl/compile.ts). **Scope:** Source grammar, existing limits, full asynchronous compile/layout behavior, projection and internal model types. The fixed render context and compile/checkSource difference ground the proposed facade. No layout execution or exact cross-platform runtime equality was measured.

**Paths:** `src/dsl/syntax.ts`; `src/dsl/compile.ts`; `src/dsl/project.ts`; `src/model/types.ts`.

### R04 — Deterministic metrics and geometry

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/model/fonts.ts). **Scope:** Checked-in font advance tables, deterministic text measurement and geometry/scene helpers. Font metrics are distinct from font loading and glyph coverage; a theme may change dimensions. Complete metric-table inspection was structural rather than running font-generation code.

**Paths:** `src/model/fonts.ts`; `src/model/font-metrics.json`; `src/model/labels.ts`; `src/model/static-scene.ts`.

### R05 — Font and DOM-export asset seams

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/lib/font-data.ts). **Scope:** Four Vite-specific embedded font imports, global browser registration and DOM-oriented SVG export behavior. Establishes packaging/readiness seams. It does not establish that a new standalone runtime or CSP configuration already works.

**Paths:** `src/lib/font-data.ts`; `src/lib/svg-export.ts`.

### R06 — SVG drawing and helpers

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/cli/svg.ts). **Scope:** Current SVG serialization, link wrapping, IDs, presentation/style output and supporting drawing helpers. Main renderer review was complete; helper review was targeted. Output-hardening recommendations are not claims that an exploit was executed.

**Paths:** `src/cli/svg.ts`; `src/model/heading.ts`; `src/model/legend.ts`; `src/model/note.ts`; `src/model/markers.ts`.

### R07 — Source metadata, links and keyed documents

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/model/embed.ts). **Scope:** Source-bearing image metadata/extraction, link classification and keyed model storage. Supports privacy defaults, legacy compatibility and targeted hostile-key proofs. Static source inspection is not a demonstrated prototype-pollution or browser-navigation exploit.

**Paths:** `src/model/embed.ts`; `src/model/link.ts`; `src/model/document.ts`.

### R08 — Site Markdown and rendering integration

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/site/draw.ts). **Scope:** The site’s existing compile-to-SVG composition, private draft fence handling, examples and source-driven UI. These are application/site integrations, not reusable published adapters or a supported viewer package.

**Paths:** `site/draw.ts`; `site/docs/content.ts`; `site/docs/Example.tsx`; `site/live/DiagramView.tsx`; `site/live/LiveEditor.tsx`; `site/play/Playground.tsx`.

### R09 — Static-scene transitive application coupling

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/components/scene/StaticScene.tsx). **Scope:** Transitive dependencies from StaticScene into scene components, link handling and application state. The real helper paths are under src/components/scene/. A visually passive component is not, by its name, an instance-isolated public API.

**Paths:** `src/components/scene/StaticScene.tsx`; `src/components/scene/NodeView.tsx`; `src/components/scene/parts.tsx`; `src/components/scene/LinkMark.tsx`; `src/state/links.ts`.

### R10 — Application stores and controls

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/state/document.ts). **Scope:** Application-wide document state, debug APIs and browser keyboard controls. Supports keeping editor behavior out of the viewer contract. No proposed multi-instance or disposal implementation was tested.

**Paths:** `src/state/document.ts`; `src/state/debug-api.ts`; `src/state/keyboard.ts`.

### R11 — Engine tasks, workers and route caching

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/lib/engine-tasks.ts). **Scope:** Current shared/per-task worker ownership, waiter/cancellation paths and source computation caching. Related targeted routing-cache inspection used src/model/routes.ts. Existing code informs requirements but is not proof of the new worker protocol.

**Paths:** `src/lib/engine-tasks.ts`; `src/workers/engine.worker.ts`.

### R12 — Existing test contracts and representative examples

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/tests/dsl.test.ts). **Scope:** Existing DSL/theme/CLI/metadata assertions and three representative native source examples. Tests were read, not run; examples were read, not rendered. Theme-size assertions contradict a general promise of geometry-invariant theme switching.

**Paths:** `tests/dsl.test.ts`; `tests/themes.test.ts`; `tests/cli.test.ts`; `tests/embed.test.ts`; `examples/checkout.draft`; `examples/emphasis.draft`; `examples/theme-proof.draft`.

### R13 — CLI execution and rasterization

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/cli/main.ts). **Scope:** Executable CLI processing, Node/filesystem/browser dependencies and PNG rasterization. Supports separating native SVG from raster/CLI behavior. An installed-browser requirement for PNG does not imply a browser requirement for native SVG.

**Paths:** `src/cli/main.ts`; `src/cli/png.ts`.

### R14 — Application and site build configuration

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/vite.site.config.ts). **Scope:** Application/site bundling, base paths and current Vite-specific loading assumptions. The new library build, browser distribution and export map are proposals, not outputs found in this snapshot.

**Paths:** `vite.config.ts`; `vite.site.config.ts`.

### R15 — Prior gap research, historical context

[Baseline source](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/docs/research/README.md). **Scope:** The earlier comparison’s taxonomy, rationale and subsequent-status notes. Its own baseline is older than this mission’s; counts are neither popularity nor demand measurements, and older gap cells were not treated as current product truth.

**Paths:** `docs/research/README.md`; `docs/research/diagram-library-gaps-2026-10-27/summary.md`; `docs/research/diagram-library-gaps-2026-10-27/coverage.md`; `docs/research/diagram-library-gaps-2026-10-27/next-steps.md`.

## Access and archive verification

The named source packet was available and sufficient for this Design mission. The access check recorded:

| Check | Observed result |
| --- | --- |
| Recorded repository | `https://github.com/byronwall/draftably` |
| Recorded commit | `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5` |
| Paths listed by `SOURCE-INVENTORY.md` | 355 |
| Inventoried paths found | All 355; none missing |
| Total extracted files | 357, including the inventory and research prompt |
| Explicitly named mandatory reading-route files | All 46 present and read across the team |
| Representative examples read | 3, listed below |
| Archive SHA-256 | `06d932f4e759bc1475813ac04ae9d04b9463379afc23c6f20adf2f50f3078920` |

The checksum identifies the supplied ZIP, not a Git commit. The recorded baseline agrees with packet metadata, but the archive is not a Git object database and its contents were **not independently authenticated byte-for-byte against the remote commit**. Inventory completeness is not a claim that every one of the 355 files was fully reviewed. Dependencies, secrets and build output are explicitly excluded by the packet description.

## Reading-route appendix

### Mandatory route: all 46 files

Each row below was fully read across the review team. The large font-metrics JSON was inspected completely as structured data across its four tables; no metric generator or source program was executed. Numbering follows the prompt’s seven reading groups.

### 1. Repository context

| # | File | Evidence group |
| --- | --- | --- |
| 01 | `AGENTS.md` | R01 |
| 02 | `README.md` | R01 |
| 03 | `package.json` | R02 |
| 04 | `pnpm-workspace.yaml` | R02 |
| 05 | `packages/cli/package.json` | R02 |
| 06 | `docs/ARCHITECTURE.md` | R01 |
| 07 | `docs/CHECKS.md` | R01 |
| 08 | `docs/RELEASING.md` | R01 |

### 2. Native language and metrics

| # | File | Evidence group |
| --- | --- | --- |
| 09 | `src/dsl/syntax.ts` | R03 |
| 10 | `src/dsl/compile.ts` | R03 |
| 11 | `src/dsl/project.ts` | R03 |
| 12 | `src/model/fonts.ts` | R04 |
| 13 | `src/model/font-metrics.json` | R04 |
| 14 | `src/model/types.ts` | R03 |

### 3. Output, fonts, metadata and links

| # | File | Evidence group |
| --- | --- | --- |
| 15 | `src/cli/svg.ts` | R06 |
| 16 | `src/cli/main.ts` | R13 |
| 17 | `src/cli/png.ts` | R13 |
| 18 | `src/lib/font-data.ts` | R05 |
| 19 | `src/lib/svg-export.ts` | R05 |
| 20 | `src/model/embed.ts` | R07 |
| 21 | `src/model/link.ts` | R07 |

### 4. Site and live rendering

| # | File | Evidence group |
| --- | --- | --- |
| 22 | `site/draw.ts` | R08 |
| 23 | `site/docs/content.ts` | R08 |
| 24 | `site/docs/Example.tsx` | R08 |
| 25 | `site/live/DiagramView.tsx` | R08 |
| 26 | `site/live/LiveEditor.tsx` | R08 |
| 27 | `site/play/Playground.tsx` | R08 |

### 5. Scene, workers and application state

| # | File | Evidence group |
| --- | --- | --- |
| 28 | `src/components/scene/StaticScene.tsx` | R09 |
| 29 | `src/model/static-scene.ts` | R04 |
| 30 | `src/lib/engine-tasks.ts` | R11 |
| 31 | `src/workers/engine.worker.ts` | R11 |
| 32 | `src/state/debug-api.ts` | R10 |
| 33 | `src/state/document.ts` | R10 |
| 34 | `src/state/keyboard.ts` | R10 |

### 6. Builds and existing tests

| # | File | Evidence group |
| --- | --- | --- |
| 35 | `scripts/build-cli.ts` | R02 |
| 36 | `scripts/prove-package.ts` | R02 |
| 37 | `vite.config.ts` | R14 |
| 38 | `vite.site.config.ts` | R14 |
| 39 | `tests/embed.test.ts` | R12 |
| 40 | `tests/dsl.test.ts` | R12 |
| 41 | `tests/themes.test.ts` | R12 |
| 42 | `tests/cli.test.ts` | R12 |

### 7. Prior research

| # | File | Evidence group |
| --- | --- | --- |
| 43 | `docs/research/README.md` | R15 |
| 44 | `docs/research/diagram-library-gaps-2026-10-27/summary.md` | R15 |
| 45 | `docs/research/diagram-library-gaps-2026-10-27/coverage.md` | R15 |
| 46 | `docs/research/diagram-library-gaps-2026-10-27/next-steps.md` | R15 |

### Representative examples

| File | Why it was read | Evidence limit |
| --- | --- | --- |
| `examples/checkout.draft` | A realistic native flow for source, layout and documentation examples. | Static source review; not newly compiled or rendered. |
| `examples/emphasis.draft` | Named-state syntax and viewer/state behavior. | Validates source vocabulary, not the proposed viewer implementation. |
| `examples/theme-proof.draft` | Typography, palette and theme-dependent geometry context. | Existing test assertions were inspected; visual output was not newly measured. |

### Additional dependency/helper inspection

These reads extend the mandatory route. They are separated to avoid claiming a full-file audit where only imports, symbols, call sites or selected implementation regions were relevant.

| Coverage | Files | Purpose |
| --- | --- | --- |
| Additional full reads recorded by the runtime reviewer | `src/components/scene/NodeView.tsx`, `GroupView.tsx`, `EdgeView.tsx`, `parts.tsx`, `LinkMark.tsx` in that same scene directory; `src/model/labels.ts`; `src/model/status.ts` | Transitive store/interaction coupling; measurement, status and emphasis behavior. |
| Additional documentation read | `site/docs/pages/get-started.md` | Concrete baseline syntax and examples. |
| Targeted engine inspection | `src/engines/layout-engine.js`; `src/engines/routing-engine.js` | Imports/globals, cold computation, options, timing/reporting paths. |
| Targeted model inspection | `src/model/routes.ts`; `src/model/document.ts` | Route cache identity/cloning and keyed model/parser seams. |
| Targeted rendering helpers | `src/model/heading.ts`; `src/model/legend.ts`; `src/model/note.ts`; `src/model/markers.ts` | Renderer-owned fragments and output construction. The actual filename is plural `markers.ts`. |
| Targeted application dependencies | `src/state/file-session.ts`; `src/state/links.ts`; `src/components/Icon.tsx` | Setup/import side effects, navigation state and selected HTML-insertion call sites. |
| Supporting package inspection | `scripts/check-cli-package.ts` | Existing packed CLI/install proof structure; no proof was executed. |

All helper paths listed above were checked to exist in the supplied snapshot. The `NodeView`, `parts` and `LinkMark` paths are under `src/components/scene/`, not guessed top-level component paths. A future renderer refactor must inspect every affected helper fully; this register does not imply that targeted review already completed that implementation work.

### Referenced material absent from the packet

The following references were identified from the supplied instructions, package scripts or release documentation but were not supplied and were not reviewed:

- `docs/intent/diagram-quality/FEEL.md` and `docs/intent/diagram-quality/RUBRIC.md`.
- `.changeset/`, including its configuration and release notes.
- `scripts/add-changeset.ts` and `scripts/check-changeset.ts`, referenced by package commands.
- `.github/workflows/`, including the documented `release.yml` workflow and Check workflow configuration.

These are not missing items from the mission’s 46-file minimum route. Their absence does not prevent this design, but it limits claims about current interaction guidance, release automation and publishing configuration. Codex should inspect the real files in the repository before implementing interaction changes or changing release/package automation. No contents or approvals were inferred from unseen references.

## Prior research and unresolved evidence

The earlier gap study was checked on October 28, 2026 against `2995a98eef31803fa8669a7ada5c8f8892486bb7`. Its 28 diagram-family and 37 feature rows across Draftably and 15 alternatives support comparison vocabulary and historical decisions. They are not user research, adoption statistics, market share or benchmark results. Later source can supersede old cells; existing import, notes and PDF work was not redescribed as absent solely because of an older plan.

The evidence does not establish:

- Published `@draftably/runtime` or `@draftably/markdown` packages, ownership of that npm scope, or implemented API/fence examples.
- Native Draftably rendering on GitHub, GitLab.com, npm, Slack or arbitrary AI/chat clients. A documented extension mechanism is not proof of installation or provider deployment.
- Numeric runtime/bundle performance, universal browser/font coverage, successful CSP/Trusted Types fixtures, or completed accessibility conformance.
- Zero-cost SSR enhancement, a stable serialized compiled scene, or an embedded editor lifecycle.
- Acceptance of a future Kroki backend, preview extension, or upstream platform proposal.

These gaps are bounded implementation or adoption proofs in the companion plan. They do not justify delaying the small static runtime behind a demand study or a hosted-service project.
