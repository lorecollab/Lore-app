# LORÉ

A premium, cinematic Character.AI-style messaging app. Dark luxury aesthetic, deep memory and scene awareness, voice messaging, and a private "World" (social feed, lifestyle, personas) that feeds context directly into chat.

**Stack** — React (CRA) + Tailwind on the frontend · FastAPI + MongoDB (Motor async) on the backend · Claude Sonnet 4.5 / Gemini Nano Banana / OpenAI Whisper-1 · TTS-1 via the Emergent universal key.

---

## Project layout

```
lore-app/
├── backend/                 # FastAPI app
│   ├── server.py            # Single-file FastAPI app (auth, chat, characters, world, etc.)
│   ├── seed_characters.py   # 28 curated public characters auto-seeded on startup
│   ├── requirements.txt
│   ├── tests/               # pytest backend tests
│   └── .env.example
├── frontend/                # React (CRA) app
│   ├── src/
│   │   ├── pages/           # Home, Chat, ChatList, Discover, Profile, Settings, ...
│   │   ├── components/      # AppShell, BottomNav, AuthImage, ChatCustomizeDrawer, ...
│   │   ├── lib/             # api.js (axios), features.js (Phase-1 flag), ...
│   │   └── contexts/        # AuthContext
│   ├── package.json
│   └── .env.example
├── memory/                  # PRD + test credentials (gitignored)
└── test_reports/            # Iteration test reports
```

---

## 1. Local development

### Prerequisites
- **Node 18+** & **yarn**
- **Python 3.11+**
- **MongoDB** running locally on `:27017` (or any URI you stick in `backend/.env`)

### Backend

```bash
cd backend
cp .env.example .env
# Open .env and fill EMERGENT_LLM_KEY + JWT_SECRET
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend boots, runs the idempotent seeder, and inserts 28 curated public characters (Sienna Vale, Kai Mercer, Mariah Carey, …).

### Frontend

```bash
cd frontend
cp .env.example .env
# Set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```

App opens on `http://localhost:3000`.

### Test account

The seed creates a test user automatically:
- **Email**: `test@lore.app`
- **Password**: `testpass123`

(or sign up with any email through `/signup`).

### Run tests

```bash
cd backend
pytest tests/ -v
```

Latest run: **8/8 backend + 9/9 frontend review items pass** (see `test_reports/iteration_10.json`).

---

## 2. Self-host on your own infra

The recommended, lowest-friction split:

| Component  | Host                 | Why                                         |
|------------|----------------------|---------------------------------------------|
| Frontend   | **Vercel** or Netlify | One-click deploy from GitHub, free tier     |
| Backend    | **Render**, Railway, or Fly.io | Native Python long-running processes |
| MongoDB    | **MongoDB Atlas**    | Free 512 MB tier, global, managed           |

> Avoid Vercel's serverless Python for the backend — chat streaming + 30s+ LLM calls hate cold-starts.

### Step-by-step

**1. Create MongoDB Atlas cluster** (free tier) → grab the connection string.

**2. Deploy backend on Render:**
- New "Web Service" → connect your GitHub repo → root: `backend/`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Environment variables (Settings → Environment):
  ```
  MONGO_URL=<your atlas URI>
  DB_NAME=lore_database
  CORS_ORIGINS=https://your-frontend.vercel.app
  EMERGENT_LLM_KEY=<your key>
  JWT_SECRET=<openssl rand -hex 32>
  ```
- Deploy → grab the URL (e.g. `https://lore-api.onrender.com`)

**3. Deploy frontend on Vercel:**
- "Add new" → "Project" → import GitHub repo → root: `frontend/`
- Framework: Create React App (auto-detected)
- Environment variable:
  ```
  REACT_APP_BACKEND_URL=https://lore-api.onrender.com
  ```
- Deploy

**4. Update backend CORS**: set `CORS_ORIGINS` on Render to the Vercel URL once it's known, redeploy backend.

That's it. You now own the whole stack and pay only Atlas + Render + Vercel (all have free tiers that comfortably fit a low-traffic launch).

---

## 3. Notes on the Emergent universal key

The codebase uses `emergentintegrations` (Claude, Gemini Nano Banana, OpenAI Whisper/TTS) routed through an Emergent-managed key. If you'd rather use direct provider keys:

- Replace `LlmChat(api_key=EMERGENT_LLM_KEY, ...)` calls in `server.py` with your own Anthropic / Google / OpenAI SDK invocations.
- Voice features (`/messages/{mid}/tts`, audio transcription) similarly call `OpenAITextToSpeech` / `OpenAISpeechToText` from `emergentintegrations` — swap for the official `openai` SDK if preferred.
- All LLM calls are isolated in `server.py` (search `EMERGENT_LLM_KEY` and `LlmChat`).

---

## 4. Storage backend

Uploaded files (avatars, voice samples, chat images, video backgrounds) currently route through Emergent's object storage (`STORAGE_URL` in `server.py`). For a fully self-hosted setup, replace `init_storage` / `put_object` / `get_object` / `delete_object` with S3, R2, or GCS — they're all isolated at the top of `server.py`. The HTTP API surface (`POST /api/upload`, `GET /api/files/{path}`) doesn't change.

---

## 5. License

Yours — this is your project. Add whatever license you want.

---

Built with ❤ in cinematic warm-black & champagne gold.
