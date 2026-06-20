import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Col, Row, Descriptions, Tag, Space, Typography, Spin, Empty, Button, List } from 'antd'
import ReactECharts from 'echarts-for-react'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [jobs, setJobs] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const p = await api.getProduct(id)
        setProduct(p)
        const j = await api.listAnalysisJobs({ productId: id, pageNum: 1, pageSize: 5 })
        const jobList = j?.records || j || []
        setJobs(jobList)
        // 取最近一个 SUCCESS 任务的结果
        const ok = jobList.find((x) => x.status === 'SUCCESS')
        if (ok) {
          const r = await api.getAnalysisResult(ok.id)
          setResult(r)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

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
      <Space>
        <Button onClick={() => navigate(-1)}>← 返回</Button>
        <Title level={3} style={{ margin: 0 }}>{product.productName}</Title>
        <Tag color="blue">{product.asin}</Tag>
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
    </Space>
  )
}