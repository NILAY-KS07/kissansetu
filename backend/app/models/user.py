from dataclasses import dataclass
from datetime import datetime


@dataclass
class User:
    id: str
    name: str
    mobile: str
    email: str
    password_hash: str
    created_at: str
    email_verified: int = 0

    @classmethod
    def from_row(cls, row):
        values = dict(row)
        values.setdefault("email", "")
        values.setdefault("email_verified", 0)
        return cls(**values)

    def public_data(self):
        return {
            "id": self.id,
            "name": self.name,
            "mobile": self.mobile,
            "email": self.email,
            "created_at": self.created_at,
            "role": "farmer",
            "email_verified": bool(self.email_verified),
        }
