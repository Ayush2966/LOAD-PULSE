import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Run from './pages/Run'
import History from './pages/History'
import Compare from './pages/Compare'

function Layout({ children }: { children: React.ReactNode }) {
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
