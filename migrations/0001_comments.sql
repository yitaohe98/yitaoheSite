CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL
    CHECK (length(display_name) BETWEEN 1 AND 40),
  body TEXT NOT NULL
    CHECK (length(body) BETWEEN 1 AND 200),
  status TEXT NOT NULL
    CHECK (status IN ('approved', 'pending', 'hidden')),
  moderation_result TEXT NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 0
    CHECK (needs_review IN (0, 1)),
  moderation_model TEXT,
  created_at INTEGER NOT NULL,
  moderated_at INTEGER,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS comments_public_feed_idx
  ON comments (status, deleted_at, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS comment_rate_limits (
  identity_hash TEXT NOT NULL,
  minute_bucket INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (identity_hash, minute_bucket)
);

CREATE INDEX IF NOT EXISTS comment_rate_limits_created_at_idx
  ON comment_rate_limits (created_at);
