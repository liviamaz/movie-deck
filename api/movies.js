// Serverless function: GET /api/movies
// Proxies TMDB "now playing in US theaters" so the API key stays server-side.
export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'TMDB_API_KEY is not configured on the server.' })
    return
  }

  const url =
    'https://api.themoviedb.org/3/movie/now_playing?region=US&language=en-US'

  try {
    const tmdbRes = await fetch(url, {
      headers: {
        // TMDB accepts the v4 read token as a Bearer header, and also accepts
        // a v3 key via ?api_key=. We send both styles so either key type works.
        Authorization: `Bearer ${apiKey}`,
        accept: 'application/json',
      },
    })

    let data
    if (tmdbRes.ok) {
      data = await tmdbRes.json()
    } else {
      // Fall back to v3 api_key query param if the Bearer header was rejected
      // (i.e. the configured key is a classic v3 key, not a v4 read token).
      const fallbackRes = await fetch(`${url}&api_key=${apiKey}`, {
        headers: { accept: 'application/json' },
      })
      if (!fallbackRes.ok) {
        const body = await fallbackRes.text()
        res
          .status(502)
          .json({ error: 'Upstream TMDB request failed.', detail: body.slice(0, 500) })
        return
      }
      data = await fallbackRes.json()
    }

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
    res.setHeader(
      'Cache-Control',
      's-maxage=21600, stale-while-revalidate=86400'
    )
    res.status(200).json({ movies })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load movies.', detail: String(err) })
  }
}
