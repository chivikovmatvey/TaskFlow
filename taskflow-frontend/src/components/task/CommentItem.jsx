import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { taskService } from '../../services/taskService'

function CommentItem({ comment, taskId, currentUserId, isReply = false, onReply, replyingTo, onCancelReply }) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(comment.content)
  const [showRepliesForm, setShowRepliesForm] = useState(false)
  const [replyText, setReplyText] = useState('')

  const isOwner = comment.user_id === currentUserId

  const updateMutation = useMutation({
    mutationFn: (content) => taskService.updateComment(comment.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      setIsEditing(false)
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => taskService.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      toast.success('Удалено')
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const replyMutation = useMutation({
    mutationFn: (text) => taskService.addComment(taskId, text, comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      setReplyText('')
      setShowRepliesForm(false)
      onCancelReply?.()
    },
    onError: (err) => toast.error(err.message || 'Ошибка'),
  })

  const save = () => {
    if (!editedContent.trim()) return toast.error('Не может быть пустым')
    if (editedContent === comment.content) {
      setIsEditing(false)
      return
    }
    updateMutation.mutate(editedContent.trim())
  }

  const sendReply = () => {
    if (!replyText.trim()) return
    replyMutation.mutate(replyText.trim())
  }

  const displayName =
    comment.user_full_name ||
    (comment.user_username ? `@${comment.user_username}` : null) ||
    comment.user_email ||
    'Пользователь'

  return (
    <div className={`flex gap-2.5 ${isReply ? 'pl-2' : ''}`}>
      <Avatar
        url={comment.user_avatar_url}
        name={displayName}
        size={isReply ? 26 : 32}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 mb-0.5">
          <span className="text-sm font-medium text-ink dark:text-canvas">
            {displayName}
            {isOwner && <span className="ml-1.5 text-[10px] uppercase tracking-caption-up font-semibold text-coral">вы</span>}
          </span>
          {comment.user_username && comment.user_full_name && (
            <span className="text-[11px] text-ink-muted-soft">@{comment.user_username}</span>
          )}
          <span className="text-[11px] text-ink-muted-soft">{formatRelative(comment.created_at)}</span>
          {comment.updated_at && comment.updated_at !== comment.created_at && (
            <span className="text-[10px] text-ink-muted-soft italic">изменено</span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={3}
              autoFocus
              className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas text-sm focus-ring resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={updateMutation.isPending}
                className="px-3 py-1 bg-coral hover:bg-coral-active text-white text-xs font-medium rounded-md shadow-coral transition-all disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditedContent(comment.content) }}
                className="px-3 py-1 text-ink-body dark:text-ink-muted hover:bg-canvas-soft dark:hover:bg-navy-soft text-xs font-medium rounded-md transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-sm text-ink-body dark:text-ink-muted whitespace-pre-wrap break-words leading-relaxed"
            style={{ overflowWrap: 'anywhere' }}
          >
            {comment.content}
          </p>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1 mt-1 -ml-1.5">
            <button
              onClick={() => {
                setShowRepliesForm((v) => !v)
                onReply?.(comment.id)
              }}
              className="px-2 py-0.5 text-[11px] font-medium text-ink-muted hover:text-coral hover:bg-coral/10 rounded transition-colors"
            >
              Ответить
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2 py-0.5 text-[11px] font-medium text-ink-muted hover:text-ink dark:hover:text-canvas rounded transition-colors"
                >
                  Изменить
                </button>
                <button
                  onClick={() => {
                    if (confirm('Удалить комментарий?')) deleteMutation.mutate()
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-2 py-0.5 text-[11px] font-medium text-ink-muted hover:text-danger rounded transition-colors disabled:opacity-50"
                >
                  Удалить
                </button>
              </>
            )}
          </div>
        )}

        {showRepliesForm && (
          <div className="mt-2 animate-fadeIn">
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Ответ для ${displayName}...`}
              rows={2}
              className="w-full px-3 py-2 bg-canvas dark:bg-navy-elevated border border-hairline dark:border-navy-hairline rounded-md text-ink dark:text-canvas text-sm focus-ring resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={sendReply}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-coral hover:bg-coral-active text-white rounded-md shadow-coral transition-all disabled:opacity-50"
              >
                Отправить
              </button>
              <button
                onClick={() => { setShowRepliesForm(false); setReplyText('') }}
                className="px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink dark:hover:text-canvas transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Avatar({ url, name, size = 32 }) {
  const initial = (name || '?')[0]?.toUpperCase() || '?'
  const style = { width: size, height: size, fontSize: size * 0.4 }
  return url ? (
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      style={style}
      className="rounded-full object-cover shrink-0"
    />
  ) : (
    <div
      style={style}
      className="rounded-full bg-coral text-white font-semibold flex items-center justify-center shrink-0"
    >
      {initial}
    </div>
  )
}

function formatRelative(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин назад`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} ч назад`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD} дн назад`
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default CommentItem
