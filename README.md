# 🎬 Movie Deck

A single-page app that shows movies currently playing in US theaters as a retro
television console. One film fills the screen at a time; the arrow keys change
the channel.

Built with **Vite + React**, deployed to **Vercel**. Movie data comes from
[TMDB](https://www.themoviedb.org/) via a serverless function that keeps the API
key server-side.

## Controls

| Key | Action |
| --- | --- |
| ← / → | Previous / next film (wraps around) |
| ↑ / ↓ | Previous / next genre |

The channel and genre knobs and the screen edges do the same thing with a mouse.

## How it works

- `api/movies.js` — Vercel serverless function. Calls TMDB `now_playing`
  (region US), filters out titles with `vote_count < 50`, sorts by release date
  descending, and caps at 20. It then resolves genre names from
  `/genre/movie/list` and fetches per-title `runtime` and director/studio
  credits from `/movie/{id}?append_to_response=credits` — `now_playing` carries
  none of those. Both enrichment steps degrade to `null` on failure rather than
  failing the request, and the 6h edge cache means the fan-out runs at most a
  few times a day. The API key is read from `process.env.TMDB_API_KEY` and never
  reaches the client.
- `src/App.jsx` — the console UI, built from the `design/reference.html` mockup.
  Poster, title, release date, star rating, runtime, and synopsis on a paper
  screen, with a channel tick strip, working channel/genre knobs, wrap-around
  navigation, adjacent-poster preloading, and loading/error/empty screens.
- `src/index.css` — the only global CSS: page background, focus ring, and the
  channel-roll / static keyframes. Everything else is inline, as in the mockup.
- Fonts (Jost, Playfair Display, Spectral) load from Google Fonts via
  `index.html`.

The console is a fixed 1280px wide — the reference design defines no responsive
behaviour, so narrow viewports scroll horizontally rather than reflow.

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
