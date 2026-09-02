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
    MSP_PROVIDER = os.getenv("MSP_PROVIDER", "unconfigured")
    PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "unconfigured")
    REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")
    OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    EMAIL_DELIVERY = os.getenv("EMAIL_DELIVERY", "smtp")
