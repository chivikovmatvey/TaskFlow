import { apiClient } from './apiClient'

export const adminService = {
  async listUsers(q) {
    const { data } = await apiClient.get('/admin/users', { params: q ? { q } : {} })
    return data.users
  },
  async updateUser(id, patch) {
    const { data } = await apiClient.patch(`/admin/users/${id}`, patch)
    return data.user
  },
  async deleteUser(id) {
    await apiClient.delete(`/admin/users/${id}`)
  },
  async unlinkProvider(id, provider) {
    const { data } = await apiClient.delete(`/admin/users/${id}/provider/${provider}`)
    return data.user
  },
  async stats() {
    const { data } = await apiClient.get('/admin/stats')
    return data
  },
}
