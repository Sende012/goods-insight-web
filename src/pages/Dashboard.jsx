import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Tag, Typography, Space, Button, Empty } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [productsTotal, setProductsTotal] = useState(0)
  const [jobs, setJobs] = useState([])
  const [jobsTotal, setJobsTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, j] = await Promise.all([
        api.listProducts({ page: 1, size: 10 }),
        api.listAnalysisJobs({ page: 1, size: 10 }),
      ])
      setProducts(p?.records || p || [])
      setProductsTotal(p?.total ?? 0)
      setJobs(j?.records || j || [])
      setJobsTotal(j?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = {
    productTotal: productsTotal,
    jobTotal: jobsTotal,
    // 近 10 条任务中的状态分布（精确数请到任务中心看）
    recentPending: jobs.filter((x) => x.status === 'PENDING').length,
    recentRunning: jobs.filter((x) => x.status === 'RUNNING').length,
    recentSuccess: jobs.filter((x) => x.status === 'SUCCESS').length,
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>概览</Title>

      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="产品总数" value={stats.productTotal} /></Card></Col>
        <Col span={6}><Card><Statistic title="任务总数" value={stats.jobTotal} /></Card></Col>
        <Col span={6}><Card><Statistic title="近10条待分析" value={stats.recentPending} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="近10条已完成" value={stats.recentSuccess} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card
        title="近期产品"
        extra={<Button type="primary" onClick={() => navigate('/analysis/new')}>新建分析</Button>}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={products}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无产品，先去新建分析" /> }}
          onRow={(r) => ({ onClick: () => navigate(`/product/${r.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '产品名', dataIndex: 'productName' },
            { title: 'ASIN', dataIndex: 'asin', width: 140 },
            { title: '品牌', dataIndex: 'brand', width: 120 },
            { title: '类目', dataIndex: 'category', width: 120 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (v) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '启用' : '停用'}</Tag>,
            },
            {
              title: '创建时间',
              dataIndex: 'createdTime',
              width: 180,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
            },
          ]}
        />
      </Card>

      <Card title="最近分析任务">
        <Table
          rowKey="id"
          size="small"
          dataSource={jobs}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无任务" /> }}
          columns={[
            { title: '任务ID', dataIndex: 'id', width: 80 },
            { title: '产品ID', dataIndex: 'productId', width: 80 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (v) => {
                const color = { PENDING: 'gold', RUNNING: 'blue', SUCCESS: 'green', FAILED: 'red' }[v] || 'default'
                return <Tag color={color}>{v}</Tag>
              },
            },
            { title: '评论数', dataIndex: 'totalReviews', width: 100 },
            {
              title: '创建时间',
              dataIndex: 'createdTime',
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
            },
          ]}
        />
      </Card>
    </Space>
  )
}