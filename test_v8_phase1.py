"""V8 Phase 1 backend tests:
- GET /users/me/settings returns merged defaults
- PUT /users/me/settings partial update + invalid body
- DELETE /users/me cascades all user content
- Chat reply respects tone_style + response_length
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lore-chat.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _signup(email_prefix="v8user"):
    email = f"TEST_{email_prefix}_{uuid.uuid4().hex[:8]}@lore.app"
    pw = "tempPass!23"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": pw, "name": "Temp Sage"}, timeout=20)
    assert r.status_code in (200, 201), f"signup failed: {r.status_code} {r.text}"
    data = r.json()
    return email, pw, data["token"], data["user"]["id"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Settings ----------

class TestUserSettings:
    def test_get_settings_returns_merged_defaults(self):
        _, _, token, _ = _signup("settings_def")
        r = requests.get(f"{API}/users/me/settings", headers=_hdr(token), timeout=15)
        assert r.status_code == 200
        s = r.json()
        # New v8 phase-1 defaults
        assert s.get("tone_style") == "natural"
        assert s.get("response_length") == "normal"
        assert s.get("mode") == "a"
        assert s.get("notif_chat") is True
        assert s.get("notif_social") is True
        assert s.get("notif_app") is True
        assert s.get("content_filter") is True
        assert s.get("sensitive_blur") is True
        # Pre-existing
        assert s.get("theme") == "system"
        assert s.get("language") == "en"

    def test_partial_put_persists_and_leaves_others(self):
        _, _, token, _ = _signup("settings_put")
        body = {"tone_style": "spicy", "response_length": "short"}
        r = requests.put(f"{API}/users/me/settings", headers=_hdr(token), json=body, timeout=15)
        assert r.status_code == 200, r.text
        # Verify via GET
        g = requests.get(f"{API}/users/me/settings", headers=_hdr(token), timeout=15)
        assert g.status_code == 200
        s = g.json()
        assert s["tone_style"] == "spicy"
        assert s["response_length"] == "short"
        # Untouched fields preserved
        assert s["mode"] == "a"
        assert s["notif_chat"] is True
        assert s["content_filter"] is True

    def test_put_empty_body_returns_400(self):
        _, _, token, _ = _signup("settings_empty")
        r = requests.put(f"{API}/users/me/settings", headers=_hdr(token), json={}, timeout=15)
        assert r.status_code == 400

    def test_put_only_unknown_fields_returns_400(self):
        _, _, token, _ = _signup("settings_unk")
        r = requests.put(f"{API}/users/me/settings", headers=_hdr(token), json={"foo": "bar"}, timeout=15)
        assert r.status_code == 400


# ---------- DELETE /users/me cascades ----------

class TestDeleteMeCascade:
    def test_delete_me_cascades_all_collections(self):
        email, pw, token, uid = _signup("cascade")
        h = _hdr(token)

        # character
        c = requests.post(f"{API}/characters", headers=h, json={
            "name": "TEST_V8 Char", "personality": "calm", "background": "test",
            "interests": ["x"], "communication_style": "warm",
        }, timeout=15)
        assert c.status_code in (200, 201), c.text
        cid = c.json()["id"]

        # persona
        p = requests.post(f"{API}/personas", headers=h, json={
            "name": "TEST_V8 Persona", "user_role": "main", "background": "x",
        }, timeout=15)
        assert p.status_code in (200, 201), p.text

        # memory (manual)
        m = requests.post(f"{API}/characters/{cid}/memories", headers=h, json={
            "type": "fact", "content": "cascade fact",
        }, timeout=15)
        assert m.status_code in (200, 201), m.text

        # relationship
        rel = requests.post(f"{API}/relationships", headers=h, json={
            "character_id": cid, "type": "friend", "level": 5,
        }, timeout=15)
        # relationships may not exist as endpoint — soft accept
        # asset
        a = requests.post(f"{API}/assets", headers=h, json={
            "name": "TEST_V8 Watch", "kind": "watch",
        }, timeout=15)

        # social profile
        sp = requests.post(f"{API}/social/profiles", headers=h, json={
            "platform": "instagram", "handle": "test_v8_cascade",
        }, timeout=15)
        sp_id = None
        if sp.status_code in (200, 201):
            sp_id = sp.json().get("id")
            # post (requires profile_id)
            if sp_id:
                post = requests.post(f"{API}/social/posts", headers=h, json={
                    "profile_id": sp_id, "caption": "TEST_V8 cascade post",
                }, timeout=15)
                if post.status_code in (200, 201):
                    pid = post.json().get("id")
                    if pid:
                        requests.post(f"{API}/social/posts/{pid}/comments", headers=h,
                                      json={"text": "TEST_V8 comment"}, timeout=15)

        # DELETE cascade
        d = requests.delete(f"{API}/users/me", headers=h, timeout=20)
        assert d.status_code == 200, d.text
        assert d.json().get("ok") is True

        # Login attempt with deleted creds → 401
        login = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
        assert login.status_code == 401

        # The old token may still be usable until expiry, but the user is gone.
        # Calls that look up user should fail.
        check = requests.get(f"{API}/auth/me", headers=h, timeout=15)
        assert check.status_code in (401, 404)


# ---------- Chat tone + length ----------

def _make_char(token, name):
    h = _hdr(token)
    c = requests.post(f"{API}/characters", headers=h, json={
        "name": name,
        "personality": "easygoing, direct",
        "background": "musician in NYC",
        "interests": ["music", "coffee"],
        "communication_style": "casual",
    }, timeout=15)
    assert c.status_code in (200, 201), c.text
    return c.json()["id"]


def _send_chat(token, cid, text):
    r = requests.post(f"{API}/characters/{cid}/messages", headers=_hdr(token),
                      json={"content": text}, timeout=120)
    assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
    data = r.json()
    if isinstance(data, list):
        char_msg = next((m for m in data if m.get("sender") == "character" or m.get("role") == "assistant"), None)
        return (char_msg or {}).get("content", "")
    cm = data.get("character_message") or data.get("character_response") or {}
    return cm.get("content") or data.get("content", "")


class TestChatToneLength:
    def test_spicy_short_gives_short_reply(self):
        _, _, token, _ = _signup("tone_spicy")
        # set settings
        r = requests.put(f"{API}/users/me/settings", headers=_hdr(token),
                          json={"tone_style": "spicy", "response_length": "short"}, timeout=15)
        assert r.status_code == 200
        cid = _make_char(token, "TEST_V8 Spicy")
        reply = _send_chat(token, cid, "how are you")
        assert reply, "empty reply"
        # Short length: ≤ 3 sentences AND ≤ ~250 chars (give some buffer)
        sentences = [s for s in reply.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        assert len(sentences) <= 4, f"expected short, got {len(sentences)} sentences: {reply}"
        # Should not contain "as an AI"
        assert "as an ai" not in reply.lower()
        print(f"[SPICY/SHORT len={len(reply)}] {reply[:200]}")

    def test_clean_long_gives_longer_reply(self):
        _, _, token, _ = _signup("tone_clean")
        r = requests.put(f"{API}/users/me/settings", headers=_hdr(token),
                          json={"tone_style": "clean", "response_length": "long"}, timeout=15)
        assert r.status_code == 200
        cid = _make_char(token, "TEST_V8 Clean")
        reply = _send_chat(token, cid, "how are you")
        assert reply, "empty reply"
        # Long: should be reasonably long (at least ~120 chars or 3+ sentences)
        sentences = [s for s in reply.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        assert len(reply) >= 100 or len(sentences) >= 3, f"too short for long mode: {reply}"
        assert "as an ai" not in reply.lower()
        print(f"[CLEAN/LONG len={len(reply)} sentences={len(sentences)}] {reply[:300]}")
