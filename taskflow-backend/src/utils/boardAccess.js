import { query } from '../db.js'

export async function getBoardAccess(boardId, userId) {
  const result = await query(
    `SELECT b.owner_id, m.role
     FROM dbo.boards b
     LEFT JOIN dbo.board_members m
       ON m.board_id = b.id AND m.user_id = @userId
     WHERE b.id = @boardId`,
    { boardId, userId }
  )
  if (!result.recordset.length) return null
  const row = result.recordset[0]
  const isOwner = row.owner_id === userId
  if (!isOwner && !row.role) return null
  return {
    isOwner,
    role: isOwner ? 'owner' : row.role,
    canManageColumns: isOwner || row.role === 'admin',
    canManageMembers: isOwner,
  }
}

export async function getBoardMemberIds(boardId) {
  const result = await query(
    `SELECT b.owner_id AS user_id FROM dbo.boards b WHERE b.id = @boardId
     UNION
     SELECT m.user_id FROM dbo.board_members m WHERE m.board_id = @boardId`,
    { boardId }
  )
  return result.recordset.map((r) => r.user_id)
}

export async function getTaskBoardId(taskId) {
  const result = await query(
    `SELECT board_id FROM dbo.tasks WHERE id = @taskId`,
    { taskId }
  )
  return result.recordset[0]?.board_id || null
}
