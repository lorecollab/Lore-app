"""LORÉ Backend API tests - auth, characters, chat+memory, isolation, upload, discover, public access."""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# 1x1 png bytes (valid)
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
    b"\xc0\xf0\x1f\x00\x05\x00\x01\xff\x8fG\xd4F\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _signup(name="Test Sage"):
    email = f"TEST_{uuid.uuid4().hex[:8]}@lore.app"
    r = requests.post(f"{API}/auth/signup",
                      json={"email": email, "password": "testpass123", "name": name}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"], email


@pytest.fixture(scope="module")
def user_a():
    token, user, email = _signup("User A")
    return {"token": token, "user": user, "email": email,
            "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="module")
def user_b():
    token, user, email = _signup("User B")
    return {"token": token, "user": user, "email": email,
            "headers": {"Authorization": f"Bearer {token}"}}


# --- Auth tests ---
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("app") == "LORÉ"

    def test_signup_returns_token_user(self, user_a):
        assert user_a["token"]
        assert user_a["user"]["email"] == user_a["email"].lower()
        assert user_a["user"]["name"] == "User A"
        assert "id" in user_a["user"]

    def test_signup_duplicate_email(self, user_a):
        r = requests.post(f"{API}/auth/signup",
                          json={"email": user_a["email"], "password": "x", "name": "dup"}, timeout=15)
        assert r.status_code == 400

    def test_login_success(self, user_a):
        r = requests.post(f"{API}/auth/login",
                          json={"email": user_a["email"], "password": "testpass123"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["id"] == user_a["user"]["id"]

    def test_login_bad_password(self, user_a):
        r = requests.post(f"{API}/auth/login",
                          json={"email": user_a["email"], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_requires_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_me_returns_user(self, user_a):
        r = requests.get(f"{API}/auth/me", headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == user_a["user"]["id"]


# --- File upload and serving ---
class TestUploadAndFiles:
    def test_upload_requires_auth(self):
        files = {"file": ("t.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/upload?folder=avatars", files=files, timeout=30)
        assert r.status_code in (401, 403)

    def test_upload_avatar_success(self, user_a):
        files = {"file": ("t.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/upload?folder=avatars",
                          files=files, headers=user_a["headers"], timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "path" in data and data["path"]
        assert data["content_type"] == "image/png"
        assert isinstance(data["size"], int) and data["size"] > 0
        user_a["avatar_path"] = data["path"]

    def test_upload_rejects_bad_type(self, user_a):
        files = {"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(f"{API}/upload?folder=avatars",
                          files=files, headers=user_a["headers"], timeout=30)
        assert r.status_code == 400

    def test_files_requires_auth(self, user_a):
        path = user_a.get("avatar_path")
        if not path:
            pytest.skip("avatar not uploaded")
        r = requests.get(f"{API}/files/{path}", timeout=30)
        assert r.status_code == 401

    def test_files_bearer_auth(self, user_a):
        path = user_a.get("avatar_path")
        if not path:
            pytest.skip("avatar not uploaded")
        r = requests.get(f"{API}/files/{path}", headers=user_a["headers"], timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 0

    def test_files_query_auth(self, user_a):
        path = user_a.get("avatar_path")
        if not path:
            pytest.skip("avatar not uploaded")
        r = requests.get(f"{API}/files/{path}?auth={user_a['token']}", timeout=60)
        assert r.status_code == 200

    def test_files_404_for_unknown(self, user_a):
        r = requests.get(f"{API}/files/lore/avatars/{user_a['user']['id']}/nope-{uuid.uuid4()}.png",
                         headers=user_a["headers"], timeout=30)
        assert r.status_code == 404


# --- Character CRUD w/ new fields ---
class TestCharacters:
    def test_create_character_full(self, user_a):
        payload = {
            "name": "TEST_Elara",
            "description": "quiet archivist of a lost city",
            "avatar_path": user_a.get("avatar_path", ""),
            "age": "231", "role": "archivist", "personality": "quiet, thoughtful",
            "speech_style": "measured, poetic", "core_traits": "loyal, curious",
            "background": "librarian of a lost city", "relationships": "estranged sister",
            "habits": "hums softly", "boundaries": "no violence",
            "initial_scene": "a moonlit library",
            "greetings": ["*looks up from a book*", "You came back."],
            "example_messages": ["Come, sit. The lamp is warm.", "I've been thinking of the river."],
            "is_public": True,
        }
        r = requests.post(f"{API}/characters", json=payload,
                          headers=user_a["headers"], timeout=20)
        assert r.status_code == 200, r.text
        c = r.json()
        # Validate all new fields round-trip
        assert c["description"] == payload["description"]
        assert c["avatar_path"] == payload["avatar_path"]
        assert c["greetings"] == payload["greetings"]
        assert c["example_messages"] == payload["example_messages"]
        assert c["is_public"] is True
        assert c["user_id"] == user_a["user"]["id"]
        user_a["char_id"] = c["id"]

    def test_list_characters(self, user_a):
        r = requests.get(f"{API}/characters", headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        assert any(c["id"] == user_a["char_id"] for c in r.json())

    def test_get_character(self, user_a):
        r = requests.get(f"{API}/characters/{user_a['char_id']}",
                         headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Elara"

    def test_update_character_preserves_new_fields(self, user_a):
        r = requests.put(f"{API}/characters/{user_a['char_id']}",
                         json={
                             "name": "TEST_Elara",
                             "description": "updated desc",
                             "personality": "wry, guarded",
                             "greetings": ["hi again"],
                             "example_messages": ["ex1"],
                             "is_public": True,
                         },
                         headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["personality"] == "wry, guarded"
        assert body["description"] == "updated desc"
        assert body["greetings"] == ["hi again"]
        assert body["example_messages"] == ["ex1"]
        assert body["is_public"] is True
        g = requests.get(f"{API}/characters/{user_a['char_id']}",
                         headers=user_a["headers"], timeout=15).json()
        assert g["description"] == "updated desc"
        assert g["greetings"] == ["hi again"]


# --- Public discovery + cross-user public chat ---
class TestDiscoverAndPublic:
    def test_discover_requires_auth(self):
        r = requests.get(f"{API}/discover", timeout=15)
        assert r.status_code in (401, 403)

    def test_discover_returns_public(self, user_b, user_a):
        r = requests.get(f"{API}/discover", headers=user_b["headers"], timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # user_a's public char should be visible to user_b
        assert any(c["id"] == user_a["char_id"] and c["is_public"] for c in items)

    def test_non_owner_can_read_public_character(self, user_a, user_b):
        r = requests.get(f"{API}/characters/{user_a['char_id']}/messages",
                         headers=user_b["headers"], timeout=15)
        assert r.status_code == 200
        # user_b has no messages for this char yet
        assert r.json() == []

    def test_non_owner_can_post_to_public_character(self, user_a, user_b):
        r = requests.post(f"{API}/characters/{user_a['char_id']}/messages",
                          json={"content": "Hi, I'm visiting."},
                          headers=user_b["headers"], timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["character_message"]["role"] == "character"
        # messages are per-user: user_a should NOT see user_b's messages
        r2 = requests.get(f"{API}/characters/{user_a['char_id']}/messages",
                          headers=user_a["headers"], timeout=15)
        a_msgs = r2.json()
        assert all(m["user_id"] == user_a["user"]["id"] for m in a_msgs)

    def test_non_owner_404_on_private(self, user_a, user_b):
        # user_b creates a private character, user_a should get 404
        r = requests.post(f"{API}/characters",
                          json={"name": "TEST_Private", "is_public": False},
                          headers=user_b["headers"], timeout=15)
        assert r.status_code == 200
        priv_id = r.json()["id"]
        r = requests.get(f"{API}/characters/{priv_id}",
                         headers=user_a["headers"], timeout=15)
        assert r.status_code == 404
        r = requests.get(f"{API}/characters/{priv_id}/messages",
                         headers=user_a["headers"], timeout=15)
        assert r.status_code == 404
        r = requests.post(f"{API}/characters/{priv_id}/messages",
                          json={"content": "hack"}, headers=user_a["headers"], timeout=30)
        assert r.status_code == 404


# --- Chat + Memory (LLM) ---
class TestChatAndMemory:
    def test_send_message_and_ai_stays_in_character(self, user_a):
        cid = user_a["char_id"]
        r = requests.post(f"{API}/characters/{cid}/messages",
                          json={"content": "Hello Elara, what are you reading tonight? My name is Sage."},
                          headers=user_a["headers"], timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user_message" in data and "character_message" in data
        reply = data["character_message"]["content"].lower()
        for banned in ["as an ai", "i am an ai", "language model",
                       "i'm an ai", "i am an assistant", "as a language model"]:
            assert banned not in reply, f"AI broke character: '{banned}' in: {reply[:200]}"
        # [IMAGE: ...] tag must be stripped from final content
        assert "[image:" not in reply
        assert data["character_message"]["role"] == "character"
        assert data.get("scene") is not None

    def test_send_message_with_image_path(self, user_a):
        cid = user_a["char_id"]
        img_path = user_a.get("avatar_path") or ""
        r = requests.post(f"{API}/characters/{cid}/messages",
                          json={"content": "look what I found", "image_path": img_path},
                          headers=user_a["headers"], timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_message"]["image_path"] == img_path
        # char_image_path may or may not be set (best-effort) - just assert field exists
        assert "image_path" in data["character_message"]

    def test_list_messages(self, user_a):
        cid = user_a["char_id"]
        r = requests.get(f"{API}/characters/{cid}/messages",
                         headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 4
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "character" in roles

    def test_list_memories(self, user_a):
        cid = user_a["char_id"]
        r = requests.get(f"{API}/characters/{cid}/memories",
                         headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        mems = r.json()
        if mems:
            m = mems[0]
            assert m["type"] in ["event", "relationship", "emotion", "fact", "story"]
            user_a["mem_id"] = m["id"]

    def test_delete_memory(self, user_a):
        if not user_a.get("mem_id"):
            pytest.skip("no memory extracted to delete")
        cid = user_a["char_id"]
        mid = user_a["mem_id"]
        r = requests.delete(f"{API}/characters/{cid}/memories/{mid}",
                            headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/characters/{cid}/memories",
                         headers=user_a["headers"], timeout=15)
        assert not any(m["id"] == mid for m in r.json())


# --- Recent chats includes non-owned chatted chars ---
class TestRecentChats:
    def test_recent_includes_chatted_public(self, user_b, user_a):
        # user_b chatted with user_a's public character earlier
        r = requests.get(f"{API}/chats/recent", headers=user_b["headers"], timeout=15)
        assert r.status_code == 200
        items = r.json()
        ids = [i["character"]["id"] for i in items]
        assert user_a["char_id"] in ids, f"Non-owned chatted public char not in recent: {ids}"


# --- Cleanup: delete character cascades ---
class TestZCleanup:
    def test_delete_character_cascades(self, user_a):
        cid = user_a["char_id"]
        r = requests.delete(f"{API}/characters/{cid}",
                            headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/characters/{cid}",
                         headers=user_a["headers"], timeout=15)
        assert r.status_code == 404
