<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;
use Throwable;

final class Database
{
    private PDO $pdo;

    public function __construct(private readonly Config $config)
    {
        $this->pdo = new PDO('sqlite:' . $config->databasePath(), options: [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        @chmod($config->databasePath(), 0600);
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->pdo->exec('PRAGMA busy_timeout = 5000');
    }

    public function connection(): PDO
    {
        return $this->pdo;
    }

    public function config(): Config
    {
        return $this->config;
    }

    public function initialize(): void
    {
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        $this->pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    system_role TEXT NOT NULL DEFAULT 'user' CHECK (system_role IN ('user', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    auth_version INTEGER NOT NULL DEFAULT 1,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('dm', 'group')),
    name TEXT,
    dm_user_low INTEGER REFERENCES users(id),
    dm_user_high INTEGER REFERENCES users(id),
    archived_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    last_read_message_id INTEGER REFERENCES messages(id),
    joined_at INTEGER NOT NULL,
    left_at INTEGER
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_user_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT,
    client_nonce TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    entity_id INTEGER,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_presence (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    last_seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS typing_indicators (
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (room_id, user_id)
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    ip_hash TEXT,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ephemeral_shares (
    token_hash TEXT PRIMARY KEY,
    ciphertext TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_dm_pair_unique ON rooms(dm_user_low, dm_user_high) WHERE kind = 'dm';
CREATE INDEX IF NOT EXISTS idx_room_members_active_user ON room_members(user_id, room_id) WHERE left_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_active_owner ON room_members(room_id) WHERE role = 'owner' AND left_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_active_pair ON room_members(room_id, user_id) WHERE left_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_nonce_unique ON messages(sender_user_id, client_nonce);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id, id);
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id, id);
CREATE INDEX IF NOT EXISTS idx_ephemeral_shares_expires_at ON ephemeral_shares(expires_at);
INSERT INTO app_meta (key, value) VALUES ('schema_version', '2') ON CONFLICT(key) DO UPDATE SET value = '2';
INSERT INTO app_meta (key, value) VALUES ('events_floor_id', '0') ON CONFLICT(key) DO NOTHING;
SQL);
    }

    public function immediate(callable $callback): mixed
    {
        $this->pdo->exec('BEGIN IMMEDIATE');
        try {
            $result = $callback($this->pdo);
            $this->pdo->exec('COMMIT');
            return $result;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->exec('ROLLBACK');
            }
            throw $exception;
        }
    }
}
