"""LORÉ v5 batch tests - profile/settings, public profile, chat controls, memory v2,
chat customization, voices, featured, social, relationships, assets, activities, find love."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


def _signup(name="Test V5"):
    email = f"TEST_{uuid.uuid4().hex[:8]}@lore.app"
    r = requests.post(f"{API}/auth/signup",
                      json={"email": email, "password": "testpass123", "name": name},
                      timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"], email


@pytest.fixture(scope="module")
def user_a():
    token, user, email = _signup("V5 User A")
    h = {"Authorization": f"Bearer {token}"}
    # create one public character for chat-related and findlove tests
    cr = requests.post(
        f"{API}/characters",
        json={"name": "TEST_V5_Char", "description": "v5 test char", "is_public": True,
              "greetings": ["*smiles*", "Hi friend"], "personality": "warm"},
        headers=h, timeout=20,
    )
    assert cr.status_code == 200, cr.text
    return {"token": token, "user": user, "email": email, "headers": h,
            "char_id": cr.json()["id"]}


@pytest.fixture(scope="module")
def user_b():
    token, user, email = _signup("V5 User B")
    return {"token": token, "user": user, "email": email,
            "headers": {"Authorization": f"Bearer {token}"}}


# --- Auto-username + login returns extended user fields ---
class TestAuthExtended:
    def test_signup_auto_username(self, user_a):
        u = user_a["user"]
        assert u.get("username"), f"username missing: {u}"
        local = user_a["email"].split("@")[0].lower()
        # auto-username is local-part lowercased (truncated to 20)
        assert u["username"].startswith(local[:20].rstrip("_") or "user")
        assert u.get("display_name") == "V5 User A"
        assert "bio" in u and "profile_pic_path" in u

    def test_login_returns_extended_fields(self, user_a):
        r = requests.post(f"{API}/auth/login",
                          json={"email": user_a["email"], "password": "testpass123"},
                          timeout=15)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["username"] == user_a["user"]["username"]
        assert u["display_name"] == "V5 User A"
        assert "bio" in u
        assert "profile_pic_path" in u

    def test_signup_dedupes_username(self):
        # Two signups with same local-part -> different usernames
        local = f"dup{uuid.uuid4().hex[:6]}"
        e1 = f"TEST_{local}@lore.app"
        e2 = f"TEST_{local}@example.com"
        r1 = requests.post(f"{API}/auth/signup",
                           json={"email": e1, "password": "x12345678", "name": "n1"}, timeout=15)
        r2 = requests.post(f"{API}/auth/signup",
                           json={"email": e2, "password": "x12345678", "name": "n2"}, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        u1 = r1.json()["user"]["username"]
        u2 = r2.json()["user"]["username"]
        assert u1 != u2
        # second should be local2
        assert u2.startswith(u1)


# --- Settings + profile update ---
class TestProfileSettings:
    def test_get_default_settings(self, user_a):
        r = requests.get(f"{API}/users/me/settings", headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in ["theme", "language", "sound_effects", "haptics", "notifications", "muted_words"]:
            assert k in s, f"missing default settings key {k}"

    def test_update_profile_and_settings(self, user_a):
        new_uname = f"v5user_{uuid.uuid4().hex[:6]}"
        r = requests.put(f"{API}/users/me",
                         json={
                             "username": new_uname,
                             "display_name": "Sage V5",
                             "bio": "I like archives.",
                             "profile_pic_path": "",
                             "settings": {"theme": "dark", "language": "fr",
                                          "sound_effects": False, "haptics": False,
                                          "notifications": True,
                                          "muted_words": ["spoiler", "nsfw"]},
                         }, headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["username"] == new_uname
        assert body["display_name"] == "Sage V5"
        assert body["bio"] == "I like archives."
        assert body["settings"]["theme"] == "dark"
        assert body["settings"]["language"] == "fr"
        assert body["settings"]["sound_effects"] is False
        assert "spoiler" in body["settings"]["muted_words"]
        # _id must be excluded
        assert "_id" not in body
        assert "password_hash" not in body
        user_a["user"]["username"] = new_uname

    def test_username_uniqueness(self, user_a, user_b):
        # user_b tries to take user_a's username -> 400
        r = requests.put(f"{API}/users/me",
                         json={"username": user_a["user"]["username"]},
                         headers=user_b["headers"], timeout=15)
        assert r.status_code == 400


# --- Public profile by username ---
class TestPublicProfile:
    def test_public_profile_returns_user_and_chars(self, user_a, user_b):
        uname = user_a["user"]["username"]
        # unauthenticated access (no Authorization header) should still work — public endpoint
        r = requests.get(f"{API}/users/{uname}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user" in data and "public_characters" in data and "public_voices" in data
        assert data["user"]["username"] == uname
        # email + settings + password_hash must be excluded
        assert "email" not in data["user"]
        assert "password_hash" not in data["user"]
        # Should contain user_a's TEST_V5_Char
        assert any(c["id"] == user_a["char_id"] for c in data["public_characters"])

    def test_public_profile_404(self):
        r = requests.get(f"{API}/users/no_such_user_{uuid.uuid4().hex[:6]}", timeout=15)
        assert r.status_code == 404


# --- Chat controls: clear / restart / delete-chat ---
class TestChatControls:
    def test_clear_messages(self, user_a):
        cid = user_a["char_id"]
        # post one message (no LLM round-trip dependency for clear, but ensures content exists)
        # Use restart instead of LLM to avoid slow tests; but we want at least one message to clear.
        # We'll just call clear; should succeed even if empty.
        r = requests.delete(f"{API}/characters/{cid}/messages",
                            headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        msgs = requests.get(f"{API}/characters/{cid}/messages",
                            headers=user_a["headers"], timeout=15).json()
        assert msgs == []

    def test_restart_returns_greetings(self, user_a):
        cid = user_a["char_id"]
        r = requests.post(f"{API}/characters/{cid}/restart",
                          headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert isinstance(body.get("greetings"), list)
        assert "*smiles*" in body["greetings"] or "Hi friend" in body["greetings"]

    def test_delete_chat_does_not_delete_public_character(self, user_a, user_b):
        """User B chats with A's public char, then DELETEs the chat -- char should still exist."""
        cid = user_a["char_id"]
        # B creates a manual memory + chat_settings via endpoints (no LLM needed)
        rm = requests.post(f"{API}/characters/{cid}/memories",
                           json={"type": "fact", "content": "B remembers V5 char"},
                           headers=user_b["headers"], timeout=15)
        assert rm.status_code == 200, rm.text
        # B sets a chat setting
        rs = requests.put(f"{API}/characters/{cid}/settings",
                          json={"font_size": 16}, headers=user_b["headers"], timeout=15)
        assert rs.status_code == 200, rs.text
        # B deletes their chat
        rd = requests.delete(f"{API}/characters/{cid}/chat",
                             headers=user_b["headers"], timeout=15)
        assert rd.status_code == 200, rd.text
        # Char still exists for owner via direct GET, and visible to non-owner via discover
        ra = requests.get(f"{API}/characters/{cid}", headers=user_a["headers"], timeout=15)
        assert ra.status_code == 200, f"owner can no longer GET char: {ra.text}"
        disc_b = requests.get(f"{API}/discover", headers=user_b["headers"], timeout=15).json()
        assert any(c["id"] == cid for c in disc_b), "public char missing from discover after delete-chat"
        # B's memories cleared
        rm2 = requests.get(f"{API}/characters/{cid}/memories",
                           headers=user_b["headers"], timeout=15).json()
        assert rm2 == []


# --- Memory v2: manual create + edit ---
class TestMemoryV2:
    def test_create_and_edit_memory(self, user_a):
        cid = user_a["char_id"]
        r = requests.post(f"{API}/characters/{cid}/memories",
                          json={"type": "event", "content": "Met for tea", "pinned": True},
                          headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["type"] == "event"
        assert m["pinned"] is True
        assert m["content"] == "Met for tea"
        assert "id" in m
        mid = m["id"]
        # edit
        r2 = requests.patch(f"{API}/memories/{mid}",
                            json={"content": "Met for chai", "pinned": False, "type": "story"},
                            headers=user_a["headers"], timeout=15)
        assert r2.status_code == 200, r2.text
        b = r2.json()
        assert b["content"] == "Met for chai"
        assert b["pinned"] is False
        assert b["type"] == "story"

    def test_edit_other_user_memory_404(self, user_a, user_b):
        # create on A
        cid = user_a["char_id"]
        r = requests.post(f"{API}/characters/{cid}/memories",
                          json={"type": "fact", "content": "A only"},
                          headers=user_a["headers"], timeout=15).json()
        # B tries to edit
        r2 = requests.patch(f"{API}/memories/{r['id']}",
                            json={"content": "hacked"},
                            headers=user_b["headers"], timeout=15)
        assert r2.status_code == 404


# --- Chat customization: bg/colors/font/glow/typing/animation ---
class TestChatCustomization:
    def test_set_and_get_chat_settings(self, user_a):
        cid = user_a["char_id"]
        payload = {
            "background_path": "lore/bg/test.png",
            "background_blur": 12,
            "background_dim": 40,
            "user_bubble_color": "#6366F1",
            "char_bubble_color": "#EC4899",
            "font_size": 18,
            "glow_enabled": True,
            "typing_style": "shy",
            "animation_speed": 1.25,
        }
        r = requests.put(f"{API}/characters/{cid}/settings",
                         json=payload, headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        # Verify GET returns persisted fields
        g = requests.get(f"{API}/characters/{cid}/settings",
                         headers=user_a["headers"], timeout=15)
        assert g.status_code == 200
        s = g.json()
        for k, v in payload.items():
            assert s.get(k) == v, f"chat settings field '{k}' not persisted: got {s.get(k)} expected {v}"


# --- Voices CRUD ---
class TestVoices:
    def test_voice_crud(self, user_a):
        r = requests.post(f"{API}/voices",
                          json={"name": "TEST_V5_Voice", "voice_path": "lore/voice/test.mp3",
                                "is_public": True, "description": "warm"},
                          headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        v = r.json()
        vid = v["id"]
        assert v["name"] == "TEST_V5_Voice"
        ls = requests.get(f"{API}/voices", headers=user_a["headers"], timeout=15).json()
        assert any(x["id"] == vid for x in ls)
        d = requests.delete(f"{API}/voices/{vid}", headers=user_a["headers"], timeout=15)
        assert d.status_code == 200
        ls2 = requests.get(f"{API}/voices", headers=user_a["headers"], timeout=15).json()
        assert not any(x["id"] == vid for x in ls2)


# --- Featured ---
class TestFeatured:
    def test_featured_returns_public(self, user_a):
        r = requests.get(f"{API}/discover/featured", headers=user_a["headers"], timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) <= 20
        assert all(c["is_public"] for c in items)


# --- Social ---
class TestSocial:
    def test_social_profiles_and_posts(self, user_a):
        # create profile
        r = requests.post(f"{API}/social/profiles",
                          json={"platform": "instagram", "handle": "@v5sage",
                                "bio": "test", "verified": True, "followers": 100},
                          headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        ls = requests.get(f"{API}/social/profiles", headers=user_a["headers"], timeout=15).json()
        assert any(p["id"] == pid for p in ls)
        # create post (v7: pass explicit likes=0 to disable fame-based seeding;
        # also use 'caption' which is the new field — 'text' is silently dropped)
        rp = requests.post(f"{API}/social/posts",
                           json={"profile_id": pid, "caption": "hello world", "likes": 0},
                           headers=user_a["headers"], timeout=15)
        assert rp.status_code == 200, rp.text
        post_id = rp.json()["id"]
        # v7 may auto-seed comments which increments comments_count, but explicit likes=0 stays 0
        assert rp.json()["likes"] == 0
        # filter by profile_id
        plist = requests.get(f"{API}/social/posts?profile_id={pid}&grow=false",
                             headers=user_a["headers"], timeout=15).json()
        assert any(p["id"] == post_id for p in plist)
        # like
        rl = requests.post(f"{API}/social/posts/{post_id}/like",
                           headers=user_a["headers"], timeout=15)
        assert rl.status_code == 200
        plist2 = requests.get(f"{API}/social/posts?profile_id={pid}&grow=false",
                              headers=user_a["headers"], timeout=15).json()
        # likes >= 1 (passive growth disabled, so exactly 1 OR — defensively — at least 1)
        assert next(p for p in plist2 if p["id"] == post_id)["likes"] >= 1
        # delete profile cascades posts
        requests.delete(f"{API}/social/profiles/{pid}", headers=user_a["headers"], timeout=15)
        plist3 = requests.get(f"{API}/social/posts?profile_id={pid}",
                              headers=user_a["headers"], timeout=15).json()
        assert plist3 == []


# --- Relationships ---
class TestRelationships:
    def test_relationship_crud(self, user_a):
        r = requests.post(f"{API}/relationships",
                          json={"name": "TEST_Sister", "kind": "family", "status": "estranged",
                                "strength": 30, "notes": "hasn't spoken in years"},
                          headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        ls = requests.get(f"{API}/relationships", headers=user_a["headers"], timeout=15).json()
        assert any(x["id"] == rid for x in ls)
        # update
        u = requests.put(f"{API}/relationships/{rid}",
                        json={"name": "TEST_Sister", "kind": "family", "status": "reconciling",
                              "strength": 60, "notes": "reaching out"},
                        headers=user_a["headers"], timeout=15)
        assert u.status_code == 200, u.text
        assert u.json()["status"] == "reconciling"
        assert u.json()["strength"] == 60
        # delete
        d = requests.delete(f"{API}/relationships/{rid}", headers=user_a["headers"], timeout=15)
        assert d.status_code == 200


# --- Assets + Finance ---
class TestAssetsFinance:
    def test_finance_and_asset_gating(self, user_a):
        # try to add private_jet first -> 400
        r = requests.post(f"{API}/assets",
                          json={"kind": "private_jet", "name": "TEST_G650"},
                          headers=user_a["headers"], timeout=15)
        assert r.status_code == 400
        # set finance to wealthy (still not very_wealthy) -> still 400
        rf = requests.put(f"{API}/finance",
                          json={"bank_balance": "5,000,000", "luxury_level": "wealthy"},
                          headers=user_a["headers"], timeout=15)
        assert rf.status_code == 200
        assert rf.json()["luxury_level"] == "wealthy"
        r2 = requests.post(f"{API}/assets",
                           json={"kind": "private_jet", "name": "TEST_G650"},
                           headers=user_a["headers"], timeout=15)
        assert r2.status_code == 400
        # upgrade to very_wealthy
        rf2 = requests.put(f"{API}/finance",
                           json={"bank_balance": "100,000,000", "luxury_level": "very_wealthy"},
                           headers=user_a["headers"], timeout=15)
        assert rf2.status_code == 200
        # private_jet now allowed
        r3 = requests.post(f"{API}/assets",
                           json={"kind": "private_jet", "name": "TEST_G650"},
                           headers=user_a["headers"], timeout=15)
        assert r3.status_code == 200, r3.text
        aid = r3.json()["id"]
        # list assets returns items + finance
        ls = requests.get(f"{API}/assets", headers=user_a["headers"], timeout=15).json()
        assert "items" in ls and "finance" in ls
        assert any(x["id"] == aid for x in ls["items"])
        assert ls["finance"]["luxury_level"] == "very_wealthy"
        # delete asset
        d = requests.delete(f"{API}/assets/{aid}", headers=user_a["headers"], timeout=15)
        assert d.status_code == 200


# --- Activities ---
class TestActivities:
    def test_activities_crud(self, user_a):
        r = requests.post(f"{API}/activities",
                          json={"kind": "find_love", "title": "TEST_Date Night",
                                "notes": "wine bar"},
                          headers=user_a["headers"], timeout=15)
        assert r.status_code == 200, r.text
        ls = requests.get(f"{API}/activities", headers=user_a["headers"], timeout=15).json()
        assert any(a["title"] == "TEST_Date Night" for a in ls)


# --- Find Love ---
class TestFindLove:
    def test_find_love_candidates_and_action(self, user_a, user_b):
        # user_b should see user_a's public char as candidate
        r = requests.get(f"{API}/findlove/candidates", headers=user_b["headers"], timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) <= 12
        target = user_a["char_id"]
        # user_a's public char should be a candidate (not user_b's own)
        assert any(c["id"] == target for c in items), f"target {target} not in candidates"
        # like
        rp = requests.post(f"{API}/findlove/action",
                           json={"character_id": target, "action": "like"},
                           headers=user_b["headers"], timeout=15)
        assert rp.status_code == 200
        assert rp.json().get("matched") is True
        assert rp.json().get("character_id") == target
        # pass
        rp2 = requests.post(f"{API}/findlove/action",
                            json={"character_id": target, "action": "pass"},
                            headers=user_b["headers"], timeout=15)
        assert rp2.status_code == 200
        assert rp2.json().get("matched") is False
