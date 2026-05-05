import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { attachmentService } from '../../services/attachmentService'

function TaskAttachments({ taskId }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const fileInputRef = useRef(null)

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => attachmentService.getTaskAttachments(taskId),
  })

  const uploadMutation = useMutation({
    mutationFn: (file) => attachmentService.uploadFile(taskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      toast.success('Файл загружен')
      setUploading(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка загрузки файла')
      setUploading(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ attachmentId, filePath }) =>
      attachmentService.deleteAttachment(attachmentId, filePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      toast.success('Файл удален')
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления файла')
    },
  })

  const handleFiles = async (files) => {
    if (files.length === 0) return

    console.log('Files selected:', files)
    setUploading(true)

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Файл ${file.name} слишком большой (макс. 10 МБ)`)
        continue
      }

      try {
        console.log('Uploading file:', file.name)
        await uploadMutation.mutateAsync(file)
        console.log('File uploaded successfully:', file.name)
      } catch (error) {
        console.error('Error uploading file:', error)
        toast.error(`Ошибка загрузки ${file.name}: ${error.message}`)
      }
    }

    setUploading(false)
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    await handleFiles(files)
    e.target.value = ''
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    await handleFiles(files)
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType) => {
    const baseClasses = "w-4 h-4"
    if (fileType.startsWith('image/')) {
      return (
        <svg className={`${baseClasses} text-coral`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    } else if (fileType.startsWith('video/')) {
      return (
        <svg className={`${baseClasses} text-amber`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    } else if (fileType.includes('pdf')) {
      return (
        <svg className={`${baseClasses} text-danger`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
    return (
      <svg className={`${baseClasses} text-ink-muted dark:text-ink-muted-soft`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  const handlePreview = async (attachment) => {
    const url = await attachmentService.getFileUrl(attachment.file_path, attachment.id)
    const token = localStorage.getItem('taskflow_token')
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      toast.error('Ошибка загрузки предпросмотра')
      return
    }
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    setPreviewUrl(blobUrl)
    setPreviewFile(attachment)

    if (attachment.file_type.startsWith('text/')) {
      setLoadingText(true)
      try {
        const text = await blob.text()
        setTextContent(text)
      } catch (error) {
        console.error('Error loading text file:', error)
        toast.error('Ошибка загрузки текстового файла')
      } finally {
        setLoadingText(false)
      }
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(null)
    setPreviewUrl(null)
    setTextContent('')
    setLoadingText(false)
  }

  const canPreview = (fileType) => {
    return fileType.startsWith('image/') ||
           fileType.startsWith('video/') ||
           fileType.includes('pdf') ||
           fileType.startsWith('text/') ||
           fileType.includes('wordprocessingml') ||
           fileType.includes('markdown')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <h4 className="font-display text-lg tracking-display-md text-ink dark:text-canvas">
            Вложения
          </h4>
          <span className="text-xs tabular-nums text-ink-muted dark:text-ink-muted-soft font-medium">
            {attachments.length}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
          accept="*/*"
        />
        <button
          onClick={() => {
            if (!uploading && fileInputRef.current) fileInputRef.current.click()
          }}
          disabled={uploading}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-coral hover:bg-coral-active text-white rounded-md shadow-coral transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {uploading ? 'Загрузка...' : 'Добавить файл'}
        </button>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onClick={() => {
          if (!uploading && fileInputRef.current) fileInputRef.current.click()
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`mb-4 border border-dashed rounded-lg p-8 text-center transition-all duration-300 ease-smooth ${
          dragActive
            ? 'border-coral bg-coral-soft scale-[1.01]'
            : 'border-hairline dark:border-navy-hairline hover:border-coral/50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <svg className={`mx-auto h-10 w-10 transition-colors ${dragActive ? 'text-coral' : 'text-ink-muted-soft'}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-3 text-sm text-ink-body dark:text-ink-muted">
          {dragActive ? (
            <span className="font-medium text-coral">Отпустите для загрузки</span>
          ) : (
            <>
              <span className="font-medium text-coral">Нажмите для выбора</span>
              <span className="text-ink-muted dark:text-ink-muted-soft"> или перетащите файлы сюда</span>
            </>
          )}
        </p>
        <p className="mt-1 text-[11px] text-ink-muted-soft">До 10 МБ</p>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-sm text-ink-muted-soft animate-shimmer">Загрузка</div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-4 text-sm text-ink-muted-soft">Нет вложений</div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-canvas-soft dark:bg-navy-soft border border-hairline dark:border-navy-hairline rounded-md hover:border-coral/40 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink dark:text-canvas truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-[11px] text-ink-muted-soft mt-0.5">
                    {formatFileSize(attachment.file_size)} · {new Date(attachment.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canPreview(attachment.file_type) && (
                  <button
                    onClick={() => handlePreview(attachment)}
                    className="p-1.5 text-ink-muted dark:text-ink-muted-soft hover:text-coral rounded transition-colors"
                    title="Предпросмотр"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => attachmentService.downloadFile(attachment.file_path, attachment.file_name, attachment.id)}
                  className="p-1.5 text-ink-muted dark:text-ink-muted-soft hover:text-coral rounded transition-colors"
                  title="Скачать"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ attachmentId: attachment.id, filePath: attachment.file_path })}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 text-ink-muted dark:text-ink-muted-soft hover:text-danger rounded transition-colors"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={closePreview}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                {getFileIcon(previewFile.file_type)}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{previewFile.file_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(previewFile.file_size)}</p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
              {previewFile.file_type.startsWith('image/') && (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewUrl}
                    alt={previewFile.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {previewFile.file_type.startsWith('video/') && (
                <div className="flex items-center justify-center h-full">
                  <video
                    src={previewUrl}
                    controls
                    className="max-w-full max-h-full"
                  >
                    Ваш браузер не поддерживает воспроизведение видео
                  </video>
                </div>
              )}

              {previewFile.file_type.includes('pdf') && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px] bg-white dark:bg-gray-800"
                  title={previewFile.file_name}
                />
              )}

              {previewFile.file_type.startsWith('text/') && (
                <div className="w-full h-full min-h-[600px] overflow-auto">
                  {loadingText ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <pre className="p-4 text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                      {textContent}
                    </pre>
                  )}
                </div>
              )}

              {previewFile.file_type.includes('wordprocessingml') && (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center p-8">
                    <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Документ Word</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Предпросмотр документов Word недоступен в браузере</p>
                    <button
                      onClick={() => attachmentService.downloadFile(previewFile.file_path, previewFile.file_name, previewFile.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Скачать для просмотра
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                onClick={() => attachmentService.downloadFile(previewFile.file_path, previewFile.file_name, previewFile.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Скачать файл
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskAttachments
