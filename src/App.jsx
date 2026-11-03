import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getSession,
  onAuthChange,
  sendMagicLink,
  signOut,
} from './lib/auth'
import {
  createWord,
  listWords,
  removeWord as deleteWord,
  setWordStatus,
  storageMode,
} from './lib/storage'
import './App.css'

const STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'learning', label: 'Learning' },
  { id: 'mastered', label: 'Mastered' },
]

const STATUS_LABELS = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
}

const FILTERS = [{ id: 'all', label: 'All' }, ...STATUSES]

function IconBook() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19" />
      <path d="M8 7.5h7" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4h6v3M6.5 7l.8 12.1a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function Login({
  email,
  setEmail,
  error,
  sending,
  sentTo,
  onSubmit,
  onReset,
}) {
  return (
    <div className="app auth-page">
      <div className="auth-card">
        <span className="brand-mark auth-mark">
          <IconBook />
        </span>
        <p className="eyebrow">Personal word collection</p>
        <h1>Vocabulary Bank</h1>
        <p className="auth-lede">
          Sign in with your email and we&rsquo;ll send you a magic link. No
          password, no sign-up.
        </p>

        {sentTo ? (
          <div className="auth-sent" role="status">
            <h2>Check your inbox</h2>
            <p>
              We sent a sign-in link to <strong>{sentTo}</strong>. Open it on
              this device to continue.
            </p>
            <button type="button" className="link-button" onClick={onReset}>
              Use a different email
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <label htmlFor="email-input">Email</label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
            />
            <button
              type="submit"
              className="add-button auth-submit"
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <p className="auth-note">
          Accounts are created by the owner. This app does not offer sign-up.
        </p>
      </div>
    </div>
  )
}

function App() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(storageMode === 'supabase')
  const userIdRef = useRef(null)
  const [email, setEmail] = useState('')
  const [authError, setAuthError] = useState('')
  const [sendingLink, setSendingLink] = useState(false)
  const [linkSentTo, setLinkSentTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [example, setExample] = useState('')
  const [status, setStatus] = useState('new')
  const [error, setError] = useState('')

  useEffect(() => {
    if (storageMode !== 'supabase') return undefined

    const controller = new AbortController()

    getSession()
      .then((current) => {
        if (controller.signal.aborted) return
        const currentId = current?.user?.id ?? null
        if (currentId && currentId !== userIdRef.current) setLoading(true)
        userIdRef.current = currentId
        setSession(current)
      })
      .catch((sessionError) => {
        if (controller.signal.aborted) return
        setAuthError(
          sessionError.message || 'Could not check your sign-in state.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthLoading(false)
      })

    const unsubscribe = onAuthChange((nextSession) => {
      if (controller.signal.aborted) return
      const nextId = nextSession?.user?.id ?? null
      if (nextId && nextId !== userIdRef.current) setLoading(true)
      userIdRef.current = nextId
      setSession(nextSession)
      setAuthLoading(false)
      if (nextSession) {
        setLinkSentTo('')
        setAuthError('')
      } else {
        setWords([])
      }
    })

    return () => {
      controller.abort()
      unsubscribe()
    }
  }, [])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (authLoading) return undefined

    if (storageMode === 'supabase' && !userId) return undefined

    let cancelled = false

    listWords()
      .then((loaded) => {
        if (!cancelled) setWords(loaded)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setSyncError(loadError.message || 'Could not load your words.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, userId])

  const counts = useMemo(() => {
    const totals = { all: words.length, new: 0, learning: 0, mastered: 0 }
    for (const entry of words) {
      totals[entry.status] += 1
    }
    return totals
  }, [words])

  const percent = counts.all
    ? Math.round((counts.mastered / counts.all) * 100)
    : 0

  const visibleWords = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return words.filter((entry) => {
      const matchesStatus = filter === 'all' || entry.status === filter
      const matchesQuery =
        !needle ||
        entry.word.toLowerCase().includes(needle) ||
        entry.meaning.toLowerCase().includes(needle) ||
        entry.example.toLowerCase().includes(needle)
      return matchesStatus && matchesQuery
    })
  }, [words, filter, query])

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedWord = word.trim()
    const trimmedMeaning = meaning.trim()

    if (!trimmedWord) {
      setError('Enter a word before adding it.')
      return
    }

    if (!trimmedMeaning) {
      setError('Add a meaning before saving.')
      return
    }

    const duplicate = words.some(
      (entry) => entry.word.toLowerCase() === trimmedWord.toLowerCase(),
    )
    if (duplicate) {
      setError(`“${trimmedWord}” is already in your bank.`)
      return
    }

    setSaving(true)
    setSyncError('')

    try {
      const entry = await createWord({
        word: trimmedWord,
        meaning: trimmedMeaning,
        example: example.trim(),
        status,
      })

      setWords((previous) => [entry, ...previous])
      setWord('')
      setMeaning('')
      setExample('')
      setStatus('new')
      setError('')
    } catch (saveError) {
      setSyncError(saveError.message || 'Could not save your word.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(id, nextStatus) {
    const entry = words.find((item) => item.id === id)
    if (!entry || entry.status === nextStatus) return

    setWords((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item,
      ),
    )
    setSyncError('')

    try {
      await setWordStatus(id, nextStatus)
    } catch (toggleError) {
      setWords((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, status: entry.status } : item,
        ),
      )
      setSyncError(toggleError.message || 'Could not update that word.')
    }
  }

  async function removeWord(id) {
    const entry = words.find((item) => item.id === id)
    setWords((previous) => previous.filter((item) => item.id !== id))
    setSyncError('')

    try {
      await deleteWord(id)
    } catch (removeError) {
      if (entry) {
        setWords((previous) =>
          [entry, ...previous].sort((a, b) => b.createdAt - a.createdAt),
        )
      }
      setSyncError(removeError.message || 'Could not delete that word.')
    }
  }

  function clearFilters() {
    setFilter('all')
    setQuery('')
  }

  async function handleLogin(event) {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setAuthError('Enter a valid email address.')
      return
    }

    setSendingLink(true)
    setAuthError('')

    try {
      await sendMagicLink(trimmedEmail)
      setLinkSentTo(trimmedEmail)
    } catch (loginError) {
      const message = loginError.message || 'Could not send the sign-in link.'
      setAuthError(
        /signups? not allowed|user not found/i.test(message)
          ? 'No account exists for that email. Ask the owner to add you first.'
          : message,
      )
    } finally {
      setSendingLink(false)
    }
  }

  function resetLogin() {
    setLinkSentTo('')
    setAuthError('')
    setEmail('')
  }

  async function handleSignOut() {
    setSyncError('')
    try {
      await signOut()
      setWords([])
    } catch (logoutError) {
      setSyncError(logoutError.message || 'Could not sign you out.')
    }
  }

  if (storageMode === 'supabase' && authLoading) {
    return (
      <div className="app auth-page">
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Checking your session…
        </div>
      </div>
    )
  }

  if (storageMode === 'supabase' && !session) {
    return (
      <Login
        email={email}
        setEmail={setEmail}
        error={authError}
        sending={sendingLink}
        sentTo={linkSentTo}
        onSubmit={handleLogin}
        onReset={resetLogin}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <IconBook />
          </span>
          <div>
            <p className="eyebrow">Personal word collection</p>
            <h1>Vocabulary Bank</h1>
            <p className="tagline">
              A quiet place for the words you&rsquo;re learning.
            </p>
          </div>
        </div>

        <div className="progress-card">
          <div className="progress-top">
            <span className="progress-label">Mastery progress</span>
            <span className="progress-value">{percent}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={percent}
            aria-label="Words mastered"
          >
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="progress-meta">
            {counts.all === 0
              ? 'Add a word to start tracking progress.'
              : `${counts.mastered} of ${counts.all} ${
                  counts.all === 1 ? 'word' : 'words'
                } mastered`}
          </p>
        </div>
      </header>

      {syncError && (
        <div className="sync-banner" role="alert">
          <span>{syncError}</span>
          <button
            type="button"
            className="sync-dismiss"
            onClick={() => setSyncError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <section className="add-card" aria-labelledby="add-heading">
        <h2 id="add-heading" className="section-title">
          Add a word
        </h2>

        <form className="add-form" onSubmit={handleSubmit} noValidate>
          <div className="field field-word">
            <label htmlFor="word-input">Word</label>
            <input
              id="word-input"
              type="text"
              value={word}
              onChange={(event) => {
                setWord(event.target.value)
                if (error) setError('')
              }}
              placeholder="e.g. serendipity"
              maxLength={60}
              autoComplete="off"
            />
          </div>

          <div className="field field-meaning">
            <label htmlFor="meaning-input">Meaning</label>
            <input
              id="meaning-input"
              type="text"
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              placeholder="e.g. a happy accident"
              maxLength={180}
              autoComplete="off"
              required
            />
          </div>

          <div className="field field-example">
            <label htmlFor="example-input">
              Example <span className="optional">optional</span>
            </label>
            <textarea
              id="example-input"
              value={example}
              onChange={(event) => setExample(event.target.value)}
              placeholder="e.g. We met by pure serendipity."
              rows={2}
              maxLength={300}
            />
          </div>

          <fieldset className="field status-field">
            <legend>Status</legend>
            <div className="segmented">
              {STATUSES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`segment ${
                    status === option.id ? 'is-active' : ''
                  }`}
                  aria-pressed={status === option.id}
                  onClick={() => setStatus(option.id)}
                >
                  <span className={`dot dot-${option.id}`} />
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="add-button" disabled={saving}>
            <IconPlus />
            {saving ? 'Adding…' : 'Add word'}
          </button>
        </form>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter words by status">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="filter"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
              <span className="filter-count">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <div className="search">
          <span className="search-icon">
            <IconSearch />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search words, meanings, or examples…"
            aria-label="Search words, meanings, or examples"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Loading your bank…
        </div>
      ) : visibleWords.length > 0 ? (
        <ul className="word-grid">
          {visibleWords.map((entry) => (
            <li key={entry.id}>
              <article className="word-card">
                <div className="card-head">
                  <h3 className="word">{entry.word}</h3>
                  <span className={`badge badge-${entry.status}`}>
                    <span className={`dot dot-${entry.status}`} />
                    {STATUS_LABELS[entry.status]}
                  </span>
                </div>

                <p
                  className={`meaning ${entry.meaning ? '' : 'meaning-empty'}`}
                >
                  {entry.meaning || 'No meaning added yet.'}
                </p>

                {entry.example && (
                  <p className="example">
                    <span className="example-label">Example</span>
                    {entry.example}
                  </p>
                )}

                <div className="card-foot">
                  <select
                    className={`status-select status-select-${entry.status}`}
                    value={entry.status}
                    onChange={(event) =>
                      changeStatus(entry.id, event.target.value)
                    }
                    aria-label={`Status for ${entry.word}`}
                    title={`Status for ${entry.word}`}
                  >
                    {STATUSES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => removeWord(entry.id)}
                    aria-label={`Delete ${entry.word}`}
                    title={`Delete ${entry.word}`}
                  >
                    <IconTrash />
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <IconBook />
          </span>
          {words.length === 0 ? (
            <>
              <h2>Your bank is empty</h2>
              <p>
                Add the first word above. Mark it as new, learning, or mastered
                — you can switch anytime.
              </p>
            </>
          ) : (
            <>
              <h2>No words match</h2>
              <p>Try another search, or clear the filters to see everything.</p>
              <button type="button" className="clear-button" onClick={clearFilters}>
                Clear filters
              </button>
            </>
          )}
        </div>
      )}

      <footer className="footer">
        {words.length > 0 && (
          <span>
            {counts.all} {counts.all === 1 ? 'word' : 'words'} in your bank
          </span>
        )}
        <span className="footer-meta">
          {session?.user?.email && (
            <span className="account">
              <span className="account-email">{session.user.email}</span>
              <button
                type="button"
                className="signout-button"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </span>
          )}
          <span>
            {storageMode === 'supabase'
              ? 'Synced with Supabase.'
              : 'Saved locally in this browser.'}
          </span>
        </span>
      </footer>
    </div>
  )
}

export default App
