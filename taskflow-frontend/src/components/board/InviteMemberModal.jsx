import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { boardMemberService } from '../../services/boardMemberService'

function InviteMemberModal({ boardId, onClose }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')

  const inviteMutation = useMutation({
    mutationFn: ({ boardId, email, role }) =>
      boardMemberService.inviteMember(boardId, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] })
      onClose()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка приглашения')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Введите email')
      return
    }

    if (!email.includes('@')) {
      toast.error('Введите корректный email')
      return
    }

    inviteMutation.mutate({ boardId, email: email.trim(), role })
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Пригласить участника</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email пользователя
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Пользователь должен быть зарегистрирован в системе
            </p>
          </div>

          {/* Role Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Роль
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="member">Участник</option>
              <option value="admin">Администратор</option>
            </select>
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <div><strong>Участник</strong> - может создавать и редактировать задачи</div>
              <div><strong>Администратор</strong> - может управлять колонками и участниками</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'Приглашение...' : 'Пригласить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InviteMemberModal