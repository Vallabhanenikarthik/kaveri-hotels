import axios from 'axios'

const ACCESS_KEY = 'kaveri_access_token'
const REFRESH_KEY = 'kaveri_refresh_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token)
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isAuthCall = original?.url?.includes('/auth/login')
      || original?.url?.includes('/auth/register')
      || original?.url?.includes('/auth/refresh')

    if (status !== 401 || original?._retry || isAuthCall) {
      return Promise.reject(error)
    }

    original._retry = true
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearTokens()
      return Promise.reject(error)
    }

    try {
      if (!refreshing) {
        refreshing = api
          .post('/auth/refresh', { refresh_token: refreshToken })
          .then((res) => {
            setTokens(res.data)
            return res.data.access_token
          })
          .finally(() => {
            refreshing = null
          })
      }
      const newAccess = await refreshing
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch (refreshError) {
      clearTokens()
      return Promise.reject(refreshError)
    }
  }
)

export function extractError(error) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || JSON.stringify(item)).join(' · ')
  }
  if (detail && typeof detail === 'object') {
    return detail.message || JSON.stringify(detail)
  }
  return error.message || 'Something went wrong'
}

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }).then((r) => r.data),
}

export const propertyApi = {
  list: () => api.get('/properties').then((r) => r.data),
  get: (id) => api.get(`/properties/${id}`).then((r) => r.data),
  create: (payload) => api.post('/properties', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/properties/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/properties/${id}`),
}

export const roomApi = {
  list: () => api.get('/rooms').then((r) => r.data),
  get: (id) => api.get(`/rooms/${id}`).then((r) => r.data),
  create: (payload) => api.post('/rooms', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/rooms/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/rooms/${id}`),
}

export const roomTypeApi = {
  list: () => api.get('/room-types').then((r) => r.data),
  create: (payload) => api.post('/room-types', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/room-types/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/room-types/${id}`),
}

export const bookingApi = {
  list: () => api.get('/bookings').then((r) => r.data),
  get: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
  create: (payload) => api.post('/bookings', payload).then((r) => r.data),
  cancel: (id) => api.post(`/bookings/${id}/cancel`).then((r) => r.data),
  checkout: (id) => api.post(`/bookings/${id}/checkout`).then((r) => r.data),
}

export const paymentApi = {
  list: () => api.get('/payments').then((r) => r.data),
  create: (payload) => api.post('/payments', payload).then((r) => r.data),
}

export const reviewApi = {
  list: () => api.get('/reviews').then((r) => r.data),
  create: (payload) => api.post('/reviews', payload).then((r) => r.data),
  propertySummary: (propertyId) =>
    api.get(`/reviews/property/${propertyId}`).then((r) => r.data),
}
