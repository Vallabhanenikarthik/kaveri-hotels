import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer-v2">
      <div className="footer-inner">
        <div className="footer-col-brand">
          <div className="footer-brand-header">
            <span className="brand-mark-small">K</span>
            <strong>Kaveri Stays & Resorts</strong>
          </div>
          <p className="footer-desc">
            Thoughtfully curated heritage estates, riverside sanctuaries, and tranquil backwater villas along South India’s most scenic waterways.
          </p>
          <div className="footer-locations">
            <span>Coorg · Riverside</span>
            <span>Ooty · Nilgiri Hills</span>
            <span>Alleppey · Backwaters</span>
          </div>
        </div>

        <div className="footer-col-links">
          <h4>Navigation</h4>
          <Link to="/">Signature Properties</Link>
          <Link to="/bookings">Manage Bookings</Link>
          <Link to="/payments">Payments & Receipts</Link>
          <Link to="/reviews">Guest Testimonials</Link>
        </div>

        <div className="footer-col-policy">
          <h4>Guest Assurance</h4>
          <p className="policy-text">✓ Instant 20% deposit guarantee</p>
          <p className="policy-text">✓ Flexible check-in & personalized service</p>
          <p className="policy-text">✓ 24/7 Dedicated Concierge</p>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p>© {new Date().getFullYear()} Kaveri Stays. Curated for serene mornings & peaceful retreats.</p>
      </div>
    </footer>
  )
}
