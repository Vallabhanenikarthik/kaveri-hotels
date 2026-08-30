import { useEffect, useState } from 'react'
import { bookingApi, extractError, reviewApi } from '../api/client'
import { formatDate } from '../lib/format'

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [bookings, setBookings] = useState([])
  const [form, setForm] = useState({ booking_id: '', rating: 5, comment: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    try {
      const [rev, bks] = await Promise.all([reviewApi.list(), bookingApi.list()])
      setReviews(rev)
      setBookings(bks.filter((b) => b.status === 'checked_out'))
    } catch (err) {
      setError(extractError(err))
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
      const payload = {
        booking_id: Number(form.booking_id),
        rating: Number(form.rating),
      }
      if (form.comment.trim()) payload.comment = form.comment.trim()
      await reviewApi.create(payload)
      setMessage('Thank you for sharing your experience!')
      setForm({ booking_id: '', rating: 5, comment: '' })
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
            <span className="section-tag">Feedback</span>
            <h1>Guest Reflections</h1>
            <p>Share your stay experience after checkout (one review per completed reservation).</p>
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
            <label htmlFor="rev-booking">Completed Stay</label>
            <div className="input-wrapper">
              <select
                id="rev-booking"
                required
                value={form.booking_id}
                onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
              >
                <option value="">Select a checked-out reservation</option>
                {bookings.map((b) => (
                  <option key={b.booking_id} value={b.booking_id}>
                    Booking #{b.booking_id} · {formatDate(b.check_in)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rev-rating">Rating (1 to 5 Stars)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[5, 4, 3, 2, 1].map((starsVal) => (
                <button
                  type="button"
                  key={starsVal}
                  className={`filter-pill ${form.rating === starsVal ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, rating: starsVal })}
                >
                  {starsVal} ★
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rev-comment">Your Comments</label>
            <div className="input-wrapper" style={{ padding: '8px 14px' }}>
              <textarea
                id="rev-comment"
                rows="4"
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', resize: 'vertical' }}
                placeholder="Tell us about the property serenity, hospitality, room cleanliness, or cuisine..."
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>
          </div>

          <button
            className="btn btn-primary full-btn"
            disabled={submitting || bookings.length === 0}
            type="submit"
          >
            {submitting ? 'Submitting Review…' : 'Publish Review'}
          </button>

          {bookings.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', fontSize: '0.78rem', marginTop: '12px' }}>
              You must have a completed (checked-out) stay to publish a review.
            </p>
          )}
        </form>
      </div>

      <div>
        <div className="section-head-v2">
          <div>
            <span className="section-tag">Testimonials</span>
            <h2>Guest Stories</h2>
            <p>Authentic reflections from fellow travelers.</p>
          </div>
        </div>

        <div className="review-cards-list">
          {reviews.map((r) => (
            <article className="review-item-card" key={r.review_id}>
              <div className="review-author-row">
                <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className="review-date-text">{formatDate(r.review_date)}</span>
              </div>
              <p className="review-comment-text">"{r.comment || 'Wonderful serene stay!'}"</p>
              <div>
                <span className="section-tag" style={{ margin: 0, padding: '2px 8px' }}>Verified Stay #{r.booking_id}</span>
              </div>
            </article>
          ))}
          {reviews.length === 0 && (
            <div className="empty-state-card">
              <h3>No guest reviews published yet</h3>
              <p className="muted">Be the first to share your thoughts after completing a stay.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
