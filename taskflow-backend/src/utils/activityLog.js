import { query } from '../db.js'

export async function logActivity({ boardId, userId, action, entityType, entityId, title, details }) {
  try {
    await query(
      `INSERT INTO dbo.activity_log (board_id, user_id, action, entity_type, entity_id, title, details)
       VALUES (@bid, @uid, @action, @etype, @eid, @title, @details)`,
      {
        bid: boardId || null,
        uid: userId || null,
        action,
        etype: entityType,
        eid: entityId || null,
        title: title || null,
        details: details ? JSON.stringify(details) : null,
      }
    )
  } catch (err) {
    console.error('Activity log error:', err.message)
  }
}
