import { apiClient, setAuth, clearAuth, getStoredUser } from './apiClient'

export const authService = {
  async signUp(email, password, fullName) {
    const { data } = await apiClient.post('/auth/register', { email, password, fullName })
    setAuth({ token: data.token, user: data.user })
    return data
  },

  async signIn(email, password) {
    const { data } = await apiClient.post('/auth/login', { email, password })
    setAuth({ token: data.token, user: data.user })
    return data
  },

  async signOut() {
    clearAuth()
  },

  async getCurrentUser() {
    try {
      const { data } = await apiClient.get('/auth/me')
      return data.user
    } catch {
      return null
    }
  },

  getStoredUser,

  async getUserByEmail(email) {
    const { data } = await apiClient.get('/auth/lookup', { params: { email } })
    return data.user
  },

  async getUserById(id) {
    const { data } = await apiClient.get('/auth/lookup', { params: { id } })
    return data.user
  },
}
