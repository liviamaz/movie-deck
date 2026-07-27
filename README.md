# 🎬 Movie Deck

A single-page app that shows movies currently playing in US theaters as a deck
of large cards you flip through with the ← / → arrow keys.

Built with **Vite + React**, deployed to **Vercel**. Movie data comes from
[TMDB](https://www.themoviedb.org/) via a serverless function that keeps the API
key server-side.

## How it works

- `api/movies.js` — Vercel serverless function. Calls TMDB `now_playing`
  (region US), trims the payload, filters out titles with `vote_count < 50`,
  sorts by release date descending, and caps at 20. The API key is read from
  `process.env.TMDB_API_KEY` and never reaches the client.
- `src/App.jsx` — the deck UI: one poster-forward card at a time, arrow-key and
  button navigation with wrap-around, a position indicator, adjacent-poster
  preloading, and loading/error states.

## Local development

```bash
npm install
```

You have two options for running locally:

### Option A — full stack with `vercel dev` (recommended)

This runs the serverless function too, so the app gets real data.

```bash
npm i -g vercel        # if you don't have it
echo "TMDB_API_KEY=your_key_here" > .env.local
vercel dev             # serves the app + /api/movies together
```

### Option B — Vite only

`npm run dev` runs the frontend but **not** the `/api/movies` function (Vite
doesn't execute serverless functions), so the deck will show its error state.
Use this only for pure UI work. For real data locally, use Option A.

```bash
npm run dev
```

## Deploying to Vercel

Same GitHub-based flow as a normal Vite app:

1. Push this repo to GitHub.
2. In Vercel, **Add New… → Project** and import the GitHub repo.
3. Vercel auto-detects the **Vite** framework preset (build `vite build`,
   output `dist`). The `api/` folder is auto-detected as serverless functions —
   no extra config needed.
4. **Add the environment variable** (see below) before/at deploy.
5. Deploy.

### Environment variable setup

In the Vercel project: **Settings → Environment Variables**, add:

| Name            | Value                         | Environments                     |
| --------------- | ----------------------------- | -------------------------------- |
| `TMDB_API_KEY`  | your TMDB key or read token   | Production, Preview, Development  |

- Get a key at https://www.themoviedb.org/settings/api. Either the **v4 API
  Read Access Token** (recommended) or the classic **v3 API key** works — the
  function tries the Bearer header first and falls back to the `api_key` query
  param.
- Tick all three environments so preview deployments and `vercel dev` work too.
- After adding or changing the variable, **redeploy** for it to take effect.

## TMDB attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
