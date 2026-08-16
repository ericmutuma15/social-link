import os
import importlib
import io


def test_comment_upload_saves_attachment(monkeypatch, tmp_path):
    # Use an in-memory database for clean schema matching current models
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    # Ensure a fresh import so the env var takes effect and tables are created
    import sys
    for m in ("app", "models"):
        if m in sys.modules:
            del sys.modules[m]
    app_module = importlib.import_module("app")

    # Ensure a clean DB state for the test by recreating schema
    with app_module.app.app_context():
        # Drop and recreate tables so the in-memory DB matches current models
        app_module.db.drop_all()
        app_module.db.create_all()

        user = app_module.ensure_default_user()

        post = app_module.Post(content="Hello world", user_id=user.id)
        app_module.db.session.add(post)
        app_module.db.session.commit()

        post_id = post.id
        token = app_module.create_access_token(user.id)

    # Prepare a small image-like bytes payload
    payload = io.BytesIO(b"\xFF\xD8\xFFexamplejpegdata")

    with app_module.app.test_client() as client:
        payload.seek(0)
        data = {
            "content": "Nice post",
            "attachment": (payload, "attach.jpg")
        }
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post(f"/api/posts/{post_id}/comments", data=data, headers=headers, content_type="multipart/form-data")

        assert response.status_code == 201
        body = response.get_json()
        assert body is not None and body.get("data") is not None
        assert body["data"].get("attachment_url") is not None
        assert body["data"].get("attachment_name") == "attach.jpg"
