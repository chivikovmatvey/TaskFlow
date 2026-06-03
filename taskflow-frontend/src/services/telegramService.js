import { apiClient } from './apiClient'

export const telegramService = {
  async getStatus() {
    const { data } = await apiClient.get('/telegram/status')
    return data
  },

  async generateLinkCode() {
    const { data } = await apiClient.post('/telegram/link-code')
    return data
  },

  async unlink() {
    await apiClient.delete('/telegram/unlink')
  },

  async updatePreferences(prefs) {
    const { data } = await apiClient.patch('/telegram/preferences', prefs)
    return data
  },

  async startLogin() {
    const { data } = await apiClient.post('/telegram/login/start')
    return data
  },

  async loginStatus(code) {
    const { data } = await apiClient.get('/telegram/login/status', { params: { code } })
    return data
  },
}
