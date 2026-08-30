import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  authApi,
  clearTokens,
  extractError,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadUser() {
    if (!getAccessToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isGuest: user?.role === 'guest',
      isStaff: user?.role === 'manager' || user?.role === 'owner',
      async login(email, password) {
        setError('')
        const tokens = await authApi.login({ email, password })
        setTokens(tokens)
        const me = await authApi.me()
        setUser(me)
        return me
      },
      async register(payload) {
        setError('')
        await authApi.register(payload)
        const tokens = await authApi.login({
          email: payload.email,
          password: payload.password,
        })
        setTokens(tokens)
        const me = await authApi.me()
        setUser(me)
        return me
      },
      async logout() {
        const refresh = getRefreshToken()
        try {
          if (refresh) await authApi.logout(refresh)
        } catch {
          /* still clear local session */
        }
        clearTokens()
        setUser(null)
      },
      setError,
      extractError,
    }),
    [user, loading, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
