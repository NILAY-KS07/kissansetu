import sqlite3
from pathlib import Path


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    crop TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    centre_id TEXT NOT NULL,
    slot_start TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    token_number INTEGER,
    token_label TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(centre_id, slot_start)
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, updated_at DESC);
"""


class Database:
    def __init__(self, path):
        self.path = Path(path)

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = NORMAL")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def initialize(self):
        with self.connect() as connection:
            connection.executescript(SCHEMA)
            user_columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)")}
            if "email" in user_columns:
                connection.execute("PRAGMA foreign_keys = OFF")
                connection.execute("CREATE TABLE users_clean (id TEXT PRIMARY KEY, name TEXT NOT NULL, mobile TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)")
                connection.execute("INSERT INTO users_clean SELECT id, name, mobile, password_hash, created_at FROM users")
                connection.execute("DROP TABLE users")
                connection.execute("ALTER TABLE users_clean RENAME TO users")
                connection.execute("PRAGMA foreign_keys = ON")
            connection.execute("DROP TABLE IF EXISTS otp_challenges")
            booking_columns = {row["name"] for row in connection.execute("PRAGMA table_info(bookings)")}
            if "token_number" not in booking_columns:
                connection.execute("ALTER TABLE bookings ADD COLUMN token_number INTEGER")
            if "token_label" not in booking_columns:
                connection.execute("ALTER TABLE bookings ADD COLUMN token_label TEXT")
            connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_token ON bookings(centre_id, substr(slot_start, 1, 10), token_number)")