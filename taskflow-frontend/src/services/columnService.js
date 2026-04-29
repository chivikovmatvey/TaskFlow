import { apiClient } from './apiClient'

export const columnService = {
  async createColumn(boardId, title, position) {
    const { data } = await apiClient.post('/columns', {
      board_id: boardId,
      title,
      position,
    })
    return data
  },

  async updateColumn(columnId, updates) {
    const { data } = await apiClient.patch(`/columns/${columnId}`, updates)
    return data
  },

  async deleteColumn(columnId) {
    await apiClient.delete(`/columns/${columnId}`)
  },

  async reorderColumns(boardId, columnIds) {
    await apiClient.post('/columns/reorder', { board_id: boardId, columnIds })
    return true
  },
}
