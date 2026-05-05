import { apiClient } from './apiClient'

export const sectionService = {
  async getSections() {
    const { data } = await apiClient.get('/sections')
    return data
  },

  async createSection(name, description = '', color = '#cc785c') {
    const { data } = await apiClient.post('/sections', { name, description, color })
    return data
  },

  async updateSection(sectionId, updates) {
    const { data } = await apiClient.patch(`/sections/${sectionId}`, updates)
    return data
  },

  async deleteSection(sectionId) {
    await apiClient.delete(`/sections/${sectionId}`)
  },

  async getSectionMembers(sectionId) {
    const { data } = await apiClient.get(`/sections/${sectionId}/members`)
    return data
  },

  async addSectionMember(sectionId, email, role = 'viewer') {
    const { data } = await apiClient.post(`/sections/${sectionId}/members`, { email, role })
    return data
  },

  async updateSectionMemberRole(sectionId, memberId, role) {
    const { data } = await apiClient.patch(`/sections/${sectionId}/members/${memberId}`, { role })
    return data
  },

  async removeSectionMember(sectionId, memberId) {
    await apiClient.delete(`/sections/${sectionId}/members/${memberId}`)
  },
}
