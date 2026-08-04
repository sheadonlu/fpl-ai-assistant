# FPL AI Assistant — Frontend

React + Vite frontend for [FPL AI Assistant](../README.md) — see the root README for the full project overview, features, and backend setup.

## Local dev

```
npm install
npm run dev
```

Requires `VITE_API_BASE` in a `.env` file, pointing at the backend API (defaults to `http://localhost:3001/api` if unset — see `src/config.js`).

## Scripts

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint

## Structure

- `src/App.jsx` — top-level state and layout
- `src/context/` — auth state (`AuthContext.jsx`, `useAuth.js`), persisted to `localStorage`
- `src/api/` — API client functions
- `src/components/` — `Nav`, `Ticker`, `TeamIdForm`, `Squad`, `AIAdvice`, `Chat`, `AuthModal`
- `src/styles/fpl.css` — design system (CSS custom properties, no CSS framework)
