import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Run from './pages/Run'

const History = lazy(() => import('./pages/History'))
const Compare = lazy(() => import('./pages/Compare'))
const Docs = lazy(() => import('./pages/Docs'))
const SharedReport = lazy(() => import('./pages/SharedReport'))
const Swarm = lazy(() => import('./pages/Swarm'))

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
  }
}

function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 999,
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '12px 16px', display: 'flex',
      alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      fontSize: 13,
    }}>
      <span>⚡ Install LoadPulse as an app</span>
      <button className="btn btn-primary btn-sm" onClick={() => { prompt.prompt(); setDismissed(true) }}>Install</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>✕</button>
    </div>
  )
}

const NAV_LINKS = [
  { to: '/', label: 'Run', end: true },
  { to: '/history', label: 'History' },
  { to: '/compare', label: 'Compare' },
  { to: '/swarm', label: '🐝 Swarm' },
  { to: '/docs', label: 'Docs' },
]

function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('_lp_theme') as 'dark' | 'light') || 'dark'
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('_lp_theme', theme)
  }, [theme])

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="nav-brand">
          ⚡ <span>LoadPulse</span>
        </div>
        <div className={'nav-links' + (menuOpen ? ' open' : '')}>
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="btn btn-ghost btn-sm nav-toggle"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>
      <main className="page-content" onClick={() => menuOpen && setMenuOpen(false)}>{children}</main>
    </div>
  )
}

function PageLoader() {
  return <div className="page-loader">Loading…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout><Run /></Layout>} />
          <Route path="/history" element={<Layout><History /></Layout>} />
          <Route path="/compare" element={<Layout><Compare /></Layout>} />
          <Route path="/swarm" element={<Layout><Swarm /></Layout>} />
          <Route path="/docs" element={<Layout><Docs /></Layout>} />
          <Route path="/report" element={<SharedReport />} />
        </Routes>
      </Suspense>
      <InstallBanner />
    </BrowserRouter>
  )
}
