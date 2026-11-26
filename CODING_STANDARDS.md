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
