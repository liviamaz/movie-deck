import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const IMG_BASE = 'https://image.tmdb.org/t/p/w500'

const STAR = '★'
const HALF = '☆'
const SNOW =
  'repeating-linear-gradient(0deg, rgba(31,23,18,0.55) 0 1px, rgba(242,234,217,0.75) 1px 2px, rgba(31,23,18,0.35) 2px 3px, rgba(242,234,217,0.5) 3px 4px), repeating-linear-gradient(97deg, rgba(31,23,18,0.28) 0 2px, rgba(242,234,217,0.3) 2px 5px, rgba(31,23,18,0.14) 5px 9px)'

// ── Design tokens, lifted from the reference ──────────────────────────────
const PAPER = '#f2ead9'
const INK = '#1f1712'
const OXBLOOD = '#7a2a28'
const MUTED = '#6a6152'

const SERIF = "'Spectral', Georgia, serif"
const DISPLAY = "'Playfair Display', Didot, Georgia, serif"
const SANS = "'Jost', sans-serif"

// The reference's recurring 9px letterspaced uppercase label.
const label = (color = MUTED, tracking = '0.24em') => ({
  fontFamily: "'Spectral', serif",
  fontSize: '9px',
  letterSpacing: tracking,
  textTransform: 'uppercase',
  color,
})

// ── Static styles ─────────────────────────────────────────────────────────
const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '34px',
    padding: '52px',
    fontFamily: "'Jost', 'Helvetica Neue', sans-serif",
    alignItems: 'flex-start',
  },
  cabinet: {
    width: '1280px',
    background:
      'linear-gradient(158deg, #6d4726 0%, #5a3a1f 38%, #472d18 74%, #59391e 100%)',
    borderRadius: '18px 18px 8px 8px',
    padding: '44px 44px 0',
    boxSizing: 'border-box',
    boxShadow:
      'inset 0 2px 0 rgba(255,225,190,0.24), inset 0 -3px 10px rgba(0,0,0,0.5), 0 40px 70px -40px rgba(31,23,18,0.7)',
  },
  grain: {
    position: 'relative',
    borderRadius: '14px 14px 6px 6px',
    backgroundImage:
      'repeating-linear-gradient(91deg, rgba(255,226,186,0.055) 0 1px, rgba(0,0,0,0.05) 1px 3px, rgba(255,226,186,0.02) 3px 7px)',
    paddingBottom: '30px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 176px',
    gap: '26px',
    alignItems: 'stretch',
  },
  bezel: {
    position: 'relative',
    padding: '26px',
    borderRadius: '40px',
    background: 'linear-gradient(180deg, #241a13, #16100b)',
    boxShadow:
      'inset 0 3px 6px rgba(0,0,0,0.8), inset 0 -2px 0 rgba(255,222,184,0.08), 0 0 0 1px rgba(0,0,0,0.5)',
  },
  tube: {
    position: 'relative',
    width: '938px',
    height: '536px',
    overflow: 'hidden',
    borderRadius: '68px / 42px',
    background: PAPER,
    boxShadow: 'inset 0 0 46px rgba(31,23,18,0.28)',
  },
  picture: {
    width: '938px',
    height: '536px',
    boxSizing: 'border-box',
    padding: '42px 54px 56px',
    display: 'grid',
    gridTemplateColumns: '236px 1fr',
    gap: '40px',
    background: PAPER,
    backgroundImage:
      'radial-gradient(120% 90% at 22% 0%, rgba(31,23,18,0.04), rgba(31,23,18,0) 62%)',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage:
      'repeating-linear-gradient(180deg, rgba(31,23,18,0.045) 0 1px, rgba(31,23,18,0) 1px 3px)',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(118% 118% at 50% 48%, rgba(31,23,18,0) 56%, rgba(31,23,18,0.3) 100%)',
    boxShadow: 'inset 0 0 30px rgba(31,23,18,0.22)',
  },
  posterCol: { display: 'flex', flexDirection: 'column', gap: '10px' },
  posterBox: {
    width: '236px',
    height: '354px',
    backgroundImage:
      'repeating-linear-gradient(135deg, rgba(31,23,18,0.09) 0 7px, rgba(31,23,18,0.03) 7px 14px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '14px',
    boxSizing: 'border-box',
  },
  posterImg: {
    width: '236px',
    height: '354px',
    objectFit: 'cover',
    display: 'block',
  },
  noPoster: {
    width: '236px',
    height: '354px',
    background: INK,
    padding: '22px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  noPosterTitle: {
    fontFamily: DISPLAY,
    fontSize: '36px',
    lineHeight: 1.05,
    color: PAPER,
    textWrap: 'balance',
  },
  rule: { height: '1px', background: OXBLOOD },
  credit: {
    fontFamily: "'Spectral', serif",
    fontSize: '10px',
    fontStyle: 'italic',
    color: MUTED,
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
  },
  headRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(31,23,18,0.28)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '26px',
    marginTop: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(31,23,18,0.28)',
  },
  metaCell: { display: 'flex', flexDirection: 'column', gap: '4px' },
  metaValue: { fontFamily: "'Spectral', serif", fontSize: '13px', color: INK },
  starRow: { display: 'flex', alignItems: 'baseline', gap: '8px' },
  stars: { fontSize: '13px', letterSpacing: '0.14em', color: OXBLOOD },
  expand: {
    alignSelf: 'flex-start',
    flex: '0 0 auto',
    marginTop: '12px',
    border: 0,
    borderBottom: `1px solid ${OXBLOOD}`,
    background: 'transparent',
    padding: '0 0 3px',
    cursor: 'pointer',
    fontFamily: "'Spectral', serif",
    fontSize: '9px',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: OXBLOOD,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '26px 18px',
    borderRadius: '8px',
    backgroundColor: '#bdb7ab',
    backgroundImage:
      'repeating-linear-gradient(96deg, rgba(255,255,255,0.34) 0 1px, rgba(0,0,0,0.05) 1px 2px, rgba(255,255,255,0.1) 2px 4px), linear-gradient(100deg, #b9b3a7, #cdc7ba 42%, #a49e93)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 5px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.35)',
    alignItems: 'center',
  },
  knobStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '9px',
  },
  knobLabel: {
    fontFamily: SANS,
    fontSize: '9px',
    fontWeight: 500,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: '#3b352c',
  },
  channelNum: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '26px',
    lineHeight: 1,
    color: INK,
  },
  panelRule: { width: '100%', height: '1px', background: 'rgba(31,23,18,0.22)' },
  keycap: {
    fontFamily: SANS,
    fontSize: '12px',
    color: '#3b352c',
    border: '1px solid rgba(31,23,18,0.35)',
    borderRadius: '3px',
    padding: '1px 6px',
    background: 'rgba(255,255,255,0.35)',
  },
  tickRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    margin: '22px 26px 0',
    height: '10px',
  },
  plinth: {
    height: '26px',
    margin: '0 -44px',
    background: 'linear-gradient(180deg, #3b2515, #2a1a0e)',
    borderRadius: '0 0 8px 8px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
  },
}

// Edge-of-screen prev/next hotspots.
const edgeBtn = (side) => ({
  position: 'absolute',
  [side]: 0,
  top: 0,
  bottom: 0,
  width: '50px',
  border: 0,
  background: 'transparent',
  cursor: side === 'left' ? 'w-resize' : 'e-resize',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Playfair Display', serif",
  fontSize: '28px',
  color: INK,
  opacity: 0.16,
  transition: 'opacity 150ms',
})

// ── Derived styles ────────────────────────────────────────────────────────
function knob(i, size) {
  const deg = -140 + i * 280
  return {
    position: 'absolute',
    left: '50%',
    top: size * 0.11 + 'px',
    width: '3px',
    height: size * 0.24 + 'px',
    marginLeft: '-1.5px',
    background: '#e6dcc8',
    borderRadius: '2px',
    transformOrigin: '50% ' + size * 0.39 + 'px',
    transform: 'rotate(' + deg + 'deg)',
    transition: 'transform 220ms cubic-bezier(.2,.8,.2,1)',
  }
}

function roll(dir, seq) {
  if (!seq) return { transformOrigin: '50% 50%' }
  return {
    '--roll': -24 * dir + 'px',
    animation: 'chRoll' + ((seq % 3) + 1) + ' 175ms cubic-bezier(.3,.02,.2,1)',
  }
}

function snow(seq) {
  const base = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0,
    backgroundImage: SNOW,
    backgroundSize: 'auto, 300% 100%',
    mixBlendMode: 'hard-light',
  }
  if (!seq) return base
  return { ...base, animation: 'chSnow' + ((seq % 3) + 1) + ' 165ms steps(4, end)' }
}

function titleStyle(len) {
  const size = len <= 20 ? 56 : len <= 34 ? 45 : len <= 54 ? 34 : 24
  return {
    margin: '18px 0 0',
    fontFamily: DISPLAY,
    fontWeight: 500,
    fontSize: size + 'px',
    lineHeight: len > 54 ? 1.14 : 1.03,
    letterSpacing: '-0.012em',
    color: INK,
    textWrap: 'balance',
    hyphens: 'auto',
    maxWidth: '16ch',
  }
}

function descStyle(expanded) {
  return {
    margin: '16px 0 0',
    fontFamily: SERIF,
    fontWeight: 300,
    fontSize: '14.5px',
    lineHeight: 1.64,
    color: '#332a22',
    maxWidth: '56ch',
    textWrap: 'pretty',
    ...(expanded
      ? { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '18px' }
      : {
          flex: '0 0 auto',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 4,
          overflow: 'hidden',
        }),
  }
}

// ── Data shaping ──────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return null
  // iso is YYYY-MM-DD; parse as local-safe date to avoid TZ off-by-one.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function starGlyphs(rating5) {
  const full = Math.max(0, Math.min(5, Math.round(rating5 ?? 0)))
  return STAR.repeat(full) + HALF.repeat(5 - full)
}

// TMDB rates out of 10; the design's dial reads out of 5.
function toFilm(m) {
  const rating5 = m.vote_average > 0 ? m.vote_average / 2 : null
  return {
    title: m.title,
    date: formatDate(m.release_date),
    rating5,
    rating: rating5 == null ? '—' : rating5.toFixed(1),
    runtime: m.runtime || null,
    genre: m.genre || null,
    credit: m.credit || null,
    desc: (m.overview || '').trim(),
    poster: m.poster_path ? IMG_BASE + m.poster_path : null,
  }
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [movies, setMovies] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error' | 'empty'
  const [error, setError] = useState(null)

  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [seq, setSeq] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/movies')
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = await res.json()
        if (cancelled) return
        const list = (data.movies || []).map(toFilm)
        if (list.length === 0) {
          setStatus('empty')
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

  const genres = useMemo(() => {
    const out = []
    movies.forEach((f) => {
      if (f.genre && out.indexOf(f.genre) < 0) out.push(f.genre)
    })
    return out
  }, [movies])

  // One synchronous swap per navigation; the roll + snow keyframes restart via
  // a cycling animation name, so nothing can be left mid-flight.
  const jump = useCallback(
    (target, d) => {
      if (target < 0 || target === index) return
      setIndex(target)
      setDir(d)
      setSeq((s) => s + 1)
      setExpanded(false)
    },
    [index]
  )

  const nav = useCallback(
    (d) => {
      if (count === 0) return
      jump((index + d + count) % count, d)
    },
    [count, index, jump]
  )

  const navGenre = useCallback(
    (d) => {
      if (genres.length === 0) return
      const cur = movies[index]?.genre
      const at = genres.indexOf(cur)
      const g = genres[(at + d + genres.length) % genres.length]
      jump(
        movies.findIndex((f) => f.genre === g),
        d
      )
    },
    [genres, movies, index, jump]
  )

  // Keep the handler fresh without rebinding the listener on every nav.
  const handlers = useRef({ nav, navGenre })
  handlers.current = { nav, navGenre }

  useEffect(() => {
    function onKey(e) {
      const k = e.key
      if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'ArrowUp' && k !== 'ArrowDown')
        return
      e.preventDefault()
      if (k === 'ArrowUp' || k === 'ArrowDown')
        handlers.current.navGenre(k === 'ArrowDown' ? 1 : -1)
      else handlers.current.nav(k === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Preload adjacent posters so navigation doesn't flash.
  useEffect(() => {
    if (count === 0) return
    ;[movies[(index + 1) % count], movies[(index - 1 + count) % count]]
      .map((m) => m?.poster)
      .filter(Boolean)
      .forEach((url) => {
        const img = new Image()
        img.src = url
      })
  }, [movies, index, count])

  const film = movies[index]
  const ready = status === 'ready' && film

  return (
    <section style={S.page}>
      <div style={S.cabinet}>
        <div style={S.grain}>
          <div style={S.grid}>
            <div style={S.bezel}>
              <div style={S.tube}>
                <div style={{ position: 'absolute', inset: 0, ...roll(dir, seq) }}>
                  {ready ? (
                    <Picture
                      film={film}
                      index={index}
                      count={count}
                      genres={genres}
                      expanded={expanded}
                      onToggle={() => setExpanded((v) => !v)}
                    />
                  ) : (
                    <Message status={status} error={error} />
                  )}
                </div>

                <div style={S.scanlines} />
                <div style={S.vignette} />
                {/* Loading holds the static on; navigation fires it as a burst. */}
                <div
                  style={
                    status === 'loading'
                      ? { ...snow(0), opacity: 0.34 }
                      : snow(seq)
                  }
                />

                <EdgeButton side="left" onClick={() => nav(-1)} label="Previous film">
                  ‹
                </EdgeButton>
                <EdgeButton side="right" onClick={() => nav(1)} label="Next film">
                  ›
                </EdgeButton>
              </div>
            </div>

            <div style={S.panel}>
              <div style={S.knobStack}>
                <Knob size={96} turn={count > 1 ? index / (count - 1) : 0}>
                  <button
                    type="button"
                    onClick={() => nav(-1)}
                    style={hitLeft(46, -6)}
                    aria-label="Previous film"
                  />
                  <button
                    type="button"
                    onClick={() => nav(1)}
                    style={hitRight(46, -6)}
                    aria-label="Next film"
                  />
                </Knob>
                <span style={S.knobLabel}>Channel</span>
                <span style={S.channelNum}>
                  {ready ? String(index + 1).padStart(2, '0') : '––'}
                </span>
              </div>

              <div style={S.panelRule} />

              <div style={S.knobStack}>
                <Knob
                  size={66}
                  turn={
                    genres.length > 1
                      ? Math.max(0, genres.indexOf(film?.genre)) / (genres.length - 1)
                      : 0
                  }
                >
                  <button
                    type="button"
                    onClick={() => navGenre(-1)}
                    style={hitLeft(33, -4)}
                    aria-label="Previous genre"
                  />
                  <button
                    type="button"
                    onClick={() => navGenre(1)}
                    style={hitRight(33, -4)}
                    aria-label="Next genre"
                  />
                </Knob>
                <span style={S.knobLabel}>Genre</span>
              </div>

              <div style={{ ...S.knobStack, opacity: 0.62 }}>
                <div
                  style={{
                    position: 'relative',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background:
                      'radial-gradient(72% 72% at 34% 26%, #4b3a28, #251b14 72%, #170f0b)',
                    boxShadow:
                      '0 2px 5px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,222,184,0.18)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '7px',
                      width: '2px',
                      height: '13px',
                      marginLeft: '-1px',
                      background: '#cdc7ba',
                      transform: 'rotate(38deg)',
                      transformOrigin: '50% 16px',
                    }}
                  />
                </div>
                <span
                  style={{
                    ...S.knobLabel,
                    fontSize: '8px',
                    letterSpacing: '0.2em',
                    textAlign: 'center',
                  }}
                >
                  Bright
                  <br />
                  decorative
                </span>
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={S.keycap}>←</span>
                  <span style={S.keycap}>→</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={S.keycap}>↑</span>
                  <span style={S.keycap}>↓</span>
                </div>
              </div>
            </div>
          </div>

          <div style={S.tickRow}>
            {movies.map((f, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: i === index ? '9px' : '2px',
                  background: i === index ? '#c98a3a' : 'rgba(255,232,200,0.24)',
                  transition: 'height 200ms, background 200ms',
                }}
              />
            ))}
          </div>
        </div>

        <div style={S.plinth} />
      </div>
    </section>
  )
}

// ── Screen contents ───────────────────────────────────────────────────────
function Picture({ film, index, count, genres, expanded, onToggle }) {
  const genrePos = film.genre
    ? `${film.genre} · ${genres.indexOf(film.genre) + 1} of ${genres.length}`
    : ''

  return (
    <div style={S.picture}>
      <div style={S.posterCol}>
        <Poster key={film.poster || film.title} film={film} />
        {film.credit && <div style={S.credit}>{film.credit}</div>}
      </div>

      <div style={S.details}>
        <div style={S.headRow}>
          <span style={label(OXBLOOD, '0.28em')}>{genrePos}</span>
          <span style={label(MUTED, '0.28em')}>
            Ch {String(index + 1).padStart(2, '0')} of {count}
          </span>
        </div>

        <h2 style={titleStyle(film.title.length)}>{film.title}</h2>

        <div style={S.metaRow}>
          {film.date && (
            <div style={S.metaCell}>
              <span style={label()}>Released</span>
              <span style={S.metaValue}>{film.date}</span>
            </div>
          )}
          <div style={S.metaCell}>
            <span style={label()}>Rating</span>
            <span style={S.starRow}>
              <span style={S.stars}>{starGlyphs(film.rating5)}</span>
              <span style={S.metaValue}>{film.rating}</span>
            </span>
          </div>
          {film.runtime && (
            <div style={{ ...S.metaCell, marginLeft: 'auto' }}>
              <span style={label()}>Running time</span>
              <span style={S.metaValue}>{film.runtime} min</span>
            </div>
          )}
        </div>

        {film.desc ? (
          <p style={descStyle(expanded)}>{film.desc}</p>
        ) : (
          <p style={{ ...descStyle(false), fontStyle: 'italic', color: MUTED }}>
            No synopsis supplied.
          </p>
        )}

        {film.desc.length > 250 && (
          <button type="button" onClick={onToggle} style={S.expand}>
            {expanded ? 'Close synopsis' : 'Read the full synopsis'}
          </button>
        )}
      </div>
    </div>
  )
}

// A poster that 404s falls back to the same no-artwork card as a title that
// never had one, so a dead TMDB path never shows a broken image.
function Poster({ film }) {
  const [failed, setFailed] = useState(false)

  if (film.poster && !failed) {
    return (
      <img
        src={film.poster}
        alt={`Poster for ${film.title}`}
        style={S.posterImg}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div style={S.noPoster}>
      <div style={label('#b4a893', '0.26em')}>No artwork supplied</div>
      <div style={S.noPosterTitle}>{film.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={S.rule} />
        <div style={label('#b4a893', '0.2em')}>{film.date}</div>
      </div>
    </div>
  )
}

// Loading / error / empty. Same paper screen, same label and body idioms as
// the card — no styling the reference doesn't already use.
function Message({ status, error }) {
  const copy = {
    loading: {
      tone: MUTED,
      heading: 'Tuning in',
      body: 'Finding what is playing in US theaters.',
    },
    error: {
      tone: OXBLOOD,
      heading: 'No signal',
      body: error || 'The listings could not be reached.',
    },
    empty: {
      tone: MUTED,
      heading: 'Nothing scheduled',
      body: 'No titles are playing in US theaters right now.',
    },
  }[status]

  if (!copy) return null

  return (
    <div
      style={{
        ...S.picture,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
      }}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div style={label(copy.tone, '0.26em')}>{copy.heading}</div>
      <div style={{ width: '120px', ...S.rule, background: copy.tone }} />
      <p
        style={{
          margin: 0,
          fontFamily: SERIF,
          fontWeight: 300,
          fontSize: '14.5px',
          lineHeight: 1.64,
          color: '#332a22',
          maxWidth: '46ch',
          textAlign: 'center',
          textWrap: 'pretty',
        }}
      >
        {copy.body}
      </p>
      {status === 'error' && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ ...S.expand, alignSelf: 'center', marginTop: 0 }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

// ── Small pieces ──────────────────────────────────────────────────────────
function EdgeButton({ side, onClick, label: aria, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      style={edgeBtn(side)}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.7)}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.16)}
    >
      {children}
    </button>
  )
}

function Knob({ size, turn, children }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size + 'px',
        height: size + 'px',
        borderRadius: '50%',
        background:
          'radial-gradient(72% 72% at 34% 26%, #58452f, #2b2018 72%, #1a130e)',
        boxShadow:
          size > 80
            ? '0 3px 7px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,222,184,0.22)'
            : '0 3px 6px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,222,184,0.2)',
      }}
    >
      <div style={knob(turn, size)} />
      {children}
    </div>
  )
}

const hitLeft = (w, off) => ({
  position: 'absolute',
  left: off + 'px',
  top: 0,
  bottom: 0,
  width: w + 'px',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: '50% 0 0 50%',
})

const hitRight = (w, off) => ({
  position: 'absolute',
  right: off + 'px',
  top: 0,
  bottom: 0,
  width: w + 'px',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: '0 50% 50% 0',
})
