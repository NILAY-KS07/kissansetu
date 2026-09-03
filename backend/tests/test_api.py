import pytest

from app import create_app


class TestConfig:
    TESTING = True
    DATABASE_PATH = "instance/test-kissansetu.sqlite3"
    CORS_ORIGINS = ["*"]
    SESSION_TTL_SECONDS = 86400
    APP_TIMEZONE = "Asia/Kolkata"


@pytest.fixture
def app(tmp_path):
    TestConfig.DATABASE_PATH = str(tmp_path / "test-kissansetu.sqlite3")
    return create_app(TestConfig)


@pytest.fixture
def client(app):
    return app.test_client()


def test_ready(client):
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ready"


def test_register_login_dashboard_logout(client):
    registration = client.post(
        "/api/auth/register",
        json={
            "name": "Test Farmer",
            "mobile": "9876543210",
            "password": "TestPassword123",
        },
    )

    assert registration.status_code == 201
    registration_data = registration.get_json()
    assert registration_data["token"]
    assert registration_data["user"]["name"] == "Test Farmer"

    login = client.post(
        "/api/auth/login",
        json={
            "mobile": "9876543210",
            "password": "TestPassword123",
        },
    )

    assert login.status_code == 200
    token = login.get_json()["token"]

    dashboard = client.get(
        "/api/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert dashboard.status_code == 200
    assert dashboard.get_json()["user"]["mobile"] == "9876543210"

    logout = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert logout.status_code == 200
    assert logout.get_json()["status"] == "signed_out"