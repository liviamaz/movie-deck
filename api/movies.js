// Serverless function: GET /api/movies
// Proxies TMDB "now playing in US theaters" so the API key stays server-side.
const TMDB = 'https://api.themoviedb.org/3'

// TMDB accepts the v4 read token as a Bearer header, and also accepts a v3 key
// via ?api_key=. We try Bearer first and fall back so either key type works.
async function tmdb(path, apiKey) {
  const res = await fetch(`${TMDB}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
    },
  })
  if (res.ok) return res

  const sep = path.includes('?') ? '&' : '?'
  return fetch(`${TMDB}${path}${sep}api_key=${apiKey}`, {
    headers: { accept: 'application/json' },
  })
}

// id -> name for TMDB's movie genres. Degrades to an empty map so a failure
// here costs the genre label, not the whole deck.
async function genreNames(apiKey) {
  try {
    const res = await tmdb('/genre/movie/list?language=en-US', apiKey)
    if (!res.ok) return {}
    const data = await res.json()
    return Object.fromEntries((data.genres || []).map((g) => [g.id, g.name]))
  } catch {
    return {}
  }
}

// now_playing carries no runtime or crew, so each title needs a detail call.
// Returns nulls rather than throwing: a missing runtime hides one field.
async function details(id, apiKey) {
  try {
    const res = await tmdb(
      `/movie/${id}?language=en-US&append_to_response=credits`,
      apiKey
    )
    if (!res.ok) return { runtime: null, credit: null }
    const data = await res.json()

    const director = (data.credits?.crew || []).find((c) => c.job === 'Director')
    const studio = (data.production_companies || [])[0]
    const parts = []
    if (director?.name) parts.push(`Dir. ${director.name}`)
    if (studio?.name) parts.push(studio.name)

    return {
      runtime: data.runtime || null,
      credit: parts.length ? parts.join(' · ') : null,
    }
  } catch {
    return { runtime: null, credit: null }
  }
}

// One page of now_playing. Page 2 can legitimately not exist, so a failure is
// reported rather than thrown and the caller decides whether it matters.
async function nowPlaying(page, apiKey) {
  try {
    const res = await tmdb(
      `/movie/now_playing?region=US&language=en-US&page=${page}`,
      apiKey
    )
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, results: [], detail: body.slice(0, 500) }
    }
    const data = await res.json()
    return { ok: true, results: data.results || [] }
  } catch (err) {
    return { ok: false, results: [], detail: String(err) }
  }
}

export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'TMDB_API_KEY is not configured on the server.' })
    return
  }

  try {
    const [first, second] = await Promise.all([
      nowPlaying(1, apiKey),
      nowPlaying(2, apiKey),
    ])

    // Page 1 is the deck; page 2 is a bonus, so only page 1 failing is fatal.
    if (!first.ok) {
      res
        .status(502)
        .json({ error: 'Upstream TMDB request failed.', detail: first.detail })
      return
    }

    // Pages shouldn't overlap, but a dupe here would show up as two channels
    // for the same film.
    const seen = new Set()
    const results = [...first.results, ...second.results]
      .filter((m) => !seen.has(m.id) && seen.add(m.id))
      // Kill limited-release noise: needs a meaningful number of votes.
      .filter((m) => (m.vote_count ?? 0) >= 10)
      // Newest first.
      .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
      .slice(0, 40)

    // Genre list and per-title details in one pass; the edge cache below means
    // this fan-out runs at most a few times a day.
    const [genres, extras] = await Promise.all([
      genreNames(apiKey),
      Promise.all(results.map((m) => details(m.id, apiKey))),
    ])

    // Trim to only the fields the client needs.
    const movies = results.map((m, i) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      poster_path: m.poster_path,
      release_date: m.release_date,
      vote_average: m.vote_average,
      vote_count: m.vote_count,
      genre: genres[(m.genre_ids || [])[0]] || null,
      runtime: extras[i].runtime,
      credit: extras[i].credit,
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
