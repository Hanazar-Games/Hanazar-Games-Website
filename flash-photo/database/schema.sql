PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS flash_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL,
    storage_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'opened', 'expired', 'destroyed')),
    created_at INTEGER NOT NULL,
    opened_at INTEGER,
    expires_at INTEGER,
    unused_expires_at INTEGER NOT NULL,
    destroyed_at INTEGER,
    storage_deleted_at INTEGER,
    cleanup_retry_at INTEGER,
    last_access_at INTEGER,
    open_ip_hash TEXT,
    open_user_agent_hash TEXT,
    viewer_hash TEXT,
    access_count INTEGER NOT NULL DEFAULT 0 CHECK (access_count >= 0),
    destroy_reason TEXT,
    view_seconds INTEGER NOT NULL DEFAULT 30 CHECK (view_seconds IN (15, 30, 60)),
    access_mode TEXT NOT NULL DEFAULT 'global' CHECK (access_mode IN ('global', 'first')),
    UNIQUE (storage_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flash_images_token_hash ON flash_images(token_hash);
CREATE INDEX IF NOT EXISTS idx_flash_images_expires_at ON flash_images(expires_at);
CREATE INDEX IF NOT EXISTS idx_flash_images_unused_expires_at ON flash_images(unused_expires_at);
CREATE INDEX IF NOT EXISTS idx_flash_images_status ON flash_images(status);
CREATE INDEX IF NOT EXISTS idx_flash_images_created_at ON flash_images(created_at);
CREATE INDEX IF NOT EXISTS idx_flash_images_pending_terminal
    ON flash_images(COALESCE(cleanup_retry_at, 0), id)
    WHERE status IN ('expired', 'destroyed') AND storage_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_flash_images_cleanup_unused
    ON flash_images(unused_expires_at, id) WHERE status = 'unused';
CREATE INDEX IF NOT EXISTS idx_flash_images_cleanup_opened
    ON flash_images(expires_at, id) WHERE status = 'opened';

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    admin_id INTEGER,
    flash_id INTEGER,
    created_at INTEGER NOT NULL,
    request_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    FOREIGN KEY (flash_id) REFERENCES flash_images(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_cleanup ON audit_logs(created_at, id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_flash_id ON audit_logs(flash_id);

CREATE INDEX IF NOT EXISTS idx_flash_images_cleanup_retention
    ON flash_images(destroyed_at, id)
    WHERE status IN ('expired', 'destroyed') AND storage_deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS cleanup_queue (
    category TEXT NOT NULL CHECK (category IN (
        'pending', 'rate_limit', 'session_pending', 'session', 'session_delete', 'log'
    )),
    item_name TEXT NOT NULL,
    due_at INTEGER NOT NULL CHECK (due_at > 0),
    updated_at INTEGER NOT NULL CHECK (updated_at > 0),
    PRIMARY KEY (category, item_name)
);

CREATE INDEX IF NOT EXISTS idx_cleanup_queue_due
    ON cleanup_queue(category, due_at, item_name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cleanup_queue_session_reference
    ON cleanup_queue(item_name)
    WHERE category IN ('session_pending', 'session', 'session_delete');

PRAGMA user_version = 1;
