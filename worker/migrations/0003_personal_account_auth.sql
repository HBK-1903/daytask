CREATE TABLE IF NOT EXISTS user_account (
  id TEXT PRIMARY KEY CHECK (id = 'owner'),
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  recovery_salt TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_attempts (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_window ON auth_attempts(window_start);
