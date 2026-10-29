CREATE TABLE IF NOT EXISTS sync_vault (
  owner TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminder_settings (
  owner TEXT PRIMARY KEY,
  quiet_start TEXT NOT NULL DEFAULT '22:00',
  quiet_end TEXT NOT NULL DEFAULT '08:00',
  wording TEXT NOT NULL DEFAULT 'brief',
  privacy_mode INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
