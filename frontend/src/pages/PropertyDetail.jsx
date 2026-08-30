import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { propertyApi, reviewApi, roomApi, roomTypeApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatMoney, propertyImage, propertyMeta, stars } from '../lib/format'

export default function PropertyDetail() {
  const { propertyId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [rooms, setRooms] = useState([])
  const [types, setTypes] = useState([])
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all')
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      propertyApi.get(propertyId),
      roomApi.list(),
      roomTypeApi.list(),
    ])
      .then(([prop, roomList, typeList]) => {
        if (!active) return
        setProperty(prop)
        const propRooms = roomList
          .filter((r) => String(r.property_id) === String(prop.property_id))
          .sort((a, b) =>
            String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true })
          )
        setRooms(propRooms)
        setTypes(typeList)
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.detail || 'Property not found')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [propertyId])

  useEffect(() => {
    if (!user) return
    reviewApi
      .propertySummary(propertyId)
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [user, propertyId])

  const typeMap = useMemo(
    () => Object.fromEntries(types.map((t) => [t.room_type_id, t])),
    [types]
  )

  const meta = useMemo(() => propertyMeta(propertyId), [propertyId])

  const filteredRooms = useMemo(() => {
    if (selectedTypeFilter === 'all') return rooms
    return rooms.filter((r) => String(r.room_type_id) === String(selectedTypeFilter))
  }, [rooms, selectedTypeFilter])

  function book(room) {
    if (!user) {
      navigate('/login', { state: { from: `/book/${room.room_id}` } })
      return
    }
    navigate(`/book/${room.room_id}`)
  }

  if (loading) {
    return (
      <main className="section">
        <div className="skeleton property-hero-skeleton" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="section narrow">
        <div className="banner error">{error}</div>
        <p className="back-link"><Link to="/">← Return to properties</Link></p>
      </main>
    )
  }

  if (!property) return null

  return (
    <main className="property-detail-page">
      {/* Property Hero Banner */}
      <section className="detail-hero-v2">
        <img
          src={propertyImage(property.property_id)}
          alt={property.name}
          className="detail-hero-img"
        />
        <div className="detail-hero-overlay" />
        <div className="detail-hero-content">
          <div>
            <div className="hero-top-badges">
              <span className="badge-city">{property.city}</span>
              <span className="detail-stars-badge">{stars(property.stars)}</span>
              {summary && (
                <span className="stat-pill">
                  {summary.average_rating ?? '—'} ★ ({summary.review_count} Reviews)
                </span>
              )}
            </div>
            <h1 className="detail-title">{property.name}</h1>
            <p className="detail-tagline">{meta.tagline}</p>
          </div>

          <div className="detail-amenities-bar">
            {meta.amenities.map((item) => (
              <span key={item} className="amenity-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Showcase Section */}
      <section className="section rooms-inventory-section">
        <div className="section-head-v2">
          <div>
            <span className="section-tag">Available Stays</span>
            <h2>Select Your Residence</h2>
            <p>
              Showing {filteredRooms.length} of {rooms.length} curated rooms. Guaranteed with a 20% deposit hold.
            </p>
          </div>

          <div className="city-filter-bar">
            <button
              type="button"
              className={`filter-pill ${selectedTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedTypeFilter('all')}
            >
              All Tiers ({rooms.length})
            </button>
            {types.map((t) => {
              const count = rooms.filter((r) => r.room_type_id === t.room_type_id).length
              if (count === 0) return null
              return (
                <button
                  key={t.room_type_id}
                  type="button"
                  className={`filter-pill ${String(selectedTypeFilter) === String(t.room_type_id) ? 'active' : ''}`}
                  onClick={() => setSelectedTypeFilter(String(t.room_type_id))}
                >
                  {t.type_name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        <div className="property-grid-v2">
          {filteredRooms.map((room) => {
            const type = typeMap[room.room_type_id]
            return (
              <article className="property-card-v2" key={room.room_id}>
                <div className="property-body-v2">
                  <div className="property-title-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
                      <span className="section-tag">Room #{room.room_number}</span>
                      <span className="room-badge-status status-available">Available</span>
                    </div>
                    <h3>{type?.type_name || `Tier #${room.room_type_id}`}</h3>
                  </div>

                  <p className="property-tagline">
                    Accommodates up to {type?.max_occupancy ?? 2} guests · Includes artisanal breakfast & plantation access.
                  </p>

                  <div className="amenity-tags">
                    <span className="amenity-tag">Max {type?.max_occupancy ?? 2} Guests</span>
                    <span className="amenity-tag">Breakfast Included</span>
                    <span className="amenity-tag">High-Speed Wi-Fi</span>
                  </div>

                  <div className="property-footer-v2">
                    <div>
                      <span className="muted" style={{ display: 'block', fontSize: '0.75rem' }}>Per Night</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--green-950)' }}>
                        {formatMoney(type?.price_per_night ?? 2000)}
                      </strong>
                    </div>
                    <button className="btn btn-primary btn-sm" type="button" onClick={() => book(room)}>
                      Reserve Room →
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {filteredRooms.length === 0 && (
          <div className="empty-state-card">
            <h3>No rooms available in this category</h3>
            <p className="muted">Try selecting "All Tiers" to view the complete inventory.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelectedTypeFilter('all')}
            >
              Reset Filter
            </button>
          </div>
        )}

        <div style={{ marginTop: '32px' }}>
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Return to All Sanctuaries
          </Link>
        </div>
      </section>
    </main>
  )
}
