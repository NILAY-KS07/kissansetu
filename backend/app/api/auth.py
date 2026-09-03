from flask import Blueprint, current_app, jsonify, request

from ..middleware.auth import require_auth
from ..schemas.auth import ValidationError, validate_login, validate_registration


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    try:
        name, mobile, password = validate_registration(request.get_json(silent=True) or {})
        user = current_app.extensions["auth_service"].register(name, mobile, password)
        token = current_app.extensions["token_service"].issue(user.id)
        return jsonify({"token": token, "user": user.public_data()}), 201
    except (ValidationError, ValueError) as error:
        return jsonify({"error": "validation_error", "message": str(error)}), 400


@auth_bp.post("/login")
def login():
    try:
        mobile, password = validate_login(request.get_json(silent=True) or {})
        user = current_app.extensions["auth_service"].authenticate(mobile, password)
        token = current_app.extensions["token_service"].issue(user.id)
        return jsonify({"token": token, "user": user.public_data()})
    except (ValidationError, ValueError) as error:
        return jsonify({"error": "authentication_error", "message": str(error)}), 401


@auth_bp.post("/logout")
@require_auth
def logout():
    header = request.headers.get("Authorization", "")
    token = header.removeprefix("Bearer ").strip()
    current_app.extensions["token_service"].revoke(token)
    return jsonify({"status": "signed_out"})