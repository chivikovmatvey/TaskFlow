import { apiClient } from './apiClient'

export const insightsService = {
  async getSummary(boardId) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/summary`)
    return data
  },

  async getHistory(boardId, limit = 100) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/history`, { params: { limit } })
    return data
  },

  async getAssignees(boardId) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/assignees`)
    return data
  },
}
