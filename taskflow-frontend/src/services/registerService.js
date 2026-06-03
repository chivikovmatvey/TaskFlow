import { apiClient } from './apiClient'

export const registerService = {
  async startEmailRegister({ email, password, fullName, username }) {
    const { data } = await apiClient.post('/auth/register/start', { email, password, fullName, username })
    return data
  },
  async verifyEmailCode({ email, code }) {
    const { data } = await apiClient.post('/auth/register/verify', { email, code })
    return data
  },
  async resendEmailCode(email) {
    const { data } = await apiClient.post('/auth/register/resend', { email })
    return data
  },

  async startTelegramRegister() {
    const { data } = await apiClient.post('/telegram/register/start')
    return data
  },
  async telegramRegisterStatus(code) {
    const { data } = await apiClient.get('/telegram/register/status', { params: { code } })
    return data
  },
  async telegramSubmitEmail({ code, email, fullName, username }) {
    const { data } = await apiClient.post('/telegram/register/email', { code, email, fullName, username })
    return data
  },
  async telegramVerifyCode({ email, code }) {
    const { data } = await apiClient.post('/telegram/register/verify', { email, code })
    return data
  },

  async checkUsername(username) {
    const { data } = await apiClient.get('/auth/check-username', { params: { username } })
    return data
  },
  async updateUsername(username) {
    const { data } = await apiClient.patch('/auth/username', { username })
    return data
  },

  async searchUsers(q) {
    const { data } = await apiClient.get('/auth/search', { params: { q } })
    return data.users
  },
}
