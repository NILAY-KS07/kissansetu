# KissanSetu Backend

Basic Flask API for the farmer procurement portal. The current storage and token service are in memory so the app can be replaced with a database and production authentication later without moving route logic into one large file.

## Setup

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

## Run

```powershell
py run.py
```

The API runs at `http://127.0.0.1:5000`. The existing frontend already targets `http://127.0.0.1:5000/api`.

The configured MSP and payment providers intentionally return `503` until real provider URLs and credentials are configured. This prevents the application from presenting fabricated rates or payment states.

Set `REDIS_URL` to a reachable Redis instance for queue pub/sub and WebSocket broadcasts. Set `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM` for real email OTP delivery. Booking timestamps are normalized to `APP_TIMEZONE`, which defaults to `Asia/Kolkata`.

## Test

```powershell
pytest
```

## Current endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-otp`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/dashboard`
- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/slots`
- `GET /api/queue`
- `GET /api/payments`
- `GET /api/msp-rates`
- `POST /api/auth/logout`
- `WebSocket /api/ws/queue`

The queue socket expects the bearer token as its first message and sends an initial queue snapshot. Queue state broadcasts should be connected to the queue service when operator actions are added.