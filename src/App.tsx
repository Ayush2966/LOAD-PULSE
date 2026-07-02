import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Run from './pages/Run'
import History from './pages/History'
import Compare from './pages/Compare'
import Docs from './pages/Docs'
import SharedReport from './pages/SharedReport'
import Swarm from './pages/Swarm'

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

function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('_lp_theme') as 'dark' | 'light') || 'dark'
  })

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
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Run</NavLink>
          <NavLink to="/history" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>History</NavLink>
          <NavLink to="/compare" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Compare</NavLink>
          <NavLink to="/swarm" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>🐝 Swarm</NavLink>
          <NavLink to="/docs" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Docs</NavLink>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>
      <main className="page-content">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Run /></Layout>} />
        <Route path="/history" element={<Layout><History /></Layout>} />
        <Route path="/compare" element={<Layout><Compare /></Layout>} />
        <Route path="/swarm" element={<Layout><Swarm /></Layout>} />
        <Route path="/docs" element={<Layout><Docs /></Layout>} />
        <Route path="/report" element={<SharedReport />} />
      </Routes>
      <InstallBanner />
    </BrowserRouter>
  )
}
