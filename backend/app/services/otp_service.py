import hashlib
import secrets
import smtplib
import time
from email.message import EmailMessage
from uuid import uuid4


class OtpDeliveryError(Exception):
    pass


class OtpService:
    def __init__(self, database, user_repository, config):
        self.database = database
        self.user_repository = user_repository
        self.ttl_seconds = config["OTP_TTL_SECONDS"]
        self.config = config

    def _hash(self, value):
        return hashlib.sha256(value.encode()).hexdigest()

    def create_and_send(self, user_id, email):
        code = f"{secrets.randbelow(1000000):06d}"
        challenge_id = str(uuid4())
        expires_at = int(time.time()) + self.ttl_seconds
        with self.database.connect() as connection:
            connection.execute("UPDATE otp_challenges SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL", (int(time.time()), user_id))
            connection.execute("INSERT INTO otp_challenges(id, user_id, code_hash, expires_at) VALUES (?, ?, ?, ?)", (challenge_id, user_id, self._hash(code), expires_at))
        self._send(email, code)
        return {"challenge_id": challenge_id, "expires_in": self.ttl_seconds}

    def _send(self, email, code):
        if self.config["EMAIL_DELIVERY"] == "console":
            print(f"OTP for {email}: {code}")
            return
        if not self.config["SMTP_HOST"] or not self.config["SMTP_FROM"]:
            raise OtpDeliveryError("Email delivery is not configured.")
        message = EmailMessage()
        message["Subject"] = "Your KissanSetu verification code"
        message["From"] = self.config["SMTP_FROM"]
        message["To"] = email
        message.set_content(f"Your KissanSetu verification code is {code}. It expires in 5 minutes.")
        with smtplib.SMTP(self.config["SMTP_HOST"], self.config["SMTP_PORT"], timeout=10) as server:
            server.starttls()
            if self.config["SMTP_USERNAME"]:
                server.login(self.config["SMTP_USERNAME"], self.config["SMTP_PASSWORD"])
            server.send_message(message)

    def verify(self, challenge_id, code):
        now = int(time.time())
        with self.database.connect() as connection:
            row = connection.execute("SELECT * FROM otp_challenges WHERE id = ? AND expires_at > ? AND consumed_at IS NULL", (challenge_id, now)).fetchone()
            if not row:
                raise ValueError("This verification code has expired or is invalid.")
            if row["attempts"] >= 5:
                raise ValueError("Too many verification attempts.")
            if self._hash(code) != row["code_hash"]:
                connection.execute("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?", (challenge_id,))
                raise ValueError("The verification code is incorrect.")
            connection.execute("UPDATE otp_challenges SET consumed_at = ? WHERE id = ?", (now, challenge_id))
            connection.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (row["user_id"],))
        return self.user_repository.find_by_id(row["user_id"])
