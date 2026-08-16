import os
import importlib
import io


def test_story_upload_saves_media(tmp_path):
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
        app_module.db.drop_all()
        app_module.db.create_all()

        user = app_module.ensure_default_user()
        token = app_module.create_access_token(user.id)

    media_path = tmp_path / 'video.mp4'
    thumb_path = tmp_path / 'thumb.jpg'
    media_path.write_bytes(b'FAKEVIDEO')
    thumb_path.write_bytes(b'FAKETHUMB')

    with app_module.app.test_client() as client:
        with open(media_path, 'rb') as mf, open(thumb_path, 'rb') as tf:
            data = {
                'media': (mf, 'video.mp4'),
                'thumbnail': (tf, 'thumb.jpg'),
            }
            headers = {'Authorization': f"Bearer {token}"}
            resp = client.post('/api/stories', data=data, content_type='multipart/form-data', headers=headers)
            assert resp.status_code == 201
            body = resp.get_json()
            assert body is not None and body.get('media_url')
            assert body.get('thumbnail_url')


def test_expired_stories_are_hidden_from_feed():
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    import sys
    for m in ("app", "models"):
        if m in sys.modules:
            del sys.modules[m]
    app_module = importlib.import_module("app")

    with app_module.app.app_context():
        app_module.db.drop_all()
        app_module.db.create_all()
        user = app_module.ensure_default_user()
        token = app_module.create_access_token(user.id)
        expired = app_module.Story(
            user_id=user.id,
            content='old',
            media_type='text',
            expires_at=app_module.datetime.utcnow() - app_module.timedelta(days=2),
        )
        live = app_module.Story(
            user_id=user.id,
            content='fresh',
            media_type='text',
            expires_at=app_module.datetime.utcnow() + app_module.timedelta(hours=1),
        )
        app_module.db.session.add_all([expired, live])
        app_module.db.session.commit()

    with app_module.app.test_client() as client:
        resp = client.get('/api/stories', headers={'Authorization': f"Bearer {token}"})
        assert resp.status_code == 200
        stories = resp.get_json()
        assert all(item['content'] != 'old' for item in stories)
        assert any(item['content'] == 'fresh' for item in stories)

