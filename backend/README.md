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

MSP rates and payment records are intentionally simple prototype data. Booking timestamps are normalized to `APP_TIMEZONE`, which defaults to `Asia/Kolkata`.

MSP rates are hardcoded in `backend/app/api/data.py`; they do not use an external API. The crop image checker currently uses a local demo score. To connect a real provider later, put its key and endpoint in `backend/.env` as `CROP_AI_API_KEY` and `CROP_AI_API_URL`, then add the provider request inside `crop_quality_check()` in `backend/app/api/data.py`. Never put the key in `script.js` or any HTML file.

## Test

```powershell
pytest
```

## Current endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/dashboard`
- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/slots`
- `POST /api/crop-quality-check` (multipart image upload; advisory demo result)
- `GET /api/queue`
- `GET /api/payments`
- `GET /api/msp-rates`
- `POST /api/auth/logout`
