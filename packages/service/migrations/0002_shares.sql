-- Short share links. The id is the first 12 base32 characters of the SHA-256 of the type and
-- source, so the same diagram always gets the same id. The caller's IP is kept only as a hash.
CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  type TEXT NOT NULL, -- draftably, mermaid
  png_scale INTEGER NOT NULL, -- the largest PNG scale under the pixel limit; 0 for none
  created_at TEXT NOT NULL,
  account_id TEXT REFERENCES accounts(id),
  ip_hash TEXT NOT NULL
);
CREATE INDEX shares_ip ON shares(ip_hash);
