import { supabase } from './supabaseClient'

export const boardService = {
  // Получить все доски пользователя
  async getBoards() {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Получить одну доску по ID
  async getBoard(boardId) {
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        columns (
          *,
          tasks (*)
        )
      `)
      .eq('id', boardId)
      .single()

    if (error) throw error

    // Сортируем колонки и задачи
    if (data.columns) {
      data.columns.sort((a, b) => a.position - b.position)
      data.columns.forEach(column => {
        if (column.tasks) {
          column.tasks.sort((a, b) => a.position - b.position)
        }
      })
    }

    return data
  },

  // Создать доску
  async createBoard(title, description, backgroundColor = '#3b82f6') {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Пользователь не авторизован')
    }

    const { data, error } = await supabase
      .from('boards')
      .insert({
        title,
        description,
        background_color: backgroundColor,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Board creation error:', error)
      throw error
    }

    // Создаем колонки по умолчанию
    await this.createDefaultColumns(data.id)

    return data
  },

  // Создать колонки по умолчанию
  async createDefaultColumns(boardId) {
    const defaultColumns = [
      { title: 'Нужно сделать', position: 0 },
      { title: 'В работе', position: 1 },
      { title: 'Готово', position: 2 },
    ]

    const columnsToInsert = defaultColumns.map((col) => ({
      ...col,
      board_id: boardId,
    }))

    const { error } = await supabase
      .from('columns')
      .insert(columnsToInsert)

    if (error) {
      console.error('Columns creation error:', error)
      throw error
    }
  },

  // Обновить доску
  async updateBoard(boardId, updates) {
    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', boardId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Удалить доску
  async deleteBoard(boardId) {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId)

    if (error) throw error
  },
  // Копировать доску
  async duplicateBoard(boardId) {
    console.log('🔵 Duplicating board:', boardId)

    // Получаем оригинальную доску с колонками и задачами
    const { data: original, error: fetchError } = await supabase
      .from('boards')
      .select(`
      *,
      columns (
        *,
        tasks (*)
      )
    `)
      .eq('id', boardId)
      .single()

    if (fetchError) {
      console.error('❌ Fetch board for duplication error:', fetchError)
      throw fetchError
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Создаем копию доски
    const { data: newBoard, error: boardError } = await supabase
      .from('boards')
      .insert({
        title: `${original.title} (копия)`,
        description: original.description,
        background_color: original.background_color,
        owner_id: user.id,
      })
      .select()
      .single()

    if (boardError) {
      console.error('❌ Create board copy error:', boardError)
      throw boardError
    }

    // Копируем колонки
    if (original.columns && original.columns.length > 0) {
      const sortedColumns = [...original.columns].sort((a, b) => a.position - b.position)

      for (const col of sortedColumns) {
        const { data: newColumn, error: colError } = await supabase
          .from('columns')
          .insert({
            board_id: newBoard.id,
            title: col.title,
            position: col.position,
          })
          .select()
          .single()

        if (colError) {
          console.error('❌ Copy column error:', colError)
          continue
        }

        // Копируем задачи в колонку
        if (col.tasks && col.tasks.length > 0) {
          const sortedTasks = [...col.tasks].sort((a, b) => a.position - b.position)

          const tasksToInsert = sortedTasks.map(task => ({
            column_id: newColumn.id,
            board_id: newBoard.id,
            title: task.title,
            description: task.description,
            position: task.position,
            priority: task.priority,
            due_date: task.due_date,
            created_by: user.id,
          }))

          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(tasksToInsert)

          if (tasksError) {
            console.error('❌ Copy tasks error:', tasksError)
          }
        }
      }
    }

    console.log('✅ Board duplicated:', newBoard)
    return newBoard
  },
}