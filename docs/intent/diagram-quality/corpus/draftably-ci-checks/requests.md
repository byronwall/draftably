# Follow-up requests

Color strategy / theme / layout: semantic (blue checks, violet proofs, amber gates, red failure) / signal, layered right.

e1 (grow): "The release workflow runs after merge: add it, from main to npm."

- expects: order-x pr install release_check build; order-x merged version_pr npm

e2 (relayout): "Show it top to bottom so it fits the docs column."

- expects: order-y pr install release_check; order-y merged version_pr npm
