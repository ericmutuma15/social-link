import os
import json
import secrets
import hashlib
import logging
import urllib.parse
import urllib.request
import uuid

from datetime import datetime, timedelta

from flask import (
    Flask,
    Blueprint,
    request,
    jsonify,
    redirect,
    make_response,
    send_from_directory,
    session,
    url_for,
)

from flask_socketio import SocketIO, join_room, leave_room
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from flask_migrate import Migrate
from flask_mail import Mail
from flask_login import current_user, login_required
from flask_jwt_extended import (
    JWTManager,
    jwt_required,
    get_jwt_identity as _get_jwt_identity,
    create_access_token as _create_access_token,
    create_refresh_token as _create_refresh_token,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
    get_jwt,
)

from werkzeug.security import generate_password_hash

from werkzeug.utils import secure_filename

from sqlalchemy.orm import joinedload, aliased
from sqlalchemy import case, inspect

from itsdangerous import URLSafeTimedSerializer

from config import Config
from app_core.security import (
    api_response,
    client_metadata,
    hash_password,
    make_account_token,
    read_account_token,
    send_account_email,
    validate_email,
    validate_password,
    verify_password,
)

logging.basicConfig(level=logging.INFO)

app = Flask(__name__, static_folder="static")
app.config.from_object(Config)
Talisman(
    app,
    force_https=app.config.get("APP_ENV") == "production",
    strict_transport_security=app.config.get("APP_ENV") == "production",
    content_security_policy={"default-src": ["'self'"], "img-src": ["'self'", "data:", "https:"], "media-src": ["'self'", "https:"], "connect-src": ["'self'", *os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]},
)
limiter = Limiter(key_func=get_remote_address, app=app, default_limits=["300 per hour"])

# Enable Cross-Origin Resource Sharing for React frontend
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,https://desire-link-app.vercel.app,https://mbogi-link.vercel.app",
).split(",")

CORS(
    app,
    resources={r"/*": {"origins": allowed_origins}},
    supports_credentials=True,
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-CSRF-TOKEN",
    ],
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    send_wildcard=False,
)
# Allow SocketIO connections from approved origins as well
socketio = SocketIO(app, cors_allowed_origins=allowed_origins)
messages_bp = Blueprint('messages', __name__)

# JWT Configuration
jwt_secret = os.getenv("JWT_SECRET_KEY")

if not jwt_secret:
    if os.getenv("FLASK_ENV") == "production":
        raise RuntimeError("JWT_SECRET_KEY is missing.")
    jwt_secret = "dev-secret-key"

app.config["JWT_SECRET_KEY"] = jwt_secret

app.config["JWT_TOKEN_LOCATION"] = ["cookies"]

app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token"
app.config["JWT_REFRESH_COOKIE_NAME"] = "refresh_token"

# JWT Cookie Configuration

app.config["JWT_COOKIE_HTTPONLY"] = True
app.config["JWT_COOKIE_CSRF_PROTECT"] = False

if app.config["APP_ENV"] != "production":
    # Local development
    app.config["JWT_COOKIE_SECURE"] = False
    app.config["JWT_COOKIE_SAMESITE"] = "Lax"
else:
    # Production (Render)
    app.config["JWT_COOKIE_SECURE"] = True
    app.config["JWT_COOKIE_SAMESITE"] = "None"

app.config["JWT_ACCESS_COOKIE_PATH"] = "/"
app.config["JWT_REFRESH_COOKIE_PATH"] = "/"

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "30")))
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

app.config["GOOGLE_CLIENT_ID"] = os.getenv("GOOGLE_CLIENT_ID")

app.config["GITHUB_CLIENT_ID"] = os.getenv("GITHUB_CLIENT_ID")
app.config["GITHUB_CLIENT_SECRET"] = os.getenv("GITHUB_CLIENT_SECRET")

app.config["GITHUB_CALLBACK_URL"] = os.getenv(
    "GITHUB_CALLBACK_URL",
    "http://localhost:5555/api/github-callback",
)

app.config["FRONTEND_URL"] = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

app.config["UPLOAD_FOLDER"] = os.path.join(app.root_path, "static", "uploads")
app.config["ALLOWED_EXTENSIONS"] = {"png", "jpg", "jpeg", "gif", "webp", "avif", "mp4", "webm", "mov", "mp3", "wav", "m4a", "ogg", "pdf", "doc", "docx", "txt"}
UPLOAD_MIME_PREFIXES = ("image/", "video/", "audio/")
UPLOAD_MIME_TYPES = {"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"}

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


@app.errorhandler(413)
def upload_too_large(_error):
    return api_response(message="Maximum upload size is 20 MB.", status=413)

# Initialize extensions
# `db` is created uninitialized in `models.py` to avoid circular imports; import it and init with the app.
from models import (
    db,
    User,
    Message,
    FriendRequest,
    Friendship,
    Post,
    Like,
    Comment,
    Notification,
    Bookmark,
    Community,
    CommunityMember,
    Story,
    TokenBlocklist,
    AuditLog,
)

db.init_app(app)

mail = Mail(app)

migrate = Migrate(app, db)

jwt = JWTManager(app)


def create_access_token(identity, **kwargs):
    return _create_access_token(identity=str(identity), **kwargs)


def create_refresh_token(identity, **kwargs):
    return _create_refresh_token(identity=str(identity), **kwargs)


def get_jwt_identity():
    identity = _get_jwt_identity()
    if identity is None:
        return None
    # Always attempt to convert to int for database comparison
    if isinstance(identity, int):
        return identity
    try:
        return int(str(identity).strip())
    except (TypeError, ValueError):
        return identity


def ensure_default_user():
    """Create a usable local admin account for fresh installs and resets."""
    default_email = (os.getenv("DEFAULT_ADMIN_EMAIL") or "admin@mbogi.dev").strip().lower()
    default_password = os.getenv("DEFAULT_ADMIN_PASSWORD") or "Admin123!"

    user = User.query.filter_by(email=default_email).first()
    if user:
        if not user.is_verified:
            user.is_verified = True
        if not user.password_hash:
            user.password_hash = hash_password(default_password)
        if not user.password:
            user.password = generate_password_hash(default_password)
        if not user.is_super_user:
            user.is_super_user = True
        if user.role != "Admin":
            user.role = "Admin"
        db.session.commit()
        return user

    new_user = User(
        name="Admin",
        email=default_email,
        password=generate_password_hash(default_password),
        password_hash=hash_password(default_password),
        username="admin",
        is_super_user=True,
        role="Admin",
        is_verified=True,
        status="active",
    )
    db.session.add(new_user)
    db.session.commit()
    return new_user


def create_or_get_oauth_user(email, name):
    """Create or reuse a verified user account for OAuth sign-ins."""
    normalized_email = (email or "").strip().lower()
    user = User.query.filter_by(email=normalized_email).first()
    if user:
        user.is_verified = True
        if not user.name and name:
            user.name = name
        db.session.commit()
        return user

    random_password = secrets.token_urlsafe(16)
    user = User(
        name=name or normalized_email.split("@")[0],
        email=normalized_email,
        password=generate_password_hash(random_password, method="pbkdf2:sha256"),
        password_hash=hash_password(random_password),
        is_verified=True,
        status="active",
    )
    db.session.add(user)
    db.session.commit()
    return user


with app.app_context():
    db.create_all()
    ensure_default_user()


def audit(action, user_id=None, **metadata):
    """Best-effort audit trail: a failed log write must never break a request."""
    try:
        # Existing installations remain usable until the additive migration is
        # deployed; audit records begin automatically once the table exists.
        if not inspect(db.engine).has_table("audit_logs"):
            return
        details = client_metadata()
        db.session.add(AuditLog(user_id=user_id, action=action, metadata_json=metadata, **details))
    except Exception:
        app.logger.exception("Could not record audit event: %s", action)


@jwt.token_in_blocklist_loader
def token_is_revoked(_jwt_header, jwt_payload):
    return TokenBlocklist.query.filter_by(jti=jwt_payload["jti"]).first() is not None


@jwt.revoked_token_loader
def revoked_token(_jwt_header, _jwt_payload):
    return api_response(message="Session has ended. Please sign in again.", status=401)


@jwt.unauthorized_loader
def unauthorized(error):
    return api_response(message="Authentication required", status=401, errors=[error])


@jwt.invalid_token_loader
def invalid_token(error):
    request_path = request.path if request else ""
    if request_path == "/api/session":
        return jsonify({"success": True, "message": "No active session", "data": {"authenticated": False}, "errors": []}), 200
    return api_response(message="Invalid token", status=422, errors=[error])


@jwt.expired_token_loader
def expired(jwt_header, jwt_payload):
    response = jsonify({"success": False, "message": "Token expired", "data": None, "errors": []})

    unset_jwt_cookies(response)

    return response, 401

messages_bp = Blueprint("messages", __name__)

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-CSRF-TOKEN"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return response

# Serializer for secure tokens
serializer = URLSafeTimedSerializer(app.config["JWT_SECRET_KEY"])

# models have already been imported and `db` initialized above

# Utility to check file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def validate_upload(file):
    """Return a friendly validation error, or None for a supported upload."""
    if not file or not file.filename:
        return "Choose a file to upload."
    if not allowed_file(file.filename):
        return "This file format isn't supported."
    mime = (file.mimetype or "").lower()
    if mime and not (mime.startswith(UPLOAD_MIME_PREFIXES) or mime in UPLOAD_MIME_TYPES):
        return "This file format isn't supported."
    return None


def media_type_for(filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext in {"jpg", "jpeg", "png", "gif", "webp", "avif"}:
        return "image"
    if ext in {"mp4", "webm", "mov"}:
        return "video"
    if ext in {"mp3", "wav", "m4a", "ogg"}:
        return "audio"
    return "document"


def public_media_url(path):
    if not path:
        return None
    if path.startswith(('http://', 'https://')):
        return path
    return f"{request.host_url.rstrip('/')}/{path.lstrip('/')}"


def public_profile_url(picture):
    return public_media_url(f"/static/{picture}") if picture else None


def serialize_comment(comment, current_user_id=None):
    return {
        "id": comment.id,
        "content": comment.content,
        "user_id": comment.user_id,
        "user_name": comment.user.name if comment.user else "Unknown",
        "user_photo": public_profile_url(comment.user.picture if comment.user else None),
        "timestamp": comment.timestamp.isoformat(),
        "is_owner": comment.user_id == current_user_id,
    }


def serialize_post(post, current_user_id=None, include_comments=True):
    comments = [serialize_comment(comment, current_user_id) for comment in post.comments] if include_comments else []
    return {
        "id": post.id,
        "user_id": post.user_id,
        "user_name": post.user.name if post.user else "Unknown",
        "user_photo": public_profile_url(post.user.picture if post.user else None),
        "content": post.content,
        "media_url": public_media_url(post.media_url),
        "timestamp": post.timestamp.isoformat(),
        "likes": post.like_count(),
        "liked": bool(current_user_id and Like.query.filter_by(post_id=post.id, user_id=current_user_id).first()),
        "bookmarked": bool(current_user_id and Bookmark.query.filter_by(post_id=post.id, user_id=current_user_id).first()),
        "is_owner": post.user_id == current_user_id,
        "comments": comments,
    }

# Routes
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    file_path = os.path.join(app.static_folder, path)

    if path != "" and os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    
    # fallback for React Router
    return send_from_directory(app.static_folder, "index.html")

from flask_jwt_extended import verify_jwt_in_request

@app.route("/api/debug-jwt")
def debug_jwt():
    try:
        verify_jwt_in_request()
        return {
            "valid": True,
            "identity": get_jwt_identity()
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }, 401


@app.route("/api/session", methods=["GET"])
@jwt_required(optional=True)
def session_status():
    """Quiet SPA session probe; an anonymous visitor is an expected state."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id) if user_id else None
    authenticated = bool(user and not user.deleted_at)
    return jsonify({
        "success": True,
        "message": "Active session" if authenticated else "No active session",
        "data": {"authenticated": authenticated},
        "errors": [],
    })

# Refresh token endpoint
@app.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_token = create_access_token(identity=current_user)
    response = jsonify({"success": True, "message": "Token refreshed", "data": None, "errors": []})
    set_access_cookies(response, new_token)
    return response


import traceback

@app.route("/api/register", methods=["POST"])
@limiter.limit("5 per hour")
def register():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    errors = ([] if name else ["Name is required."]) + ([] if validate_email(email) else ["Enter a valid email address."]) + validate_password(password)
    if errors:
        return api_response(message="Registration validation failed", status=422, errors=errors)

    if User.query.filter_by(email=email).first():
        return api_response(message="Email already registered", status=409)

    is_super_user = email == "ericmutuma15@gmail.com"

    new_user = User(
        name=name,
        email=email,
        # Keep the legacy column populated until its planned removal migration.
        password=generate_password_hash(password),
        password_hash=hash_password(password),
        is_super_user=is_super_user,
    )

    try:
        db.session.add(new_user)
        db.session.flush()
        can_send_mail = bool(app.config.get("MAIL_SERVER") and app.config.get("MAIL_SERVER").strip())
        if can_send_mail:
            token = make_account_token(new_user.id, "verify")
            new_user.verification_token = hashlib.sha256(token.encode()).hexdigest()
            new_user.verification_sent_at = datetime.utcnow()
            verify_url = f"{app.config['FRONTEND_URL'].rstrip('/')}/verify-email?token={token}"
            if not send_account_email("Verify your Mbogi account", email, f"Verify your email within 24 hours: {verify_url}"):
                app.logger.warning("Verification email could not be delivered for %s", email)
                new_user.is_verified = False
            else:
                new_user.is_verified = False
        else:
            new_user.is_verified = True
            new_user.verification_token = None
            new_user.verification_sent_at = None
        db.session.commit()
        audit("auth.register", new_user.id)
        db.session.commit()
        if new_user.is_verified:
            return api_response({"email": email}, "Account created successfully. You can sign in right away.", 201)
        return api_response({"email": email}, "Account created. Please verify your email before logging in.", 201)

    except Exception as e:
        db.session.rollback()

        app.logger.exception("Registration failed")

        return api_response(message="Registration failed", status=500)


import logging

# Enable logging for debugging
logging.basicConfig(level=logging.DEBUG)

@app.route("/api/login", methods=["POST"])
@limiter.limit("10 per 15 minutes")
def login():
    data = request.get_json(silent=True) or {}
    form_data = request.form or {}

    # Accept both JSON and form submissions for compatibility.
    email = data.get("email") or form_data.get("email") or data.get("username") or form_data.get("username")
    password = data.get("password") or form_data.get("password")
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    normalized_email = (email or "").strip().lower()

    # Retrieve the user
    user = User.query.filter_by(email=normalized_email).first()
    if not user:
        default_email = (os.getenv("DEFAULT_ADMIN_EMAIL") or "admin@mbogi.dev").strip().lower()
        if normalized_email == default_email and password == (os.getenv("DEFAULT_ADMIN_PASSWORD") or "Admin123!"):
            user = ensure_default_user()

    password_valid = bool(user and not user.deleted_at and verify_password(user, password))
    if not password_valid:
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.account_locked_until = datetime.utcnow() + timedelta(minutes=15)
        audit("auth.login_failed", user.id if user else None, email=email)
        db.session.commit()
        return api_response(message="Invalid email or password", status=401)
    if user.account_locked_until and user.account_locked_until > datetime.utcnow():
        return api_response(message="Account temporarily locked. Try again later.", status=423)
    if not user.is_verified:
        return api_response(message="Please verify your email before logging in.", status=403)

    # Generate access and refresh tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    # Set cookies with proper properties using app config
    user.failed_login_attempts = 0
    user.last_login = user.last_active = datetime.utcnow()
    audit("auth.login", user.id)
    db.session.commit()
    response = jsonify({"success": True, "message": "Login successful", "data": {"user_id": user.id}, "errors": []})
    set_access_cookies(response, access_token, max_age=timedelta(hours=1))
    set_refresh_cookies(response, refresh_token, max_age=timedelta(days=30))

    return response, 200


@app.route("/api/verify-email", methods=["POST"])
@limiter.limit("10 per hour")
def verify_email():
    token = (request.get_json(silent=True) or {}).get("token", "")
    user_id = read_account_token(token, "verify", 24 * 60 * 60)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    user = User.query.get(user_id) if user_id else None
    if not user or not user.verification_token or not secrets.compare_digest(user.verification_token, token_hash):
        return api_response(message="Verification link is invalid or expired.", status=400)
    user.is_verified = True
    user.verification_token = None
    audit("auth.email_verified", user.id)
    db.session.commit()
    return api_response(message="Email verified. You can now sign in.")


@app.route("/api/resend-verification", methods=["POST"])
@limiter.limit("3 per hour")
def resend_verification():
    email = ((request.get_json(silent=True) or {}).get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if user and not user.is_verified:
        token = make_account_token(user.id, "verify")
        user.verification_token = hashlib.sha256(token.encode()).hexdigest()
        user.verification_sent_at = datetime.utcnow()
        if not send_account_email("Verify your Mbogi account", email, f"Verify your email within 24 hours: {app.config['FRONTEND_URL'].rstrip('/')}/verify-email?token={token}"):
            app.logger.warning("Verification email could not be delivered for %s", email)
        audit("auth.verification_resent", user.id)
        db.session.commit()
    return api_response(message="If that account needs verification, we sent a new link.")


@app.route("/api/forgot-password", methods=["POST"])
@limiter.limit("3 per hour")
def forgot_password():
    email = ((request.get_json(silent=True) or {}).get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if user and not user.deleted_at:
        token = make_account_token(user.id, "reset")
        user.reset_token = hashlib.sha256(token.encode()).hexdigest()
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        if not send_account_email("Reset your Mbogi password", email, f"Reset your password within one hour: {app.config['FRONTEND_URL'].rstrip('/')}/reset-password?token={token}"):
            app.logger.warning("Password reset email could not be delivered for %s", email)
        audit("auth.password_reset_requested", user.id)
        db.session.commit()
    return api_response(message="If an account exists, a password reset link has been sent.")


@app.route("/api/reset-password", methods=["POST"])
@limiter.limit("5 per hour")
def reset_password():
    data = request.get_json(silent=True) or {}
    token, password = data.get("token", ""), data.get("password", "")
    errors = validate_password(password)
    user_id = read_account_token(token, "reset", 60 * 60)
    user = User.query.get(user_id) if user_id else None
    if errors:
        return api_response(message="Password validation failed", status=422, errors=errors)
    if not user or not user.reset_token or user.reset_token_expiry < datetime.utcnow() or not secrets.compare_digest(user.reset_token, hashlib.sha256(token.encode()).hexdigest()):
        return api_response(message="Reset link is invalid or expired.", status=400)
    user.password_hash = hash_password(password)
    user.password = generate_password_hash(password)
    user.reset_token = None
    user.reset_token_expiry = None
    audit("auth.password_reset", user.id)
    db.session.commit()
    return api_response(message="Password updated. You can now sign in.")

def verify_google_id_token(id_token):
    token_info_url = "https://oauth2.googleapis.com/tokeninfo"
    params = urllib.parse.urlencode({"id_token": id_token})
    url = f"{token_info_url}?{params}"

    expected_client_id = app.config.get("GOOGLE_CLIENT_ID")
    if not expected_client_id:
        app.logger.error("GOOGLE_CLIENT_ID is not configured")
        return None

    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
    except Exception as error:
        app.logger.error(f"Google token verification failed: {error}")
        return None

    if data.get("aud") != expected_client_id:
        app.logger.error("Google token audience mismatch")
        return None

    if data.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
        app.logger.error("Google token issuer invalid")
        return None

    email_verified = data.get("email_verified")
    if email_verified is not True and str(email_verified).lower() != "true":
        app.logger.error("Google email not verified")
        return None

    return data


@app.route("/api/google-login", methods=["POST"])
def google_login():
    data = request.get_json()
    id_token = data.get("id_token")

    if not id_token:
        return jsonify({"message": "Google ID token is required"}), 400

    token_data = verify_google_id_token(id_token)
    if not token_data:
        return jsonify({"message": "Invalid Google ID token"}), 401

    email = token_data.get("email")
    if not email:
        return jsonify({"message": "Google ID token missing email"}), 400

    user = create_or_get_oauth_user(email, email.split("@", 1)[0])

    user.is_verified = True
    user.last_login = user.last_active = datetime.utcnow()
    db.session.commit()
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    response = jsonify({"message": "Login successful"})
    set_access_cookies(response, access_token, max_age=timedelta(hours=1))
    set_refresh_cookies(response, refresh_token, max_age=timedelta(days=30))

    return response, 200


@app.route("/api/github-login", methods=["GET"])
def github_login():
    client_id = app.config.get("GITHUB_CLIENT_ID")
    callback_url = app.config.get("GITHUB_CALLBACK_URL")

    if not client_id or not callback_url:
        return jsonify({"message": "GitHub OAuth not configured"}), 500

    state = secrets.token_urlsafe(32)
    session["github_oauth_state"] = state
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": callback_url,
        "scope": "user:email",
        "allow_signup": "true",
        "state": state,
    })
    return redirect(f"https://github.com/login/oauth/authorize?{params}")


def exchange_github_code(code):
    token_url = "https://github.com/login/oauth/access_token"
    data = urllib.parse.urlencode({
        "client_id": app.config.get("GITHUB_CLIENT_ID"),
        "client_secret": app.config.get("GITHUB_CLIENT_SECRET"),
        "code": code,
        "redirect_uri": app.config.get("GITHUB_CALLBACK_URL"),
    }).encode("utf-8")

    request_obj = urllib.request.Request(
        token_url,
        data=data,
        headers={"Accept": "application/json"},
    )

    try:
        with urllib.request.urlopen(request_obj) as resp:
            return json.loads(resp.read().decode())
    except Exception as error:
        app.logger.error(f"GitHub token exchange failed: {error}")
        return None


def get_github_user_info(access_token):
    if not access_token:
        return None

    user_request = urllib.request.Request(
        "https://api.github.com/user",
        headers={
            "Authorization": f"token {access_token}",
            "User-Agent": "social-app",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(user_request) as resp:
            profile = json.loads(resp.read().decode())
    except Exception as error:
        app.logger.error(f"GitHub user profile fetch failed: {error}")
        return None

    email = profile.get("email")
    if not email:
        emails_request = urllib.request.Request(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"token {access_token}",
                "User-Agent": "social-app",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(emails_request) as resp:
                emails = json.loads(resp.read().decode())
                for item in emails:
                    if item.get("primary") and item.get("verified"):
                        email = item.get("email")
                        break
        except Exception as error:
            app.logger.error(f"GitHub email fetch failed: {error}")
            return None

    if not email:
        app.logger.error("No verified GitHub email available")
        return None

    return {
        "email": email,
        "name": profile.get("name") or profile.get("login"),
        "login": profile.get("login"),
    }


@app.route("/api/github-callback", methods=["GET"])
def github_callback():
    code = request.args.get("code")
    returned_state = request.args.get("state")
    expected_state = session.pop("github_oauth_state", None)
    if not code or not expected_state or not secrets.compare_digest(returned_state or "", expected_state):
        audit("auth.github_callback_rejected", reason="missing_or_invalid_state")
        db.session.commit()
        return api_response(message="GitHub authorization could not be verified. Please try again.", status=400)
    token_data = exchange_github_code(code)
    if not token_data or not token_data.get("access_token"):
        return jsonify({"message": "GitHub token exchange failed"}), 401

    github_data = get_github_user_info(token_data.get("access_token"))
    if not github_data:
        return jsonify({"message": "Unable to retrieve GitHub profile"}), 401

    email = github_data.get("email")
    user = create_or_get_oauth_user(email, github_data.get("name") or github_data.get("login") or email.split("@", 1)[0])

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    response = make_response(redirect(app.config.get("FRONTEND_URL") + "/home"))
    set_access_cookies(response, access_token, max_age=timedelta(hours=1))
    set_refresh_cookies(response, refresh_token, max_age=timedelta(days=30))
    return response


@app.route("/api/logout", methods=["POST"])
@jwt_required(optional=True)
def logout():
    jwt_data = get_jwt()
    if jwt_data:
        db.session.add(TokenBlocklist(
            jti=jwt_data["jti"], user_id=get_jwt_identity(), token_type=jwt_data.get("type", "access"),
            expires_at=datetime.fromtimestamp(jwt_data["exp"]),
        ))
        audit("auth.logout", get_jwt_identity())
        db.session.commit()
    response = jsonify({"success": True, "message": "Logout successful", "data": None, "errors": []})
    unset_jwt_cookies(response)
    return response, 200



#serve images

@app.route('/static/<filename>')
def serve_image(filename):
    return send_from_directory(os.path.join(app.root_path, 'static/images'), filename)

@app.route('/<filename>')
def static_files(filename):
    return send_from_directory(os.path.join(app.root_path, 'static/uploads'), filename)

@app.route('/static/sidebar_images/<filename>')
def serve_sidebar_image(filename):
    return send_from_directory(os.path.join(app.root_path, 'static/sidebar_images'), filename)

@app.route("/api/token", methods=["GET"])
@jwt_required(refresh=True)
def refresh_token():
    identity = get_jwt_identity()

    access_token = create_access_token(identity=identity)

    response = jsonify({"message": "Token refreshed"})

    set_access_cookies(response, access_token)

    return response

@app.route("/api/users", methods=["GET"])
@jwt_required()
def get_users():
    try:
        current_user_id = get_jwt_identity()

        # Get friend IDs in both directions (since friendships are mutual)
        friend_ids_query1 = db.session.query(Friendship.friend_id).filter(Friendship.user_id == current_user_id)
        friend_ids_query2 = db.session.query(Friendship.user_id).filter(Friendship.friend_id == current_user_id)
        friend_ids = friend_ids_query1.union(friend_ids_query2).all()
        friend_ids = {fid[0] for fid in friend_ids}  # Convert list of tuples to a set

        # Query for users who are not the current user and not in the friend IDs
        users = User.query.filter(
            User.id != current_user_id,
            ~User.id.in_(friend_ids)
        ).all()

        # Build the response list with the desired fields
        user_list = [{
            'id': user.id,
            'name': user.name,
            'description': user.description,
            'location': user.location,
            'picture': user.picture,
        } for user in users]

        return jsonify(user_list), 200

    except Exception as e:
        return jsonify({"error": f"Error fetching users: {str(e)}"}), 500


@app.route("/api/users/discover", methods=["GET"])
@jwt_required()
def discover_users():
    """Return active people who can receive a new friend request from this user."""
    try:
        current_user_id = get_jwt_identity()
        friendship_ids = db.session.query(Friendship.friend_id).filter(
            Friendship.user_id == current_user_id
        ).union(
            db.session.query(Friendship.user_id).filter(
                Friendship.friend_id == current_user_id
            )
        )
        pending_request_ids = db.session.query(FriendRequest.recipient_id).filter(
            FriendRequest.requester_id == current_user_id,
            FriendRequest.status == "pending",
        ).union(
            db.session.query(FriendRequest.requester_id).filter(
                FriendRequest.recipient_id == current_user_id,
                FriendRequest.status == "pending",
            )
        )
        users = User.query.filter(
            User.id != current_user_id,
            User.status == "active",
            ~User.id.in_(friendship_ids),
            ~User.id.in_(pending_request_ids),
        ).order_by(User.name.asc()).all()
        return jsonify([{
            "id": user.id,
            "name": user.name,
            "description": user.description,
            "location": user.location,
            "department": user.department,
            "picture": url_for("serve_image", filename=user.picture, _external=True) if user.picture else None,
        } for user in users]), 200
    except Exception as error:
        app.logger.error("Error discovering users: %s", error)
        return jsonify({"error": "Unable to discover users"}), 500


@app.route("/api/users", methods=["POST"])
@jwt_required()
def create_workspace_user():
    """Create a user from the managed add-users flow (super users only)."""
    current_user = User.query.get(get_jwt_identity())
    if not current_user or not current_user.is_super_user:
        return jsonify({"error": "Only workspace administrators can add users"}), 403
    name = (request.form.get("name") or "").strip()
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not name or not email or len(password) < 8:
        return jsonify({"error": "Name, email, and a password of at least 8 characters are required"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 409
    picture_name = None
    picture = request.files.get("picture")
    if picture and picture.filename:
        if not allowed_file(picture.filename):
            return jsonify({"error": "Profile image must be a PNG, JPG, JPEG, or GIF"}), 400
        picture_name = f"{secrets.token_hex(8)}_{secure_filename(picture.filename)}"
        picture.save(os.path.join(app.config["UPLOAD_FOLDER"], picture_name))
    user = User(
        name=name, email=email, password=generate_password_hash(password), picture=picture_name,
        role=request.form.get("role") or "Member", department=request.form.get("department") or None,
        status=request.form.get("status") or "active",
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User added successfully", "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "status": user.status}}), 201
    
    
@app.route("/api/current_user", methods=["GET"])
@jwt_required()  # JWT Authentication will automatically check the cookies
def get_current_user():
    try:
        # Get user ID from JWT token (extracted from the cookies)
        current_user_id = get_jwt_identity()
        app.logger.info(f"Current user ID: {current_user_id}")

        # Check if the token is valid and has a valid user ID
        if not current_user_id:
            return jsonify({"error": "Invalid token"}), 401

        # Fetch the user from the database
        user = User.query.filter_by(id=current_user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # If the user has a picture, generate a URL for it
        picture_url = (
            url_for('serve_image', filename=user.picture, _external=True)
            if user.picture else None
        )

        # Send the user data as a JSON response
        data = {
            'id': user.id,
            'uuid': user.public_id,
            'name': user.name,
            'username': user.username,
            'email': user.email,
            'description': user.description,
            'location': user.location,
            'picture': picture_url,
            'avatar': public_profile_url(user.avatar),
            'cover_photo': public_profile_url(user.cover_photo),
            'phone_number': user.phone_number,
            'website': user.website,
            'occupation': user.occupation,
            'company': user.company,
            'timezone': user.timezone,
            'language': user.language,
            'theme_preference': user.theme_preference,
            'social_links': user.social_links,
            'settings': user.settings,
            'role': user.role,
            'department': user.department,
            'status': user.status,
            'is_super_user': user.is_super_user,
            'friend_count': Friendship.query.filter((Friendship.user_id == user.id) | (Friendship.friend_id == user.id)).count(),
            'community_count': CommunityMember.query.filter_by(user_id=user.id).count(),
        }
        return jsonify(data), 200
    except Exception as e:
        app.logger.error(f"Error fetching user data: {str(e)}")
        return jsonify({"error": f"Error fetching user data: {str(e)}"}), 500


@app.route("/api/account", methods=["DELETE"])
@jwt_required()
def delete_account():
    """Soft-delete only the signed-in account; the client must explicitly confirm."""
    payload = request.get_json(silent=True) or {}
    if payload.get("confirm") is not True:
        return api_response(message="Please confirm that you want to delete your account.", status=400)
    user = User.query.get(get_jwt_identity())
    if not user or user.deleted_at:
        return api_response(message="Account not found", status=404)
    user.deleted_at = datetime.utcnow()
    user.status = "deleted"
    db.session.add(AuditLog(user_id=user.id, action="account_soft_deleted", metadata_json=client_metadata()))
    db.session.commit()
    response, status = api_response(message="Your account has been deleted.")
    unset_jwt_cookies(response)
    return response, status

#end point to get user posts
@app.route("/api/user_posts/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_posts(user_id):
    try:
        # Query posts made by the selected user
        posts = Post.query.filter_by(user_id=user_id).order_by(Post.timestamp.desc()).all()

        # Serialize post data
        post_data = [
            {
                "id": post.id,
                "content": post.content,
                "media_url": public_media_url(post.media_url),
                "timestamp": post.timestamp.isoformat(),  # Convert to ISO format for JSON
                "like_count": post.like_count(),
                "user": {
                    "id": post.user.id,
                    "name": post.user.name,
                    "user_photo": (
                        url_for('serve_image', filename=post.user.picture, _external=True)
                        if post.user.picture else None
                    ),
                },
            }
            for post in posts
        ]

        return jsonify({"posts": post_data}), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching posts: {str(e)}"}), 500

@app.route("/api/user_posts", methods=["GET"])
@jwt_required()
def get_current_user_posts():
    try:
        # Get the logged-in user's ID
        current_user_id = get_jwt_identity()

        # Query posts made by the logged-in user
        posts = Post.query.filter_by(user_id=current_user_id).order_by(Post.timestamp.desc()).all()

        # Serialize post data
        post_data = [
            {
                "id": post.id,
                "content": post.content,
                "media_url": public_media_url(post.media_url),
                "timestamp": post.timestamp.isoformat(),  # Convert to ISO format for JSON
                "like_count": post.like_count(),
                "user": {
                    "id": post.user.id,
                    "name": post.user.name,
                    "user_photo": (
                        url_for('serve_image', filename=post.user.picture, _external=True)
                        if post.user.picture else None
                    ),
                },
            }
            for post in posts
        ]

        return jsonify({"posts": post_data}), 200
    except Exception as e:
        return jsonify({"error": f"Error fetching posts: {str(e)}"}), 500



@app.route('/api/profile', methods=['POST'])
@jwt_required()
def update_profile():
    try:
        current_user_id = get_jwt_identity()
        name = request.form.get('name')
        description = request.form.get('description')
        location = request.form.get('location')
        picture = request.files.get('picture')
        cover_photo = request.files.get('cover_photo')

        if name is not None and not str(name).strip():
            return api_response(message='Name cannot be empty', status=400)

        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        upload_folder = app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        if picture:
            if not allowed_file(picture.filename):
                return api_response(message="Profile image must be PNG, JPG, JPEG, or GIF", status=422)
            filename = f"{secrets.token_hex(8)}_{secure_filename(picture.filename)}"
            image_path = os.path.join(upload_folder, filename)
            picture.save(image_path)
            user.picture = f'images/{filename}'

        if cover_photo:
            if not allowed_file(cover_photo.filename):
                return api_response(message="Cover image must be PNG, JPG, JPEG, or GIF", status=422)
            filename = f"{secrets.token_hex(8)}_{secure_filename(cover_photo.filename)}"
            cover_photo.save(os.path.join(upload_folder, filename))
            user.cover_photo = f'images/{filename}'

        if name is not None:
            user.name = name.strip() if str(name).strip() else user.name
        username = request.form.get("username")
        if username is not None:
            normalized_username = username.strip().lower() or None
            if normalized_username and User.query.filter(User.username == normalized_username, User.id != user.id).first():
                return api_response(message="That username is already in use.", status=409)
            user.username = normalized_username
        if description is not None:
            user.description = description.strip() if str(description).strip() else None
        if location is not None:
            user.location = location.strip() if str(location).strip() else None
        field_limits = {"phone_number": 32, "website": 255, "occupation": 100, "company": 100, "timezone": 64, "language": 10, "theme_preference": 12}
        for field, limit in field_limits.items():
            value = request.form.get(field)
            if value is not None:
                setattr(user, field, value.strip()[:limit] or None)
        social_links = request.form.get("social_links")
        if social_links:
            try:
                user.social_links = json.loads(social_links)
            except json.JSONDecodeError:
                return api_response(message="Social links must be valid JSON", status=422)
        settings = request.form.get("settings")
        if settings:
            try:
                parsed_settings = json.loads(settings)
                if not isinstance(parsed_settings, dict):
                    raise ValueError
                user.settings = {**(user.settings or {}), **parsed_settings}
            except (json.JSONDecodeError, ValueError):
                return api_response(message="Settings must be valid data", status=422)

        db.session.commit()
        return api_response({"id": user.id}, 'Profile updated successfully')
    except Exception as e:
        app.logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': f'Error updating profile: {str(e)}'}), 500

@app.route('/api/posts', methods=['POST'])
@jwt_required()
def create_post():
    try:
        current_user_id = get_jwt_identity()
        form_data = request.form.to_dict(flat=True)
        media = request.files.get('media')

        content = form_data.get('content')
        media_url = None

        uploads_folder = os.path.join(app.root_path, 'static/uploads')
        if not os.path.exists(uploads_folder):
            os.makedirs(uploads_folder)

        if media:
            error = validate_upload(media)
            if error:
                return api_response(message=error, status=400)
            media_filename = f"{uuid.uuid4().hex}_{secure_filename(media.filename)}"
            media.save(os.path.join(uploads_folder, media_filename))
            media_url = f'/static/uploads/{media_filename}'

        if not content and not media_url:
            return api_response(message="Add text or an attachment to publish your post.", status=400)

        post = Post(
            content=content,
            media_url=media_url,
            user_id=current_user_id,
            timestamp=datetime.utcnow()
        )
        db.session.add(post)
        db.session.commit()

        return api_response(data=serialize_post(post, current_user_id), message="Post published", status=201)
    except Exception as e:
        app.logger.error(f"Error creating post: {str(e)}")
        return api_response(message="Your post couldn't be published. Please try again.", status=500)

# A new account should never land on an empty timeline.  We keep friends near
# the top, then fill the page with a shuffled selection from the community.
@app.route('/api/feeds', methods=['GET'])
@jwt_required()
def get_all_posts():
    current_user_id = get_jwt_identity()
    page = max(request.args.get('page', 1, type=int), 1)
    per_page = min(max(request.args.get('per_page', 12, type=int), 1), 40)
    friend_ids = db.session.query(Friendship.friend_id).filter(Friendship.user_id == current_user_id).union(
        db.session.query(Friendship.user_id).filter(Friendship.friend_id == current_user_id)
    )
    # The first page gives existing connections priority.  Discovery content
    # fills any remaining slots so users without friends still have a useful home.
    friends = Post.query.options(joinedload(Post.user)).filter(Post.user_id.in_(friend_ids)).order_by(Post.timestamp.desc()).limit(per_page).all()
    remaining = max(per_page - len(friends), 0)
    seen_ids = [post.id for post in friends]
    discovery = []
    if remaining:
        discovery_query = Post.query.options(joinedload(Post.user)).filter(Post.user_id != current_user_id)
        if seen_ids:
            discovery_query = discovery_query.filter(~Post.id.in_(seen_ids))
        discovery = discovery_query.order_by(db.func.random()).limit(remaining).all()
    items = friends + discovery
    return jsonify({"items": [serialize_post(post, current_user_id) for post in items], "page": page, "has_more": False, "total": len(items), "has_discovery": bool(discovery)}), 200


@app.route('/api/explore', methods=['GET'])
@jwt_required()
def explore_posts():
    current_user_id = get_jwt_identity()
    page = max(request.args.get('page', 1, type=int), 1)
    per_page = min(max(request.args.get('per_page', 12, type=int), 1), 40)
    query = (request.args.get('q') or '').strip()
    order = request.args.get('sort', 'recent')
    post_query = Post.query.options(joinedload(Post.user))
    if query:
        post_query = post_query.filter(Post.content.ilike(f'%{query}%'))
    if order == 'popular':
        post_query = post_query.outerjoin(Like).group_by(Post.id).order_by(db.func.count(Like.id).desc(), Post.timestamp.desc())
    else:
        # Discovery should feel fresh even when the signed-in user has no
        # connections yet, rather than repeating the same chronological list.
        post_query = post_query.order_by(db.func.random())
    pagination = post_query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({"items": [serialize_post(post, current_user_id) for post in pagination.items], "page": page, "has_more": pagination.has_next}), 200


@app.route('/api/posts/<int:post_id>', methods=['GET'])
@jwt_required()
def get_post(post_id):
    post = Post.query.options(joinedload(Post.user)).get(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(serialize_post(post, get_jwt_identity())), 200


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    user_id = get_jwt_identity()
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    if post.user_id != user_id:
        return jsonify({"error": "You can only delete your own posts"}), 403
    db.session.delete(post)
    db.session.commit()
    return jsonify({"message": "Post deleted", "post_id": post_id}), 200


@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    try:
        user_id = get_jwt_identity()
        
        # Ensure IDs are integers
        try:
            user_id = int(user_id)
            post_id = int(post_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid ID format", status=400)
        
        post = Post.query.get(post_id)
        if not post:
            return api_response(message="Post not found", status=404)
        
        user = User.query.get(user_id)
        if not user or user.deleted_at:
            return api_response(message="User not found", status=404)
        
        # Check if the user already liked the post
        existing_like = Like.query.filter_by(user_id=user_id, post_id=post_id).first()
        if existing_like:
            # Remove the like
            db.session.delete(existing_like)
            db.session.commit()
            return api_response(data={"likes": post.like_count(), "liked": False}, message="Like removed", status=200)
        
        # Add a new like
        new_like = Like(user_id=user_id, post_id=post_id)
        db.session.add(new_like)
        db.session.commit()
        return api_response(data={"likes": post.like_count(), "liked": True}, message="Post liked", status=201)
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error liking post: {str(e)}")
        return api_response(message="Failed to like post", status=500)


@app.route('/api/posts/<int:post_id>/bookmark', methods=['POST'])
@jwt_required()
def toggle_bookmark(post_id):
    try:
        user_id = get_jwt_identity()
        
        # Ensure IDs are integers
        try:
            user_id = int(user_id)
            post_id = int(post_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid ID format", status=400)
        
        post = Post.query.get(post_id)
        if not post:
            return api_response(message="Post not found", status=404)
        
        user = User.query.get(user_id)
        if not user or user.deleted_at:
            return api_response(message="User not found", status=404)
        
        bookmark = Bookmark.query.filter_by(user_id=user_id, post_id=post_id).first()
        if bookmark:
            db.session.delete(bookmark)
            bookmarked = False
            message = "Bookmark removed"
        else:
            db.session.add(Bookmark(user_id=user_id, post_id=post_id))
            bookmarked = True
            message = "Post bookmarked"
        
        db.session.commit()
        return api_response(data={"post_id": post_id, "bookmarked": bookmarked}, message=message, status=200)
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error toggling bookmark: {str(e)}")
        return api_response(message="Failed to bookmark post", status=500)


@app.route('/api/bookmarks', methods=['GET'])
@jwt_required()
def get_bookmarks():
    user_id = get_jwt_identity()
    page = max(request.args.get('page', 1, type=int), 1)
    per_page = min(max(request.args.get('per_page', 12, type=int), 1), 40)
    pagination = Bookmark.query.filter_by(user_id=user_id).order_by(Bookmark.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({"items": [serialize_post(bookmark.post, user_id) for bookmark in pagination.items], "page": page, "has_more": pagination.has_next}), 200

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(post_id):
    try:
        user_id = get_jwt_identity()
        
        # Ensure IDs are integers
        try:
            user_id = int(user_id)
            post_id = int(post_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid ID format", status=400)
        
        if not user_id:
            return api_response(message="Unauthorized", status=401)

        post = Post.query.get(post_id)
        if not post:
            return api_response(message="Post not found", status=404)

        data = request.get_json(silent=True) or {}
        comment_content = (data.get('content') or "").strip()
        
        if not comment_content:
            return api_response(message="Comment cannot be empty", status=400)
        
        if len(comment_content) > 5000:
            return api_response(message="Comment is too long", status=400)

        new_comment = Comment(content=comment_content, user_id=user_id, post_id=post.id)
        db.session.add(new_comment)
        db.session.commit()

        return api_response(data=serialize_comment(new_comment, user_id), message="Comment added", status=201)

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error adding comment: {str(e)}")
        return api_response(message="Failed to add comment", status=500)
    

@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(post_id):
    try:
        # Ensure post_id is an integer
        try:
            post_id = int(post_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid post ID", status=400)
        
        post = Post.query.get(post_id)
        if not post:
            return api_response(message="Post not found", status=404)

        comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.timestamp.desc()).all()
        comments_data = [serialize_comment(comment, get_jwt_identity()) for comment in comments]

        return api_response(data=comments_data, message="Comments retrieved", status=200)

    except Exception as e:
        app.logger.error(f"Error fetching comments: {str(e)}")
        return api_response(message="Failed to fetch comments", status=500)


@app.route('/api/comments/<int:comment_id>', methods=['PATCH', 'DELETE'])
@jwt_required()
def manage_comment(comment_id):
    """Owners can edit or remove their comments without affecting the post."""
    user_id = get_jwt_identity()
    comment = Comment.query.get(comment_id)
    if not comment:
        return api_response(message="Comment not found", status=404)
    if comment.user_id != user_id:
        return api_response(message="You can only change your own comments.", status=403)
    if request.method == 'DELETE':
        db.session.delete(comment)
        db.session.commit()
        return api_response(data={"id": comment_id}, message="Comment deleted")
    content = ((request.get_json(silent=True) or {}).get("content") or "").strip()
    if not content:
        return api_response(message="A comment cannot be empty.", status=400)
    if len(content) > 5000:
        return api_response(message="This comment is too long.", status=400)
    comment.content = content
    db.session.commit()
    return api_response(data=serialize_comment(comment, user_id), message="Comment updated")

# Upload route for sidebar images
@app.route("/api/upload_sidebar_image", methods=["POST"])
@jwt_required()
def upload_sidebar_image():
    try:
        # Fetch current user from JWT token
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({"error": "User not found"}), 404

        # Only super user can upload images
        if current_user.email != "ericmutuma15@gmail.com":
            return jsonify({"error": "You are not authorized to upload images"}), 403

        # Process the image upload
        image = request.files.get("image")
        if not image or not allowed_file(image.filename):
            return jsonify({"error": "No image provided or invalid format"}), 400

        filename = secure_filename(image.filename)
        # Create folder if it does not exist
        if not os.path.exists(app.config["UPLOAD_FOLDER"]):
            os.makedirs(app.config["UPLOAD_FOLDER"])

        # Save image to the folder
        image.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))

        # Save image URL to return
        image_url = f"/static/sidebar_images/{filename}"

        return jsonify({"message": "Image uploaded successfully", "image_url": image_url}), 201

    except Exception as e:
        app.logger.error(f"Error uploading image: {str(e)}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


# Define the allowed file extensions
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/api/sidebar_images", methods=["GET"])
def get_sidebar_images():
    try:
        # Define the folder path
        folder_path = os.path.join(app.root_path, "static", "sidebar_images")
        
        # Ensure the folder exists
        if not os.path.exists(folder_path):
            return jsonify({"error": "Sidebar images folder not found"}), 404
        
        # List all allowed image files in the directory
        files = [f for f in os.listdir(folder_path) if allowed_file(f)]

        if not files:
            return jsonify({"error": "No images found in the sidebar folder"}), 404

        # Construct response with filenames and URLs
        images = [
            {
                "filename": filename,
                "url": url_for('serve_sidebar_image', filename=filename, _external=True),
                "title": os.path.splitext(filename)[0]  # Use filename (without extension) as a placeholder title
            }
            for filename in files
        ]

        return jsonify(images), 200

    except Exception as e:
        app.logger.error(f"Error fetching sidebar images: {str(e)}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

#endpoint to send friend request
@app.route('/api/send-friend-request', methods=['POST'])
@jwt_required()
def send_friend_request():
    data = request.get_json()
    recipient_id = data.get("userId")  # Ensure frontend sends the correct key

    if not recipient_id:
        return jsonify({"error": "Recipient ID is required"}), 400

    current_user_id = get_jwt_identity()

    if current_user_id == recipient_id:
        return jsonify({"error": "You cannot send a request to yourself"}), 400

    recipient = User.query.get(recipient_id)
    if not recipient or recipient.status != "active":
        return jsonify({"error": "This user is unavailable"}), 404

    existing_friendship = Friendship.query.filter(
        ((Friendship.user_id == current_user_id) & (Friendship.friend_id == recipient_id)) |
        ((Friendship.user_id == recipient_id) & (Friendship.friend_id == current_user_id))
    ).first()
    if existing_friendship:
        return jsonify({"error": "You are already friends"}), 400

    existing_request = FriendRequest.query.filter(
        FriendRequest.status == "pending",
        ((FriendRequest.requester_id == current_user_id) & (FriendRequest.recipient_id == recipient_id)) |
        ((FriendRequest.requester_id == recipient_id) & (FriendRequest.recipient_id == current_user_id))
    ).first()

    if existing_request:
        return jsonify({"error": "A friend request is already pending"}), 400

    # Save the friend request
    friend_request = FriendRequest(
        requester_id=current_user_id,
        recipient_id=recipient_id,
        status="pending"
    )
    db.session.add(friend_request)
    db.session.commit()  # Commit to generate friend_request.id

    # Create a notification for the recipient, linking to the friend request
    notification = Notification(
        user_id=recipient_id,
        message="You have a new friend request!",
        type="friend_request",
        friend_request_id=friend_request.id  # Store request ID for reference
    )
    db.session.add(notification)
    db.session.commit()

    return jsonify({"message": "Friend request sent!"}), 201



@app.route("/api/user/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_by_id(user_id):
    try:
        # Get the ID of the currently authenticated user
        current_user_id = get_jwt_identity()

        # Fetch the user from the database
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if the logged-in user and the requested user are friends
        is_friend = Friendship.query.filter(
            ((Friendship.user_id == current_user_id) & (Friendship.friend_id == user_id)) |
            ((Friendship.user_id == user_id) & (Friendship.friend_id == current_user_id))
        ).first() is not None

        # Generate a URL for the profile picture
        picture_url = (
            url_for('serve_image', filename=user.picture, _external=True)
            if user.picture else None
        )

        # Return user details, including is_friend status
        return jsonify({
            'id': user.id,
            'name': user.name,
            'description': user.description,
            'location': user.location,
            'picture': picture_url,
            'cover_photo': public_profile_url(user.cover_photo),
            'occupation': user.occupation,
            'company': user.company,
            'website': user.website,
            'phone_number': user.phone_number,
            'username': user.username,
            'is_friend': is_friend,  # Added field
            'role': user.role,
            'department': user.department,
            'status': user.status,
            'friend_count': Friendship.query.filter((Friendship.user_id == user.id) | (Friendship.friend_id == user.id)).count(),
            'community_count': CommunityMember.query.filter_by(user_id=user.id).count(),
        }), 200

    except Exception as e:
        app.logger.error(f"Error fetching user data: {str(e)}")
        return jsonify({"error": f"Error fetching user data: {str(e)}"}), 500


@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    current_user_id = get_jwt_identity()
    
    # Ensure current_user_id is an integer
    try:
        current_user_id = int(current_user_id)
    except (TypeError, ValueError):
        return api_response(message="Invalid authentication token", status=401)
    
    base_url = request.host_url  # e.g., "http://127.0.0.1:5555/"
    status = request.args.get('status', 'all')
    page = max(request.args.get('page', 1, type=int), 1)
    per_page = min(max(request.args.get('per_page', 10, type=int), 1), 100)

    # Create aliases for the User model
    requester = aliased(User)
    acceptor = aliased(User)

    # Base query
    notifications_query = (
        db.session.query(
            Notification.id,
            Notification.message,
            Notification.type,
            Notification.friend_request_id,
            Notification.read,
            Notification.archived,
            Notification.created_at,
            FriendRequest.status.label("friend_request_status"),
            # For "friend_accept" notifications, use the acceptor's info; otherwise, use the requester's info.
            case(
                (Notification.type == "friend_accept", acceptor.name),
                else_=requester.name
            ).label("originator_name"),
            case(
                (Notification.type == "friend_accept", acceptor.picture),
                else_=requester.picture
            ).label("originator_profile_pic"),
            case(
                (Notification.type == "friend_accept", acceptor.id),
                else_=requester.id
            ).label("originator_id")
        )
        .outerjoin(FriendRequest, FriendRequest.id == Notification.friend_request_id)
        .outerjoin(requester, requester.id == FriendRequest.requester_id)
        .outerjoin(acceptor, acceptor.id == FriendRequest.recipient_id)
        .filter(Notification.user_id == current_user_id)
        .filter(
            (Notification.type != "friend_request") | (FriendRequest.status != "accepted")
        )
    )

    # Apply status filters
    if status == "unread":
        notifications_query = notifications_query.filter(Notification.read.is_(False), Notification.archived.is_(False))
    elif status == "read":
        notifications_query = notifications_query.filter(Notification.read.is_(True), Notification.archived.is_(False))
    elif status == "archived":
        notifications_query = notifications_query.filter(Notification.archived.is_(True))
    else:  # 'all'
        notifications_query = notifications_query.filter(Notification.archived.is_(False))

    # Order by most recent first
    notifications_query = notifications_query.order_by(Notification.created_at.desc(), Notification.id.desc())

    # Paginate
    pagination = notifications_query.paginate(page=page, per_page=per_page, error_out=False)

    notification_list = [
        {
            "id": notif.id,
            "message": notif.message,
            "type": notif.type,
            "friend_request_id": notif.friend_request_id,
            "friend_request_status": notif.friend_request_status or "unknown",
            "originator_name": notif.originator_name or "Unknown User",
            "originator_profile_pic": (
                f"{base_url}static/{notif.originator_profile_pic}"
                if notif.originator_profile_pic
                else f"{base_url}static/default.jpg"
            ),
            "originator_id": notif.originator_id,
            "read": notif.read,
            "archived": notif.archived,
            "created_at": notif.created_at.isoformat() if notif.created_at else None
        }
        for notif in pagination.items
    ]

    return jsonify({
        "items": notification_list,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "has_more": pagination.has_next
        },
        "unread_count": Notification.query.filter_by(user_id=current_user_id, read=False, archived=False).count(),
    }), 200


@app.route('/api/notifications/unread-count', methods=['GET'])
@jwt_required()
def notification_unread_count():
    current_user_id = get_jwt_identity()
    count = Notification.query.filter_by(user_id=current_user_id, read=False, archived=False).count()
    return jsonify({"unread_count": count}), 200


@app.route('/api/notifications/<int:notification_id>', methods=['PATCH', 'DELETE'])
@jwt_required()
def manage_notification(notification_id):
    current_user_id = get_jwt_identity()
    notification = Notification.query.filter_by(id=notification_id, user_id=current_user_id).first()
    if not notification:
        return jsonify({"error": "Notification not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(notification)
        db.session.commit()
        return jsonify({"message": "Notification deleted"}), 200

    payload = request.get_json(silent=True) or {}
    allowed = {"read", "archived"}
    for key in allowed:
        if key in payload and isinstance(payload[key], bool):
            setattr(notification, key, payload[key])
    db.session.commit()
    return jsonify({"id": notification.id, "read": notification.read, "archived": notification.archived}), 200



# Accept friend request
@app.route('/api/accept-friend-request', methods=['POST'])
@jwt_required()
def accept_friend_request():
    data = request.get_json(silent=True) or {}
    request_id = data.get("requestId") or data.get("request_id") or data.get("id")
    current_user_id = get_jwt_identity()

    app.logger.info(f"accept_friend_request payload={data} current_user_id={current_user_id!r}")

    if not request_id:
        return api_response(message="Request ID is required", status=400)

    try:
        request_id = int(request_id)
    except (TypeError, ValueError):
        return api_response(message="Request ID must be a number", status=400)

    # Ensure current_user_id is an integer for database comparison
    try:
        current_user_id = int(current_user_id)
    except (TypeError, ValueError):
        return api_response(message="Invalid authentication token", status=401)

    friend_request = FriendRequest.query.get(request_id)
    if not friend_request:
        return api_response(message="Friend request not found", status=404)

    app.logger.info(
        f"friend_request id={friend_request.id} requester={friend_request.requester_id} recipient={friend_request.recipient_id} status={friend_request.status}"
    )

    if friend_request.status != "pending":
        return api_response(message="Friend request has already been processed", status=400)

    if friend_request.recipient_id != current_user_id:
        return api_response(message="You are not the recipient of this friend request", status=403)

    # Accept friend request
    friend_request.status = "accepted"

    # Create reciprocal friendship in both directions.
    new_friendship_1 = Friendship(user_id=current_user_id, friend_id=friend_request.requester_id)
    new_friendship_2 = Friendship(user_id=friend_request.requester_id, friend_id=current_user_id)
    db.session.add_all([new_friendship_1, new_friendship_2])

    # Fetch the requester's details
    requester_user = User.query.get(friend_request.requester_id)
    if not requester_user:
        return jsonify({"error": "Requester user not found"}), 404

    # Fetch the current (recipient) user
    recipient_user = User.query.get(current_user_id)
    if not recipient_user:
        return jsonify({"error": "Recipient user not found"}), 404

    # Notify the requester that the friend request was accepted
    new_notification = Notification(
        user_id=friend_request.requester_id,  # Notify the requester
        message=f"{recipient_user.name} accepted your friend request!",
        type="friend_accept",
        friend_request_id=friend_request.id  # Associate the notification with the request
    )
    db.session.add(new_notification)

    db.session.commit()

    return jsonify({"message": "Friend request accepted!"}), 200



#Fetch friends list
@app.route('/api/friends', methods=['GET'])
@jwt_required()
def get_friends():
    current_user_id = get_jwt_identity()

    friends = db.session.query(
        User.id,
        User.name,
        User.picture
    ).join(Friendship, Friendship.friend_id == User.id
    ).filter(Friendship.user_id == current_user_id).all()

    friends_list = [
        {
            "id": friend.id,
            "name": friend.name,
            "profile_pic": f"{request.host_url}static/{friend.picture}" if friend.picture else f"{request.host_url}static/default.jpg"
        }
        for friend in friends
    ]

    return jsonify(friends_list), 200


def _person_payload(user):
    return {
        "id": user.id,
        "name": user.name,
        "description": user.description,
        "location": user.location,
        "department": user.department,
        "picture": url_for("serve_image", filename=user.picture, _external=True) if user.picture else None,
    }


@app.route('/api/friend-requests', methods=['GET'])
@jwt_required()
def get_friend_requests():
    """List incoming and outgoing pending requests for the signed-in user."""
    current_user_id = get_jwt_identity()
    incoming = FriendRequest.query.filter_by(recipient_id=current_user_id, status="pending").order_by(FriendRequest.timestamp.desc()).all()
    outgoing = FriendRequest.query.filter_by(requester_id=current_user_id, status="pending").order_by(FriendRequest.timestamp.desc()).all()
    return jsonify({
        "incoming": [{"id": item.id, "created_at": item.timestamp.isoformat(), "user": _person_payload(item.requester)} for item in incoming],
        "outgoing": [{"id": item.id, "created_at": item.timestamp.isoformat(), "user": _person_payload(item.recipient)} for item in outgoing],
    }), 200


@app.route('/api/friend-requests/<int:request_id>', methods=['PATCH', 'DELETE'])
@jwt_required()
def manage_friend_request(request_id):
    current_user_id = get_jwt_identity()
    friend_request = FriendRequest.query.get(request_id)
    if not friend_request or friend_request.status != "pending":
        return jsonify({"error": "Friend request not found"}), 404

    if request.method == "DELETE":
        if friend_request.requester_id != current_user_id:
            return jsonify({"error": "Only the sender can cancel this request"}), 403
        db.session.delete(friend_request)
        db.session.commit()
        return jsonify({"message": "Friend request cancelled"}), 200

    if friend_request.recipient_id != current_user_id:
        return jsonify({"error": "Only the recipient can update this request"}), 403
    status = (request.get_json(silent=True) or {}).get("status")
    if status != "declined":
        return jsonify({"error": "Only a pending request can be declined here"}), 400
    friend_request.status = "declined"
    db.session.commit()
    return jsonify({"message": "Friend request declined"}), 200


@app.route('/api/friends/<int:friend_id>', methods=['DELETE'])
@jwt_required()
def remove_friend(friend_id):
    current_user_id = get_jwt_identity()
    friendships = Friendship.query.filter(
        ((Friendship.user_id == current_user_id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == current_user_id))
    ).all()
    if not friendships:
        return jsonify({"error": "Friendship not found"}), 404
    for friendship in friendships:
        db.session.delete(friendship)
    db.session.commit()
    return jsonify({"message": "Friend removed"}), 200


@app.route('/api/friends/suggestions', methods=['GET'])
@jwt_required()
def friend_suggestions():
    """A deterministic, privacy-safe first pass at people suggestions."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    friend_ids = db.session.query(Friendship.friend_id).filter(Friendship.user_id == current_user_id)
    pending_ids = db.session.query(FriendRequest.recipient_id).filter(
        FriendRequest.requester_id == current_user_id, FriendRequest.status == "pending"
    ).union(db.session.query(FriendRequest.requester_id).filter(
        FriendRequest.recipient_id == current_user_id, FriendRequest.status == "pending"
    ))
    candidates = User.query.filter(
        User.id != current_user_id, User.status == "active", ~User.id.in_(friend_ids), ~User.id.in_(pending_ids)
    ).order_by(User.created_at.desc()).limit(24).all()
    def score(user):
        return int(bool(current_user and current_user.location and user.location and current_user.location.lower() == user.location.lower())) * 2 + int(bool(current_user and current_user.department and user.department and current_user.department.lower() == user.department.lower()))
    candidates.sort(key=lambda user: (-score(user), user.name.lower()))
    return jsonify([_person_payload(user) for user in candidates[:8]]), 200


@app.route('/api/stories', methods=['GET', 'POST'])
@jwt_required()
def stories():
    current_user_id = get_jwt_identity()
    # Expired stories are never returned. Cleanup is deliberately best-effort so
    # a retention job can later own the same policy without changing this API.
    Story.query.filter(Story.expires_at <= datetime.utcnow()).delete(synchronize_session=False)
    db.session.commit()
    if request.method == 'POST':
        payload = request.get_json(silent=True) or {}
        content = (payload.get('content') or '').strip()
        media_url = payload.get('media_url')
        media_type = payload.get('media_type') or ('image' if media_url else 'text')
        if not content and not media_url:
            return jsonify({"error": "A story needs text or media"}), 400
        story = Story(user_id=current_user_id, content=content or None, media_url=media_url, media_type=media_type)
        db.session.add(story)
        db.session.commit()
        return jsonify({"id": story.id, "expires_at": story.expires_at.isoformat()}), 201
    results = Story.query.filter(Story.expires_at > datetime.utcnow()).order_by(Story.created_at.desc()).limit(50).all()
    return jsonify([{
        "id": story.id, "user_id": story.user_id, "name": story.user.name,
        "picture": url_for("serve_image", filename=story.user.picture, _external=True) if story.user.picture else None,
        "content": story.content, "media_url": story.media_url, "media_type": story.media_type,
        "created_at": story.created_at.isoformat(), "expires_at": story.expires_at.isoformat(),
        "is_own": story.user_id == current_user_id,
    } for story in results]), 200

@app.route('/api/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_read():
    current_user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=current_user_id, read=False).update({"read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200

# ----- Messaging API Endpoints -----

# ---------------------------
# Socket.IO event handlers
@socketio.on("connect")
def handle_connect():
    print("Client connected")

@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")

@socketio.on("join_chat")
def handle_join_chat(data):
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
    except Exception:
        return False
    join_room(f"user_{user_id}")


@socketio.on("typing")
def handle_typing(data):
    try:
        verify_jwt_in_request()
        sender_id = int(get_jwt_identity())
        receiver_id = int((data or {}).get("receiver_id"))
    except (TypeError, ValueError):
        return False
    socketio.emit("typing", {"sender_id": sender_id, "is_typing": bool(data.get("is_typing"))}, room=f"user_{receiver_id}")

@socketio.on("leave_chat")
def handle_leave_chat(data):
    user_id = data.get("user_id")
    leave_room(f"user_{user_id}")
    print(f"User {user_id} left room user_{user_id}")


# --- Messaging Endpoints ---

@app.route("/api/messages/send", methods=["POST"])
@app.route("/messages/send", methods=["POST"])
@jwt_required()
def send_message():
    try:
        data = request.get_json(silent=True) or {}
        receiver_id = data.get("receiver_id")
        message_text = (data.get("message") or "").strip()
        media_url = data.get("media_url")
        media_type = data.get("media_type")
        
        # Ensure receiver_id is an integer
        try:
            receiver_id = int(receiver_id) if receiver_id else None
        except (ValueError, TypeError):
            return api_response(message="Invalid receiver ID", status=400)
        
        if not receiver_id or (not message_text and not media_url):
            return api_response(message="Receiver and message or attachment required", status=400)

        current_user_id = get_jwt_identity()
        
        # Ensure current_user_id is an integer
        try:
            current_user_id = int(current_user_id) if current_user_id else None
        except (ValueError, TypeError):
            return api_response(message="Invalid authentication token", status=401)
        
        # Check if receiver exists
        receiver = User.query.get(receiver_id)
        if not receiver:
            return api_response(message="Recipient not found", status=404)
        
        # Check if sender is trying to message themselves
        if current_user_id == receiver_id:
            return api_response(message="Cannot message yourself", status=400)
        
        sender = User.query.get(current_user_id)
        if not sender:
            return api_response(message="Sender not found", status=404)
        
        message = Message(
            sender_id=current_user_id,
            receiver_id=receiver_id,
            message=message_text,
            media_url=media_url,
            media_type=media_type
        )
        db.session.add(message)
        db.session.flush()  # Flush to get message.id
        
        # Create notification for the message
        notification = Notification(
            user_id=receiver_id,
            message=f"{sender.name} sent you a message",
            type="message",
            created_at=datetime.utcnow()
        )
        db.session.add(notification)
        db.session.commit()

        # Emit real-time notification via socket.io
        socketio.emit("new_message", {
            "id": message.id,
            "sender_id": current_user_id,
            "receiver_id": receiver_id,
            "message": message_text,
            "media_url": media_url,
            "media_type": media_type,
            "timestamp": message.timestamp.isoformat(),
            "is_read": message.is_read,
            "sender_profile_pic": sender.picture,
            "sender_name": sender.name
        }, room=f"user_{receiver_id}")

        payload = {
            "id": message.id, "sender_id": current_user_id, "receiver_id": receiver_id,
            "message": message.message, "media_url": message.media_url, "media_type": message.media_type,
            "timestamp": message.timestamp.isoformat(), "is_read": message.is_read,
            "sender_profile_pic": sender.picture, "sender_name": sender.name,
        }
        socketio.emit("notification", {"type": "message", "unread_count": Message.query.filter_by(receiver_id=receiver_id, is_read=False).count()}, room=f"user_{receiver_id}")
        return api_response(data=payload, message="Message sent", status=201)
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error sending message: {str(e)}")
        return api_response(message="Message could not be sent", status=500)

@app.route("/api/messages/<int:user_id>", methods=["GET"])
@app.route("/messages/<int:user_id>", methods=["GET"])
@jwt_required()
def get_messages(user_id):
    try:
        current_user_id = get_jwt_identity()
        
        # Ensure IDs are integers
        try:
            current_user_id = int(current_user_id)
            user_id = int(user_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid user ID", status=400)
        
        # Check if user exists
        if not User.query.get(user_id):
            return api_response(message="User not found", status=404)
        
        messages = Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.receiver_id == user_id)) |
            ((Message.sender_id == user_id) & (Message.receiver_id == current_user_id))
        ).filter(
            ~((Message.sender_id == current_user_id) & (Message.deleted_by_sender.is_(True))),
            ~((Message.receiver_id == current_user_id) & (Message.deleted_by_receiver.is_(True))),
        ).order_by(Message.timestamp.asc()).all()

        result = []
        for msg in messages:
            sender = User.query.get(msg.sender_id)
            if sender:
                result.append({
                    "id": msg.id,
                    "sender_id": msg.sender_id,
                    "receiver_id": msg.receiver_id,
                    "message": msg.message,
                    "media_url": msg.media_url,
                    "media_type": msg.media_type,
                    "timestamp": msg.timestamp.isoformat(),
                    "is_read": msg.is_read,
                    "sender_profile_pic": sender.picture,
                    "sender_name": sender.name
                })
        return jsonify(result), 200
    
    except Exception as e:
        app.logger.error(f"Error fetching messages: {str(e)}")
        return api_response(message="Failed to fetch messages", status=500)

@app.route("/api/messages/read/<int:sender_id>", methods=["PUT"])
@app.route("/messages/read/<int:sender_id>", methods=["PUT"])
@jwt_required()
def mark_messages_as_read(sender_id):
    try:
        current_user_id = get_jwt_identity()
        
        # Ensure IDs are integers
        try:
            current_user_id = int(current_user_id)
            sender_id = int(sender_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid user ID", status=400)
        
        messages = Message.query.filter_by(receiver_id=current_user_id, sender_id=sender_id, is_read=False).all()
        for msg in messages:
            msg.is_read = True
            msg.read_at = datetime.utcnow()
        db.session.commit()
        socketio.emit("messages_read", {"reader_id": current_user_id}, room=f"user_{sender_id}")
        return api_response(message="Messages marked as read", status=200)
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error marking messages as read: {str(e)}")
        return api_response(message="Failed to mark messages as read", status=500)

# --- File Upload Endpoint ---

@app.route("/api/uploads", methods=["POST"])
@app.route("/upload", methods=["POST"])
@jwt_required()  # Optionally protect the endpoint
def upload_file():
    if "file" not in request.files:
        return api_response(message="Choose a file to upload.", status=400)
    file = request.files["file"]
    error = validate_upload(file)
    if error:
        return api_response(message=error, status=400)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    # Create URL for the uploaded file
    file_url = url_for("uploaded_file", filename=filename, _external=True)
    return api_response(data={"media_url": file_url, "media_type": media_type_for(filename)}, message="Upload complete"), 201

@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/api/messages/<int:message_id>", methods=["DELETE"])
@jwt_required()
def delete_message(message_id):
    user_id = get_jwt_identity()
    message = Message.query.get(message_id)
    if not message or user_id not in {message.sender_id, message.receiver_id}:
        return api_response(message="Message not found", status=404)
    if user_id == message.sender_id:
        message.deleted_by_sender = True
    else:
        message.deleted_by_receiver = True
    db.session.commit()
    return api_response(data={"id": message_id}, message="Message removed from your conversation")


@app.route("/api/chats", methods=["GET"])
@jwt_required()
def get_chats():
    try:
        current_user_id = get_jwt_identity()
        
        # Ensure current_user_id is an integer
        try:
            current_user_id = int(current_user_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid authentication token", status=401)
        
        # Query all messages where current user is either sender or receiver
        messages = Message.query.filter(
            (Message.sender_id == current_user_id) | (Message.receiver_id == current_user_id)
        ).order_by(Message.timestamp.desc()).all()

        # Collect unique partner IDs
        partner_ids = set()
        for msg in messages:
            if msg.sender_id != current_user_id:
                partner_ids.add(msg.sender_id)
            if msg.receiver_id != current_user_id:
                partner_ids.add(msg.receiver_id)

        # Build the chat list with user details
        chats = []
        for pid in partner_ids:
            user = User.query.get(pid)
            if user and not user.deleted_at:  # Exclude deleted users
                picture_url = (
                    url_for("serve_image", filename=user.picture, _external=True)
                    if user.picture else None
                )
                latest = next((message for message in messages if message.sender_id == pid or message.receiver_id == pid), None)
                unread_count = sum(1 for message in messages if message.sender_id == pid and message.receiver_id == current_user_id and not message.is_read)
                chats.append({
                    "id": user.id,
                    "name": user.name,
                    "profile_pic": picture_url or "/default-profile.png",
                    "last_message": latest.message[:50] if latest and latest.message else (f"[{latest.media_type}]" if latest and latest.media_type else "Start a conversation"),
                    "last_message_at": latest.timestamp.isoformat() if latest else None,
                    "unread_count": unread_count,
                    "is_online": user.last_active and (datetime.utcnow() - user.last_active).total_seconds() < 300  # Online if active within 5 minutes
                })
        
        # Sort by most recent conversation
        chats.sort(key=lambda chat: chat["last_message_at"] or "", reverse=True)
        return jsonify(chats), 200
    
    except Exception as e:
        app.logger.error(f"Error fetching chats: {str(e)}")
        return api_response(message="Failed to fetch conversations", status=500)


@app.route("/api/messages/unread-count", methods=["GET"])
@jwt_required()
def get_unread_message_count():
    try:
        current_user_id = get_jwt_identity()
        
        # Ensure current_user_id is an integer
        try:
            current_user_id = int(current_user_id)
        except (ValueError, TypeError):
            return api_response(message="Invalid authentication token", status=401)
        
        unread_count = Message.query.filter_by(receiver_id=current_user_id, is_read=False).count()
        return jsonify({"unread_count": unread_count}), 200
    
    except Exception as e:
        app.logger.error(f"Error fetching unread count: {str(e)}")
        return api_response(message="Failed to fetch unread count", status=500)



if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, port=5555)
