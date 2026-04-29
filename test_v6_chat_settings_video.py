"""LORÉ v6 regression tests:
- GET/PUT /api/characters/{cid}/settings persists ALL 10 ChatSettingsInput fields
- Defaults returned correctly for a fresh character
- PUT returns full settings doc (not just {active_persona_id})
- Partial updates via exclude_unset do not overwrite other fields
- POST /api/upload accepts video/mp4, video/webm, video/quicktime up to 20MB
- >20MB video returns 400
- Existing image upload still works (regression)
"""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


def _signup(name="V6 Tester"):
    email = f"TEST_{uuid.uuid4().hex[:8]}@lore.app"
    r = requests.post(f"{API}/auth/signup",
                      json={"email": email, "password": "testpass123", "name": name},
                      timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"], email


@pytest.fixture(scope="module")
def ctx():
    token, user, email = _signup("V6 ChatSettings")
    h = {"Authorization": f"Bearer {token}"}
    cr = requests.post(
        f"{API}/characters",
        json={"name": "TEST_V6_Char", "description": "v6", "is_public": True,
              "greetings": ["*hi*"], "personality": "warm"},
        headers=h, timeout=20,
    )
    assert cr.status_code == 200, cr.text
    return {"headers": h, "char_id": cr.json()["id"], "user": user}


# ---------------- Chat settings: defaults + full persistence ----------------
EXPECTED_DEFAULTS = {
    "active_persona_id": None,
    "background_path": None,
    "background_blur": 0,
    "background_dim": 0,
    "user_bubble_color": None,
    "char_bubble_color": None,
    "font_size": 15,
    "glow_enabled": True,
    "typing_style": "auto",
    "animation_speed": 1.0,
}


class TestChatSettingsDefaults:
    def test_get_defaults_all_10_fields(self, ctx):
        r = requests.get(f"{API}/characters/{ctx['char_id']}/settings",
                         headers=ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        s = r.json()
        for k, v in EXPECTED_DEFAULTS.items():
            assert k in s, f"missing default field {k}"
            assert s[k] == v, f"default mismatch {k}: got {s[k]} expected {v}"


class TestChatSettingsFullPersistence:
    def test_put_all_fields_round_trip(self, ctx):
        cid = ctx["char_id"]
        payload = {
            "background_path": "lore/bg/v6.png",
            "background_blur": 8,
            "background_dim": 35,
            "user_bubble_color": "#112233",
            "char_bubble_color": "#AABBCC",
            "font_size": 17,
            "glow_enabled": False,
            "typing_style": "dramatic",
            "animation_speed": 1.75,
        }
        r = requests.put(f"{API}/characters/{cid}/settings",
                         json=payload, headers=ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # PUT must return full doc (not just {active_persona_id})
        for k, v in payload.items():
            assert body.get(k) == v, f"PUT response mismatch {k}"
        # Default fields still present
        assert "active_persona_id" in body
        assert "font_size" in body
        # GET matches
        g = requests.get(f"{API}/characters/{cid}/settings",
                         headers=ctx["headers"], timeout=15).json()
        for k, v in payload.items():
            assert g.get(k) == v, f"GET mismatch {k}: got {g.get(k)} expected {v}"

    def test_put_partial_does_not_clobber(self, ctx):
        """Send only font_size; other previously-set fields must remain."""
        cid = ctx["char_id"]
        # Seed state
        seed = {
            "background_path": "lore/bg/seed.png",
            "background_blur": 10,
            "background_dim": 50,
            "user_bubble_color": "#ABCDEF",
            "char_bubble_color": "#123456",
            "font_size": 16,
            "glow_enabled": True,
            "typing_style": "shy",
            "animation_speed": 1.5,
        }
        requests.put(f"{API}/characters/{cid}/settings",
                     json=seed, headers=ctx["headers"], timeout=15).raise_for_status()
        # Partial: only change font_size
        r = requests.put(f"{API}/characters/{cid}/settings",
                         json={"font_size": 20},
                         headers=ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["font_size"] == 20
        # Other fields preserved
        for k, v in seed.items():
            if k == "font_size":
                continue
            assert body.get(k) == v, f"partial overwrote {k}: got {body.get(k)} expected {v}"

    def test_put_individual_field_each(self, ctx):
        """PUT each field individually and verify GET."""
        cid = ctx["char_id"]
        cases = [
            ("background_path", "lore/bg/one.png"),
            ("background_blur", 5),
            ("background_dim", 20),
            ("user_bubble_color", "#111111"),
            ("char_bubble_color", "#222222"),
            ("font_size", 14),
            ("glow_enabled", False),
            ("typing_style", "smooth"),
            ("animation_speed", 0.75),
        ]
        for k, v in cases:
            r = requests.put(f"{API}/characters/{cid}/settings",
                             json={k: v}, headers=ctx["headers"], timeout=15)
            assert r.status_code == 200, f"{k}: {r.text}"
            assert r.json().get(k) == v, f"PUT resp {k}: got {r.json().get(k)}"
            g = requests.get(f"{API}/characters/{cid}/settings",
                             headers=ctx["headers"], timeout=15).json()
            assert g.get(k) == v, f"GET {k}: got {g.get(k)}"


# ---------------- Upload: video + image regression ----------------
# Minimal well-formed MP4 (ftyp box only). Content-type header drives validation.
MIN_MP4 = (
    b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41"
    + b"\x00" * 16
)


class TestUploadVideo:
    def test_upload_small_mp4_ok(self, ctx):
        files = {"file": ("sample.mp4", io.BytesIO(MIN_MP4), "video/mp4")}
        r = requests.post(f"{API}/upload", files=files,
                          headers=ctx["headers"], timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("content_type") == "video/mp4"
        assert body.get("path", "").endswith(".mp4")

    def test_upload_small_webm_ok(self, ctx):
        files = {"file": ("sample.webm", io.BytesIO(b"\x1a\x45\xdf\xa3" + b"\x00" * 64), "video/webm")}
        r = requests.post(f"{API}/upload", files=files,
                          headers=ctx["headers"], timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("content_type") == "video/webm"

    def test_upload_small_mov_ok(self, ctx):
        files = {"file": ("sample.mov", io.BytesIO(MIN_MP4), "video/quicktime")}
        r = requests.post(f"{API}/upload", files=files,
                          headers=ctx["headers"], timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("content_type") == "video/quicktime"

    def test_upload_video_too_large_400(self, ctx):
        # 21 MB exceeds MAX_VIDEO_BYTES (20 MB)
        big = b"\x00" * (21 * 1024 * 1024)
        files = {"file": ("big.mp4", io.BytesIO(big), "video/mp4")}
        r = requests.post(f"{API}/upload", files=files,
                          headers=ctx["headers"], timeout=60)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"


class TestUploadImageRegression:
    def test_upload_small_png_still_works(self, ctx):
        # 1x1 transparent PNG
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
               b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
               b"\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
               b"\x00\x00\x00\x00IEND\xaeB`\x82")
        files = {"file": ("px.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/upload", files=files,
                          headers=ctx["headers"], timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("content_type") == "image/png"


# ---------------- Credentials regression ----------------
class TestSeedCredentials:
    def test_known_user_login(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "test@lore.app", "password": "testpass123"},
                          timeout=15)
        # Either the seed user exists (200) or not (401/404). If 200, token must be present.
        if r.status_code == 200:
            assert "token" in r.json()
        else:
            pytest.skip(f"Seed user not present in this env (status={r.status_code}); skipping.")
