import { apiClient } from './apiClient'

export const boardMemberService = {
  async getBoardMembers(boardId) {
    const { data } = await apiClient.get('/members', { params: { board_id: boardId } })
    return data
  },

  async inviteMember(boardId, { email, username, userId, role = 'member' }) {
    const { data } = await apiClient.post('/members', {
      board_id: boardId,
      email,
      username,
      user_id: userId,
      role,
    })
    return data
  },

  async inviteTeam(boardId, teamId, role = 'member', userIds) {
    const { data } = await apiClient.post('/members/invite-team', {
      board_id: boardId,
      team_id: teamId,
      role,
      userIds,
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
