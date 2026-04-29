import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService } from '../services/authService'
import { clearAuth, getStoredUser, getToken } from '../services/apiClient'
import { disconnectSocket } from '../services/socketClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    authService.getCurrentUser()
      .then((u) => {
        if (u) setUser(u)
        else {
          clearAuth()
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onLogout = () => {
      setUser(null)
      disconnectSocket()
    }
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  const signIn = useCallback(async (email, password) => {
    const data = await authService.signIn(email, password)
    setUser(data.user)
    return data
  }, [])

  const signUp = useCallback(async (email, password, fullName) => {
    const data = await authService.signUp(email, password, fullName)
    setUser(data.user)
    return data
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    disconnectSocket()
    setUser(null)
  }, [])

  const value = { user, loading, signIn, signUp, signOut }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
