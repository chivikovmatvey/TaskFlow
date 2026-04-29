import { apiClient } from './apiClient'

export const timeTrackingService = {
  async getTaskTimeTracking(taskId) {
    const { data } = await apiClient.get(`/time-tracking/task/${taskId}`)
    return data
  },

  async startTimer(taskId) {
    const { data } = await apiClient.post(`/time-tracking/task/${taskId}/start`)
    return data
  },

  async stopTimer(timeTrackingId) {
    const { data } = await apiClient.post(`/time-tracking/${timeTrackingId}/stop`)
    return data
  },

  async getActiveTimer(taskId, userId) {
    const all = await this.getTaskTimeTracking(taskId)
    return all.find((t) => t.user_id === userId && !t.ended_at) || null
  },

  async getTotalTaskTime(taskId) {
    const all = await this.getTaskTimeTracking(taskId)
    return all
      .filter((t) => t.ended_at)
      .reduce((sum, t) => sum + (t.duration || 0), 0)
  },

  async updateTimeEntry(timeTrackingId, updates) {
    const { data } = await apiClient.patch(`/time-tracking/${timeTrackingId}`, updates)
    return data
  },

  async deleteTimeEntry(timeTrackingId) {
    await apiClient.delete(`/time-tracking/${timeTrackingId}`)
  },

  async addManualEntry(taskId, _userId, startedAt, endedAt, notes) {
    const start = new Date(startedAt)
    const end = new Date(endedAt)
    const duration = Math.floor((end - start) / 1000)
    if (duration <= 0) throw new Error('Время окончания должно быть позже времени начала')
    const { data } = await apiClient.post(`/time-tracking/task/${taskId}/manual`, {
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      duration,
      notes: notes || null,
    })
    return data
  },

  async addDurationEntry(taskId, _userId, durationInSeconds, notes) {
    if (durationInSeconds <= 0) throw new Error('Длительность должна быть больше 0')
    const now = new Date()
    const { data } = await apiClient.post(`/time-tracking/task/${taskId}/manual`, {
      started_at: now.toISOString(),
      ended_at: now.toISOString(),
      duration: durationInSeconds,
      notes: notes || null,
    })
    return data
  },
}
