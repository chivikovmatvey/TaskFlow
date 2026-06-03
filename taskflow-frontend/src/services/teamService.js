import { apiClient } from './apiClient'

export const teamService = {
  async list() {
    const { data } = await apiClient.get('/teams')
    return data
  },
  async get(teamId) {
    const { data } = await apiClient.get(`/teams/${teamId}`)
    return data
  },
  async create({ name, description, color, memberIds }) {
    const { data } = await apiClient.post('/teams', { name, description, color, memberIds })
    return data
  },
  async update(teamId, payload) {
    const { data } = await apiClient.patch(`/teams/${teamId}`, payload)
    return data
  },
  async remove(teamId) {
    await apiClient.delete(`/teams/${teamId}`)
  },
  async addMember(teamId, { username, email, userId }) {
    const { data } = await apiClient.post(`/teams/${teamId}/members`, { username, email, userId })
    return data
  },
  async removeMember(teamId, memberId) {
    await apiClient.delete(`/teams/${teamId}/members/${memberId}`)
  },
}
