import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ]
    API_PORT = int(os.getenv("API_PORT", "5000"))
    DATABASE_PATH = os.getenv("DATABASE_PATH", "instance/kissansetu.sqlite3")
    SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "86400"))
    APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")
    CROP_AI_API_KEY = os.getenv("CROP_AI_API_KEY", "")
    CROP_AI_API_URL = os.getenv("CROP_AI_API_URL", "")