import { apiClient } from './apiClient'

export const checklistService = {
  async getChecklistItems(taskId) {
    const { data } = await apiClient.get(`/checklists/task/${taskId}`)
    return data
  },

  async createChecklistItem(taskId, title, position) {
    const { data } = await apiClient.post(`/checklists/task/${taskId}`, { title, position })
    return data
  },

  async updateChecklistItem(itemId, updates) {
    const { data } = await apiClient.patch(`/checklists/${itemId}`, updates)
    return data
  },

  async deleteChecklistItem(itemId) {
    await apiClient.delete(`/checklists/${itemId}`)
  },

  async toggleChecklistItem(itemId, isCompleted) {
    return this.updateChecklistItem(itemId, { is_completed: isCompleted })
  },
}
