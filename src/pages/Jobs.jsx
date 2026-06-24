import { useEffect, useRef, useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Progress } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title } = Typography

const statusColor = { PENDING: 'gold', RUNNING: 'blue', SUCCESS: 'green', FAILED: 'red' }

export default function Jobs() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // 让 5s 自动刷新始终读最新的 page/size，不重置到 1
  const paramsRef = useRef({ page: 1, size: 20 })
  paramsRef.current = { page, size }

  const load = async () => {
    setLoading(true)
    try {
      const { page: p, size: s } = paramsRef.current
      const r = await api.listAnalysisJobs({ page: p, size: s })
      setData(r?.records || r || [])
      setTotal(r?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000) // 5s 自动刷新
    return () => clearInterval(t)
  }, [])

  const onRetry = async (id) => {
    await api.triggerAnalysis(id)
    load()
  }

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>分析任务中心</Title>}
      extra={<Button onClick={load}>刷新</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{
          current: page,
          pageSize: size,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, s) => { setPage(p); setSize(s) },
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '产品ID', dataIndex: 'productId', width: 100 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (v) => <Tag color={statusColor[v]}>{v}</Tag>,
          },
          {
            title: '进度',
            width: 200,
            render: (_, r) => {
              if (r.status === 'SUCCESS') return <Progress percent={100} size="small" status="success" />
              if (r.status === 'FAILED') return <Progress percent={0} size="small" status="exception" />
              if (r.status === 'RUNNING') return <Progress percent={50} size="small" status="active" />
              return <Progress percent={0} size="small" />
            },
          },
          { title: '评论数', dataIndex: 'totalReviews', width: 100 },
          { title: '已处理', dataIndex: 'finishedReviews', width: 100 },
          { title: '模型', dataIndex: 'modelName', width: 140 },
          {
            title: '创建时间',
            dataIndex: 'createdTime',
            width: 180,
            render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
          },
          {
            title: '操作',
            width: 160,
            render: (_, r) => (
              <Space>
                {r.status === 'SUCCESS' && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => navigate(`/products/${r.productId}`)}
                  >
                    查看结果
                  </Button>
                )}
                {r.status === 'FAILED' && (
                  <Button size="small" type="link" onClick={() => onRetry(r.id)}>重试</Button>
                )}
                {r.status === 'PENDING' && (
                  <Button size="small" type="link" onClick={() => onRetry(r.id)}>立即执行</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}