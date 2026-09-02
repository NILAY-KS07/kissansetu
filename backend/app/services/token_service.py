import hashlib
import secrets
import time


class TokenService:
    def __init__(self, database, ttl_seconds):
        self.database = database
        self.ttl_seconds = ttl_seconds

    def _hash(self, token):
        return hashlib.sha256(token.encode()).hexdigest()

    def issue(self, user_id):
        token = secrets.token_urlsafe(32)
        expires_at = int(time.time()) + self.ttl_seconds
        with self.database.connect() as connection:
            connection.execute("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)", (self._hash(token), user_id, expires_at))
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
        return token

    def identify(self, token):
        if not token:
            return None
        with self.database.connect() as connection:
            row = connection.execute("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?", (self._hash(token), int(time.time()))).fetchone()
        return row["user_id"] if row else None

    def revoke(self, token):
        with self.database.connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (self._hash(token),))
