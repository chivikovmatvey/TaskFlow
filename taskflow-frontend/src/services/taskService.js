import { supabase } from './supabaseClient'

export const taskService = {
  async createTask(columnId, boardId, title, description = '', position = 0) {
    console.log('🔵 Creating task:', { columnId, boardId, title, position })

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        column_id: columnId,
        board_id: boardId,
        title,
        description,
        position,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Create task error:', error)
      throw error
    }

    console.log('✅ Task created:', data)
    return data
  },

  async updateTask(taskId, updates) {
    console.log('🔵 Updating task:', taskId, updates)

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('❌ Update task error:', error)
      throw error
    }

    console.log('✅ Task updated:', data)
    return data
  },

  async moveTask(taskId, newColumnId, newPosition) {
    console.log('🔵 Moving task:', { taskId, newColumnId, newPosition })

    const { data, error } = await supabase
      .from('tasks')
      .update({
        column_id: newColumnId,
        position: newPosition,
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('❌ Move task error:', error)
      throw error
    }

    console.log('✅ Task moved:', data)
    return data
  },

  async deleteTask(taskId) {
    console.log('🔵 Deleting task:', taskId)

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('❌ Delete task error:', error)
      throw error
    }

    console.log('✅ Task deleted')
  },

  async getTaskComments(taskId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  async addComment(taskId, content) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        content,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateComment(commentId, content) {
    console.log('🔵 Updating comment:', { commentId, content })

    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select()
      .single()

    if (error) {
      console.error('❌ Update comment error:', error)
      throw error
    }

    console.log('✅ Comment updated:', data)
    return data
  },

  async deleteComment(commentId) {
    console.log('🔵 Deleting comment:', commentId)

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('❌ Delete comment error:', error)
      throw error
    }

    console.log('✅ Comment deleted')
  },
  async archiveTask(taskId) {
    console.log('🔵 Archiving task:', taskId)

    const { data, error } = await supabase
      .from('tasks')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('❌ Archive task error:', error)
      throw error
    }

    console.log('✅ Task archived:', data)
    return data
  },

  async unarchiveTask(taskId) {
    console.log('🔵 Unarchiving task:', taskId)

    const { data, error } = await supabase
      .from('tasks')
      .update({
        is_archived: false,
        archived_at: null
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('❌ Unarchive task error:', error)
      throw error
    }

    console.log('✅ Task unarchived:', data)
    return data
  },

  async getArchivedTasks(boardId) {
    console.log('🔵 Fetching archived tasks:', boardId)

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .eq('is_archived', true)
      .order('archived_at', { ascending: false })

    if (error) {
      console.error('❌ Get archived tasks error:', error)
      throw error
    }

    console.log('✅ Archived tasks fetched:', data)
    return data
  },

  async duplicateTask(taskId) {
    console.log('🔵 Duplicating task:', taskId)

    const { data: original, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      console.error('❌ Fetch task for duplication error:', fetchError)
      throw fetchError
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        column_id: original.column_id,
        board_id: original.board_id,
        title: `${original.title} (копия)`,
        description: original.description,
        position: original.position + 1,
        priority: original.priority,
        due_date: original.due_date,
        assigned_to: original.assigned_to,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Duplicate task error:', error)
      throw error
    }

    console.log('✅ Task duplicated:', data)
    return data
  }
}