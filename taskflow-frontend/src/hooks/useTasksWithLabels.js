import { useQuery } from '@tanstack/react-query'
import { labelService } from '../services/labelService'

export const useTasksWithLabels = (tasks, labelFilter) => {
  const taskIds = tasks?.map(t => t.id) || []

  const { data: allTaskLabels } = useQuery({
    queryKey: ['tasks-labels-bulk', taskIds.join(',')],
    queryFn: async () => {
      if (taskIds.length === 0) return {}

      const results = await Promise.all(
        taskIds.map(async (taskId) => {
          try {
            const labels = await labelService.getTaskLabels(taskId)
            return { taskId, labels }
          } catch {
            return { taskId, labels: [] }
          }
        })
      )

      return results.reduce((acc, { taskId, labels }) => {
        acc[taskId] = labels
        return acc
      }, {})
    },
    enabled: taskIds.length > 0,
    staleTime: 30000,
  })

  if (!labelFilter || labelFilter.length === 0 || !allTaskLabels) {
    return tasks
  }

  return tasks?.filter(task => {
    const taskLabels = allTaskLabels[task.id] || []
    const taskLabelIds = taskLabels.map(l => l.id)

    return labelFilter.some(labelId => taskLabelIds.includes(labelId))
  })
}
