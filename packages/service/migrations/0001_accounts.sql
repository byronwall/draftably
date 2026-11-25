-- One account per email address. Credits: a monthly grant that resets, plus bought credits that keep.
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  grant_left INTEGER NOT NULL,
  grant_month TEXT NOT NULL, -- YYYY-MM the grant belongs to
  bought INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- API keys are dft_<id>.<secret>; only a SHA-256 of the secret is kept.
CREATE TABLE keys (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  hash TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX keys_account ON keys(account_id);

-- Every change to a balance. A purchase's ref is its Stripe Checkout session, kept once.
CREATE TABLE ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL, -- render, purchase
  ref TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ledger_account ON ledger(account_id, id);
CREATE UNIQUE INDEX ledger_purchase ON ledger(ref) WHERE reason = 'purchase';

-- Signed-in browser sessions for the account page.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  expires_at TEXT NOT NULL
);

-- Emailed sign-in links. Only a SHA-256 of the token is kept; a link works once, for 15 minutes.
CREATE TABLE login_tokens (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
