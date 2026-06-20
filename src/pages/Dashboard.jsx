import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Tag, Typography, Space, Button, Empty } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, j] = await Promise.all([
        api.listProducts({ pageNum: 1, pageSize: 10 }),
        api.listAnalysisJobs({ pageNum: 1, pageSize: 10 }),
      ])
      setProducts(p?.records || p || [])
      setJobs(j?.records || j || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = {
    total: products.length,
    pending: jobs.filter((x) => x.status === 'PENDING').length,
    running: jobs.filter((x) => x.status === 'RUNNING').length,
    success: jobs.filter((x) => x.status === 'SUCCESS').length,
    failed: jobs.filter((x) => x.status === 'FAILED').length,
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>概览</Title>

      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="产品数" value={stats.total} /></Card></Col>
        <Col span={6}><Card><Statistic title="待分析" value={stats.pending} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="分析中" value={stats.running} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="已完成" value={stats.success} valueStyle={{ color: '#52c41a' }} /></Card></Col>
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