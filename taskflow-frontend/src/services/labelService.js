import { apiClient } from './apiClient'

export const labelService = {
  async getBoardLabels(boardId) {
    const { data } = await apiClient.get('/labels', { params: { board_id: boardId } })
    return data
  },

  async createLabel(boardId, name, color) {
    const { data } = await apiClient.post('/labels', { board_id: boardId, name, color })
    return data
  },

  async updateLabel(labelId, updates) {
    const { data } = await apiClient.patch(`/labels/${labelId}`, updates)
    return data
  },

  async deleteLabel(labelId) {
    await apiClient.delete(`/labels/${labelId}`)
  },

  async getTaskLabels(taskId) {
    const { data } = await apiClient.get(`/labels/task/${taskId}`)
    return data
  },

  async addLabelToTask(taskId, labelId) {
    const { data } = await apiClient.post(`/labels/task/${taskId}`, { label_id: labelId })
    return data
  },

  async removeLabelFromTask(taskId, labelId) {
    await apiClient.delete(`/labels/task/${taskId}/${labelId}`)
  },
}
