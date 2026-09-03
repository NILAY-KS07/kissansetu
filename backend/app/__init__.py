from flask import Flask
from flask_cors import CORS

from .config import Config
from .database import Database
from .api import register_blueprints
from .errors import register_error_handlers
from .extensions import configure_extensions


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, origins=app.config["CORS_ORIGINS"])

    database = Database(app.config["DATABASE_PATH"])
    database.initialize()
    app.extensions["database"] = database

    configure_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)

    return app