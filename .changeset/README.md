# Changesets

After CLI activation, add a release note with:

```sh
pnpm changeset:add patch "Describe the change for CLI users."
pnpm changeset:status
```

Use `minor` for features and `major` for breaking changes.
Do not add release notes for the private viewer workspace.
See [release setup](../docs/RELEASING.md).
