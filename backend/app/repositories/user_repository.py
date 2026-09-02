from typing import Optional

from ..models.user import User


class UserRepository:
    def __init__(self, database):
        self.database = database

    def find_by_mobile(self, mobile: str) -> Optional[User]:
        with self.database.connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE mobile = ?", (mobile,)).fetchone()
        return User.from_row(row) if row else None

    def find_by_email(self, email: str) -> Optional[User]:
        with self.database.connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return User.from_row(row) if row else None

    def find_by_id(self, user_id: str) -> Optional[User]:
        with self.database.connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return User.from_row(row) if row else None

    def save(self, user: User) -> User:
        with self.database.connect() as connection:
            connection.execute("INSERT INTO users(id, name, mobile, email, password_hash, created_at, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)", (user.id, user.name, user.mobile, user.email, user.password_hash, user.created_at, user.email_verified))
        return user

    def update_name(self, user_id: str, name: str):
        with self.database.connect() as connection:
            connection.execute("UPDATE users SET name = ? WHERE id = ?", (name, user_id))

    def mark_email_verified(self, user_id: str):
        with self.database.connect() as connection:
            connection.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (user_id,))
