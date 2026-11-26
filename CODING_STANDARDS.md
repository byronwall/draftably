# Coding standards

Judgement rules that a lint rule or a test cannot enforce. Each rule comes from a class of bug
that Codex reviews found more than once. Where a test can hold a rule, the test is the rule and it
is not listed here.

## Editor drafts

- An editor or dialog that holds a draft records each field it can write when it opens. On save
  it writes only the fields the user changed. It refuses the save only when one of those fields
  changed in the file since it opened. A file change to another field stays.
  `tests/stale-drafts.test.ts` holds the Code editor to this rule; a new draft surface adds its
  fields to that test.
- A draft save is a command, not a snapshot of the drawing. It names its draft, the fields it
  writes and the values it read them with. The file session runs it against the latest drawn
  source (`whenDrawn`), so a save made while a refresh compiles is checked against that refresh.

## Docs

- When a documented request also stores the source or makes it publicly readable (a short link
  stores it, and anyone with the link can read it), say both at the first example of that request,
  not only in a later storage section.
