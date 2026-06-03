import { apiClient } from './apiClient'

export const taskService = {
  async createTask(columnId, boardId, title, description = '', position = 0) {
    const { data } = await apiClient.post('/tasks', {
      column_id: columnId,
      board_id: boardId,
      title,
      description,
      position,
    })
    return data
  },

  async updateTask(taskId, updates) {
    const { data } = await apiClient.patch(`/tasks/${taskId}`, updates)
    return data
  },

  async moveTask(taskId, newColumnId, newPosition, allTaskIds) {
    await apiClient.post(`/tasks/${taskId}/move`, {
      column_id: newColumnId,
      position: newPosition,
      allTaskIds,
    })
    return true
  },

  async deleteTask(taskId) {
    await apiClient.delete(`/tasks/${taskId}`)
  },

  async duplicateTask(taskId) {
    const { data } = await apiClient.post(`/tasks/${taskId}/duplicate`)
    return data
  },

  async archiveTask(taskId) {
    const { data } = await apiClient.patch(`/tasks/${taskId}`, {
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    return data
  },

  async unarchiveTask(taskId) {
    const { data } = await apiClient.patch(`/tasks/${taskId}`, {
      is_archived: false,
      archived_at: null,
    })
    return data
  },

  async getArchivedTasks(boardId) {
    const { data } = await apiClient.get('/tasks/archived', { params: { board_id: boardId } })
    return data
  },

  async getTaskComments(taskId) {
    const { data } = await apiClient.get(`/tasks/${taskId}/comments`)
    return data
  },

  async addComment(taskId, content, parentId = null) {
    const { data } = await apiClient.post(`/tasks/${taskId}/comments`, { content, parent_id: parentId })
    return data
  },

  async updateComment(commentId, content) {
    const { data } = await apiClient.patch(`/tasks/comments/${commentId}`, { content })
    return data
  },

  async deleteComment(commentId) {
    await apiClient.delete(`/tasks/comments/${commentId}`)
  },
}
