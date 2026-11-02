# E10 — Agentic Workflows security layers

- **Publisher:** GitHub
- **Author:** Landon Cox and Jiaxiao Zhou
- **Published:** 2026-03-09
- **Accessed:** 2026-11-02 UTC
- **Original page:** https://github.blog/ai-and-ml/generative-ai/under-the-hood-security-architecture-of-github-agentic-workflows/
- **Exact original image:** https://github.blog/wp-content/uploads/2026/03/image1.jpg
- **Figure / selection:** Diagram of a three-layer system architecture with labeled sections Planning layer, Configuration layer, and Substrate layer. Each layer contains three blue tiles:

Planning: Safe Outputs MCP (GitHub write operations), Call filtering (call availability, volume), Output sanitization (secret removal, moderation).
Configuration: Compiler (GH AW extension), Firewall policies (allowlist), MCP config (Docker image, auth token).
Substrate: Action runner VM (OS, hypervisor), Docker containers (Docker daemon, network), Trusted containers (firewall, MCP gateway, API proxy).
- **Stored original:** reference.jpg, SHA-256 `d636d83d678c93c2771a0f641873c2ae81716ad541f8ac431e1cfd13dc9daf3f`. Original resolution retained; no tracing or redrawing.
- **License observed:** unknown. For unknown licenses, no image-specific permission statement was established. Acquisition for this study is not a claim of permission to republish.
- **Principal objects:** 12. Count includes meaningful panels/layers where stated, not every decorative mark.
- **Patterns:** layered-stack, taxonomy, type-hierarchy
- **Reading path:** Read Planning, Configuration, Substrate down the page; inspect three capability cards per layer.
- **Design merit:** A disciplined three-by-three card grid separates component names from monospace mechanism captions while containing each layer quietly.
- **Confirmation case:** Yes; reserved from future tuning.

The native sources are independent editable recreations. The original is never imported into a native node or used as a rendering background. Any unrepresentable visual content is recorded in audit.md.
