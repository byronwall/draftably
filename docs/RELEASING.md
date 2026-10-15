# Draftably releases

The release flow follows explorEDA and Product Grid:

1. Add a changeset with the CLI change.
2. Merge it into `main`.
3. GitHub Actions opens or updates the **Version Packages** pull request.
4. Review the version and changelog. Merge that pull request.
5. Actions checks, builds, tests, and packs the CLI. Changesets publishes it and creates a GitHub release.

The workflow runs when `.changeset/` changes on `main`, or through **Run workflow**.
Ordinary commits do not start a release. Manual runs on other branches skip publishing.
The version command updates the pnpm lockfile with the package version.

## Current boundary

This checkout contains the static viewer. It does not contain the planned DSL CLI.
`packages/cli` reserves its release location. Its npm name is `draftably` and `private` is `true`.
The CLI command will also be `draftably`.
The root viewer package remains private. No initial changeset exists yet.
Release checks fail until the CLI implementation and package metadata are ready.
The GitHub workflow skips the release action while the CLI package is private.

## Activate the CLI package

1. Keep `draftably` as the npm package and executable name.
2. Set `private` to `false` in `packages/cli/package.json` when the CLI is ready.
3. Keep the package repository metadata set to `byronwall/draftably`, directory `packages/cli`.
4. Add the CLI implementation, a `build` script, and a `test` script.
5. Add `bin` with `draftably` as the executable name and its compiled JavaScript path under `dist/`.
6. Build the viewer into the CLI's `dist/` tree. Include its workers and assets.
7. Start the compiled CLI with `#!/usr/bin/env node`. Support `--help` without starting the server.
8. Replace the package README with install, file format, and command instructions. Set the intended license.
9. Run `pnpm release:check`. Test the packed archive from `tmp/cli-dist/` in a fresh directory.
10. Verify file watching, viewer saves, and restart behavior from that archive.
11. Run `pnpm changeset:add minor "Release the first diagram DSL CLI."`.

Start the package at `0.0.0`; the first minor changeset produces `0.1.0`.
The changeset helper reads the package name from its manifest, so it follows a rename.
Keep runtime dependencies in the CLI manifest. Avoid imports into the repository source tree.
Add the viewer build to the CLI build script so every release includes matching assets.

## Configure GitHub and npm

The source repository is [byronwall/draftably](https://github.com/byronwall/draftably).
In GitHub **Settings → Actions → General**, allow Actions to create and approve pull requests.

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

Provenance is disabled to match Product Grid and support a private source repository.
For a public repository, set `NPM_CONFIG_PROVENANCE` to `true` after confirming the repository metadata.

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
The package's own test script must cover the file/viewer loop and the packed runtime.
