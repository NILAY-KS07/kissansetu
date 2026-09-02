from flask import Blueprint, current_app, jsonify, request

from ..middleware.auth import require_auth
from ..services.otp_service import OtpDeliveryError

from ..schemas.auth import ValidationError, validate_login, validate_registration


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    try:
        name, mobile, email, password = validate_registration(request.get_json(silent=True) or {})
        user = current_app.extensions["auth_service"].register(name, mobile, email, password)
        challenge = current_app.extensions["otp_service"].create_and_send(user.id, user.email)
        return jsonify({"verification_required": True, "challenge": challenge}), 202
    except OtpDeliveryError as error:
        return jsonify({"error": "otp_delivery_unavailable", "message": str(error)}), 503
    except (ValidationError, ValueError) as error:
        return jsonify({"error": "validation_error", "message": str(error)}), 400


@auth_bp.post("/login")
def login():
    try:
        mobile, password = validate_login(request.get_json(silent=True) or {})
        user = current_app.extensions["auth_service"].authenticate(mobile, password)
        challenge = current_app.extensions["otp_service"].create_and_send(user.id, user.email)
        return jsonify({"verification_required": True, "challenge": challenge}), 202
    except OtpDeliveryError as error:
        return jsonify({"error": "otp_delivery_unavailable", "message": str(error)}), 503
    except (ValidationError, ValueError) as error:
        return jsonify({"error": "authentication_error", "message": str(error)}), 401


@auth_bp.post("/verify-otp")
def verify_otp():
    payload = request.get_json(silent=True) or {}
    challenge_id = str(payload.get("challenge_id", "")).strip()
    code = str(payload.get("code", "")).strip()
    if not challenge_id or not code.isdigit() or len(code) != 6:
        return jsonify({"error": "validation_error", "message": "Enter the six-digit verification code."}), 400
    try:
        user = current_app.extensions["otp_service"].verify(challenge_id, code)
        token = current_app.extensions["token_service"].issue(user.id)
        return jsonify({"token": token, "user": user.public_data()})
    except ValueError as error:
        return jsonify({"error": "verification_error", "message": str(error)}), 400


@auth_bp.post("/logout")
@require_auth
def logout():
    header = request.headers.get("Authorization", "")
    token = header.removeprefix("Bearer ").strip()
    current_app.extensions["token_service"].revoke(token)
    return jsonify({"status": "signed_out"})
