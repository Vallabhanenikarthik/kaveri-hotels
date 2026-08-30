import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { extractError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      }
      if (form.phone.trim()) payload.phone = form.phone.trim()
      await register(payload)
      navigate('/bookings')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-container">
      <div className="auth-single-card-wrap">
        <form className="auth-form-card" onSubmit={submit}>
          <div className="form-header">
            <span className="section-tag">New Guest</span>
            <h1>Join Kaveri Stays</h1>
            <p className="muted">
              Create an account to reserve sanctuary stays, view confirmations, and manage deposits.
            </p>
          </div>

          {error && (
            <div className="banner error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <div className="input-wrapper">
              <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="reg-name"
                required
                minLength={1}
                placeholder="e.g. Karthik Sharma"
                value={form.full_name}
                onChange={update('full_name')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <div className="input-wrapper">
              <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={update('email')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-phone">
              Phone Number <span className="muted">(Optional)</span>
            </label>
            <div className="input-wrapper">
              <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <input
                id="reg-phone"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={update('phone')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-pwd">Password</label>
            <div className="input-wrapper">
              <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="reg-pwd"
                type="password"
                required
                minLength={8}
                placeholder="Create a secure password (min 8 chars)"
                value={form.password}
                onChange={update('password')}
              />
            </div>
          </div>

          <button className="btn btn-primary full-btn" disabled={busy} type="submit">
            {busy ? (
              <span className="btn-loading">
                <span className="spinner" /> Creating Account…
              </span>
            ) : (
              'Create Guest Account'
            )}
          </button>

          <div className="form-footer">
            <p className="muted">
              Already have an account?{' '}
              <Link to="/login" className="highlight-link">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}
