from flask import Blueprint, current_app, g, jsonify, request

from ..middleware.auth import require_auth


profile_bp = Blueprint("profile", __name__)


@profile_bp.get("/profile")
@require_auth
def get_profile():
    user = current_app.extensions["user_repository"].find_by_id(g.user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Profile not found."}), 404
    return jsonify({"user": user.public_data()})


@profile_bp.put("/profile")
@require_auth
def update_profile():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    if len(name) < 2:
        return jsonify({"error": "validation_error", "message": "Name must contain at least 2 characters."}), 400
    user = current_app.extensions["user_repository"].find_by_id(g.user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Profile not found."}), 404
    current_app.extensions["user_repository"].update_name(g.user_id, name)
    user.name = name
    return jsonify({"user": user.public_data()})
