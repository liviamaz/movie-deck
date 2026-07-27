import { useCallback, useEffect, useMemo, useState } from 'react'

const IMG_BASE = 'https://image.tmdb.org/t/p/w500'

function posterUrl(path) {
  return path ? `${IMG_BASE}${path}` : null
}

function formatDate(iso) {
  if (!iso) return 'Release date unknown'
  // iso is YYYY-MM-DD; parse as local-safe date to avoid TZ off-by-one.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function App() {
  const [movies, setMovies] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('loading')
      setError(null)
      try {
        const res = await fetch('/api/movies')
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`)
        }
        const data = await res.json()
        if (cancelled) return
        const list = data.movies || []
        if (list.length === 0) {
          setStatus('error')
          setError('No movies came back from TMDB right now. Try again later.')
          return
        }
        setMovies(list)
        setIndex(0)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(err.message || 'Something went wrong loading the deck.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const count = movies.length

  const go = useCallback(
    (delta) => {
      setIndex((i) => {
        if (count === 0) return 0
        // Wrap around at both ends.
        return (i + delta + count) % count
      })
    },
    [count]
  )

  const prev = useCallback(() => go(-1), [go])
  const next = useCallback(() => go(1), [go])

  // Left/right arrow keys move through the deck.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  // Preload adjacent posters so navigation doesn't flash.
  const adjacentPosters = useMemo(() => {
    if (count === 0) return []
    const nextI = (index + 1) % count
    const prevI = (index - 1 + count) % count
    return [movies[nextI], movies[prevI]]
      .map((m) => posterUrl(m?.poster_path))
      .filter(Boolean)
  }, [movies, index, count])

  useEffect(() => {
    adjacentPosters.forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [adjacentPosters])

  if (status === 'loading') {
    return (
      <Shell>
        <div className="state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p>Loading movies now playing…</p>
        </div>
      </Shell>
    )
  }

  if (status === 'error') {
    return (
      <Shell>
        <div className="state" role="alert">
          <p className="state-title">Couldn’t load the deck</p>
          <p className="state-detail">{error}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </Shell>
    )
  }

  const movie = movies[index]

  return (
    <Shell>
      <div className="deck">
        <button
          className="nav-btn nav-prev"
          onClick={prev}
          aria-label="Previous movie"
        >
          ‹
        </button>

        <Card movie={movie} />

        <button
          className="nav-btn nav-next"
          onClick={next}
          aria-label="Next movie"
        >
          ›
        </button>
      </div>

      <div className="position" aria-live="polite">
        {index + 1} of {count}
      </div>
    </Shell>
  )
}

function Card({ movie }) {
  const url = posterUrl(movie.poster_path)
  const overview =
    movie.overview && movie.overview.trim().length > 0
      ? movie.overview
      : 'No description is available for this title yet.'
  const rating =
    movie.vote_average > 0 ? movie.vote_average.toFixed(1) : '—'

  return (
    <article className="card">
      <div className="poster">
        {url ? (
          <img
            src={url}
            alt={`Poster for ${movie.title}`}
            className="poster-img"
          />
        ) : (
          <div className="poster-placeholder" aria-label="No poster available">
            <span>🎬</span>
            <span className="poster-placeholder-title">{movie.title}</span>
          </div>
        )}
      </div>

      <div className="details">
        <h1 className="title">{movie.title}</h1>
        <div className="meta">
          <span className="date">{formatDate(movie.release_date)}</span>
          <span className="rating" title={`${movie.vote_count} votes`}>
            ★ {rating}
          </span>
        </div>
        <p className="overview">{overview}</p>
      </div>
    </article>
  )
}

function Shell({ children }) {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="brand">🎬 Movie Deck</h1>
        <p className="tagline">Now playing in US theaters</p>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <p>Use ← / → arrow keys or the buttons to flip through the deck.</p>
        <p className="tmdb-notice">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </footer>
    </div>
  )
}
