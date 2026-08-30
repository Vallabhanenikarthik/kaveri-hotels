import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { propertyApi, roomApi, roomTypeApi } from '../api/client'
import { propertyImage, propertyMeta, stars } from '../lib/format'

export default function Home() {
  const [properties, setProperties] = useState([])
  const [rooms, setRooms] = useState([])
  const [types, setTypes] = useState([])
  const [query, setQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([propertyApi.list(), roomApi.list(), roomTypeApi.list()])
      .then(([props, roomList, typeList]) => {
        if (!active) return
        setProperties(props)
        setRooms(roomList)
        setTypes(typeList)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load properties')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const typeMap = useMemo(
    () => Object.fromEntries(types.map((t) => [t.room_type_id, t])),
    [types]
  )

  const cities = useMemo(() => {
    const list = Array.from(new Set(properties.map((p) => p.city))).filter(Boolean)
    return ['all', ...list]
  }, [properties])

  const filtered = properties.filter((p) => {
    const q = query.trim().toLowerCase()
    const matchesCity = selectedCity === 'all' || p.city.toLowerCase() === selectedCity.toLowerCase()
    const matchesQuery = !q || `${p.name} ${p.city}`.toLowerCase().includes(q)
    return matchesCity && matchesQuery
  })

  return (
    <main className="home-main">
      {/* Hero Section */}
      <section className="hero-v2">
        <div className="hero-copy-v2">
          <div className="hero-eyebrow-pill">
            <span className="eyebrow-dot" />
            <span>Heritage Sanctuaries & Waterfront Stays</span>
          </div>

          <h1 className="hero-title">
            Stay where the <span className="hero-brand-word">Kaveri</span> slows down.
          </h1>

          <p className="hero-subtitle">
            Immerse yourself in boutique riverside estates, misty mountain lodges, and tranquil
            backwater villas designed for serenity, heritage hospitality, and pure comfort.
          </p>

          <div className="search-bar-unified">
            <div className="search-input-wrap">
              <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Search by destination, estate name or amenity..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="search-count-tag">
              <span>{filtered.length} properties available</span>
            </div>
          </div>

          <div className="city-filter-bar">
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                className={`filter-pill ${selectedCity === city ? 'active' : ''}`}
                onClick={() => setSelectedCity(city)}
              >
                {city === 'all' ? 'All Locations' : city}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-visual-v2">
          <div className="hero-img-card">
            <img
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
              alt="Luxury hotel pool and river view"
              className="hero-primary-img"
            />
            <div className="hero-floating-glass-card">
              <div className="glass-card-header">
                <span className="location-dot" />
                <strong>Coorg · Ooty · Alleppey</strong>
              </div>
              <p>Riverfront estates, mountain tea lodges & backwater villas</p>
              <div className="glass-card-stats">
                <span className="stat-pill">4.9 ★ Guest Rating</span>
                <span className="stat-pill">20% Deposit Hold</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="features-ribbon">
        <div className="feature-item">
          <div className="feature-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <strong>Instant 20% Deposit</strong>
            <p>Secure your preferred dates today and settle remaining balance on arrival</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4v16" />
              <path d="M2 8h18a2 2 0 0 1 2 2v10" />
              <path d="M2 17h20" />
              <path d="M6 8v9" />
            </svg>
          </div>
          <div>
            <strong>Boutique Curated Rooms</strong>
            <p>Handcrafted Standard, Deluxe, and Suite residences with picturesque views</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div>
            <strong>Restorative Wellness</strong>
            <p>Ayurvedic spas, infinity pools, organic gardens, and riverside dining</p>
          </div>
        </div>
      </section>

      {/* Property Showcase Grid */}
      <section className="section properties-section">
        <div className="section-head-v2">
          <div>
            <span className="section-tag">Curated Portfolio</span>
            <h2>Our Signature Sanctuaries</h2>
            <p>Select a retreat to browse room tiers, amenities, and available dates.</p>
          </div>
          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setQuery('')
                setSelectedCity('all')
              }}
            >
              Clear Filters ✕
            </button>
          )}
        </div>

        {error && <div className="banner error">{error}</div>}

        {loading && (
          <div className="skeleton-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton property-skeleton" />
            ))}
          </div>
        )}

        <div className="property-grid-v2">
          {filtered.map((property, index) => {
            const propRooms = rooms.filter((r) => r.property_id === property.property_id)
            const meta = propertyMeta(property.property_id)
            return (
              <Link
                className="property-card-v2"
                to={`/properties/${property.property_id}`}
                key={property.property_id}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="property-media-v2">
                  <img
                    src={propertyImage(property.property_id)}
                    alt={property.name}
                    loading="lazy"
                  />
                  <div className="media-badges">
                    <span className="badge-city">{property.city}</span>
                    <span className="badge-stars">{stars(property.stars)}</span>
                  </div>
                  <div className="media-overlay-gradient" />
                </div>

                <div className="property-body-v2">
                  <div className="property-title-row">
                    <h3>{property.name}</h3>
                  </div>
                  <p className="property-tagline">{meta.tagline}</p>

                  <div className="amenity-tags">
                    {meta.amenities.slice(0, 3).map((amenity) => (
                      <span key={amenity} className="amenity-tag">
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="property-footer-v2">
                    <div className="inventory-badge">
                      <span className="indicator-dot" />
                      <span>{propRooms.length} Rooms Available</span>
                    </div>
                    <span className="btn-explore">
                      View Estate →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="empty-state-card">
            <h3>No properties found matching "{query}"</h3>
            <p className="muted">Try searching with a different destination keyword or reset filters.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setQuery('')
                setSelectedCity('all')
              }}
            >
              Show All Properties
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
