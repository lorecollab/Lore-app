"""Iteration 10 — Seed catalogue + public character + audio upload validation tests.

Covers:
  - GET /api/discover/featured -> 14 featured chars
  - GET /api/discover -> >=28 public chars
  - GET /api/characters/{seed_id} for non-owner (public access)
  - POST /api/characters/{seed_id}/messages with seed (public chat)
  - POST /api/upload audio size & MIME validation
"""

import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lore-chat.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- shared fixtures ----------

@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(session):
    # Try login first; fall back to signup
    r = session.post(f"{API}/auth/login",
                     json={"email": "test@lore.app", "password": "testpass123"},
                     timeout=15)
    if r.status_code == 200:
        return r.json()["token"]
    # signup
    r = session.post(f"{API}/auth/signup",
                     json={"email": "test@lore.app", "password": "testpass123",
                           "name": "Test Sage"},
                     timeout=15)
    if r.status_code in (200, 201):
        return r.json()["token"]
    pytest.skip(f"Auth failed: {r.status_code} {r.text[:200]}")


@pytest.fixture(scope="session")
def auth_session(auth_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    })
    return s


@pytest.fixture(scope="session")
def auth_session_no_ct(auth_token):
    """For multipart uploads — no preset Content-Type so requests sets boundary."""
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}"})
    return s


# ---------- seed catalogue ----------

class TestSeedCatalogue:

    def test_featured_returns_14_all_featured(self, auth_session):
        r = auth_session.get(f"{API}/discover/featured", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 14, f"expected 14 featured, got {len(data)}: " \
                                 f"{[c.get('name') for c in data]}"
        for c in data:
            assert c.get("featured") is True, f"non-featured slipped in: {c.get('name')}"
            assert c.get("is_public") is True
            assert isinstance(c.get("tags"), list) and len(c["tags"]) > 0
            ap = c.get("avatar_path", "")
            assert ap.startswith("https://"), f"avatar not external URL: {ap}"

    def test_discover_has_at_least_28_public(self, auth_session):
        r = auth_session.get(f"{API}/discover", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 28, f"expected >=28 public, got {len(data)}"
        names = {c["name"] for c in data}
        assert "Sienna Vale" in names, f"Sienna Vale missing from discover: {sorted(names)[:5]}..."

    def test_sienna_vale_has_tags_and_https_avatar(self, auth_session):
        r = auth_session.get(f"{API}/discover", timeout=15)
        data = r.json()
        sienna = next((c for c in data if c["name"] == "Sienna Vale"), None)
        assert sienna is not None
        assert isinstance(sienna["tags"], list) and len(sienna["tags"]) >= 1
        assert sienna["avatar_path"].startswith("https://images.unsplash.com/")
        assert sienna.get("is_public") is True


# ---------- public character access + chat ----------

class TestPublicCharacterAccess:

    @pytest.fixture(scope="class")
    def seed_id(self, auth_session):
        r = auth_session.get(f"{API}/discover/featured", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data, "no featured characters returned"
        return data[0]["id"]

    def test_get_public_seed_character_returns_200(self, auth_session, seed_id):
        r = auth_session.get(f"{API}/characters/{seed_id}", timeout=15)
        assert r.status_code == 200, \
            f"public seed character should be reachable, got {r.status_code}: {r.text[:200]}"
        c = r.json()
        assert c["id"] == seed_id
        assert c.get("is_public") is True

    def test_chat_with_public_seed_character(self, auth_session, seed_id):
        payload = {"content": "Hello, who are you?"}
        r = auth_session.post(f"{API}/characters/{seed_id}/messages",
                              json=payload, timeout=60)
        assert r.status_code == 200, \
            f"chat with seed char failed: {r.status_code} {r.text[:300]}"
        body = r.json()
        # Server returns user + character message envelope
        assert "user_message" in body or "character_message" in body or "messages" in body, \
            f"unexpected response shape: {body}"


# ---------- audio upload validation ----------

def _wav_header_bytes(payload_size: int) -> bytes:
    """Minimal valid RIFF/WAVE header with given payload (silence) size."""
    import struct
    fmt_chunk_size = 16
    audio_format = 1
    num_channels = 1
    sample_rate = 8000
    bits_per_sample = 8
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    riff_size = 4 + (8 + fmt_chunk_size) + (8 + payload_size)
    return (
        b"RIFF" + struct.pack("<I", riff_size) + b"WAVE"
        + b"fmt " + struct.pack("<IHHIIHH",
                                  fmt_chunk_size, audio_format, num_channels,
                                  sample_rate, byte_rate, block_align, bits_per_sample)
        + b"data" + struct.pack("<I", payload_size)
    )


class TestAudioUploadValidation:

    def test_oversized_audio_rejected(self, auth_session_no_ct):
        # 11 MB payload — must exceed the 10 MB cap
        payload_size = 11 * 1024 * 1024
        body = _wav_header_bytes(payload_size) + (b"\x80" * payload_size)
        files = {"file": ("big.wav", io.BytesIO(body), "audio/wav")}
        r = auth_session_no_ct.post(f"{API}/upload?folder=voicesamples",
                                    files=files, timeout=60)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"
        msg = r.text.lower()
        assert "too large" in msg, f"missing too-large message: {r.text[:200]}"
        assert "10" in msg, f"missing 10MB hint: {r.text[:200]}"

    def test_unsupported_text_file_rejected(self, auth_session_no_ct):
        files = {"file": ("notes.txt", io.BytesIO(b"hello world"), "text/plain")}
        r = auth_session_no_ct.post(f"{API}/upload?folder=voicesamples",
                                    files=files, timeout=30)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"
        msg = r.text.lower()
        assert "unsupported" in msg, f"missing unsupported message: {r.text[:200]}"
        # Must enumerate accepted formats
        for kw in ("mp3", "wav", "m4a"):
            assert kw in msg, f"hint '{kw}' missing in {r.text[:200]}"

    def test_small_wav_accepted(self, auth_session_no_ct):
        payload_size = 1024
        body = _wav_header_bytes(payload_size) + (b"\x80" * payload_size)
        files = {"file": ("sample.wav", io.BytesIO(body), "audio/wav")}
        r = auth_session_no_ct.post(f"{API}/upload?folder=voicesamples",
                                    files=files, timeout=30)
        assert r.status_code == 200, \
            f"small wav should upload, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "path" in data and data["path"], f"no path in: {data}"
        assert data.get("content_type", "").startswith("audio/")
