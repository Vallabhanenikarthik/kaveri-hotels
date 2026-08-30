export function formatMoney(value) {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)))
}

const PROPERTY_CONFIG = {
  1: {
    name: 'Kaveri Riverside',
    city: 'Coorg',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80',
    tagline: 'Riverfront Coffee Estate Sanctuary',
    amenities: ['Riverfront View', 'Infinity Pool', 'Coffee Plantation Walk', 'Spa & Wellness'],
  },
  2: {
    name: 'Kaveri Hilltop',
    city: 'Ooty',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    tagline: 'Misty Nilgiri Tea Haven',
    amenities: ['Mountain Valley View', 'Fireplace Lounges', 'Tea Tasting', 'Heated Suites'],
  },
  3: {
    name: 'Kaveri Backwater',
    city: 'Alleppey',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
    tagline: 'Palm-Fringed Waterfront Retreat',
    amenities: ['Private Backwater Deck', 'Ayurvedic Spa', 'Boat Cruises', 'Seafood Cuisine'],
  },
}

export function propertyImage(id) {
  const cfg = PROPERTY_CONFIG[Number(id)]
  if (cfg?.image) return cfg.image
  return 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80'
}

export function propertyMeta(id) {
  return PROPERTY_CONFIG[Number(id)] || {
    tagline: 'Boutique Luxury Stay',
    amenities: ['Free WiFi', 'Premium Dining', 'Valet Parking', 'Room Service'],
  }
}

export function stars(count) {
  return '★'.repeat(count || 0) + '☆'.repeat(Math.max(0, 5 - (count || 0)))
}
