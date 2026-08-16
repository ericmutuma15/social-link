import importlib
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


def _fresh_app_module():
    for module_name in ["app", "models"]:
        if module_name in sys.modules:
            del sys.modules[module_name]
    return importlib.import_module("app")


def test_user_can_update_privacy_settings():
    app_module = _fresh_app_module()

    with app_module.app.app_context():
        app_module.db.drop_all()
        app_module.db.create_all()
        user = app_module.ensure_default_user()
        token = app_module.create_access_token(user.id)

    with app_module.app.test_client() as client:
        response = client.patch(
            "/api/privacy",
            json={
                "profile_visibility": "friends",
                "allow_friend_requests": False,
                "show_online_status": False,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200, response.get_data(as_text=True)
        payload = response.get_json()
        assert payload["data"]["privacy"]["profile_visibility"] == "friends"
        assert payload["data"]["privacy"]["allow_friend_requests"] is False

        with app_module.app.app_context():
            saved = app_module.User.query.get(user.id)
            assert saved.settings["privacy"]["profile_visibility"] == "friends"
            assert saved.settings["privacy"]["show_online_status"] is False


def test_user_can_block_and_unblock_another_user():
    app_module = _fresh_app_module()

    with app_module.app.app_context():
        app_module.db.drop_all()
        app_module.db.create_all()
        actor = app_module.ensure_default_user()
        target = app_module.User(name="Blocked User", email="blocked@example.com", password="StrongPassword123!", is_verified=True)
        app_module.db.session.add(target)
        app_module.db.session.commit()
        target_id = target.id
        token = app_module.create_access_token(actor.id)

    with app_module.app.test_client() as client:
        response = client.post(
            f"/api/blocks/{target_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201, response.get_data(as_text=True)
        list_response = client.get("/api/blocks", headers={"Authorization": f"Bearer {token}"})
        assert list_response.status_code == 200
        items = list_response.get_json()["data"]["items"]
        assert any(item["id"] == target.id for item in items)

        delete_response = client.delete(
            f"/api/blocks/{target.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_response.status_code == 200

        final_list = client.get("/api/blocks", headers={"Authorization": f"Bearer {token}"})
        assert final_list.status_code == 200
        assert final_list.get_json()["data"]["items"] == []
