import axios from 'axios'
import { message } from 'antd'

const TOKEN_KEY = 'gi_token'
const USER_KEY = 'gi_user'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
export const getCurrentUser = () => {
  const raw = localStorage.getItem(USER_KEY)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

/** 把后端存的 JSON 字符串字段解析成数组（失败兜底为空数组） */
function parseJsonArray(s) {
  if (Array.isArray(s)) return s
  if (!s || typeof s !== 'string') return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// 请求拦截器：自动带 JWT
client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (resp) => {
    const data = resp.data
    // 后端统一响应约定：{ code, message, data }
    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 0 || data.code === 200) return normalize(data.data)
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return normalize(data)
  },
  (err) => {
    const status = err?.response?.status
    const code = err?.response?.data?.code
    if (status === 401 || code === 'invalid_token' || code === 'missing_token') {
      clearAuth()
      // 避免在登录页本身重复跳
      if (!window.location.pathname.startsWith('/login')) {
        message.warning('登录已失效，请重新登录')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
    const msg = err?.response?.data?.message || err.message || '网络异常'
    message.error(msg)
    return Promise.reject(err)
  },
)

/** 规整化响应：JSON 字符串字段 → 数组 */
function normalize(data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if ('topKeywords' in data) data.topKeywords = parseJsonArray(data.topKeywords)
    if ('painPoints' in data) data.painPoints = parseJsonArray(data.painPoints)
  }
  return data
}

export default client

// 业务 API
export const api = {
  // 鉴权
  login: (account, password) =>
    client.post('/auth/login', { account, password }),
  register: (body) => client.post('/auth/register', body),
  sendResetCode: (email) => client.post('/auth/forgot-code', { email }),
  resetPassword: (email, code, newPassword) =>
    client.post('/auth/reset-password', { email, code, newPassword }),
  me: () => client.get('/users/me'),
  listWorkspaces: () => client.get('/workspaces'),

  // 产品
  listProducts: (params) => client.get('/products', { params }),
  getProduct: (id) => client.get(`/products/${id}`),
  createProduct: (body) => client.post('/products', body),
  updateProduct: (id, body) => client.put(`/products/${id}`, body),
  deleteProduct: (id) => client.delete(`/products/${id}`),

  // 评论导入
  uploadReviews: (productId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post('/reviews/import', fd, {
      params: { productId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  listImportJobs: (params) => client.get('/reviews/import-jobs', { params }),
  listReviews: (params) => client.get('/reviews', { params }),

  // 分析任务
  listAnalysisJobs: (params) => client.get('/analysis-jobs', { params }),
  getAnalysisJob: (id) => client.get(`/analysis-jobs/${id}`),
  createAnalysisJob: (productId, totalReviews = 0) =>
    client.post('/analysis-jobs', { productId, totalReviews }),
  triggerAnalysis: (id) => client.post(`/analysis-jobs/${id}/run`),
  getAnalysisResult: (jobId) => client.get(`/analysis-results/by-job/${jobId}`),

  // 爬虫（v1.0 微服务，桥接 goods-insight-crawler）
  submitCrawlTask: (productId, marketplace = 'US', maxPages = 10) =>
    client.post(`/products/${productId}/crawl`, null, {
      params: { marketplace, maxPages },
    }),
  getCrawlTask: (taskId) => client.get(`/crawl-tasks/${taskId}`),
  listCrawlTasks: (params) => client.get('/crawl-tasks', { params }),
  importCrawlTask: (taskId) => client.post(`/crawl-tasks/${taskId}/import`),
  retryCrawlTask: (taskId) => client.post(`/crawl-tasks/${taskId}/retry`),

  // 竞品对比（v1.0 新增）
  createCompetitorGroup: (body) => client.post('/competitor-groups', body),
  runCompare: (groupId) => client.post(`/competitor-groups/${groupId}/compare`),
  getCompareResult: (groupId) => client.get(`/competitor-groups/${groupId}/result`),

  // 类目扫描（v1.0 新增）
  runCategoryScan: (category) => client.post('/category/scan', { category }),
  getCategoryScan: (taskId) => client.get(`/category/scan/${taskId}`),
}