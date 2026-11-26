-- The warnings and notes found when a share was stored, as JSON, so a repeat /link call only reads
-- the row. NULL for a row stored before this column: the next /link call finds them once.
ALTER TABLE shares ADD COLUMN notes TEXT;
