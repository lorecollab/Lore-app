"""LORÉ v4 audio/TTS/voice tests — upload audio, /tts/preview, /messages/{mid}/tts, character voice fields, dialogue_only util."""
import os
import io
import sys
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# allow importing server.py for util tests
sys.path.insert(0, "/app/backend")


def _signup(name="Audio User"):
    email = f"TEST_{uuid.uuid4().hex[:8]}@lore.app"
    r = requests.post(f"{API}/auth/signup",
                      json={"email": email, "password": "testpass123", "name": name}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["token"], d["user"], email


@pytest.fixture(scope="module")
def auth():
    tok, user, email = _signup("AudioTester")
    return {"token": tok, "user": user, "email": email,
            "headers": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="module")
def auth_b():
    tok, user, email = _signup("OtherUser")
    return {"token": tok, "user": user, "email": email,
            "headers": {"Authorization": f"Bearer {tok}"}}


# Tiny silent webm-like blob (header bytes); whisper will likely return empty transcript
SILENT_WEBM = (
    b"\x1a\x45\xdf\xa3\xa3\x42\x86\x81\x01\x42\xf7\x81\x01\x42\xf2\x81"
    b"\x04\x42\xf3\x81\x08\x42\x82\x84webm\x42\x87\x81\x02\x42\x85\x81\x02"
    + b"\x00" * 256
)


# ====== dialogue_only utility ======
class TestDialogueOnlyUtil:
    def test_strips_actions_and_image_tags(self):
        from server import dialogue_only
        text = "*she smiles* Hello there. [IMAGE: a sunset] How are you?"
        out = dialogue_only(text)
        assert "*" not in out
        assert "[IMAGE" not in out
        assert "Hello there" in out
        assert "How are you?" in out

    def test_only_actions_returns_empty(self):
        from server import dialogue_only
        assert dialogue_only("*just looks at you*") == ""

    def test_empty_input(self):
        from server import dialogue_only
        assert dialogue_only("") == ""
        assert dialogue_only(None) == ""


# ====== Upload audio + caps ======
class TestAudioUpload:
    def test_upload_audio_webm_success(self, auth):
        files = {"file": ("v.webm", io.BytesIO(SILENT_WEBM), "audio/webm")}
        r = requests.post(f"{API}/upload?folder=voice",
                          files=files, headers=auth["headers"], timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["content_type"].startswith("audio/")
        assert d["path"]
        auth["audio_path"] = d["path"]

    def test_upload_audio_mp3_success(self, auth):
        files = {"file": ("v.mp3", io.BytesIO(b"\xff\xfb\x90\x00" + b"\x00" * 1024), "audio/mpeg")}
        r = requests.post(f"{API}/upload?folder=voice",
                          files=files, headers=auth["headers"], timeout=60)
        assert r.status_code == 200, r.text
        assert r.json()["content_type"] == "audio/mpeg"

    def test_upload_audio_m4a_success(self, auth):
        files = {"file": ("v.m4a", io.BytesIO(b"\x00" * 2048), "audio/m4a")}
        r = requests.post(f"{API}/upload?folder=voice",
                          files=files, headers=auth["headers"], timeout=60)
        assert r.status_code == 200, r.text

    def test_upload_audio_too_large(self, auth):
        big = b"\x00" * (13 * 1024 * 1024)  # 13MB > 12MB cap
        files = {"file": ("big.mp3", io.BytesIO(big), "audio/mpeg")}
        r = requests.post(f"{API}/upload?folder=voice",
                          files=files, headers=auth["headers"], timeout=60)
        assert r.status_code == 400
        assert "12mb" in r.text.lower() or "max" in r.text.lower()

    def test_upload_rejects_unknown_type(self, auth):
        files = {"file": ("doc.pdf", io.BytesIO(b"%PDF-"), "application/pdf")}
        r = requests.post(f"{API}/upload?folder=voice",
                          files=files, headers=auth["headers"], timeout=30)
        assert r.status_code == 400


# ====== Character voice fields ======
class TestCharacterVoiceFields:
    def test_create_character_with_voice_fields(self, auth):
        payload = {
            "name": "TEST_VoiceChar", "description": "test voice",
            "personality": "playful, warm",
            "voice_id": "nova",
            "elevenlabs_voice_id": "21m00Tcm4TlvDq8ikWAM",
            "is_public": False,
        }
        r = requests.post(f"{API}/characters", json=payload,
                          headers=auth["headers"], timeout=20)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["voice_id"] == "nova"
        assert c["elevenlabs_voice_id"] == "21m00Tcm4TlvDq8ikWAM"
        assert c["voice_sample_path"] == ""
        auth["char_id"] = c["id"]

    def test_default_voice_id_is_alloy(self, auth):
        r = requests.post(f"{API}/characters",
                          json={"name": "TEST_Default"}, headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["voice_id"] == "alloy"

    def test_update_character_voice(self, auth):
        cid = auth["char_id"]
        r = requests.put(f"{API}/characters/{cid}",
                         json={"name": "TEST_VoiceChar", "voice_id": "echo",
                               "elevenlabs_voice_id": "newid"},
                         headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["voice_id"] == "echo"
        # GET to verify persistence
        g = requests.get(f"{API}/characters/{cid}",
                         headers=auth["headers"], timeout=15).json()
        assert g["voice_id"] == "echo"
        assert g["elevenlabs_voice_id"] == "newid"


# ====== /api/tts/preview ======
class TestTTSPreview:
    def test_preview_returns_audio_mpeg(self, auth):
        r = requests.post(f"{API}/tts/preview",
                          json={"text": "Hello there, this is a voice preview.", "voice": "alloy"},
                          headers=auth["headers"], timeout=60)
        assert r.status_code == 200, r.text
        assert r.headers["content-type"].startswith("audio/mpeg")
        assert len(r.content) > 1000  # mp3 should be at least 1KB

    def test_preview_strips_actions(self, auth):
        r = requests.post(f"{API}/tts/preview",
                          json={"text": "*shrugs* Hi there.", "voice": "nova"},
                          headers=auth["headers"], timeout=60)
        assert r.status_code == 200
        assert len(r.content) > 500

    @pytest.mark.parametrize("voice", ["alloy", "echo", "fable", "nova", "onyx", "shimmer"])
    def test_preview_all_six_voices(self, auth, voice):
        r = requests.post(f"{API}/tts/preview",
                          json={"text": f"Testing the {voice} voice.", "voice": voice},
                          headers=auth["headers"], timeout=60)
        assert r.status_code == 200, f"voice {voice} failed: {r.text[:200]}"
        assert r.headers["content-type"].startswith("audio/mpeg")

    def test_preview_requires_auth(self):
        r = requests.post(f"{API}/tts/preview",
                          json={"text": "hi", "voice": "alloy"}, timeout=30)
        assert r.status_code in (401, 403)


# ====== /api/messages/{mid}/tts ======
class TestMessageTTS:
    @pytest.fixture(scope="class")
    def char_with_msg(self, auth):
        # ensure character + a character message exists
        cid = auth.get("char_id")
        if not cid:
            r = requests.post(f"{API}/characters",
                              json={"name": "TEST_TtsChar", "voice_id": "fable"},
                              headers=auth["headers"], timeout=15)
            cid = r.json()["id"]
            auth["char_id"] = cid
        # send a message to elicit a character reply
        r = requests.post(f"{API}/characters/{cid}/messages",
                          json={"content": "Say hello in one short sentence."},
                          headers=auth["headers"], timeout=120)
        assert r.status_code == 200, r.text
        char_msg = r.json()["character_message"]
        user_msg = r.json()["user_message"]
        return {"char_msg_id": char_msg["id"], "user_msg_id": user_msg["id"],
                "char_content": char_msg["content"]}

    def test_tts_for_character_message(self, auth, char_with_msg):
        mid = char_with_msg["char_msg_id"]
        r = requests.get(f"{API}/messages/{mid}/tts",
                         headers=auth["headers"], timeout=60)
        assert r.status_code == 200, r.text
        assert r.headers["content-type"].startswith("audio/mpeg")
        assert len(r.content) > 1000

    def test_tts_404_for_unknown_message(self, auth):
        r = requests.get(f"{API}/messages/{uuid.uuid4()}/tts",
                         headers=auth["headers"], timeout=30)
        assert r.status_code == 404

    def test_tts_404_for_other_user_message(self, auth, auth_b, char_with_msg):
        mid = char_with_msg["char_msg_id"]
        r = requests.get(f"{API}/messages/{mid}/tts",
                         headers=auth_b["headers"], timeout=30)
        assert r.status_code == 404

    def test_tts_400_when_only_actions(self, auth):
        # Create a message via direct DB-like insertion isn't possible; instead
        # use edit_message PATCH to make content actions-only
        cid = auth["char_id"]
        # get latest character message
        msgs = requests.get(f"{API}/characters/{cid}/messages",
                            headers=auth["headers"], timeout=15).json()
        char_msgs = [m for m in msgs if m["role"] == "character"]
        if not char_msgs:
            pytest.skip("no character message")
        mid = char_msgs[-1]["id"]
        # edit to actions-only
        r = requests.patch(f"{API}/messages/{mid}",
                           json={"content": "*just stares silently*"},
                           headers=auth["headers"], timeout=15)
        assert r.status_code == 200
        # now TTS should 400
        r = requests.get(f"{API}/messages/{mid}/tts",
                         headers=auth["headers"], timeout=30)
        assert r.status_code == 400


# ====== send_message with audio_path (Whisper round-trip) ======
class TestAudioMessageRoundtrip:
    def test_send_message_with_audio_path(self, auth):
        cid = auth["char_id"]
        audio_path = auth.get("audio_path")
        if not audio_path:
            pytest.skip("no uploaded audio")
        r = requests.post(f"{API}/characters/{cid}/messages",
                          json={"content": "", "audio_path": audio_path},
                          headers=auth["headers"], timeout=180)
        # Should NOT crash even if transcript empty (silence)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_message"]["audio_path"] == audio_path
        assert d["character_message"]["role"] == "character"

    def test_send_message_with_invalid_audio_path(self, auth):
        cid = auth["char_id"]
        r = requests.post(f"{API}/characters/{cid}/messages",
                          json={"content": "", "audio_path": "lore/voice/bogus.mp3"},
                          headers=auth["headers"], timeout=60)
        assert r.status_code == 400


# ====== cleanup ======
class TestZAudioCleanup:
    def test_delete_character(self, auth):
        cid = auth.get("char_id")
        if cid:
            r = requests.delete(f"{API}/characters/{cid}",
                                headers=auth["headers"], timeout=15)
            assert r.status_code == 200
