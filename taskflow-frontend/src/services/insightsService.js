import { apiClient } from './apiClient'

function rangeParams(range) {
  if (!range) return {}
  const p = {}
  if (range.from) p.from = range.from instanceof Date ? range.from.toISOString() : range.from
  if (range.to) p.to = range.to instanceof Date ? range.to.toISOString() : range.to
  return p
}

export const insightsService = {
  async getSummary(boardId, range) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/summary`, {
      params: rangeParams(range),
    })
    return data
  },

  async getUsers(boardId, range) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/users`, {
      params: rangeParams(range),
    })
    return data
  },

  async getUser(boardId, userId, range) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/user/${userId}`, {
      params: rangeParams(range),
    })
    return data
  },

  async getTimeseries(boardId, range) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/timeseries`, {
      params: rangeParams(range),
    })
    return data
  },

  async getCFD(boardId, range) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/cfd`, {
      params: rangeParams(range),
    })
    return data
  },

  async getTimeSummary(boardId, range) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/time-summary`, {
      params: rangeParams(range),
    })
    return data
  },

  async getActiveSessions(boardId) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/active-sessions`)
    return data
  },

  async getHeatmap(boardId, range, userId = null) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/heatmap`, {
      params: { ...rangeParams(range), ...(userId ? { userId } : {}) },
    })
    return data
  },

  async getTasksDetailed(boardId) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/tasks-detailed`)
    return data
  },

  async getHistory(boardId, { range, limit = 200, userId, action, search } = {}) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/history`, {
      params: {
        ...rangeParams(range),
        limit,
        ...(userId ? { userId } : {}),
        ...(action ? { action } : {}),
        ...(search ? { search } : {}),
      },
    })
    return data
  },

  async getAssignees(boardId) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/assignees`)
    return data
  },

  async compare(boardId, p1, p2) {
    const { data } = await apiClient.get(`/insights/board/${boardId}/compare`, {
      params: {
        p1from: p1.from instanceof Date ? p1.from.toISOString() : p1.from,
        p1to: p1.to instanceof Date ? p1.to.toISOString() : p1.to,
        p2from: p2.from instanceof Date ? p2.from.toISOString() : p2.from,
        p2to: p2.to instanceof Date ? p2.to.toISOString() : p2.to,
      },
    })
    return data
  },
}
