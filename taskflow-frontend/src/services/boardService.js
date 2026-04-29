import { apiClient } from './apiClient'

export const boardService = {
  async getBoards() {
    const { data } = await apiClient.get('/boards')
    return data
  },

  async getBoard(boardId) {
    const { data } = await apiClient.get(`/boards/${boardId}`)
    return data
  },

  async createBoard(title, description, backgroundColor = '#3b82f6') {
    const { data } = await apiClient.post('/boards', {
      title,
      description,
      background_color: backgroundColor,
    })
    return data
  },

  async updateBoard(boardId, updates) {
    const { data } = await apiClient.patch(`/boards/${boardId}`, updates)
    return data
  },

  async deleteBoard(boardId) {
    await apiClient.delete(`/boards/${boardId}`)
  },

  async duplicateBoard(boardId) {
    const { data } = await apiClient.post(`/boards/${boardId}/duplicate`)
    return data
  },

  async getBoardPermissions(boardId) {
    const { data } = await apiClient.get(`/boards/${boardId}/permissions`)
    return data
  },
}
