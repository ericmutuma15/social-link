import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    APP_ENV = os.getenv("FLASK_ENV", "development").lower()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = (
        os.getenv("DATABASE_URL")
        or f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'users.db')}"
    )
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 1800}
    SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY", "dev-only-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_COOKIE_NAME = "access_token"
    JWT_REFRESH_COOKIE_NAME = "refresh_token"
    JWT_COOKIE_HTTPONLY = True
    JWT_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_CSRF_PROTECT = os.getenv("JWT_CSRF_PROTECT", "false").lower() == "true"
    JWT_COOKIE_CSRF_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "30")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "30")))
    MAIL_SERVER = (os.getenv("MAIL_SERVER") or "").strip()
    ALLOWED_EXTENSIONS = {
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
    }
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = (os.getenv("MAIL_USERNAME") or "").strip()
    MAIL_PASSWORD = (os.getenv("MAIL_PASSWORD") or "").strip().replace(" ", "")
    MAIL_DEFAULT_SENDER = (os.getenv("MAIL_DEFAULT_SENDER") or "no-reply@example.com").strip()
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(25 * 1024 * 1024)))
    # Use Redis in production so rate limits are shared across Gunicorn workers.
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True
