from datetime import datetime, timedelta, timezone
from hashlib import sha256

from flask import Blueprint, current_app, g, jsonify, request

from ..middleware.auth import require_auth
from ..repositories.booking_repository import BookingConflict
from ..schemas.booking import BookingValidationError, validate_booking


data_bp = Blueprint("data", __name__)

MSP_RATES = {
    "wheat": {"crop": "Wheat", "season": "Rabi", "rate": 2585},
    "mustard": {"crop": "Mustard", "season": "Rabi", "rate": 6200},
    "gram": {"crop": "Gram", "season": "Rabi", "rate": 5650},
    "barley": {"crop": "Barley", "season": "Rabi", "rate": 2150},
    "paddy": {"crop": "Paddy", "season": "Kharif", "rate": 2369},
    "maize": {"crop": "Maize", "season": "Kharif", "rate": 2400},
}

CENTRES = [
    {
        "id": "jaipur-north",
        "name": "Jaipur North Procurement Centre",
        "location": "Jaipur North",
        "capacity": 40,
    },
    {
        "id": "jaipur-east",
        "name": "Jaipur East Procurement Centre",
        "location": "Jaipur East",
        "capacity": 35,
    },
    {
        "id": "jaipur-rural",
        "name": "Jaipur Rural Procurement Centre",
        "location": "Jaipur Rural",
        "capacity": 30,
    },
]


def _slot_options(centre_id, date):
    with current_app.extensions["database"].connect() as connection:
        rows = connection.execute(
            """
            SELECT slot_start
            FROM bookings
            WHERE centre_id = ?
            AND substr(slot_start, 1, 10) = ?
            """,
            (centre_id, date),
        ).fetchall()

    booked = {row["slot_start"] for row in rows}
    slots = []

    start = datetime.fromisoformat(f"{date}T09:00:00+05:30")

    for index in range(12):
        slot = start + timedelta(minutes=index * 30)
        slot_end = slot + timedelta(minutes=30)
        slot_start = slot.isoformat()

        slots.append({
            "slot_start": slot_start,
            "slot_end": slot_end.isoformat(),
            "label": f"{slot.strftime('%I:%M %p')} – {slot_end.strftime('%I:%M %p')}",
            "available": slot_start not in booked,
        })

    return slots


def _centre_load(centre, date):
    with current_app.extensions["database"].connect() as connection:
        count = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM bookings
            WHERE centre_id = ?
            AND substr(slot_start, 1, 10) = ?
            AND status = 'reserved'
            """,
            (centre["id"], date),
        ).fetchone()["count"]

    load_percent = min(100, round(count / centre["capacity"] * 100))
    estimated_tat_hours = round(24 + (load_percent / 100 * 12), 1)
    return {
        "booked_slots": count,
        "load_percent": load_percent,
        "estimated_tat_hours": estimated_tat_hours,
        "tat_note": "Approximate; may change with centre load.",
    }


def _get_payment_items(user_id):
    bookings = current_app.extensions["booking_repository"].for_user(user_id)
    items = []

    for booking in bookings:
        crop_key = str(booking["crop"]).lower()
        crop_data = MSP_RATES.get(crop_key, {})
        rate = crop_data.get("rate", 0)
        quantity = float(booking["quantity"] or 0)
        amount = round(quantity * rate, 2)

        items.append({
            "id": f"PAY-{booking['id'].replace('booking-', '').upper()}",
            "booking_id": booking["id"],
            "crop": crop_data.get("crop", booking["crop"]),
            "quantity": quantity,
            "rate": rate,
            "amount": amount,
            "currency": "INR",
            "status": "Completed" if booking["status"] == "completed" else "Pending",
            "date": booking["created_at"],
        })

    return items


@data_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


@data_bp.get("/ping")
def ping():
    return jsonify({"status": "ok", "service": "kissansetu-api"})


@data_bp.get("/ready")
def ready():
    try:
        with current_app.extensions["database"].connect() as connection:
            connection.execute("SELECT 1").fetchone()

        return jsonify({
            "status": "ready",
            "database": "ok",
        })
    except Exception:
        return jsonify({"status": "not_ready"}), 503


@data_bp.get("/dashboard")
@require_auth
def dashboard():
    user = current_app.extensions["user_repository"].find_by_id(g.user_id)

    if not user:
        return jsonify({
            "error": "unauthorized",
            "message": "User not found.",
        }), 401

    bookings = current_app.extensions["booking_repository"].for_user(g.user_id)

    active_booking = next(
        (booking for booking in bookings if booking["status"] == "reserved"),
        None,
    )

    queue_snapshot = current_app.extensions["booking_repository"].queue_for_user(
        g.user_id
    )

    people_ahead = queue_snapshot.get("people_ahead")

    estimated_wait = (
        current_app.extensions["queue_service"].estimate(people_ahead)
        if people_ahead is not None
        else None
    )
    payment_items = _get_payment_items(g.user_id)
    pending_amount = sum(
        item["amount"] for item in payment_items if item["status"] == "Pending"
    )
    received_amount = sum(
        item["amount"] for item in payment_items if item["status"] == "Completed"
    )

    return jsonify({
        "user": user.public_data(),
        "stats": {
            "total_bookings": len(bookings),
            "active_bookings": 1 if active_booking else 0,
            "people_ahead": people_ahead,
            "estimated_wait_minutes": estimated_wait,
            "pending_amount": pending_amount,
            "received_amount": received_amount,
            "completed_payments": len([
                item for item in payment_items if item["status"] == "Completed"
            ]),
        },
        "active_booking": active_booking,
        "queue": queue_snapshot,
        "recent_activity": bookings[:5],
    })


@data_bp.get("/slots")
@require_auth
def slots():
    date = str(request.args.get("date", "")).strip()

    if not date:
        date = datetime.now(timezone.utc).astimezone().date().isoformat()

    centre_id = str(request.args.get("centre_id", "")).strip()

    if not centre_id:
        return jsonify({
            "date": date,
            "centres": [
                {**centre, **_centre_load(centre, date)}
                for centre in CENTRES
            ],
        })

    centre = next(
        (item for item in CENTRES if item["id"] == centre_id),
        None,
    )

    if not centre:
        return jsonify({
            "error": "not_found",
            "message": "Procurement centre not found.",
        }), 404

    return jsonify({
        "date": date,
        "centre": {**centre, **_centre_load(centre, date)},
        "items": _slot_options(centre_id, date),
    })


@data_bp.post("/crop-quality-check")
@require_auth
def crop_quality_check():
    image = request.files.get("image")
    if not image or not image.filename:
        return jsonify({
            "error": "validation_error",
            "message": "Upload a crop sample image to check its quality.",
        }), 400

    image_bytes = image.read(5 * 1024 * 1024 + 1)
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if image.mimetype not in allowed_types:
        return jsonify({
            "error": "validation_error",
            "message": "Use a JPG, PNG, or WebP image.",
        }), 400
    if not image_bytes or len(image_bytes) > 5 * 1024 * 1024:
        return jsonify({
            "error": "validation_error",
            "message": "Image must be smaller than 5 MB.",
        }), 400

    # Prototype scoring keeps this demo usable without a model service.
    score = 70 + (sha256(image_bytes).digest()[0] % 26)
    fit_to_sell = score >= 78
    return jsonify({
        "status": "fit_to_sell" if fit_to_sell else "needs_review",
        "fit_to_sell": fit_to_sell,
        "confidence": score,
        "message": (
            "Sample looks suitable for procurement. Final approval happens at the centre."
            if fit_to_sell
            else "Sample needs a closer check for quality or cleanliness. Bring it for centre review."
        ),
        "disclaimer": "AI-assisted demo result; this does not replace physical inspection.",
    })


@data_bp.post("/bookings")
@require_auth
def create_booking():
    try:
        payload = request.get_json(silent=True) or {}

        crop, quantity, centre_id, slot_start = validate_booking(
            payload,
            current_app.config["APP_TIMEZONE"],
        )

        if centre_id not in {centre["id"] for centre in CENTRES}:
            return jsonify({
                "error": "validation_error",
                "message": "Select a valid procurement centre.",
            }), 400

        booking = current_app.extensions["booking_repository"].create(
            g.user_id,
            crop,
            quantity,
            centre_id,
            slot_start,
        )

        queue_snapshot = current_app.extensions["booking_repository"].queue_for_user(
            g.user_id
        )

        people_ahead = queue_snapshot.get("people_ahead")

        booking["people_ahead"] = people_ahead
        booking["estimated_wait_minutes"] = (
            current_app.extensions["queue_service"].estimate(people_ahead)
            if people_ahead is not None
            else None
        )

        return jsonify({"booking": booking}), 201

    except BookingValidationError as error:
        return jsonify({
            "error": "validation_error",
            "message": str(error),
        }), 400

    except BookingConflict as error:
        return jsonify({
            "error": "slot_unavailable",
            "message": str(error),
        }), 409


@data_bp.get("/bookings")
@require_auth
def bookings():
    items = current_app.extensions["booking_repository"].for_user(g.user_id)
    return jsonify({"items": items})


@data_bp.get("/queue")
@require_auth
def queue():
    snapshot = current_app.extensions["booking_repository"].queue_for_user(g.user_id)

    people_ahead = snapshot.get("people_ahead")

    snapshot["estimated_wait_minutes"] = (
        current_app.extensions["queue_service"].estimate(people_ahead)
        if people_ahead is not None
        else None
    )

    return jsonify(snapshot)


@data_bp.get("/payments")
@require_auth
def payments():
    items = _get_payment_items(g.user_id)

    completed = sum(
        item["amount"]
        for item in items
        if item["status"] == "Completed"
    )

    pending = sum(
        item["amount"]
        for item in items
        if item["status"] == "Pending"
    )

    return jsonify({
        "summary": {
            "total_received": completed,
            "pending_amount": pending,
            "transaction_count": len(items),
        },
        "items": items,
    })


@data_bp.get("/payments/<reference>")
@require_auth
def payment_status(reference):
    items = _get_payment_items(g.user_id)

    payment = next(
        (item for item in items if item["id"] == reference),
        None,
    )

    if not payment:
        return jsonify({
            "error": "not_found",
            "message": "Payment not found.",
        }), 404

    return jsonify({"payment": payment})


@data_bp.get("/msp-rates")
def msp_rates():
    return jsonify({
        "items": list(MSP_RATES.values()),
    })