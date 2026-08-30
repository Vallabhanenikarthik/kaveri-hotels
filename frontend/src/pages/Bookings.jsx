import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingApi, extractError } from '../api/client'
import { formatDate, formatMoney } from '../lib/format'

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const list = await bookingApi.list()
      setBookings(list.slice().sort((a, b) => b.booking_id - a.booking_id))
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function run(action, id, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return
    setError('')
    setMessage('')
    try {
      await action(id)
      setMessage('Booking updated successfully.')
      await load()
    } catch (err) {
      setError(extractError(err))
    }
  }

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings
    return bookings.filter((b) => b.status === activeTab)
  }, [bookings, activeTab])

  const counts = useMemo(() => {
    return {
      all: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      checked_out: bookings.filter((b) => b.status === 'checked_out').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    }
  }, [bookings])

  return (
    <main className="section bookings-page">
      <div className="section-head-v2">
        <div>
          <span className="section-tag">Reservations</span>
          <h1>My Sanctuary Stays</h1>
          <p>Review confirmed reservations, settle pending balances, and manage checkout.</p>
        </div>
        <Link to="/" className="btn btn-primary">
          + Reserve Another Stay
        </Link>
      </div>

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

      {/* Tabs Filter */}
      <div className="tabs-row-v2">
        {[
          { key: 'all', label: 'All Stays', count: counts.all },
          { key: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { key: 'checked_out', label: 'Completed', count: counts.checked_out },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn-v2 ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="tab-count-pill">{tab.count}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="stack">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton property-hero-skeleton" style={{ height: '140px' }} />
          ))}
        </div>
      )}

      <div className="bookings-list-v2">
        {filteredBookings.map((booking) => {
          const paid = Number(booking.amount_paid ?? booking.deposit_amount ?? 0)
          const total = Number(booking.total_amount ?? 0)
          const due = Math.max(0, total - paid)
          const isConfirmed = booking.status === 'confirmed'
          const isCheckedOut = booking.status === 'checked_out'
          const isCancelled = booking.status === 'cancelled'

          return (
            <article className="booking-card-v2" key={booking.booking_id}>
              <div className="booking-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="booking-id-tag">Booking #{booking.booking_id}</span>
                  <span className="section-tag" style={{ margin: 0 }}>Room ID {booking.room_id}</span>
                </div>
                <span className={`booking-status-pill status-${booking.status}`}>
                  {booking.status === 'confirmed'
                    ? 'Confirmed'
                    : booking.status === 'checked_out'
                    ? 'Checked Out'
                    : booking.status === 'cancelled'
                    ? 'Cancelled'
                    : booking.status}
                </span>
              </div>

              <div className="booking-card-body">
                <div className="booking-prop-title">
                  <div className="booking-dates-grid">
                    <div className="date-box">
                      <span className="date-box-label">Check-in</span>
                      <div className="date-box-val">{formatDate(booking.check_in)}</div>
                    </div>
                    <div className="date-box">
                      <span className="date-box-label">Check-out</span>
                      <div className="date-box-val">{formatDate(booking.check_out)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
                  <div>{booking.nights} Night{booking.nights === 1 ? '' : 's'} · {booking.guest_count} Guest{booking.guest_count === 1 ? '' : 's'}</div>
                  {booking.payment_methods?.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                      Paid via {booking.payment_methods.join(', ').toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="booking-cost-details">
                  <div className="cost-item">
                    <span>Total: </span>
                    <strong>{formatMoney(total)}</strong>
                  </div>
                  <div className="cost-item" style={{ marginTop: '2px' }}>
                    <span>Paid: {formatMoney(paid)}</span>
                  </div>
                  {due > 0 ? (
                    <div className="deposit-highlight" style={{ color: 'var(--status-danger-text)' }}>
                      Due Balance: {formatMoney(due)}
                    </div>
                  ) : (
                    <div className="deposit-highlight" style={{ color: 'var(--green-700)' }}>
                      Fully Settled ✓
                    </div>
                  )}
                </div>
              </div>

              <div className="booking-card-actions">
                {isConfirmed && (
                  <>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() =>
                        run(
                          bookingApi.checkout,
                          booking.booking_id,
                          `Check out from Booking #${booking.booking_id}?`
                        )
                      }
                    >
                      Complete Checkout
                    </button>
                    <button
                      className="btn btn-danger-ghost btn-sm"
                      type="button"
                      onClick={() =>
                        run(
                          bookingApi.cancel,
                          booking.booking_id,
                          `Are you sure you want to cancel Booking #${booking.booking_id}?`
                        )
                      }
                    >
                      Cancel Stay
                    </button>
                  </>
                )}
                {due > 0 && !isCancelled && (
                  <Link
                    className="btn btn-primary btn-sm"
                    to="/payments"
                    state={{ bookingId: booking.booking_id, remaining: due }}
                  >
                    Settle Balance ({formatMoney(due)}) →
                  </Link>
                )}
                {isCheckedOut && (
                  <Link className="btn btn-ghost btn-sm" to="/reviews">
                    Share Guest Review →
                  </Link>
                )}
              </div>
            </article>
          )
        })}

        {!loading && filteredBookings.length === 0 && (
          <div className="empty-state-card">
            <h3>No {activeTab === 'all' ? '' : activeTab} bookings found</h3>
            <p className="muted">Ready for a serene getaway along the river?</p>
            <Link className="btn btn-primary" to="/">
              Explore Properties & Book
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
