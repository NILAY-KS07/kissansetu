from flask import Blueprint, current_app, g, jsonify, request

from ..repositories.booking_repository import BookingConflict
from ..middleware.auth import require_auth
from ..schemas.booking import BookingValidationError, validate_booking


data_bp = Blueprint("data", __name__)


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
        current_app.extensions["event_bus"].ping()
        return jsonify({"status": "ready", "database": "ok", "redis": "ok"})
    except Exception:
        return jsonify({"status": "not_ready"}), 503


@data_bp.get("/dashboard")
@require_auth
def dashboard():
    return jsonify({"stats": {}, "active_booking": None, "recent_activity": []})


@data_bp.get("/bookings")
@require_auth
def bookings():
    items = current_app.extensions["booking_repository"].for_user(g.user_id)
    return jsonify({"items": items})


@data_bp.post("/bookings")
@require_auth
def create_booking():
    try:
        crop, quantity, centre_id, slot_start = validate_booking(request.get_json(silent=True) or {}, current_app.config["APP_TIMEZONE"])
        booking = current_app.extensions["booking_repository"].create(g.user_id, crop, quantity, centre_id, slot_start)
        return jsonify({"booking": booking}), 201
    except BookingValidationError as error:
        return jsonify({"error": "validation_error", "message": str(error)}), 400
    except BookingConflict as error:
        return jsonify({"error": "slot_unavailable", "message": str(error)}), 409


@data_bp.get("/slots")
@require_auth
def slots():
    return jsonify({"items": []})


@data_bp.get("/queue")
@require_auth
def queue():
    snapshot = current_app.extensions["booking_repository"].queue_for_user(g.user_id)
    snapshot["estimated_wait_minutes"] = current_app.extensions["queue_service"].estimate(snapshot["people_ahead"])
    return jsonify(snapshot)


@data_bp.get("/payments")
@require_auth
def payments():
    return jsonify({"summary": {}, "items": []})


@data_bp.get("/payments/<reference>")
@require_auth
def payment_status(reference):
    return jsonify({"error": "provider_unavailable", "message": "Payment provider is not configured.", "reference": reference}), 503


@data_bp.get("/msp-rates")
def msp_rates():
    return jsonify({"error": "provider_unavailable", "message": "MSP provider is not configured."}), 503
