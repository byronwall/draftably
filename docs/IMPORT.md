# Source record

The initial commit imports the final Diagram Studio v7 release from the
[Describe Diagram Studio conversation](https://chatgpt.com/c/6aa8c654-c26c-83e9-8b98-0ee82facaf4a).

- Release: Diagram Studio v7, September 20, 2026.
- Retrieved: October 3, 2026, in America/Indiana/Indianapolis.
- Archive: `diagram-studio-v7.zip`, 64 files.
- Archive SHA-256: `2774d6007e1e4dd62a890ea9b79945c7cb1018555011aa1b369f0300af56b168`.
- Initial commit: `df9f919` (`Import final Diagram Studio v7 release`).
- Integrity: all 63 file checksums passed before the import commit.

The initial commit preserves the source, standalone app, documents, 13 examples,
previews, and verification files exactly as downloaded. Earlier release bundles
were not imported. The v6 change guide was part of the final v7 bundle.

The unchanged release is now under `reference/v7/`. Its checksum list is
`reference/v7/MANIFEST.sha256`. The application under `src/` is the maintained
SolidJS version.

The intent dump contains the product history, layout research, references,
interaction rules, and migration proposals. The parameter reference describes
the algorithms in this release. Some historical references name files which
were not included in the final ZIP, such as `docs/evidence/original-brief-and-transcripts.txt`.
Those missing files were not reconstructed or presented as recovered originals.

The imported verification reports describe tests run in the ChatGPT environment.
They are source evidence, not results from the SolidJS app. Current checks and
their limits are recorded separately.

The release describes an independent implementation inspired by
`byronwall/user-flow-workbench`. It does not include ELK or libavoid. The ZIP
contains no license file. This import does not assign a new license.
