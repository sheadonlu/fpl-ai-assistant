⚽ FPL AI Assistant
A Fantasy Premier League companion that treats squad decisions as a scoring problem instead of a stat-scrolling exercise. A deterministic engine ranks every player by expected points, and an LLM turns that into plain-English gameweek advice — grounded in the numbers, not guessing at them. Anonymous squad lookups work with zero setup; an optional account unlocks AI advice, chat, and saved teams.
Live App: https://fpl-ai-assistant-mu.vercel.app

🚀 Tech Stack

Frontend
* React 19
* Vite
* Axios
* React Markdown

Backend
* Node.js + Express 5
* PostgreSQL (Neon), via `pg`
* JWT auth — `jsonwebtoken` + `bcryptjs`
* `express-rate-limit`

AI & Data
* Groq API (LLaMA 3.3 70B)
* Official Fantasy Premier League API

🧠 Under the hood

* Deterministic scoring engine — every player gets an Expected Points score computed from five weighted, documented components: minutes probability (rotation/injury risk), exponentially-decayed recent form, attacking threat (xG/xA), a fixture-difficulty modifier, and points volatility. Pure functions of structured input data — no randomness, no LLM involved. See the formulas and their rationale in `backend/src/services/scoring/scoringEngine.js`, and 28 unit tests covering the edge cases in `scoringEngine.test.js`.
* Captain scoring — splits Expected Points into a "safe" score and a "differential" score using the player's own point volatility, so picking between a nailed-on captain and a punt is a numbers question, not a vibe.
* The LLM only ever explains computed numbers — the AI advice and chat layer (`backend/src/services/aiService.js`, `backend/src/routes/ai.js`) is given the scoring engine's Expected Points and its breakdown, and is explicitly instructed not to invent its own statistics. It's a narrator for the math, not a second opinion.

✨ Features

* 🔎 Anonymous squad lookup — enter any public FPL team ID, no account required, to view your starting XI, bench, captain, and key stats
* 🔐 Optional account — register/login (JWT + bcrypt) to unlock AI features and save teams
* 🧠 AI-generated gameweek advice — captain pick, transfer advice, chip strategy, and fixture view, all grounded in the scoring engine's output (requires login)
* 💬 AI chat — multi-turn conversation with full squad and fixture context (requires login)
* ⭐ Saved teams — logged-in users can save, quick-load, and remove FPL team IDs across sessions
* 🗄️ Postgres-backed cache — per-player gameweek history cached with a staleness-aware policy (finished gameweeks cached permanently, the live gameweek refreshed hourly) to cut down on calls to the FPL API
* 🛡️ Rate-limited AI routes — 10 requests / 15 min per IP, on top of the login requirement, to protect the Groq quota
* 🧪 Mock-data mode — `USE_MOCK_DATA=true` runs the app against a fabricated squad and fixtures, for developing during the FPL off-season

📸 Screenshots
Add screenshots of the squad view, AI advice panel, and chat here.

🛠️ Getting Started
Requires [Node.js](https://nodejs.org/) 18 or later (CI runs on 22) and a PostgreSQL database — a free [Neon](https://neon.tech) project works well.

Clone the repository

```
git clone https://github.com/sheadonlu/fpl-ai-assistant.git
cd fpl-ai-assistant
```

Set up the database

```
psql $DATABASE_URL -f backend/src/db/schema.sql
```

Backend

```
cd backend
npm install
```

Create `backend/.env`:

```
PORT=3001
DATABASE_URL=postgresql://user:password@host/dbname
PGSSL=true
JWT_SECRET=some-long-random-string
GROQ_API_KEY=your-groq-api-key
USE_MOCK_DATA=false
```

```
npm run dev
```

Frontend

```
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_BASE=http://localhost:3001/api
```

```
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`) — open it in your browser. Changes to any file hot-reload instantly.

Build for production

```
cd frontend && npm run build
```

Outputs static files to `frontend/dist/`, deployable anywhere (Vercel, Netlify, GitHub Pages, etc.) — preview locally with `npm run preview`. The backend has no build step; run it in production with `npm start`.

Run the tests

```
cd backend && npm test
```

36 unit tests (auth + scoring engine) via Node's built-in test runner — also run automatically in CI on every push/PR to `main`.

Project structure

```
backend/
  src/
    index.js                 Express app entry point
    env.js                    dotenv loader
    db/
      pool.js                  Postgres connection pool
      schema.sql                Cache + auth table definitions
      playerHistoryCache.js     Staleness-aware gameweek history cache
    middleware/
      requireAuth.js            JWT auth guard
      aiRateLimit.js             Per-IP rate limit for AI routes
    routes/
      auth.js                    Register / login / saved teams
      fpl.js                     Squad + bootstrap data
      ai.js                      AI advice + chat
    services/
      authService.js              bcrypt hashing + JWT signing
      fplService.js                FPL API client (+ mock mode)
      aiService.js                  Groq client
      scoring/
        scoringEngine.js            Pure scoring functions
        scoringAdapter.js            Bridges FPL data into scoring engine input
        constants.js                 Weights + position scoring config
frontend/
  src/
    main.jsx                  React entry point, wraps App in AuthProvider
    App.jsx                    Top-level state + layout
    config.js                   API base URL
    api/
      authApi.js                 Auth API calls
    context/
      AuthContext.jsx             Auth state + localStorage persistence
      useAuth.js                   useAuth hook
    components/
      Nav.jsx, Ticker.jsx, TeamIdForm.jsx, Squad.jsx,
      AIAdvice.jsx, Chat.jsx, AuthModal.jsx
    styles/
      fpl.css                    Design system

```

📖 Usage
Looking up a squad

1. Enter any public FPL team ID (visible in the URL on the official FPL site) into the home screen.
2. Click Analyse. No account needed for this step.

Getting AI advice

1. Log in or register from the top-right corner.
2. Open the AI Analysis section and click Generate AI Analysis, or open Chat to ask a free-form question.
3. Every answer is grounded in the scoring engine's computed Expected Points — the model explains the numbers rather than inventing its own.

Saving teams

1. While logged in, load a squad and click Save team in the nav bar.
2. Saved teams appear as a quick-pick list on the home screen — click one to reload it, or remove it with the × button.

🔐 Data & privacy
Passwords are hashed with bcrypt before storage — never stored or logged in plaintext. Auth uses a JWT (7-day expiry) kept in the browser's `localStorage` under the key `fplAuth`, sent as an `Authorization: Bearer` header on requests that need it (saved teams, AI advice, AI chat). Squad lookups are anonymous by default and require no account or token. Account emails and saved FPL team IDs live in your own Postgres database (see `schema.sql`) — the only outside services in the loop are the official FPL API (squad data) and Groq (AI advice generation, which receives your computed squad stats, not your account details).

🌐 Browser Support
Compatible with all modern browsers, including:

* Chrome
* Firefox
* Safari
* Microsoft Edge

📄 License
This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

Author: Sheadon Lu
