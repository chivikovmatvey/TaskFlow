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
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-80 flex flex-col h-full group/column relative"
    >
      {canManageColumns && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-3 py-1 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover/column:opacity-100 transition-all duration-300 ease-smooth hover:scale-110"
          title="Перетащите колонку"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-ink-muted dark:bg-ink-muted-soft" />
              <div className="w-1 h-1 rounded-full bg-ink-muted dark:bg-ink-muted-soft" />
            </div>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-ink-muted dark:bg-ink-muted-soft" />
              <div className="w-1 h-1 rounded-full bg-ink-muted dark:bg-ink-muted-soft" />
            </div>
          </div>
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
