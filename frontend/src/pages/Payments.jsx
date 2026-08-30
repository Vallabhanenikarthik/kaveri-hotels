import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { extractError, paymentApi } from '../api/client'
import { formatDate, formatMoney } from '../lib/format'

export default function Payments() {
  const location = useLocation()
  const [payments, setPayments] = useState([])
  const [form, setForm] = useState({
    booking_id: location.state?.bookingId || '',
    amount: location.state?.remaining || '',
    method: 'upi',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await paymentApi.list()
      setPayments(data.slice().reverse())
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      await paymentApi.create({
        booking_id: Number(form.booking_id),
        amount: Number(form.amount),
        method: form.method,
      })
      setMessage('Payment recorded successfully!')
      setForm({ booking_id: '', amount: '', method: 'upi' })
      await load()
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="section split-layout">
      <div>
        <div className="section-head-v2">
          <div>
            <span className="section-tag">Finance</span>
            <h1>Record Payment</h1>
            <p>Pay remaining stay balances with instant UPI, card, or cash.</p>
          </div>
        </div>

        <form className="auth-form-card" onSubmit={submit}>
          {error && (
            <div className="banner error">
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="banner success">
              <span>{message}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="pay-booking">Booking ID</label>
            <div className="input-wrapper">
              <input
                id="pay-booking"
                type="number"
                min="1"
                required
                placeholder="e.g. 15"
                value={form.booking_id}
                onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pay-amount">Amount (INR)</label>
            <div className="input-wrapper">
              <input
                id="pay-amount"
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="e.g. 5000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pay-method">Payment Mode</label>
            <div className="input-wrapper">
              <select
                id="pay-method"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="card">Credit or Debit Card</option>
                <option value="cash">Cash Settlement</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary full-btn" disabled={submitting} type="submit">
            {submitting ? 'Recording Payment…' : 'Submit Payment'}
          </button>
        </form>
      </div>

      <div>
        <div className="section-head-v2">
          <div>
            <span className="section-tag">Ledger</span>
            <h2>Payment Receipts</h2>
            <p>Recent transactions and settlement records.</p>
          </div>
        </div>

        <div className="stack">
          {loading && <div className="skeleton" style={{ height: '200px' }} />}
          {payments.map((p) => (
            <article className="detail-card-panel" style={{ padding: '18px 22px', marginBottom: '12px' }} key={p.payment_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="booking-id-tag">Receipt #{p.payment_id}</span>
                    <span className="section-tag" style={{ margin: 0, padding: '2px 8px' }}>{p.method.toUpperCase()}</span>
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>
                    Booking #{p.booking_id} · {formatDate(p.payment_date)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--green-950)' }}>{formatMoney(p.amount)}</strong>
                </div>
              </div>
            </article>
          ))}

          {!loading && payments.length === 0 && (
            <div className="empty-state-card">
              <h3>No payments recorded yet</h3>
              <p className="muted">Settlement receipts will appear here once submitted.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
