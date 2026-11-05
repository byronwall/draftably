# Upstream integration proposal drafts

**Status:** saved drafts only. Runtime, Markdown, and viewer packed-consumer proofs pass. Independent browser checks also pass. These drafts have not been sent; package publication and provider acceptance remain separate steps.

## Evidence available to attach

These local commands produce relevant evidence without publishing a package:

```sh
pnpm runtime:build && pnpm runtime:pack-check
pnpm prove:runtime
pnpm markdown:build && pnpm markdown:pack-check
pnpm viewer:pack-check
pnpm prove:viewer
```

Also run `pnpm markdown:browser-check` and `pnpm host:pack-check`. For a host proposal, attach its named-version build and browser evidence. Include output policy, limits, measured package size, license and font notices, compatibility range, and an agreed maintenance contact.

See the [implementation evidence](../intent/embedding-ecosystem/implementation-evidence.md) for the complete PR stack and proof commands.

## Draft A: native fenced diagram support

**Possible recipients:** maintainers of one Markdown provider or repository host, such as GitHub or GitLab. Check that host's current extension process before sending.

**Subject:** Proposal: render `draft` fences with an accessible static fallback

Draftably has a native `.draft` source format and a portable runtime that produces standalone SVG. We would like to learn whether your Markdown pipeline has an extension path for another diagram language.

The proposed first behavior renders a recognized `draft` fence at build time as a static image. Reader-side scripts are not required. The output has text alternatives and dimensions. Source is omitted by default. Links require host policy. The renderer does not fetch source-driven network resources or send source to a Draftably service.

Questions: Does this host accept a native diagram integration? Which sanitization, accessibility, compatibility, and maintenance requirements apply? If native recognition is out of scope, should generated images remain the recommended route?

This draft asks for evaluation only. It does not say the host supports Draftably. Native support would require the host's own implementation and release.

## Draft B: Kroki backend request

**Possible recipient:** Kroki maintainers, followed by administrators who choose to enable a backend.

**Subject:** Explore a Draftably backend for self-hosted Kroki deployments

Draftably has a native source format and a portable rendering runtime. We would like to learn whether a small backend could fit Kroki's contribution and operational model.

A backend would need explicit source and execution limits, offline behavior, safe SVG output, license and font notices, and a version policy. It would be opt-in for self-hosted deployments. A Kroki backend would not enable Draftably in GitHub.com, GitLab.com, or another provider unless that provider or an administrator separately installed and enabled it.

Questions: Is this backend shape acceptable? Which isolation, rate, size, and upgrade rules apply? Would static image generation be preferable to a new backend?

This is a proposal outline only. No backend has been built, and Kroki has not been contacted.
