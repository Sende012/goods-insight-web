import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Space, Typography, Steps, message, Alert } from 'antd'
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
  const [hydrating, setHydrating] = useState(false)

  // 跳回「输入 ASIN」时把已有产品信息回填到表单
  useEffect(() => {
    if (step === 0 && productId && !hydrating) {
      setHydrating(true)
      api.getProduct(productId)
        .then((p) => {
          if (p) form.setFieldsValue(p)
        })
        .catch(() => {})
        .finally(() => setHydrating(false))
    }
  }, [step, productId])

  // 步骤 0：保存产品（无 productId → create；有 → update）
  const onSubmitProduct = async (values) => {
    setLoading(true)
    try {
      if (productId) {
        // 编辑模式
        await api.updateProduct(productId, {
          asin: values.asin,
          productName: values.productName,
          brand: values.brand,
          category: values.category,
          sourcePlatform: values.sourcePlatform || 'AMAZON',
        })
        message.success('产品信息已更新')
      } else {
        // 新建模式
        const p = await api.createProduct({
          asin: values.asin,
          productName: values.productName,
          brand: values.brand,
          category: values.category,
          sourcePlatform: 'AMAZON',
        })
        setProductId(p)
        message.success(`产品已创建 (ID=${p})`)
        setStep(1) // 新建后自动跳到下一步
      }
    } catch (e) {
      message.error('保存失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 步骤 1：提交爬虫任务
  const onCrawl = async () => {
    if (!productId) {
      message.warning('请先创建产品')
      return
    }
    setLoading(true)
    try {
      const taskId = await api.submitCrawlTask(productId, 'US', 10)
      setCrawlTaskId(taskId)
      message.success(`爬虫任务已提交 (ID=${taskId})`)
      setStep(2)
    } catch (e) {
      message.warning('爬虫接口暂不可用，请上传 CSV 或直接触发分析')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  // 步骤 2：触发 AI 分析
  const onTriggerAnalysis = async () => {
    if (!productId) {
      message.warning('请先创建产品')
      return
    }
    setLoading(true)
    try {
      const jobId = await api.createAnalysisJob(productId, 0)
      setAnalysisJobId(jobId)
      message.success(`分析任务已创建 (ID=${jobId})`)
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

  // 顶部步骤条：点击节点自由跳转
  const onStepChange = (next) => {
    if (next === 0) {
      setStep(0) // 总是允许回到输入 ASIN
      return
    }
    // 前进到非 0 步骤，要求至少 productId 已存在
    if (!productId) {
      message.warning('请先完成「输入 ASIN」步骤')
      return
    }
    setStep(next)
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>新建分析</Title>

      <Card>
        <Steps
          current={step}
          onChange={onStepChange}
          items={[
            { title: '输入 ASIN', description: productId ? `已创建 (ID=${productId})` : '产品基础信息' },
            { title: '抓取评论', description: '从亚马逊抓取评论' },
            { title: '触发分析', description: 'AI 分析评论' },
            { title: '完成', description: '跳转到报告' },
          ]}
        />
      </Card>

      {step === 0 && (
        <Card
          title={productId ? 'Step 1 · 编辑产品信息' : 'Step 1 · 产品信息'}
          extra={productId && <Text type="secondary" style={{ fontSize: 12 }}>保存会更新现有产品，不会新建</Text>}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmitProduct}
            style={{ maxWidth: 600 }}
          >
            <Form.Item
              name="asin"
              label="Amazon ASIN"
              rules={[{ required: true, pattern: /^[A-Z0-9]{10}$/, message: '请输入 10 位 ASIN' }]}
            >
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
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {productId ? '保存修改' : '下一步'}
                </Button>
                {productId && (
                  <Button onClick={() => setStep(1)}>前往下一步</Button>
                )}
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {step === 1 && (
        <Card title="Step 2 · 抓取评论">
          {!productId ? (
            <Alert type="warning" showIcon message="请先回到 Step 1 创建产品" />
          ) : (
            <>
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
            </>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card title="Step 3 · 触发 AI 分析">
          {!productId ? (
            <Alert type="warning" showIcon message="请先回到 Step 1 创建产品" />
          ) : (
            <>
              <Paragraph>
                已存在{crawlTaskId ? `爬虫任务 ${crawlTaskId}` : '评论数据'}，可触发 AI 分析。
              </Paragraph>
              <Button type="primary" onClick={onTriggerAnalysis} loading={loading}>
                触发分析
              </Button>
            </>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card title="Step 4 · 完成">
          {analysisJobId ? (
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
                    <Button onClick={() => {
                      // 重新开始：清掉所有 state
                      setProductId(null)
                      setCrawlTaskId(null)
                      setAnalysisJobId(null)
                      form.resetFields()
                      setStep(0)
                    }}>再来一个</Button>
                  </Space>
                </Space>
              }
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="请先回到 Step 3 触发分析"
              action={<Button size="small" onClick={() => setStep(2)}>去触发</Button>}
            />
          )}
        </Card>
      )}
    </Space>
  )
}
