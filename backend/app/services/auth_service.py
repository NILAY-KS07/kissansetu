from datetime import datetime, timezone
from uuid import uuid4

from werkzeug.security import check_password_hash, generate_password_hash

from ..models.user import User


class AuthService:
    def __init__(self, repository):
        self.repository = repository

    def register(self, name, mobile, password):
        if self.repository.find_by_mobile(mobile):
            raise ValueError("An account with this mobile number already exists.")

        user = User(
            id=f"farmer-{uuid4().hex[:12]}",
            name=name,
            mobile=mobile,
            password_hash=generate_password_hash(password),
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        try:
            return self.repository.save(user)
        except Exception as error:
            if "UNIQUE" in str(error).upper():
                raise ValueError("An account with this mobile number already exists.") from error
            raise

    def authenticate(self, mobile, password):
        user = self.repository.find_by_mobile(mobile)

        if not user or not check_password_hash(user.password_hash, password):
            raise ValueError("Invalid mobile number or password.")

        return user

    def get_current_user(self, user_id):
        return self.repository.find_by_id(user_id)