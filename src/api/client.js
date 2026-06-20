import axios from 'axios'
import { message } from 'antd'

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

client.interceptors.request.use((config) => {
  // MVP 单租户，workspace_id 后端硬编码 1
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
    return client.post(`/products/${productId}/reviews/import`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  listImportJobs: (params) => client.get('/review-import-jobs', { params }),

  // 分析任务
  listAnalysisJobs: (params) => client.get('/analysis-jobs', { params }),
  getAnalysisJob: (id) => client.get(`/analysis-jobs/${id}`),
  createAnalysisJob: (productId, totalReviews = 0) =>
    client.post('/analysis-jobs', { productId, totalReviews }),
  triggerAnalysis: (id) => client.post(`/analysis-jobs/${id}/run`),
  getAnalysisResult: (jobId) => client.get(`/analysis-results/by-job/${jobId}`),

  // 爬虫（v1.0 新增）
  submitCrawlTask: (asin) => client.post('/crawler/tasks', { asin }),
  getCrawlTask: (id) => client.get(`/crawler/tasks/${id}`),

  // 竞品对比（v1.0 新增）
  createCompetitorGroup: (body) => client.post('/competitor-groups', body),
  runCompare: (groupId) => client.post(`/competitor-groups/${groupId}/compare`),
  getCompareResult: (groupId) => client.get(`/competitor-groups/${groupId}/result`),

  // 类目扫描（v1.0 新增）
  runCategoryScan: (category) => client.post('/category/scan', { category }),
  getCategoryScan: (taskId) => client.get(`/category/scan/${taskId}`),
}