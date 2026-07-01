import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Run from './pages/Run'
import History from './pages/History'
import Compare from './pages/Compare'

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
      </Routes>
    </BrowserRouter>
  )
}
