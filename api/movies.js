// Serverless function: GET /api/movies
// Proxies TMDB "now playing in US theaters" so the API key stays server-side.

const TMDB_URL =
  'https://api.themoviedb.org/3/movie/now_playing?region=US&language=en-US'

// Small helper so every error path logs the real cause (visible in Vercel
// function logs) and returns a consistent JSON body with a useful status code.
function fail(res, status, message, detail) {
  // console.error surfaces in the Vercel "Function Logs" for the invocation.
  console.error(`[api/movies] ${status} — ${message}`, detail ?? '')
  res.status(status).json({ error: message, ...(detail ? { detail } : {}) })
}

// Try to pull TMDB's own error message out of a failed response body.
async function readUpstreamError(response) {
  const text = await response.text().catch(() => '')
  try {
    const json = JSON.parse(text)
    return json.status_message || json.errors?.join?.('; ') || text.slice(0, 300)
  } catch {
    return text.slice(0, 300)
  }
}

export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    // Misconfiguration, not a client error: 500 is correct, but say why.
    return fail(
      res,
      500,
      'TMDB_API_KEY is not set on the server. Add it in Vercel → Settings → ' +
        'Environment Variables (Production) and redeploy.'
    )
  }

  try {
    // TMDB accepts a v4 read token as a Bearer header. If that's rejected
    // (e.g. the key is a classic v3 key), retry with the ?api_key= query param.
    let tmdbRes = await fetch(TMDB_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: 'application/json',
      },
    })

    if (!tmdbRes.ok && (tmdbRes.status === 401 || tmdbRes.status === 403)) {
      tmdbRes = await fetch(`${TMDB_URL}&api_key=${encodeURIComponent(apiKey)}`, {
        headers: { accept: 'application/json' },
      })
    }

    if (!tmdbRes.ok) {
      const detail = await readUpstreamError(tmdbRes)
      // Auth failures mean a bad/missing key -> that's our config problem (502
      // is misleading), everything else is a genuine upstream fault.
      if (tmdbRes.status === 401 || tmdbRes.status === 403) {
        return fail(
          res,
          502,
          'TMDB rejected the API key. Check that TMDB_API_KEY is a valid v4 ' +
            'read token or v3 key.',
          detail
        )
      }
      if (tmdbRes.status === 429) {
        return fail(res, 429, 'TMDB rate limit hit. Try again shortly.', detail)
      }
      return fail(
        res,
        502,
        `TMDB request failed (upstream status ${tmdbRes.status}).`,
        detail
      )
    }

    const data = await tmdbRes.json()

    const movies = (data.results || [])
      // Kill limited-release noise: needs a meaningful number of votes.
      .filter((m) => (m.vote_count ?? 0) >= 50)
      // Newest first.
      .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
      .slice(0, 20)
      // Trim to only the fields the client needs.
      .map((m) => ({
        id: m.id,
        title: m.title,
        overview: m.overview,
        poster_path: m.poster_path,
        release_date: m.release_date,
        vote_average: m.vote_average,
        vote_count: m.vote_count,
      }))

    // Cache at the edge for 6h, serve stale for another 24h while revalidating.
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400')
    res.status(200).json({ movies })
  } catch (err) {
    // Network error, DNS failure, JSON parse blowup, etc. — log the real
    // message and return 502 (we failed talking to an upstream), not a bare 500.
    return fail(res, 502, 'Failed to reach TMDB.', err?.message || String(err))
  }
}
