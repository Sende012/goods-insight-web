import { useState } from 'react'
import { Card, Form, Input, Button, Space, Typography, Steps, message, Alert, Divider } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

export default function NewAnalysis() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [productId, setProductId] = useState(null)
  const [crawlTaskId, setCrawlTaskId] = useState(null)
  const [analysisJobId, setAnalysisJobId] = useState(null)

  const onCreateProduct = async (values) => {
    setLoading(true)
    try {
      // 1. 创建产品
      const p = await api.createProduct({
        asin: values.asin,
        productName: values.productName,
        brand: values.brand,
        category: values.category,
        sourcePlatform: 'AMAZON',
      })
      setProductId(p.id)
      message.success(`产品已创建 (ID=${p.id})`)
      setStep(1)
    } catch (e) {
      message.error('创建产品失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const onCrawl = async () => {
    setLoading(true)
    try {
      const asin = form.getFieldValue('asin')
      const task = await api.submitCrawlTask(asin)
      setCrawlTaskId(task.id)
      message.success(`爬虫任务已提交 (ID=${task.id})`)
      setStep(2)
    } catch (e) {
      // 兜底：爬虫 API 还没实现时，使用 CSV 上传
      message.warning('爬虫接口暂不可用，请上传 CSV 或直接触发分析')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  const onTriggerAnalysis = async () => {
    if (!productId) return
    setLoading(true)
    try {
      // 1) 创建 PENDING 任务
      const jobId = await api.createAnalysisJob(productId, 0)
      setAnalysisJobId(jobId)
      message.success(`分析任务已创建 (ID=${jobId})`)
      // 2) 立即触发执行
      try {
        await api.triggerAnalysis(jobId)
      } catch (e) {
        // worker 也会 30s 后自动跑，trigger 失败不影响
      }
      setStep(3)
    } catch (e) {
      message.error('创建分析任务失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>新建分析</Title>

      <Card>
        <Steps
          current={step}
          items={[
            { title: '输入 ASIN', description: '产品基础信息' },
            { title: '抓取评论', description: '从亚马逊抓取评论' },
            { title: '触发分析', description: 'AI 分析评论' },
            { title: '完成', description: '跳转到报告' },
          ]}
        />
      </Card>

      <Card title="Step 1 · 产品信息">
        <Form form={form} layout="vertical" onFinish={onCreateProduct} style={{ maxWidth: 600 }}>
          <Form.Item name="asin" label="Amazon ASIN" rules={[{ required: true, pattern: /^[A-Z0-9]{10}$/, message: '请输入 10 位 ASIN' }]}>
            <Input placeholder="如 B08N5WRWNW" style={{ textTransform: 'uppercase' }} maxLength={10} />
          </Form.Item>
          <Form.Item name="productName" label="产品名称" rules={[{ required: true }]}>
            <Input placeholder="如 Wireless Earbuds" />
          </Form.Item>
          <Form.Item name="brand" label="品牌">
            <Input placeholder="如 Sony" />
          </Form.Item>
          <Form.Item name="category" label="类目">
            <Input placeholder="如 Electronics" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>下一步</Button>
          </Form.Item>
        </Form>
      </Card>

      {step >= 1 && (
        <Card title="Step 2 · 抓取评论">
          <Paragraph>
            产品已创建 (ID=<Text code>{productId}</Text>)。点击下方按钮自动从亚马逊抓取评论。
          </Paragraph>
          <Alert
            type="info"
            showIcon
            message="MVP 阶段：爬虫 API 可能未部署。如失败请改用 CSV 上传或继续下一步。"
            style={{ marginBottom: 16 }}
          />
          <Space>
            <Button onClick={onCrawl} loading={loading}>抓取评论</Button>
            <Button type="primary" onClick={() => setStep(2)}>跳过，直接分析</Button>
          </Space>
        </Card>
      )}

      {step >= 2 && (
        <Card title="Step 3 · 触发 AI 分析">
          <Paragraph>已存在 {crawlTaskId ? `爬虫任务 ${crawlTaskId}` : '评论数据'}，可触发 AI 分析。</Paragraph>
          <Button type="primary" onClick={onTriggerAnalysis} loading={loading}>
            触发分析
          </Button>
        </Card>
      )}

      {step >= 3 && analysisJobId && (
        <Card>
          <Alert
            type="success"
            showIcon
            message="分析任务已创建"
            description={
              <Space direction="vertical">
                <Text>任务 ID：<Text code>{analysisJobId}</Text></Text>
                <Space>
                  <Button type="primary" onClick={() => navigate('/jobs')}>查看任务中心</Button>
                  <Button onClick={() => navigate(`/product/${productId}`)}>查看产品详情</Button>
                </Space>
              </Space>
            }
          />
        </Card>
      )}
    </Space>
  )
}