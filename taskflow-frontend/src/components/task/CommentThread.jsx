import { useMemo, useState } from 'react'
import CommentItem from './CommentItem'

function CommentThread({ comments, taskId, currentUserId }) {
  const { tops, repliesByParent } = useMemo(() => {
    const tops = []
    const repliesByParent = new Map()
    for (const c of comments) {
      if (c.parent_id) {
        if (!repliesByParent.has(c.parent_id)) repliesByParent.set(c.parent_id, [])
        repliesByParent.get(c.parent_id).push(c)
      } else {
        tops.push(c)
      }
    }
    for (const arr of repliesByParent.values()) {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }
    tops.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    return { tops, repliesByParent }
  }, [comments])

  return (
    <div className="space-y-5">
      {tops.map((c) => (
        <ThreadNode
          key={c.id}
          comment={c}
          replies={repliesByParent.get(c.id) || []}
          taskId={taskId}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}

function ThreadNode({ comment, replies, taskId, currentUserId }) {
  const [showReplies, setShowReplies] = useState(false)

  return (
    <div>
      <CommentItem
        comment={comment}
        taskId={taskId}
        currentUserId={currentUserId}
      />
      {replies.length > 0 && (
        <div className="pl-4 sm:pl-10 mt-2">
          <button
            type="button"
            onClick={() => setShowReplies((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-coral hover:text-coral-active mb-2 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showReplies ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {showReplies ? 'Скрыть' : 'Показать'} {replies.length} {pluralize(replies.length, 'ответ', 'ответа', 'ответов')}
          </button>
          {showReplies && (
            <div className="space-y-3 border-l-2 border-hairline dark:border-navy-hairline pl-3 animate-slideUp">
              {replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  taskId={taskId}
                  currentUserId={currentUserId}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function pluralize(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return many
  if (m10 === 1) return one
  if (m10 >= 2 && m10 <= 4) return few
  return many
}

export default CommentThread
