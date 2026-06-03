import { apiClient, setAuth, clearAuth, getStoredUser } from './apiClient'

export const authService = {
  async signUp(email, password, fullName) {
    const { data } = await apiClient.post('/auth/register/start', { email, password, fullName })
    return data
  },

  async signIn(identifier, password) {
    const { data } = await apiClient.post('/auth/login', { identifier, password })
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

  async getUserByUsername(username) {
    const { data } = await apiClient.get('/auth/lookup', { params: { username } })
    return data.user
  },

  async getUserById(id) {
    const { data } = await apiClient.get('/auth/lookup', { params: { id } })
    return data.user
  },

  setAuth,

  async updateProfile(patch) {
    const { data } = await apiClient.patch('/auth/profile', patch)
    return data.user
  },

  async uploadAvatar(file) {
    const form = new FormData()
    form.append('avatar', file)
    const { data } = await apiClient.post('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.user
  },

  async removeAvatar() {
    const { data } = await apiClient.delete('/auth/avatar')
    return data.user
  },

  async getAccountLinks() {
    const { data } = await apiClient.get('/auth/account-links')
    return data
  },

  async unlinkAccount(provider) {
    await apiClient.delete(`/auth/account-links/${provider}`)
  },
}
