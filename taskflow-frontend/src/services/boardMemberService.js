import { apiClient } from './apiClient'

export const boardMemberService = {
  async getBoardMembers(boardId) {
    const { data } = await apiClient.get('/members', { params: { board_id: boardId } })
    return data
  },

  async inviteMember(boardId, email, role = 'viewer') {
    const { data } = await apiClient.post('/members', {
      board_id: boardId,
      email,
      role,
    })
    return data
  },

  async removeMember(memberId) {
    await apiClient.delete(`/members/${memberId}`)
  },

  async updateMemberRole(memberId, newRole) {
    const { data } = await apiClient.patch(`/members/${memberId}`, { role: newRole })
    return data
  },
}
