# FPL AI Assistant

An AI-powered Fantasy Premier League assistant that loads your squad and gives you gameweek advice.

**Live app:** https://fpl-ai-assistant-mu.vercel.app

## What it does

- Enter your FPL team ID to load your squad
- View your starting XI, bench, captain, and key stats
- Get AI-generated advice on your starting lineup and transfer suggestions

## Tech stack

- **Frontend:** React + Vite, deployed on Vercel
- **Backend:** Node.js + Express, deployed on Render
- **AI:** Groq API (LLaMA 3.3 70B)
- **Data:** Official FPL API

## Running locally

**Backend**
```bash
cd backend
npm install
# Add GROQ_API_KEY and PORT=3001 to a .env file
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
# Add VITE_API_BASE=http://localhost:3001/api to a .env file
npm run dev
```

## Author

Sheadon Lu
