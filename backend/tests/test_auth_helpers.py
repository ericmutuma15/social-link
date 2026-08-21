import importlib
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


def test_seed_default_user_creates_verified_admin():
    app_module = importlib.import_module("app")

    with app_module.app.app_context():
        app_module.db.session.query(app_module.User).delete()
        app_module.db.session.commit()

        user = app_module.ensure_default_user()

        assert user is not None
        assert user.email == "admin@mbogi.dev"
        assert user.is_verified is True
        assert app_module.verify_password(user, "Admin123!") is True


def test_oauth_user_creation_provisions_verified_account():
    app_module = importlib.import_module("app")

    with app_module.app.app_context():
        app_module.db.session.query(app_module.User).filter(app_module.User.email == "oauth@example.com").delete()
        app_module.db.session.commit()

        user = app_module.create_or_get_oauth_user("oauth@example.com", "OAuth User")

        assert user is not None
        assert user.email == "oauth@example.com"
        assert user.is_verified is True
        assert user.name == "OAuth User"


def test_login_session_flow_authenticates_user():
    app_module = importlib.import_module("app")

    with app_module.app.test_client() as client:
        login_response = client.post(
            "/api/login",
            json={"email": "admin@mbogi.dev", "password": "Admin123!"},
        )

        assert login_response.status_code == 200

        session_response = client.get("/api/session")
        assert session_response.status_code == 200
        assert session_response.get_json()["data"]["authenticated"] is True


def test_profile_update_without_name_preserves_existing_profile_fields():
    app_module = importlib.import_module("app")

    with app_module.app.test_client() as client:
        login_response = client.post(
            "/api/login",
            json={"email": "admin@mbogi.dev", "password": "Admin123!"},
        )

        assert login_response.status_code == 200

        update_response = client.post(
            "/api/profile",
            data={"description": "Updated profile", "location": "Nairobi"},
            content_type="multipart/form-data",
        )

        assert update_response.status_code == 200

        with app_module.app.app_context():
            user = app_module.User.query.filter_by(email="admin@mbogi.dev").first()
            assert user is not None
            assert user.description == "Updated profile"
            assert user.location == "Nairobi"


def test_create_post_accepts_text_only_content():
    app_module = importlib.import_module("app")

    with app_module.app.app_context():
        user = app_module.User.query.filter_by(email="admin@mbogi.dev").first()
        assert user is not None
        token = app_module.create_access_token(user.id)

    with app_module.app.test_client() as client:
        response = client.post(
            "/api/posts",
            data={"content": "Hello from the regression test"},
            headers={"Authorization": f"Bearer {token}"},
            content_type="multipart/form-data",
        )

        assert response.status_code == 201
        payload = response.get_json()
        assert payload["success"] is True
        assert payload["data"]["content"] == "Hello from the regression test"


def test_register_returns_verification_status(monkeypatch):
    app_module = importlib.import_module("app")
    monkeypatch.setitem(app_module.app.config, "REQUIRE_EMAIL_VERIFICATION", True)

    def fake_send_email(subject, recipient, body):
        return True

    monkeypatch.setattr(app_module, "send_account_email", fake_send_email)

    with app_module.app.test_client() as client:
        response = client.post(
            "/api/register",
            json={
                "name": "Verification User",
                "email": "verification@example.com",
                "password": "StrongPassword123!",
            },
        )

        assert response.status_code == 201
        payload = response.get_json()
        assert payload["data"]["requires_verification"] is True
        assert payload["data"]["verification_sent"] is True


def test_google_verification_accepts_boolean_email_verified(monkeypatch):
    app_module = importlib.import_module("app")
    app_module.app.config["GOOGLE_CLIENT_ID"] = "test-client"

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return (
                b'{"aud":"test-client","iss":"accounts.google.com",'
                b'"email_verified":true,"email":"person@example.com"}'
            )

    monkeypatch.setattr(app_module.urllib.request, "urlopen", lambda req: FakeResponse())

    result = app_module.verify_google_id_token("dummy-token")

    assert result is not None
    assert result["email"] == "person@example.com"


def test_public_media_url_resolves_uploaded_files_without_double_prefixing():
    app_module = importlib.import_module("app")
    filename = "public-media-url-test.png"
    upload_dir = app_module.app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)
    full_path = os.path.join(upload_dir, filename)
    with open(full_path, "wb") as fh:
        fh.write(b"test")

    try:
        with app_module.app.test_request_context("/"):
            assert app_module.public_media_url(f"/static/uploads/{filename}") == f"http://localhost/uploads/{filename}"
            assert app_module.public_media_url(f"uploads/{filename}") == f"http://localhost/uploads/{filename}"
            assert app_module.public_media_url(filename) == f"http://localhost/uploads/{filename}"
    finally:
        if os.path.exists(full_path):
            os.remove(full_path)
