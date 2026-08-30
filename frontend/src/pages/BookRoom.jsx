import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { bookingApi, extractError, roomApi, roomTypeApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatMoney, nightsBetween } from '../lib/format'

export default function BookRoom() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [type, setType] = useState(null)
  const [form, setForm] = useState({
    check_in: '',
    check_out: '',
    guest_count: 1,
    payment_method: 'upi',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/book/${roomId}` } })
    }
  }, [user, navigate, roomId])

  useEffect(() => {
    roomApi
      .get(roomId)
      .then(async (r) => {
        setRoom(r)
        const types = await roomTypeApi.list()
        setType(types.find((t) => t.room_type_id === r.room_type_id) || null)
      })
      .catch((err) => setError(extractError(err)))
  }, [roomId])

  const nights = useMemo(
    () => nightsBetween(form.check_in, form.check_out),
    [form.check_in, form.check_out]
  )

  const pricePerNight = Number(type?.price_per_night || 2000)
  const totalAmount = pricePerNight * (nights || 1)
  const depositAmount = totalAmount * 0.2
  const dueAmount = totalAmount - depositAmount

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const booking = await bookingApi.create({
        room_id: Number(roomId),
        check_in: form.check_in,
        check_out: form.check_out,
        guest_count: Number(form.guest_count),
        payment_method: form.payment_method,
      })
      setSuccess(booking)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <main className="section narrow">
        <section className="detail-card-panel" style={{ textAlign: 'center', padding: '40px 30px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--green-50)', border: '1px solid var(--green-200)', color: 'var(--green-800)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: '1.4rem', fontWeight: 'bold' }}>
            ✓
          </div>
          <span className="section-tag">Reservation Confirmed</span>
          <h1 style={{ fontSize: '2.4rem', color: 'var(--green-950)', marginBottom: '8px' }}>Your Stay is Secured</h1>
          <p className="muted" style={{ marginBottom: '24px' }}>
            Booking reference: <strong>#{success.booking_id}</strong> · Status: <strong>{success.status}</strong>
          </p>

          <div style={{ background: 'var(--green-25)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span>Duration</span>
              <strong>{success.nights || nights} Night{success.nights === 1 ? '' : 's'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span>Total Stay Cost</span>
              <strong>{formatMoney(success.total_amount ?? totalAmount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--green-200)', fontSize: '0.95rem', color: 'var(--green-850)' }}>
              <span>20% Deposit Paid</span>
              <strong style={{ color: 'var(--green-700)' }}>
                {formatMoney(success.deposit_amount ?? success.amount_paid ?? depositAmount)}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link className="btn btn-primary full-btn" to="/bookings">
              View All My Reservations
            </Link>
            <Link className="btn btn-ghost full-btn" to="/">
              Return to Homepage
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="section narrow">
      <div className="auth-single-card-wrap">
        <form className="auth-form-card" onSubmit={submit}>
          <div className="form-header">
            <span className="section-tag">Instant Hold</span>
            <h1>Reserve Room {room?.room_number || roomId}</h1>
            <p className="muted">
              {type?.type_name || 'Room'} · Up to {type?.max_occupancy ?? '—'} Guests · {formatMoney(pricePerNight)} / night
            </p>
          </div>

          {error && (
            <div className="banner error">
              <span>{error}</span>
            </div>
          )}

          {user?.role && user.role !== 'guest' && (
            <div className="banner info">
              <span>Note: Only guest accounts can submit room reservations.</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="res-checkin">Check-in Date</label>
              <div className="input-wrapper">
                <input
                  id="res-checkin"
                  type="date"
                  required
                  value={form.check_in}
                  onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="res-checkout">Check-out Date</label>
              <div className="input-wrapper">
                <input
                  id="res-checkout"
                  type="date"
                  required
                  value={form.check_out}
                  onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="res-guests">Number of Guests</label>
              <div className="input-wrapper">
                <input
                  id="res-guests"
                  type="number"
                  min="1"
                  max={type?.max_occupancy || 8}
                  required
                  value={form.guest_count}
                  onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="res-method">Deposit Method</label>
              <div className="input-wrapper">
                <select
                  id="res-method"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                >
                  <option value="upi">UPI (Instant 0-Fee)</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Pay Balance on Arrival</option>
                </select>
              </div>
            </div>
          </div>

          {nights > 0 && (
            <div style={{ background: 'var(--green-25)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                <span>{formatMoney(pricePerNight)} × {nights} night{nights === 1 ? '' : 's'}</span>
                <strong>{formatMoney(totalAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: 'var(--green-800)', fontWeight: '700', marginBottom: '6px' }}>
                <span>20% Deposit (Due Now)</span>
                <span>{formatMoney(depositAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                <span>Remaining Balance Due at Checkout</span>
                <span>{formatMoney(dueAmount)}</span>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary full-btn"
            disabled={busy || user?.role !== 'guest' || nights <= 0}
            type="submit"
          >
            {busy ? (
              <span className="btn-loading">
                <span className="spinner" /> Securing Room…
              </span>
            ) : nights > 0 ? (
              `Hold Room with ${formatMoney(depositAmount)} Deposit`
            ) : (
              'Select Dates to Continue'
            )}
          </button>

          <p className="muted" style={{ textAlign: 'center', fontSize: '0.78rem', marginTop: '14px' }}>
            Free cancellation available up to 48 hours prior to check-in.
          </p>
        </form>
      </div>
    </main>
  )
}
