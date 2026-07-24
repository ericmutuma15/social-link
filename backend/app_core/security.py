"""Authentication, validation, and response helpers.

These helpers deliberately keep legacy endpoints operational while moving new
credentials to bcrypt and providing a controlled legacy-hash upgrade path.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any

import bcrypt
from flask import current_app, request
from flask_mail import Message as MailMessage
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def api_response(data: Any = None, message: str = "OK", status: int = 200, errors: list[str] | None = None):
    """Return the standard API envelope without forcing legacy endpoints to change."""
    from flask import jsonify
    return jsonify({"success": status < 400, "message": message, "data": data, "errors": errors or []}), status


def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.fullmatch((email or "").strip().lower()))


def validate_password(password: str) -> list[str]:
    errors: list[str] = []
    if len(password or "") < 12: errors.append("Password must contain at least 12 characters.")
    if not re.search(r"[A-Z]", password or ""): errors.append("Password must include an uppercase letter.")
    if not re.search(r"[a-z]", password or ""): errors.append("Password must include a lowercase letter.")
    if not re.search(r"\d", password or ""): errors.append("Password must include a number.")
    if not re.search(r"[^\w\s]", password or ""): errors.append("Password must include a symbol.")
    return errors


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(user: Any, password: str) -> bool:
    """Verify bcrypt first, then transparently upgrade an existing Werkzeug hash."""
    stored = getattr(user, "password_hash", None)
    if stored:
        try:
            if bcrypt.checkpw(password.encode(), stored.encode()):
                return True
        except (ValueError, TypeError):
            pass  # Fall through to legacy check if bcrypt hash is invalid
    
    # Fall back to legacy Werkzeug hash for backward compatibility
    legacy = getattr(user, "password", None)
    if legacy and check_password_hash(legacy, password):
        # Upgrade to bcrypt for future logins
        user.password_hash = hash_password(password)
        return True
    
    return False


def token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="mbogi-account-tokens")


def make_account_token(user_id: int, purpose: str) -> str:
    return token_serializer().dumps({"user_id": user_id, "purpose": purpose})


def read_account_token(token: str, purpose: str, max_age: int) -> int | None:
    try:
        payload = token_serializer().loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None
    return payload.get("user_id") if payload.get("purpose") == purpose else None


def client_metadata() -> dict[str, str | None]:
    return {"ip_address": request.headers.get("X-Forwarded-For", request.remote_addr), "user_agent": request.user_agent.string[:500]}


def send_account_email(subject: str, recipient: str, body: str) -> bool:
    """Send mail when configured; log safely in local development otherwise."""
    mail = current_app.extensions.get("mail")
    if mail and current_app.config.get("MAIL_SERVER"):
        try:
            message = MailMessage(subject=subject, recipients=[recipient], body=body)
            message.sender = current_app.config.get("MAIL_DEFAULT_SENDER")
            mail.send(message)
            return True
        except Exception:
            current_app.logger.exception("Account email delivery failed for %s", recipient)
            return False

    current_app.logger.info("Account email prepared for %s: %s", recipient, subject)
    return True
