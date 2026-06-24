import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Col,
  Row,
  Descriptions,
  Tag,
  Space,
  Typography,
  Spin,
  Empty,
  Button,
  List,
  Modal,
  Select,
  InputNumber,
  Progress,
  message,
} from 'antd'
import { CloudDownloadOutlined, ImportOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const crawlStatusColor = {
  PENDING: 'gold',
  RUNNING: 'blue',
  SUCCESS: 'green',
  PARTIAL: 'cyan',
  FAILED: 'red',
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [jobs, setJobs] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [crawlTasks, setCrawlTasks] = useState([])

  // 抓取弹窗
  const [crawlOpen, setCrawlOpen] = useState(false)
  const [marketplace, setMarketplace] = useState('US')
  const [maxPages, setMaxPages] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  // 状态弹窗（跟踪某个 taskId）
  const [trackingTaskId, setTrackingTaskId] = useState(null)
  const [tracking, setTracking] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const p = await api.getProduct(id)
        setProduct(p)
        const j = await api.listAnalysisJobs({ productId: id, page: 1, size: 5 })
        const jobList = j?.records || j || []
        setJobs(jobList)
        const ok = jobList.find((x) => x.status === 'SUCCESS')
        if (ok) {
          const r = await api.getAnalysisResult(ok.id)
          setResult(r)
        }
        // 顺手拉一下这个商品的爬虫任务
        const ct = await api.listCrawlTasks({ productId: id, page: 1, size: 10 })
        setCrawlTasks(ct?.records || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // 状态轮询
  useEffect(() => {
    if (!trackingTaskId) return
    let stop = false
    const tick = async () => {
      try {
        const t = await api.getCrawlTask(trackingTaskId)
        if (stop) return
        setTracking(t)
        if (t && (t.status === 'PENDING' || t.status === 'RUNNING')) {
          setTimeout(tick, 3000)
        }
      } catch {
        // 静默：拦截器已提示
      }
    }
    tick()
    return () => { stop = true }
  }, [trackingTaskId])

  const onSubmitCrawl = async () => {
    setSubmitting(true)
    try {
      const taskId = await api.submitCrawlTask(Number(id), marketplace, maxPages)
      message.success(`已提交 (taskId=${taskId})`)
      setCrawlOpen(false)
      setTrackingTaskId(taskId)
      // 刷新该商品任务列表
      const ct = await api.listCrawlTasks({ productId: id, page: 1, size: 10 })
      setCrawlTasks(ct?.records || [])
    } finally {
      setSubmitting(false)
    }
  }

  const onImport = async (taskId) => {
    const hide = message.loading('正在导入 review 表…', 0)
    try {
      const r = await api.importCrawlTask(taskId)
      hide()
      message.success(`导入完成：新增 ${r.successCount} / 跳过 ${r.skipCount}`)
      if (r.analysisJobId) message.info(`已自动创建分析任务 #${r.analysisJobId}`)
      setTrackingTaskId(taskId)
      const ct = await api.listCrawlTasks({ productId: id, page: 1, size: 10 })
      setCrawlTasks(ct?.records || [])
    } catch {
      hide()
    }
  }

  const onRetry = async (taskId) => {
    try {
      const ok = await api.retryCrawlTask(taskId)
      if (ok) {
        message.success('已重置为 PENDING')
        setTrackingTaskId(taskId)
        const ct = await api.listCrawlTasks({ productId: id, page: 1, size: 10 })
        setCrawlTasks(ct?.records || [])
      } else {
        message.warning('该任务不可重跑')
      }
    } catch {
      // ignore
    }
  }

  if (loading) return <Spin tip="加载中..." style={{ width: '100%', marginTop: 100 }} />
  if (!product) return <Empty description="产品不存在" />

  const pieOption = result && {
    title: { text: '评分分布', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: result.positiveCount || 0, name: '正面', itemStyle: { color: '#52c41a' } },
        { value: result.neutralCount || 0, name: '中性', itemStyle: { color: '#faad14' } },
        { value: result.negativeCount || 0, name: '负面', itemStyle: { color: '#ff4d4f' } },
      ],
    }],
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space wrap>
        <Button onClick={() => navigate(-1)}>← 返回</Button>
        <Title level={3} style={{ margin: 0 }}>{product.productName}</Title>
        <Tag color="blue">{product.asin}</Tag>
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={() => setCrawlOpen(true)}
        >
          从 Amazon 抓取评论
        </Button>
        <Button onClick={() => navigate(`/reviews?productId=${id}`)}>
          查看评论列表
        </Button>
      </Space>

      <Card title="基础信息">
        <Descriptions column={3} size="small">
          <Descriptions.Item label="品牌">{product.brand || '-'}</Descriptions.Item>
          <Descriptions.Item label="类目">{product.category || '-'}</Descriptions.Item>
          <Descriptions.Item label="来源">{product.sourcePlatform}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={product.status === 1 ? 'green' : 'default'}>{product.status === 1 ? '启用' : '停用'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {!result && (
        <Card>
          <Empty description="暂无 AI 分析结果，请先触发分析任务" />
        </Card>
      )}

      {result && (
        <>
          <Row gutter={16}>
            <Col span={10}>
              <Card title="情感分布">
                <ReactECharts option={pieOption} style={{ height: 320 }} />
              </Card>
            </Col>
            <Col span={14}>
              <Card title="核心指标">
                <Row gutter={16}>
                  <Col span={8}>
                    <Card>
                      <Text type="secondary">平均评分</Text>
                      <Title level={2} style={{ margin: 0, color: '#1677ff' }}>
                        {result.avgRating?.toFixed?.(2) ?? '-'}
                      </Title>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Text type="secondary">评论总数</Text>
                      <Title level={2} style={{ margin: 0 }}>
                        {(result.positiveCount || 0) + (result.neutralCount || 0) + (result.negativeCount || 0)}
                      </Title>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Text type="secondary">好评率</Text>
                      <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                        {result.positiveCount && (result.positiveCount + result.negativeCount + result.neutralCount)
                          ? Math.round((result.positiveCount / (result.positiveCount + result.negativeCount + result.neutralCount)) * 100)
                          : 0}%
                      </Title>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Card title="AI 摘要">
            <Paragraph style={{ fontSize: 14 }}>{result.summary || '暂无摘要'}</Paragraph>
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="Top 关键词">
                <Space wrap>
                  {(result.topKeywords || []).map((k, i) => (
                    <Tag key={i} color="blue">{k}</Tag>
                  ))}
                  {(!result.topKeywords || result.topKeywords.length === 0) && <Text type="secondary">暂无</Text>}
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="核心痛点">
                <List
                  size="small"
                  dataSource={result.painPoints || []}
                  locale={{ emptyText: <Text type="secondary">暂无</Text> }}
                  renderItem={(item, i) => (
                    <List.Item>
                      <Tag color="red">痛点 {i + 1}</Tag>
                      {item}
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Card title="分析任务">
        <List
          size="small"
          dataSource={jobs}
          locale={{ emptyText: <Empty description="暂无任务" /> }}
          renderItem={(j) => (
            <List.Item
              actions={[
                j.status === 'FAILED' && (
                  <Button size="small" onClick={() => api.triggerAnalysis(j.id).then(() => window.location.reload())}>
                    重试
                  </Button>
                ),
              ].filter(Boolean)}
            >
              <Space>
                <Text>任务 #{j.id}</Text>
                <Tag color={({ PENDING: 'gold', RUNNING: 'blue', SUCCESS: 'green', FAILED: 'red' })[j.status] || 'default'}>
                  {j.status}
                </Tag>
                <Text type="secondary">{j.totalReviews} 条评论</Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Card
        title="爬虫任务"
        extra={
          <Button size="small" onClick={() => navigate('/crawl-tasks')}>查看全部</Button>
        }
      >
        <List
          size="small"
          dataSource={crawlTasks}
          locale={{ emptyText: <Empty description="暂无爬虫任务" /> }}
          renderItem={(t) => (
            <List.Item
              actions={[
                <Button size="small" onClick={() => setTrackingTaskId(t.taskId)}>查看</Button>,
                (t.status === 'FAILED' || t.status === 'PARTIAL') && (
                  <Button size="small" onClick={() => onRetry(t.taskId)}>重跑</Button>
                ),
                (t.status === 'SUCCESS' || t.status === 'PARTIAL') && !t.imported && (
                  <Button size="small" type="primary" icon={<ImportOutlined />} onClick={() => onImport(t.taskId)}>
                    导入 review
                  </Button>
                ),
                t.imported && <Tag color="green">已导入</Tag>,
              ].filter(Boolean)}
            >
              <Space wrap>
                <Text>任务 #{t.taskId}</Text>
                <Tag color={crawlStatusColor[t.status] || 'default'}>{t.status}</Tag>
                <Text type="secondary">{t.platform}/{t.marketplace}</Text>
                <Text type="secondary">抓取 {t.totalFetched ?? 0} / 落库 {t.totalSaved ?? 0}</Text>
                <Text type="secondary">{t.startTime ? dayjs(t.startTime).format('MM-DD HH:mm:ss') : '-'}</Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* 触发抓取弹窗 */}
      <Modal
        title="从 Amazon 抓取评论"
        open={crawlOpen}
        onCancel={() => setCrawlOpen(false)}
        onOk={onSubmitCrawl}
        confirmLoading={submitting}
        okText="提交"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text>站点</Text>
            <Select
              style={{ width: '100%' }}
              value={marketplace}
              onChange={setMarketplace}
              options={[
                { value: 'US', label: 'US - 美国' },
                { value: 'JP', label: 'JP - 日本' },
                { value: 'UK', label: 'UK - 英国' },
                { value: 'DE', label: 'DE - 德国' },
                { value: 'FR', label: 'FR - 法国' },
              ]}
            />
          </div>
          <div>
            <Text>最大抓取页数</Text>
            <InputNumber
              style={{ width: '100%' }}
              value={maxPages}
              onChange={setMaxPages}
              min={1}
              max={50}
            />
          </div>
        </Space>
      </Modal>

      {/* 任务状态跟踪弹窗 */}
      <Modal
        title={trackingTaskId ? `爬虫任务 #${trackingTaskId}` : ''}
        open={!!trackingTaskId}
        onCancel={() => { setTrackingTaskId(null); setTracking(null) }}
        footer={[
          <Button key="close" onClick={() => { setTrackingTaskId(null); setTracking(null) }}>关闭</Button>,
          tracking && (tracking.status === 'FAILED' || tracking.status === 'PARTIAL') && (
            <Button key="retry" onClick={() => onRetry(tracking.taskId)}>重跑</Button>
          ),
          tracking && (tracking.status === 'SUCCESS' || tracking.status === 'PARTIAL') && !tracking.imported && (
            <Button key="import" type="primary" icon={<ImportOutlined />} onClick={() => onImport(tracking.taskId)}>
              导入 review
            </Button>
          ),
        ].filter(Boolean)}
        width={600}
      >
        {tracking && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={crawlStatusColor[tracking.status]}>{tracking.status}</Tag>
              {(tracking.status === 'PENDING' || tracking.status === 'RUNNING') && (
                <Tag color="processing">实时刷新中</Tag>
              )}
              {tracking.imported && <Tag color="green">已导入</Tag>}
            </Space>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="平台/站点">{tracking.platform} / {tracking.marketplace}</Descriptions.Item>
              <Descriptions.Item label="ASIN">{tracking.asin}</Descriptions.Item>
              <Descriptions.Item label="已抓取">{tracking.totalFetched ?? 0}</Descriptions.Item>
              <Descriptions.Item label="已落库">{tracking.totalSaved ?? 0}</Descriptions.Item>
              <Descriptions.Item label="页数">{tracking.pagesCrawled ?? 0}</Descriptions.Item>
              <Descriptions.Item label="数据源">{tracking.source || '-'}</Descriptions.Item>
              {tracking.errorMessage && (
                <Descriptions.Item label="错误" span={2}>
                  <Text type="danger">{tracking.errorMessage}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Space>
        )}
      </Modal>
    </Space>
  )
}