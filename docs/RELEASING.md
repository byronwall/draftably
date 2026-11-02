# draftably releases

The release flow follows explorEDA and Product Grid:

1. Add a changeset with the CLI change.
2. Merge it into `main`.
3. GitHub Actions opens or updates the **Version Packages** pull request.
4. Review the version and changelog. Merge that pull request.
5. Actions checks, builds, tests, and packs the CLI. Changesets publishes it and creates a GitHub release.

A pull request that changes shipped files (`src/`, `index.html`, `examples/`, `docs/DSL.md`,
`packages/cli/`) must add a changeset; CI runs `pnpm changeset:check` to enforce it. Use
`pnpm changeset add --empty` for a change that needs no release.

The workflow runs when `.changeset/` changes on `main`, or through **Run workflow**.
Ordinary commits do not start a release. Manual runs on other branches skip publishing.
The version command updates the pnpm lockfile with the package version.

## Build and prove the package

The CLI lives in `src/cli/`; `packages/cli` is its npm release package.
It includes prebuilt JavaScript, the viewer and worker assets, a language guide, and an example.
The installed command is `draftably`. It needs Node 22.21 or later, with no compiler or build step.

```sh
pnpm cli:build
pnpm cli:pack-check
pnpm prove:installed
```

`cli:build` builds the viewer and bundles the CLI into `packages/cli/dist/`.
`cli:pack-check` installs the tarball outside the repo and checks the actual executable and local server.
`prove:installed` adds the browser drag, save, external edit, restart, invalid-source, and conflict proof.
The browser proof needs Playwright Chromium installed locally.
Archives go to `tmp/cli-dist/`; screenshots go to `tmp/proof/`.

Run `pnpm release:check` before publishing. GitHub's Check workflow runs the same gate.
The first version is `0.1.0`, generated with Changesets.

## Configure GitHub and npm

The source repository is [byronwall/draftably](https://github.com/byronwall/draftably).
GitHub Actions is enabled and can create and approve pull requests.

Configure an npm trusted publisher for `draftably`:

| Field                | Value                                       |
| -------------------- | ------------------------------------------- |
| Provider             | GitHub Actions                              |
| Organization or user | `byronwall`                                 |
| Repository           | `draftably`                                 |
| Workflow filename    | `release.yml`                               |
| Environment          | Leave empty; this workflow does not use one |
| Allowed action       | Direct publishing with `npm publish`        |

The npm package must exist before trusted publishing can be configured.
Publish the first checked archive from your authenticated local session once the CLI is ready.
Then configure the trusted publisher before the next Actions release.
Do not add an npm token to this workflow. Changesets uses npm's OIDC authentication.
The workflow uses GitHub-hosted Ubuntu and Node 24, which includes a compatible npm CLI.
Trusted publishing requires npm 11.5.1 or later and Node 22.14 or later.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

The source repository is public. The release workflow requests npm provenance for automated publishes.

## Add each release note

```sh
pnpm changeset:add patch "Describe the change for CLI users."
pnpm changeset:status
```

Use `minor` for features and `major` for breaking changes.
Commit the generated `.changeset/*.md` file with the change.
Do not run `pnpm release` during normal development; it publishes with your current npm credentials.

GitHub Actions runs `pnpm release:check` before publishing.
The package check requires public metadata and runs each built executable with `--help`.
The release gate tests the packed runtime in a fresh temporary install.
