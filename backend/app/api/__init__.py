from .auth import auth_bp
from .data import data_bp
from .profile import profile_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(data_bp, url_prefix="/api")
    app.register_blueprint(profile_bp, url_prefix="/api")