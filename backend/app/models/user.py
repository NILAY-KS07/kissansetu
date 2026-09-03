from dataclasses import dataclass
from datetime import datetime


@dataclass
class User:
    id: str
    name: str
    mobile: str
    password_hash: str
    created_at: str

    @classmethod
    def from_row(cls, row):
        values = dict(row)
        return cls(id=values["id"], name=values["name"], mobile=values["mobile"], password_hash=values["password_hash"], created_at=values["created_at"])

    def public_data(self):
        return {
            "id": self.id,
            "name": self.name,
            "mobile": self.mobile,
            "created_at": self.created_at,
            "role": "farmer",
        }
