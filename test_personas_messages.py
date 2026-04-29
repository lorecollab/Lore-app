"""LORÉ v3 backend tests: Personas CRUD, Chat settings (active persona),
Message versions backfill, Regenerate, PATCH edit + version switching.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


def _signup(name="Persona User"):
    email = f"TEST_{uuid.uuid4().hex[:8]}@lore.app"
    r = requests.post(f"{API}/auth/signup",
                      json={"email": email, "password": "testpass123", "name": name},
                      timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["token"], d["user"], email


@pytest.fixture(scope="module")
def ua():
    tk, u, e = _signup("PA")
    h = {"Authorization": f"Bearer {tk}"}
    # create public character for tests
    r = requests.post(f"{API}/characters",
                      json={"name": "TEST_PChar", "description": "x",
                            "personality": "warm, curious", "is_public": True},
                      headers=h, timeout=20)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    return {"token": tk, "user": u, "email": e, "headers": h, "char_id": cid}


@pytest.fixture(scope="module")
def ub():
    tk, u, e = _signup("PB")
    return {"token": tk, "user": u, "email": e,
            "headers": {"Authorization": f"Bearer {tk}"}}


PERSONA_FULL = {
    "name": "TEST_Aria",
    "age": "27", "gender": "female", "pronouns": "she/her",
    "height": "5'6", "ethnicity": "mixed", "appearance": "freckles, green eyes",
    "hair_color": "auburn", "hairstyle": "shoulder-length waves",
    "dress_code": "vintage cardigans + jeans",
    "personality": "wry, gentle, perceptive",
    "background": "ex-archivist turned writer",
    "family": "one younger brother",
    "relationship_status": "single",
    "occupation": "freelance writer",
    "money_situation": "modest",
    "place_of_birth": "Porto",
    "current_location": "Lisbon",
    "extra_details": "loves rainy windows",
    "definition": "Aria moves slowly through the world. She listens.",
}


# --- Personas CRUD ---
class TestPersonasCRUD:
    def test_create_persona_full(self, ua):
        r = requests.post(f"{API}/personas", json=PERSONA_FULL,
                          headers=ua["headers"], timeout=20)
        assert r.status_code == 200, r.text
        p = r.json()
        for k, v in PERSONA_FULL.items():
            assert p.get(k) == v, f"{k} mismatch: {p.get(k)!r} != {v!r}"
        assert p["user_id"] == ua["user"]["id"]
        assert p["id"] and p["created_at"] and p["updated_at"]
        ua["persona_id"] = p["id"]

    def test_list_personas_user_only(self, ua, ub):
        r = requests.get(f"{API}/personas", headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert any(p["id"] == ua["persona_id"] for p in items)
        # ub should not see ua's personas
        r2 = requests.get(f"{API}/personas", headers=ub["headers"], timeout=15)
        assert r2.status_code == 200
        assert all(p["id"] != ua["persona_id"] for p in r2.json())

    def test_get_persona_owner_only(self, ua, ub):
        r = requests.get(f"{API}/personas/{ua['persona_id']}",
                         headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/personas/{ua['persona_id']}",
                          headers=ub["headers"], timeout=15)
        assert r2.status_code == 404

    def test_update_persona(self, ua):
        upd = {**PERSONA_FULL, "occupation": "novelist", "extra_details": "tea over coffee"}
        r = requests.put(f"{API}/personas/{ua['persona_id']}", json=upd,
                         headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["occupation"] == "novelist"
        assert body["extra_details"] == "tea over coffee"
        # GET verify persistence
        g = requests.get(f"{API}/personas/{ua['persona_id']}",
                         headers=ua["headers"], timeout=15).json()
        assert g["occupation"] == "novelist"

    def test_definition_over_32k_rejected(self, ua):
        big = {**PERSONA_FULL, "name": "TEST_Big", "definition": "x" * 32001}
        r = requests.post(f"{API}/personas", json=big,
                          headers=ua["headers"], timeout=20)
        assert r.status_code == 400

    def test_definition_at_32k_accepted(self, ua):
        ok = {**PERSONA_FULL, "name": "TEST_AtCap", "definition": "y" * 32000}
        r = requests.post(f"{API}/personas", json=ok,
                          headers=ua["headers"], timeout=20)
        assert r.status_code == 200
        # cleanup
        requests.delete(f"{API}/personas/{r.json()['id']}",
                        headers=ua["headers"], timeout=15)


# --- Chat settings ---
class TestChatSettings:
    def test_get_settings_default_null(self, ua):
        r = requests.get(f"{API}/characters/{ua['char_id']}/settings",
                         headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        body = r.json()
        # Defaults: persona unset, all context toggles ON, customization defaults
        assert body["active_persona_id"] is None
        for k in ("ctx_social", "ctx_relationships", "ctx_lifestyle",
                   "ctx_memories", "ctx_activities", "ctx_tags", "glow_enabled"):
            assert body.get(k) is True, f"{k} should default to True, got {body.get(k)}"
        assert body["typing_style"] == "auto"
        assert body["animation_speed"] == 1.0

    def test_set_persona_other_user_404(self, ua, ub):
        # ub tries to set ua's persona on a (public) char visible to ub
        r = requests.put(f"{API}/characters/{ua['char_id']}/settings",
                         json={"active_persona_id": ua["persona_id"]},
                         headers=ub["headers"], timeout=15)
        assert r.status_code == 404

    def test_set_and_get_active_persona(self, ua):
        r = requests.put(f"{API}/characters/{ua['char_id']}/settings",
                         json={"active_persona_id": ua["persona_id"]},
                         headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["active_persona_id"] == ua["persona_id"]
        g = requests.get(f"{API}/characters/{ua['char_id']}/settings",
                         headers=ua["headers"], timeout=15).json()
        assert g["active_persona_id"] == ua["persona_id"]


# --- Send message + persona awareness ---
class TestPersonaAwareSend:
    def test_send_with_persona_returns_in_character(self, ua):
        r = requests.post(f"{API}/characters/{ua['char_id']}/messages",
                          json={"content": "Hi! Who am I to you?"},
                          headers=ua["headers"], timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        cm = d["character_message"]
        reply_l = cm["content"].lower()
        for banned in ["as an ai", "language model", "i am an ai", "i'm an ai"]:
            assert banned not in reply_l
        assert cm["role"] == "character"
        # messages should have versions auto-populated
        assert isinstance(cm.get("versions"), list) and len(cm["versions"]) >= 1
        assert cm["active_version"] == 0
        ua["last_char_msg_id"] = cm["id"]
        ua["last_user_msg_id"] = d["user_message"]["id"]


# --- Versions backfill via list ---
class TestVersionsBackfill:
    def test_list_messages_have_versions(self, ua):
        r = requests.get(f"{API}/characters/{ua['char_id']}/messages",
                         headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert msgs, "no messages"
        for m in msgs:
            assert isinstance(m["versions"], list) and len(m["versions"]) >= 1
            assert m["active_version"] >= 0
            assert m["versions"][m["active_version"]]["content"] == m["content"]


# --- Regenerate ---
class TestRegenerate:
    def test_regenerate_user_msg_400(self, ua):
        r = requests.post(f"{API}/messages/{ua['last_user_msg_id']}/regenerate",
                          headers=ua["headers"], timeout=180)
        assert r.status_code == 400

    def test_regenerate_char_msg_creates_version(self, ua):
        mid = ua["last_char_msg_id"]
        # current count
        before = requests.get(f"{API}/characters/{ua['char_id']}/messages",
                              headers=ua["headers"], timeout=15).json()
        prev = next(m for m in before if m["id"] == mid)
        prev_count = len(prev["versions"])

        r = requests.post(f"{API}/messages/{mid}/regenerate",
                          headers=ua["headers"], timeout=180)
        assert r.status_code == 200, r.text
        m = r.json()
        assert len(m["versions"]) == prev_count + 1
        assert m["active_version"] == len(m["versions"]) - 1
        assert m["content"] == m["versions"][m["active_version"]]["content"]

    def test_regenerate_unknown_404(self, ua):
        r = requests.post(f"{API}/messages/{uuid.uuid4()}/regenerate",
                          headers=ua["headers"], timeout=30)
        assert r.status_code == 404


# --- Edit / switch active version ---
class TestEditMessage:
    def test_switch_active_version(self, ua):
        mid = ua["last_char_msg_id"]
        r = requests.patch(f"{API}/messages/{mid}",
                           json={"active_version": 0},
                           headers=ua["headers"], timeout=15)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["active_version"] == 0
        assert m["content"] == m["versions"][0]["content"]

    def test_switch_invalid_index_400(self, ua):
        mid = ua["last_char_msg_id"]
        r = requests.patch(f"{API}/messages/{mid}",
                           json={"active_version": 99},
                           headers=ua["headers"], timeout=15)
        assert r.status_code == 400

    def test_edit_active_version_content(self, ua):
        mid = ua["last_char_msg_id"]
        new = "TEST_EDITED reply by user."
        r = requests.patch(f"{API}/messages/{mid}",
                           json={"content": new},
                           headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        m = r.json()
        assert m["content"] == new
        assert m["versions"][m["active_version"]]["edited"] is True
        # GET verify persistence
        g = requests.get(f"{API}/characters/{ua['char_id']}/messages",
                         headers=ua["headers"], timeout=15).json()
        gm = next(x for x in g if x["id"] == mid)
        assert gm["content"] == new
        assert gm["versions"][gm["active_version"]]["edited"] is True

    def test_edit_unknown_404(self, ua):
        r = requests.patch(f"{API}/messages/{uuid.uuid4()}",
                           json={"content": "x"},
                           headers=ua["headers"], timeout=15)
        assert r.status_code == 404


# --- Delete persona unsets settings ---
class TestZDeletePersonaCascade:
    def test_delete_persona_unsets_active(self, ua):
        # ensure it's currently set
        s = requests.get(f"{API}/characters/{ua['char_id']}/settings",
                         headers=ua["headers"], timeout=15).json()
        assert s["active_persona_id"] == ua["persona_id"]
        r = requests.delete(f"{API}/personas/{ua['persona_id']}",
                            headers=ua["headers"], timeout=15)
        assert r.status_code == 200
        s2 = requests.get(f"{API}/characters/{ua['char_id']}/settings",
                          headers=ua["headers"], timeout=15).json()
        assert s2["active_persona_id"] in (None, "")
        # GET deleted persona returns 404
        g = requests.get(f"{API}/personas/{ua['persona_id']}",
                         headers=ua["headers"], timeout=15)
        assert g.status_code == 404

    def test_delete_persona_404_unknown(self, ua):
        r = requests.delete(f"{API}/personas/{uuid.uuid4()}",
                            headers=ua["headers"], timeout=15)
        assert r.status_code == 404

    def test_zz_cleanup_character(self, ua):
        requests.delete(f"{API}/characters/{ua['char_id']}",
                        headers=ua["headers"], timeout=15)
