import { apiClient, getToken } from './apiClient'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const attachmentService = {
  async uploadFile(taskId, file) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post(`/attachments/task/${taskId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async getTaskAttachments(taskId) {
    const { data } = await apiClient.get(`/attachments/task/${taskId}`)
    return data
  },

  async deleteAttachment(attachmentId) {
    await apiClient.delete(`/attachments/${attachmentId}`)
  },

  async getFileUrl(filePath, attachmentId) {
    void filePath
    return `${baseURL}/attachments/${attachmentId}/download`
  },

  async downloadFile(filePath, fileName, attachmentId) {
    void filePath
    const token = getToken()
    const response = await fetch(`${baseURL}/attachments/${attachmentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error(`Ошибка загрузки: ${response.statusText}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }, 100)
  },
}
