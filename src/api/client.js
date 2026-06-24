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
  timeout: 130000,
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

  // 类目扫描（V2.0 场景 S1）
  runCategoryScan: (body) => client.post('/category/scan', body),
  pageCategoryScan: (params) => client.get('/category/scan', { params }),
  getCategoryScan: (taskId) => client.get(`/category/scan/${taskId}`),
  deleteCategoryScan: (taskId) => client.delete(`/category/scan/${taskId}`),

  // 利润估算（v2.0）
  estimateProfit: (body) => client.post('/profit/estimate', body),
  listProfitEstimations: (params) => client.get('/profit/estimations', { params }),
  getProfitEstimation: (id) => client.get(`/profit/estimations/${id}`),
  deleteProfitEstimation: (id) => client.delete(`/profit/estimations/${id}`),

  // 趋势库（v2.0）
  upsertTrendData: (body) => client.post('/trend/data', body),
  batchUpsertTrendData: (body) => client.post('/trend/data/batch', body),
  getTrendSeries: (params) => client.get('/trend/data/series', { params }),
  forecastTrend: (body) => client.post('/trend/forecast', body),
  getLatestForecast: (keyword) => client.get('/trend/forecast/latest', { params: { keyword } }),
  listRecentForecasts: (limit) => client.get('/trend/forecast/recent', { params: { limit } }),
  listAlertSubscriptions: (activeOnly) => client.get('/trend/alert-subscriptions', { params: { activeOnly } }),
  createAlertSubscription: (body) => client.post('/trend/alert-subscriptions', body),
  toggleAlertSubscription: (id, active) => client.post(`/trend/alert-subscriptions/${id}/toggle`, null, { params: { active } }),
  deleteAlertSubscription: (id) => client.delete(`/trend/alert-subscriptions/${id}`),

  // 预警事件（V2.0 场景 S2）
  pageAlertEvents: (params) => client.get('/trend/alert-events', { params }),
  getAlertEvent: (id) => client.get(`/trend/alert-events/${id}`),
  acknowledgeAlertEvent: (id) => client.post(`/trend/alert-events/${id}/ack`),
  deleteAlertEvent: (id) => client.delete(`/trend/alert-events/${id}`),

  // 类目库（v2.0）
  upsertCategory: (body) => client.post('/categories', body),
  batchUpsertCategory: (body) => client.post('/categories/batch', body),
  seedCategories: () => client.post('/categories/seed'),
  getCategoryById: (id) => client.get(`/categories/${id}`),
  getCategoryByCategoryId: (cid) => client.get('/categories/by-category-id', { params: { categoryId: cid } }),
  listCategoryByParent: (parentId) => client.get('/categories/by-parent', { params: { parentId } }),
  listCategoryByLevel: (level) => client.get('/categories/by-level', { params: { level } }),
  getCategoryTree: (maxLevel) => client.get('/categories/tree', { params: { maxLevel } }),
  searchCategory: (keyword, limit) => client.get('/categories/search', { params: { keyword, limit } }),

  // ASIN 库（v2.0）
  upsertAsin: (body) => client.post('/asin-database', body),
  batchUpsertAsin: (body) => client.post('/asin-database/batch', body),
  seedAsinDatabase: () => client.post('/asin-database/seed'),
  getAsinById: (id) => client.get(`/asin-database/${id}`),
  getAsinByAsin: (asin) => client.get('/asin-database/by-asin', { params: { asin } }),
  pageAsinDatabase: (params) => client.get('/asin-database', { params }),
  topAsinByBsr: (categoryId, limit) => client.get('/asin-database/top-by-bsr', { params: { categoryId, limit } }),

  // 工厂能力（v2.0 场景 S4）
  upsertFactoryCapability: (body) => client.post('/factory-capabilities', body),
  getLatestFactoryCapability: () => client.get('/factory-capabilities/me/latest'),
  listFactoryCapabilities: () => client.get('/factory-capabilities/me'),
  getFactoryCapability: (id) => client.get(`/factory-capabilities/${id}`),

  // 选品创意（v2.0 场景 S4）
  generateIdeas: (body) => client.post('/product-ideas/generate', body),
  pageProductIdeas: (params) => client.get('/product-ideas', { params }),
  listRecentProductIdeas: (limit) => client.get('/product-ideas/recent', { params: { limit } }),
  getProductIdea: (id) => client.get(`/product-ideas/${id}`),
  updateProductIdeaStatus: (id, status) => client.put('/product-ideas/status', { id, status }),
  softDeleteProductIdea: (id) => client.delete(`/product-ideas/${id}`),

  // 风险评估（v2.0 场景 S3）
  assessRisk: (body) => client.post('/risk-scores/assess', body),
  pageRiskScores: (params) => client.get('/risk-scores', { params }),
  listRecentRiskScores: (limit) => client.get('/risk-scores/recent', { params: { limit } }),
  getLatestRiskByAsin: (asin) => client.get('/risk-scores/by-asin', { params: { asin } }),
  getRiskScore: (id) => client.get(`/risk-scores/${id}`),
  softDeleteRiskScore: (id) => client.delete(`/risk-scores/${id}`),

  // 专利库（v2.0）
  upsertPatent: (body) => client.post('/patents', body),
  batchUpsertPatent: (body) => client.post('/patents/batch', body),
  pagePatents: (params) => client.get('/patents', { params }),
  getPatent: (id) => client.get(`/patents/${id}`),
  getPatentByNumber: (patentNumber) => client.get('/patents/by-number', { params: { patentNumber } }),

  // 决策代理（V2.0 决策代理框架）
  runAgent: (body) => client.post('/agent/runs', body),
  pageAgentRuns: (params) => client.get('/agent/runs', { params }),
  getAgentRun: (id) => client.get(`/agent/runs/${id}`),
  deleteAgentRun: (id) => client.delete(`/agent/runs/${id}`),
  listAgentPlans: () => client.get('/agent/runs/plans'),

  // AI 选品教练（V2.0 P3）
  getCoachToday: () => client.get('/coach/today'),
  getCoachRecent: (limit = 30) => client.get('/coach/recent', { params: { limit } }),
  generateCoach: () => client.post('/coach/generate'),
  getCoachById: (id) => client.get(`/coach/${id}`),
  feedbackCoach: (body) => client.post('/coach/feedback', body),

  // API 开放平台（V2.0 P3）
  listApiKeys: (status) => client.get('/open/api-keys', { params: { status } }),
  createApiKey: (body) => client.post('/open/api-keys', body),
  revokeApiKey: (id) => client.delete(`/open/api-keys/${id}`),
  getApiKeyUsage: (id, days = 7) => client.get(`/open/api-keys/${id}/usage`, { params: { days } }),

  // AI 选品教练 决策报告（V2.0 P3 SelectionCoach）
  runSelectionCoach: (body) => client.post('/selection-coach', body, { timeout: 240000 }),
  pageSelectionCoach: (params) => client.get('/selection-coach', { params }),
  getSelectionCoach: (id) => client.get(`/selection-coach/${id}`),
  deleteSelectionCoach: (id) => client.delete(`/selection-coach/${id}`),
}