import { useEffect, useState } from 'react'
import { extractError, propertyApi, roomApi, roomTypeApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { stars } from '../lib/format'

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('properties')
  const [properties, setProperties] = useState([])
  const [rooms, setRooms] = useState([])
  const [types, setTypes] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const [propertyForm, setPropertyForm] = useState({ name: '', city: '', stars: 4 })
  const [typeForm, setTypeForm] = useState({ type_name: '', max_occupancy: 2 })
  const [roomForm, setRoomForm] = useState({ property_id: '', room_number: '', room_type_id: '' })

  async function load() {
    try {
      const [p, r, t] = await Promise.all([
        propertyApi.list(),
        roomApi.list(),
        roomTypeApi.list(),
      ])
      setProperties(p)
      setRooms(
        r.sort((a, b) => {
          if (a.property_id !== b.property_id) return a.property_id - b.property_id
          return String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true })
        })
      )
      setTypes(t)
    } catch (err) {
      setError(extractError(err))
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function wrap(fn, ok) {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await fn()
      setMessage(ok)
      await load()
    } catch (err) {
      setError(extractError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="section admin-page">
      <div className="section-head-v2">
        <div>
          <span className="section-tag">Operations Console</span>
          <h1>Hotel Management</h1>
          <p>
            Signed in as <strong>{user?.role?.toUpperCase()}</strong> ({user?.email}). Manage properties, room categories, and live room inventory.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="detail-card-panel" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span className="section-tag" style={{ margin: 0, marginBottom: '6px' }}>Properties</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--green-950)' }}>{properties.length}</div>
        </div>
        <div className="detail-card-panel" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span className="section-tag" style={{ margin: 0, marginBottom: '6px' }}>Total Rooms</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--green-950)' }}>{rooms.length}</div>
        </div>
        <div className="detail-card-panel" style={{ padding: '16px 20px', marginBottom: 0 }}>
          <span className="section-tag" style={{ margin: 0, marginBottom: '6px' }}>Room Categories</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--green-950)' }}>{types.length}</div>
        </div>
      </div>

      <div className="tabs-row-v2" style={{ marginBottom: '28px' }}>
        {[
          { key: 'properties', label: `Properties (${properties.length})` },
          { key: 'rooms', label: `Rooms (${rooms.length})` },
          { key: 'room types', label: `Room Types (${types.length})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-btn-v2 ${tab === item.key ? 'active' : ''}`}
            onClick={() => {
              setTab(item.key)
              setError('')
              setMessage('')
            }}
          >
            {item.label}
          </button>
        ))}
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

      {tab === 'properties' && (
        <div className="split-layout">
          <form
            className="auth-form-card"
            onSubmit={(e) => {
              e.preventDefault()
              wrap(
                () =>
                  propertyApi.create({
                    name: propertyForm.name,
                    city: propertyForm.city,
                    stars: Number(propertyForm.stars),
                  }),
                'Property created successfully.'
              )
            }}
          >
            <div className="form-header">
              <span className="section-tag">New Estate</span>
              <h3>Add Resort Property</h3>
            </div>
            <div className="form-group">
              <label>Property Name</label>
              <div className="input-wrapper">
                <input
                  required
                  placeholder="e.g. Kaveri Sunrise"
                  value={propertyForm.name}
                  onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>City / Location</label>
              <div className="input-wrapper">
                <input
                  required
                  placeholder="e.g. Wayanad"
                  value={propertyForm.city}
                  onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Star Rating (1 - 5)</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={propertyForm.stars}
                  onChange={(e) => setPropertyForm({ ...propertyForm, stars: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary full-btn" disabled={busy} type="submit">
              + Add Property
            </button>
          </form>

          <div className="stack">
            {properties.map((p) => (
              <article className="detail-card-panel" style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }} key={p.property_id}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--green-950)' }}>{p.name}</h3>
                    <span style={{ color: '#f6d860', fontSize: '0.85rem' }}>{stars(p.stars)}</span>
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>{p.city} · Property ID #{p.property_id}</p>
                </div>
                <button
                  className="btn btn-danger-ghost btn-sm"
                  type="button"
                  onClick={() =>
                    window.confirm(`Delete property ${p.name}?`) &&
                    wrap(() => propertyApi.remove(p.property_id), 'Property removed.')
                  }
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'room types' && (
        <div className="split-layout">
          <form
            className="auth-form-card"
            onSubmit={(e) => {
              e.preventDefault()
              wrap(
                () =>
                  roomTypeApi.create({
                    type_name: typeForm.type_name,
                    max_occupancy: Number(typeForm.max_occupancy),
                  }),
                'Room type added successfully.'
              )
            }}
          >
            <div className="form-header">
              <span className="section-tag">New Category</span>
              <h3>Add Room Type</h3>
            </div>
            <div className="form-group">
              <label>Type Name</label>
              <div className="input-wrapper">
                <input
                  required
                  placeholder="e.g. Presidential Suite"
                  value={typeForm.type_name}
                  onChange={(e) => setTypeForm({ ...typeForm, type_name: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Max Guest Occupancy</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  min="1"
                  max="12"
                  required
                  value={typeForm.max_occupancy}
                  onChange={(e) => setTypeForm({ ...typeForm, max_occupancy: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-primary full-btn" disabled={busy} type="submit">
              + Add Room Type
            </button>
          </form>

          <div className="stack">
            {types.map((t) => (
              <article className="detail-card-panel" style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }} key={t.room_type_id}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--green-950)' }}>{t.type_name}</h3>
                    <span className="section-tag" style={{ margin: 0, padding: '2px 8px' }}>ID #{t.room_type_id}</span>
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>Maximum Occupancy: {t.max_occupancy} Guests</p>
                </div>
                <button
                  className="btn btn-danger-ghost btn-sm"
                  type="button"
                  onClick={() =>
                    window.confirm(`Delete room type ${t.type_name}?`) &&
                    wrap(() => roomTypeApi.remove(t.room_type_id), 'Type removed.')
                  }
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'rooms' && (
        <div className="split-layout">
          <form
            className="auth-form-card"
            onSubmit={(e) => {
              e.preventDefault()
              wrap(
                () =>
                  roomApi.create({
                    property_id: Number(roomForm.property_id),
                    room_number: roomForm.room_number,
                    room_type_id: Number(roomForm.room_type_id),
                  }),
                'Room created successfully.'
              )
            }}
          >
            <div className="form-header">
              <span className="section-tag">New Inventory</span>
              <h3>Add Room to Property</h3>
            </div>
            <div className="form-group">
              <label>Property</label>
              <div className="input-wrapper">
                <select
                  required
                  value={roomForm.property_id}
                  onChange={(e) => setRoomForm({ ...roomForm, property_id: e.target.value })}
                >
                  <option value="">Select Property</option>
                  {properties.map((p) => (
                    <option key={p.property_id} value={p.property_id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Room Number</label>
              <div className="input-wrapper">
                <input
                  required
                  placeholder="e.g. 101"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Room Category</label>
              <div className="input-wrapper">
                <select
                  required
                  value={roomForm.room_type_id}
                  onChange={(e) => setRoomForm({ ...roomForm, room_type_id: e.target.value })}
                >
                  <option value="">Select Room Type</option>
                  {types.map((t) => (
                    <option key={t.room_type_id} value={t.room_type_id}>
                      {t.type_name} (Max {t.max_occupancy} guests)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="btn btn-primary full-btn" disabled={busy} type="submit">
              + Add Room
            </button>
          </form>

          <div className="stack">
            {rooms.map((r) => {
              const prop = properties.find((p) => p.property_id === r.property_id)
              const type = types.find((t) => t.room_type_id === r.room_type_id)
              return (
                <article className="detail-card-panel" style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }} key={r.room_id}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="section-tag" style={{ margin: 0, padding: '2px 8px' }}>Room #{r.room_number}</span>
                      <strong style={{ color: 'var(--green-950)', fontSize: '0.95rem' }}>{type?.type_name || `Type #${r.room_type_id}`}</strong>
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
                      {prop?.name || `Property #${r.property_id}`} ({prop?.city || '—'}) · Room ID: {r.room_id}
                    </p>
                  </div>
                  <button
                    className="btn btn-danger-ghost btn-sm"
                    type="button"
                    onClick={() =>
                      window.confirm(`Delete Room ${r.room_number}?`) &&
                      wrap(() => roomApi.remove(r.room_id), 'Room removed.')
                    }
                  >
                    Delete
                  </button>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
