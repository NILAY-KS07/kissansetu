from functools import wraps

from flask import g, jsonify, request

def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header.removeprefix("Bearer ").strip()
        from flask import current_app
        user_id = current_app.extensions["token_service"].identify(token)
        if not user_id:
            return jsonify({"error": "unauthorized", "message": "Authentication required."}), 401
        g.user_id = user_id
        return view(*args, **kwargs)

    return wrapped
