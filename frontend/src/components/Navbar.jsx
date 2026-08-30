import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header className="nav-v2">
      <div className="nav-inner-v2">
        <Link to="/" className="brand-v2">
          <div className="brand-badge-icon">
            <span>K</span>
          </div>
          <div className="brand-text-col">
            <strong>Kaveri Stays</strong>
            <em>Heritage & Sanctuaries</em>
          </div>
        </Link>

        <nav className="nav-links-v2">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Properties
          </NavLink>
          {user && (
            <>
              <NavLink to="/bookings" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Bookings
              </NavLink>
              <NavLink to="/payments" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Payments
              </NavLink>
              <NavLink to="/reviews" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                Reviews
              </NavLink>
            </>
          )}
          {user && (user.role === 'manager' || user.role === 'owner') && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-item active admin-link' : 'nav-item admin-link')}>
              Management
            </NavLink>
          )}
        </nav>

        <div className="nav-actions-v2">
          {user ? (
            <div className="user-profile-widget">
              <div className="user-avatar-initial">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-meta-info">
                <span className="user-email-text">{user.email}</span>
                <span className={`user-role-badge badge-${user.role}`}>
                  <span className="badge-dot" /> {user.role?.toUpperCase()}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout} type="button">
                Sign out
              </button>
            </div>
          ) : (
            <div className="auth-buttons-row">
              <Link className="btn btn-ghost btn-sm" to="/login" state={{ from: location }}>
                Sign in
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                Reserve a Stay
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
