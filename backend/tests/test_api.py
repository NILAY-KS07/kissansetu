from pathlib import Path

import pytest

from app import create_app


@pytest.fixture
def client(tmp_path):
    class TestConfig:
        CORS_ORIGINS = ["*"]
        DATABASE_PATH = str(Path(tmp_path) / "test.sqlite3")
        SESSION_TTL_SECONDS = 3600
        OTP_TTL_SECONDS = 300
        EMAIL_DELIVERY = "console"
        SMTP_HOST = ""
        SMTP_PORT = 587
        SMTP_USERNAME = ""
        SMTP_PASSWORD = ""
        SMTP_FROM = ""
        REDIS_URL = "redis://127.0.0.1:6379/0"
        API_PORT = 5000
        APP_TIMEZONE = "Asia/Kolkata"

    app = create_app(TestConfig)
    app.extensions["event_bus"].ping = lambda: True
    app.extensions["booking_repository"].event_bus = None
    app.extensions["otp_service"]._send = lambda email, code: setattr(app, "test_otp_code", code)
    return app.test_client()


def register_and_verify(client, mobile, email):
    payload = {"name": "Test Farmer", "mobile": mobile, "email": email, "password": "password123", "confirm_password": "password123"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 202
    challenge = response.json["challenge"]["challenge_id"]
    verified = client.post("/api/auth/verify-otp", json={"challenge_id": challenge, "code": client.application.test_otp_code})
    assert verified.status_code == 200
    return payload, verified.json["token"]


def test_health_and_readiness(client):
    assert client.get("/api/health").json["status"] == "ok"
    assert client.get("/api/ping").status_code == 200
    assert client.get("/api/ready").status_code == 200


def test_protected_dashboard_requires_auth(client):
    assert client.get("/api/dashboard").status_code == 401


def test_registration_login_otp_dashboard_and_logout(client):
    payload, token = register_and_verify(client, "9876543210", "test@example.com")
    login = client.post("/api/auth/login", json={"mobile": payload["mobile"], "password": payload["password"]})
    assert login.status_code == 202
    challenge = login.json["challenge"]["challenge_id"]
    verified = client.post("/api/auth/verify-otp", json={"challenge_id": challenge, "code": client.application.test_otp_code})
    assert verified.status_code == 200
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/dashboard", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/dashboard", headers=headers).status_code == 401


def test_booking_conflict_is_atomic(client):
    _, token = register_and_verify(client, "9876543211", "booking@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    booking = {"crop": "wheat", "quantity": 20, "centre_id": "centre-1", "slot_start": "2026-09-03T10:00:00+00:00"}
    created = client.post("/api/bookings", json=booking, headers=headers)
    assert created.status_code == 201
    assert created.json["booking"]["token"].endswith("-001")
    queue = client.get("/api/queue", headers=headers)
    assert queue.status_code == 200
    assert queue.json["your_token"].endswith("-001")
    assert queue.json["estimated_wait_minutes"] == 0
    assert client.post("/api/bookings", json=booking, headers=headers).status_code == 409
