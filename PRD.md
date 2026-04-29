# LORÉ — Product Requirements Document

## Tech Stack
- Frontend: React, Tailwind, framer-motion, shadcn/ui, Plus Jakarta Sans
- Backend: FastAPI + MongoDB (Motor async)
- LLM: Claude Sonnet 4.5; Image gen: Gemini Nano Banana; STT: OpenAI Whisper-1; TTS: OpenAI tts-1
- Auth: JWT email/password + bcrypt; Storage: Emergent Object Storage

## Core Vision
Premium, cinematic, mobile-first messaging app. Dark luxury palette (#15110F warm black, #D8B982 champagne gold, #F7EFE6 soft cream). No purple, no Android tropes, serif fonts ONLY for logo/hero, sans-serif everywhere else. Chat is the centre — World/Social/Lifestyle features feed INTO chat, never compete with it.

## Implemented (cumulative)

### v1–v9 (prior — see CHANGELOG section below)
JWT auth, character CRUD, chat with versions/regenerate/edit, World/Social/Personas, voice messaging, video chat backgrounds, mood-based typing animation, per-chat context drawer, hybrid AI comments, posts feed-into-chat, Phase 1 feature flag, Netflix-style Home with interactive crossfading hero, bottom-nav with raised plus button, /welcome cinematic landing.

### v10 / v11 (this iteration)
Critical P0 fix list + 28-character seed catalogue.

**Bug fixes (all verified)**
- ChatList tap-vs-swipe: `dxRef` pattern + `stopPropagation`/`preventDefault` on swipe-action buttons + z-20 layer for action buttons. Tapping Clear/Delete now opens the confirm modal (was opening the chat).
- Audio upload validation: 10 MB hard cap, strict `.mp3/.wav/.m4a` extensions in `/create-voice` AND chat composer; friendlier 400 messages from backend; upload progress bar.
- Long-press / right-click suppression: `onContextMenu={(e) => e.preventDefault()}` + `draggable={false}` on `AuthImage`, on `ChatRow` `<li>`, and on Discover/Home `CharacterCard`s.
- Color audit: 100 % indigo / violet / purple eradicated across `pages/` and `components/`. `Avatar` palette swapped to gold/cream tones.
- Chat menu cleanup: removed `menu-memories` (now reachable through Character Profile), no `menu-settings`, no `menu-customize`. Settings & Memory live OUTSIDE the chat now.
- Profile Edit: `.profile-input` rebuilt around `#D8B982` gold focus + `#3A2F2A` border. No `#6366F1` anywhere.
- Discover redesign: `Trending / Popular / Yours` gold pill tabs, lore-palette grid, Popular tab now excludes Featured ids.
- Home Trending vs Popular sets are now disjoint (Popular filters out Featured ids).

**New: 28-character seed catalogue**
- 14 Trending (`featured=true`) + 14 Popular (`featured=false`) curated characters.
- All `is_public=true`, owned by system user `system-lore`, marked `is_seed=true`.
- Each row carries `tags: List[str]`, `description`, `role`, three `greetings`, and an external Unsplash portrait URL.
- Seed runs idempotently on every backend startup: wipes prior `is_seed=true` rows + any `^TEST_*` placeholders, inserts fresh 28.
- Re-seed on demand via `POST /api/admin/reseed_characters`.
- `AuthImage` detects `^https?://` paths and renders directly without auth round-trip.
- `GET /api/characters/{cid}` now uses `_character_view` so any logged-in user can open the seeded characters.
- Backend models: added `tags: List[str]` and `featured: bool` to `Character` + `CharacterInput`.

**Test results (this iteration)**
- Backend: 8/8 PASS (`/app/backend/tests/test_v10_seed_audio.py`) — seed catalogue, public character access, audio validation.
- Frontend: 9/9 review items PASS (`/app/test_reports/iteration_10.json`) — tap-vs-swipe, right-click suppression, color audit, Discover tabs, Home Trending≠Popular, /create-voice attrs, Chat menu items, Bottom-nav hide list, Profile gold focus.

## Known Backlog (P1 / P2)
### P1
- **Server.py module split** — file is now ~2150 lines. Split into `routes/`, `models/`, `services/`.
- Multiple persona images (gallery beyond avatar).
- Investigate POST `/api/chats/{id}/messages` 404 reported during iteration_10 swipe test setup (sanity check whether brand-new users without prior chats can start a conversation).
### P2
- AI characters making their OWN posts (their account, their feed)
- Live notifications panel: "@cosmopolitan commented on your post" surfaced inside chat
- Relationship strength bars that change live based on chat tone
- iOS-style polish + i18n actual language switching
- PWA + push notifications
- Public Social Loré Feed (Phase 2 — currently gated behind `PHASE_1_ONLY` flag)
- Advanced Memory Engine (Phase 2 — flag-gated)

## Test Credentials
See `/app/memory/test_credentials.md` — `test@lore.app` / `testpass123`.

## Endpoints reference (selected)
- `POST /api/auth/login` `{email, password}` → `{token, user}`
- `GET  /api/discover` → all public characters (incl. 28 seeded)
- `GET  /api/discover/featured` → 14 trending (`featured=true`)
- `GET  /api/characters/{cid}` → owner OR public
- `POST /api/admin/reseed_characters` → re-runs seed
- `POST /api/upload?folder=…` → `{path, content_type, size}` (10 MB audio cap)
- `POST /api/characters/{cid}/messages` → user_message + character_message
