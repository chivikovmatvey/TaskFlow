import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import KanbanBoard from './KanbanBoard'

function SortableColumn({ column, boardId, onModalStateChange, canManageColumns }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: !canManageColumns,
    data: {
      type: 'column',
      column,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0 w-80 flex flex-col h-full">
      {canManageColumns && (
        <div
          {...attributes}
          {...listeners}
          className="flex justify-center items-center py-1.5 mb-1 cursor-grab active:cursor-grabbing hover:bg-gray-300 dark:hover:bg-gray-600 bg-gray-200 dark:bg-gray-700 rounded-t-lg transition-colors group flex-shrink-0"
          title="Перетащите, чтобы изменить порядок колонки"
        >
          <svg className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="8" cy="6" r="1.5" />
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="16" cy="6" r="1.5" />
            <circle cx="8" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="16" cy="12" r="1.5" />
          </svg>
        </div>
      )}
      <KanbanBoard
        column={column}
        boardId={boardId}
        onModalStateChange={onModalStateChange}
      />
    </div>
  )
}

export default SortableColumn
