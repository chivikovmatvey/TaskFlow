import { supabase } from './supabaseClient'

export const columnService = {
  async createColumn(boardId, title, position) {
    const { data, error } = await supabase
      .from('columns')
      .insert([
        {
          board_id: boardId,
          title,
          position,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateColumn(columnId, updates) {
    const { data, error } = await supabase
      .from('columns')
      .update(updates)
      .eq('id', columnId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteColumn(columnId) {
    const { error } = await supabase
      .from('columns')
      .delete()
      .eq('id', columnId)

    if (error) throw error
  },
  async reorderColumns(boardId, columnIds) {
    console.log('Reordering columns:', { boardId, columnIds })

    const updates = columnIds.map((id, index) => ({
      id,
      position: index,
    }))

    for (const update of updates) {
      const { error } = await supabase
        .from('columns')
        .update({ position: update.position })
        .eq('id', update.id)

      if (error) {
        console.error('Reorder column error:', error)
        throw error
      }
    }

    console.log('Columns reordered')
    return true
  },
}