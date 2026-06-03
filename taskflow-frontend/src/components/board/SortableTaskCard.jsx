import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskCard from './TaskCard'
import { useModalStore, selectIsAnyModalOpen } from '../../stores/modalStore'

function SortableTaskCard({ task, boardId, onModalStateChange }) {
  const isAnyModalOpen = useModalStore(selectIsAnyModalOpen)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isAnyModalOpen,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="stagger-card"
    >
      <TaskCard
        task={task}
        boardId={boardId}
        isDragging={isDragging}
        onModalStateChange={onModalStateChange}
      />
    </div>
  )
}

export default SortableTaskCard