from flask import Flask
from flask_cors import CORS
from flask_sock import Sock

from .config import Config
from .api import register_blueprints
from .api.realtime import register_socket
from .errors import register_error_handlers
from .database import Database
from .extensions import configure_extensions


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app, origins=app.config["CORS_ORIGINS"])
    app.extensions["database"] = Database(app.config["DATABASE_PATH"])
    app.extensions["database"].initialize()
    configure_extensions(app)
    sock = Sock(app)
    register_socket(sock)
    register_blueprints(app)
    register_error_handlers(app)
    return app
