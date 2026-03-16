# 🍽️ Bell Family AI Meal Planner

An AI-driven weekly meal planner for the Bell family — powered by Google Gemini.

## Features
- **AI-generated weekly meal plan** every Saturday at noon (configurable)
- **Weeknight-aware**: Mon–Thu = quick 30-min meals; Sunday = elaborate cooking + Random Sunday special from Bell Favorite Recipes
- **Wednesday Takeout Night** toggle (toggle any day to takeout on the fly)
- **Edit any day**: change meal, sides, who's cooking via picklist or free-type
- **Portions control**: tap +/- per day to adjust servings (for when someone's not home)
- **Auto grocery list**: categorized by aisle, tap items to check off, add custom items
- **Meal ratings**: family members rate meals 1–5 ⭐ so the AI learns preferences
- **Plan history**: last 12 weeks archived and browsable
- **Allergy/dietary settings** per family member
- **Render-ready**: one `npm run build && npm start` deploys the full app

## Quick Start (Local)

### 1. Get a Gemini API key
Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free key.

### 2. Set up environment
```
cp server/.env.example server/.env
# Edit server/.env and paste your GEMINI_API_KEY
```

### 3. Install dependencies & run
```bash
# From the project root:
cd server && npm install
cd ../client && npm install
cd ..

# Terminal 1 — backend (port 5001)
cd server && npm run dev

# Terminal 2 — frontend (port 3000, with hot reload)
cd client && npm run dev
```
Open http://localhost:3000

### 4. Generate your first plan
- Click **"Generate This Week's Plan"** on the home page
- Gemini will build a 7-day plan with your family recipes, cooking constraints, and a Random Sunday special

## Loading Your Meals from Google Sheets

1. In Google Sheets, export your Meals tab as CSV
2. Make sure columns are: `name, type, link, notes` (type = `meal` or `side`)
3. Go to **Settings → Known Meals & Sides → Import CSV**
4. Paste your CSV and click Import

## Deploying to Render

1. Push this repo to GitHub
2. Create a new **Web Service** on Render
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variable: `GEMINI_API_KEY = your_key_here`

## Push Notifications (Phase 2)
Push notifications to Android/iOS are a Phase 2 feature. The scheduler already runs and generates plans — notifications can be added via:
- **Expo Push** (for a React Native app)
- **Firebase Cloud Messaging** (web push + Android)
- **Twilio** (SMS)

## Tech Stack
- **Backend**: Node.js, Express, node-cron, @google/generative-ai
- **Frontend**: React 19, Vite, Tailwind CSS, React Router
- **Data**: JSON files in `/data/` (no database needed)
- **AI**: Gemini 2.0 Flash (fast + free tier available)
- **Hosting**: Render.com
