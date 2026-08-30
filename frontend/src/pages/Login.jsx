import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { extractError } from '../api/client'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCOUNTS = [
  {
    id: 'guest',
    role: 'guest',
    roleLabel: 'Guest Experience',
    badgeClass: 'badge-guest',
    name: 'Karthik (Guest Account)',
    email: 'karthik@example.com',
    password: 'password123',
    description: 'Browse boutique suites, reserve dates with 20% deposit & view booking receipts.',
  },
  {
    id: 'manager',
    role: 'manager',
    roleLabel: 'Property Manager',
    badgeClass: 'badge-manager',
    name: 'Estate Manager (Coorg)',
    email: 'manager@kaverihotels.com',
    password: 'password123',
    description: 'Oversee property inventory, room maintenance status & live reservations.',
  },
  {
    id: 'owner',
    role: 'owner',
    roleLabel: 'General Admin',
    badgeClass: 'badge-owner',
    name: 'Administrator (Executive)',
    email: 'owner@test.com',
    password: 'password123',
    description: 'Full portfolio administrative control across all estates, pricing & room classifications.',
  },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedDemo, setSelectedDemo] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const from = location.state?.from || '/bookings'

  function handleSelectDemo(acc) {
    setEmail(acc.email)
    setPassword(acc.password)
    setSelectedDemo(acc.id)
    setError('')
  }

  async function submit(e) {
    if (e) e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate(typeof from === 'string' ? from : from.pathname || '/bookings')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-container">
      <div className="auth-wrapper">
        <div className="demo-accounts-panel">
          <div className="panel-header">
            <span className="pill-badge">One-Click Demonstration Access</span>
            <h2>Select Profile</h2>
            <p className="panel-sub">
              Select any role below to prefill credentials and preview role-based access.
            </p>
          </div>

          <div className="demo-cards-list">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = selectedDemo === acc.id || email === acc.email
              return (
                <button
                  type="button"
                  key={acc.id}
                  className={`demo-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectDemo(acc)}
                >
                  <div className="demo-card-top">
                    <div className="demo-avatar-circle">
                      {acc.role.charAt(0).toUpperCase()}
                    </div>
                    <div className="demo-meta">
                      <div className="demo-name-row">
                        <strong>{acc.name}</strong>
                        <span className={`role-pill ${acc.badgeClass}`}>{acc.roleLabel}</span>
                      </div>
                      <code className="demo-email">{acc.email}</code>
                    </div>
                  </div>
                  <p className="demo-desc">{acc.description}</p>
                  <div className="demo-card-footer">
                    <span className="demo-pwd">Password: <code>{acc.password}</code></span>
                    <span className="demo-action-hint">
                      {isSelected ? '✓ Profile Selected' : 'Auto-fill →'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="auth-card-panel">
          <form className="auth-form-card" onSubmit={submit}>
            <div className="form-header">
              <span className="section-tag">Sanctuary Access</span>
              <h1>Sign In</h1>
              <p className="muted">Welcome back. Enter your credentials or choose a demo profile.</p>
            </div>

            {error && (
              <div className="banner error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSelectedDemo(null)
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setSelectedDemo(null)
                  }}
                />
              </div>
            </div>

            <button className="btn btn-primary full-btn" disabled={busy} type="submit">
              {busy ? (
                <span className="btn-loading">
                  <span className="spinner" /> Signing in…
                </span>
              ) : (
                'Sign In to Sanctuary'
              )}
            </button>

            <div className="form-footer">
              <p className="muted">
                First time visiting Kaveri Stays?{' '}
                <Link to="/register" className="highlight-link">
                  Create Guest Account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
