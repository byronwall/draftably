-- Apps disconnected on /account. OAuth grants live in KV, which other locations may still serve
-- for a while after a delete; this row is checked on every app call and token refresh instead.
CREATE TABLE app_revocations (
  grant_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  revoked_at TEXT NOT NULL
);
