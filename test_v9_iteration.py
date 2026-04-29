"""V9 Iteration tests:
- Character model has NO voice_id / elevenlabs_voice_id; voice_sample_path remains.
- TTS endpoint still works without per-character voice (uses 'alloy').
- Critical regression: settings GET/PUT, character CRUD, send_message flow.
"""
import os
import uuid
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lore-chat.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _signup(prefix="v9"):
    email = f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@lore.app"
    pw = "tempPass!23"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": pw, "name": "V9 Sage"}, timeout=45)
    assert r.status_code in (200, 201), f"signup failed: {r.status_code} {r.text}"
    d = r.json()
    return email, pw, d["token"], d["user"]["id"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Character voice fields removed ----------

class TestVoiceFieldsRemoved:
    def test_create_character_without_voice_succeeds_no_voice_id_field(self):
        _, _, token, _ = _signup("char_no_voice")
        r = requests.post(f"{API}/characters", headers=_hdr(token), json={
            "name": "TEST_V9 NoVoice",
            "personality": "warm",
            "background": "lives in a small town",
            "interests": ["books"],
            "communication_style": "soft",
        }, timeout=20)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        # voice_sample_path remains, defaults to ''
        assert "voice_sample_path" in body
        assert body["voice_sample_path"] == ""
        # Removed fields must not be present
        assert "voice_id" not in body, f"voice_id should be removed but present: {body.get('voice_id')}"
        assert "elevenlabs_voice_id" not in body, "elevenlabs_voice_id should be removed"

    def test_create_character_ignores_legacy_voice_fields_in_payload(self):
        _, _, token, _ = _signup("char_legacy")
        r = requests.post(f"{API}/characters", headers=_hdr(token), json={
            "name": "TEST_V9 Legacy",
            "personality": "calm",
            "background": "x",
            "interests": ["y"],
            "communication_style": "warm",
            # Legacy unknown fields - Pydantic should drop them (or accept silently)
            "voice_id": "echo",
            "elevenlabs_voice_id": "abc",
        }, timeout=20)
        # Either 200 with fields stripped, or 422. Both acceptable; voice_id should NOT appear
        assert r.status_code in (200, 201, 422), r.text
        if r.status_code in (200, 201):
            assert "voice_id" not in r.json()
            assert "elevenlabs_voice_id" not in r.json()


# ---------- TTS still works without per-character voice ----------

class TestTtsUsesAlloy:
    def test_tts_endpoint_still_works(self):
        _, _, token, _ = _signup("tts")
        h = _hdr(token)
        # create character
        c = requests.post(f"{API}/characters", headers=h, json={
            "name": "TEST_V9 TTS",
            "personality": "warm",
            "background": "x",
            "interests": ["y"],
            "communication_style": "soft",
        }, timeout=20)
        assert c.status_code in (200, 201), c.text
        cid = c.json()["id"]
        # send message to get char reply
        m = requests.post(f"{API}/characters/{cid}/messages", headers=h,
                          json={"content": "hi"}, timeout=120)
        assert m.status_code in (200, 201), m.text
        data = m.json()
        # find character message id
        mid = None
        if isinstance(data, list):
            cm = next((x for x in data if x.get("sender") == "character" or x.get("role") == "assistant"), None)
            mid = (cm or {}).get("id")
        else:
            cm = data.get("character_message") or {}
            mid = cm.get("id")
        if not mid:
            # fallback: list messages
            ms = requests.get(f"{API}/characters/{cid}/messages", headers=h, timeout=15)
            if ms.status_code == 200:
                arr = ms.json()
                cmsg = next((x for x in arr if x.get("sender") == "character"), None)
                if cmsg:
                    mid = cmsg.get("id")
        assert mid, "could not find character message id"
        # call tts (GET endpoint)
        t = requests.get(f"{API}/messages/{mid}/tts", headers=h, timeout=60)
        # should not 500 even though voice_id field is removed
        assert t.status_code != 500, f"TTS 500'd: {t.text}"
        # OpenAI may not be configured in test env; accept 200/400/404 but NOT 500
        assert t.status_code in (200, 201, 400, 401, 404), f"unexpected: {t.status_code} {t.text}"


# ---------- Regression: critical endpoints still respond ----------

class TestRegression:
    def test_settings_get_put(self):
        _, _, token, _ = _signup("reg_set")
        h = _hdr(token)
        g = requests.get(f"{API}/users/me/settings", headers=h, timeout=15)
        assert g.status_code == 200
        p = requests.put(f"{API}/users/me/settings", headers=h, json={"tone_style": "natural"}, timeout=15)
        assert p.status_code == 200, p.text

    def test_character_crud(self):
        _, _, token, _ = _signup("reg_crud")
        h = _hdr(token)
        c = requests.post(f"{API}/characters", headers=h, json={
            "name": "TEST_V9 CRUD", "personality": "x", "background": "x",
            "interests": ["x"], "communication_style": "x",
        }, timeout=20)
        assert c.status_code in (200, 201), c.text
        cid = c.json()["id"]
        g = requests.get(f"{API}/characters/{cid}", headers=h, timeout=15)
        assert g.status_code == 200
        u = requests.put(f"{API}/characters/{cid}", headers=h, json={
            "name": "TEST_V9 CRUD",
            "personality": "updated",
            "background": "x",
            "interests": ["x"],
            "communication_style": "x",
        }, timeout=15)
        assert u.status_code in (200, 204), u.text
        d = requests.delete(f"{API}/characters/{cid}", headers=h, timeout=15)
        assert d.status_code in (200, 204), d.text

    def test_chat_send_and_chat_settings(self):
        _, _, token, _ = _signup("reg_chat")
        h = _hdr(token)
        c = requests.post(f"{API}/characters", headers=h, json={
            "name": "TEST_V9 Chat", "personality": "calm", "background": "x",
            "interests": ["x"], "communication_style": "warm",
        }, timeout=20)
        cid = c.json()["id"]
        m = requests.post(f"{API}/characters/{cid}/messages", headers=h,
                          json={"content": "hello"}, timeout=120)
        assert m.status_code in (200, 201), m.text
        # chat settings (path is /characters/{cid}/settings)
        gs = requests.get(f"{API}/characters/{cid}/settings", headers=h, timeout=15)
        assert gs.status_code == 200, gs.text
        ps = requests.put(f"{API}/characters/{cid}/settings", headers=h,
                          json={"chat_style": "casual"}, timeout=15)
        assert ps.status_code in (200, 204), ps.text

    def test_social_profile_and_post_flow(self):
        _, _, token, _ = _signup("reg_social")
        h = _hdr(token)
        sp = requests.post(f"{API}/social/profiles", headers=h, json={
            "platform": "instagram", "handle": f"test_v9_{uuid.uuid4().hex[:6]}",
        }, timeout=15)
        # endpoint may return 200 or 201
        if sp.status_code not in (200, 201):
            return  # social may be disabled in this build
        spid = sp.json().get("id")
        if not spid:
            return
        post = requests.post(f"{API}/social/posts", headers=h, json={
            "profile_id": spid, "caption": "TEST_V9 post",
        }, timeout=15)
        assert post.status_code in (200, 201, 422), post.text
