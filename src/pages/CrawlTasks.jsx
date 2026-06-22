import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Modal,
  Descriptions,
  Progress,
  Select,
  InputNumber,
  message,
} from 'antd'
import { ReloadOutlined, DownloadOutlined, RedoOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const statusColor = {
  PENDING: 'gold',
  RUNNING: 'blue',
  SUCCESS: 'green',
  PARTIAL: 'cyan',
  FAILED: 'red',
}

const sourceLabel = { AMAZON: 'Amazon 官方', PLAYWRIGHT: 'Playwright 浏览器' }

export default function CrawlTasks() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState()
  const [productIdFilter, setProductIdFilter] = useState()

  // 详情/状态弹窗
  const [detailTaskId, setDetailTaskId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [polling, setPolling] = useState(false)

  // 触发抓取弹窗
  const [triggerOpen, setTriggerOpen] = useState(false)
  const [triggerProductId, setTriggerProductId] = useState()
  const [marketplace, setMarketplace] = useState('US')
  const [maxPages, setMaxPages] = useState(10)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.listCrawlTasks({
        page,
        size,
        status: statusFilter,
        productId: productIdFilter,
      })
      setData(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, size, statusFilter, productIdFilter])

  // 详情轮询：PENDING/RUNNING 时 3s 自动刷新
  const pollingRef = useRef(false)
  useEffect(() => {
    if (!detailTaskId) return
    let stop = false
    const tick = async () => {
      setDetailLoading(true)
      try {
        const t = await api.getCrawlTask(detailTaskId)
        if (stop) return
        setDetail(t)
        const stillRunning = t && (t.status === 'PENDING' || t.status === 'RUNNING')
        setPolling(stillRunning)
        pollingRef.current = stillRunning
      } finally {
        if (!stop) setDetailLoading(false)
      }
    }
    tick()
    const t = setInterval(() => {
      if (!pollingRef.current) return
      tick()
    }, 3000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [detailTaskId])

  const openDetail = (id) => {
    setDetailTaskId(id)
  }

  const closeDetail = () => {
    setDetailTaskId(null)
    setDetail(null)
    setPolling(false)
    load()
  }

  const onRetry = async (id) => {
    try {
      const ok = await api.retryCrawlTask(id)
      if (ok) message.success('已重置为 PENDING')
      else message.warning('该任务不可重跑（仅 FAILED/PARTIAL 可重置）')
      load()
      if (detailTaskId === id) setDetailTaskId(id) // 重新拉详情
    } catch (e) {
      // 拦截器已提示
    }
  }

  const onImport = async (id) => {
    const hide = message.loading('正在导入到 review 表…', 0)
    try {
      const r = await api.importCrawlTask(id)
      hide()
      Modal.success({
        title: '导入完成',
        content: (
          <Space direction="vertical">
            <Text>抓取：<Text strong>{r.fetchedCount}</Text> 条</Text>
            <Text>入库：<Text strong style={{ color: '#52c41a' }}>{r.successCount}</Text> 条</Text>
            <Text>跳过：<Text strong>{r.skipCount}</Text> 条（重复 review_id）</Text>
            <Text>review_import_job ID：<Text code>{r.reviewImportJobId}</Text></Text>
            {r.analysisJobId && (
              <Text>已自动创建分析任务 ID：<Text code>{r.analysisJobId}</Text></Text>
            )}
          </Space>
        ),
        onOk: () => navigate('/jobs'),
      })
      load()
    } catch (e) {
      hide()
    }
  }

  const onTrigger = async () => {
    if (!triggerProductId) {
      message.warning('请输入 productId')
      return
    }
    try {
      const taskId = await api.submitCrawlTask(triggerProductId, marketplace, maxPages)
      message.success(`已提交 (taskId=${taskId})`)
      setTriggerOpen(false)
      setTriggerProductId(undefined)
      load()
      openDetail(taskId)
    } catch (e) {
      // 拦截器已提示
    }
  }

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>爬虫任务</Title>}
      extra={
        <Space>
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.keys(statusColor).map((s) => ({ label: s, value: s }))}
          />
          <InputNumber
            placeholder="productId"
            style={{ width: 140 }}
            value={productIdFilter}
            onChange={setProductIdFilter}
            min={1}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setTriggerOpen(true)}>
            触发抓取
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="taskId"
        loading={loading}
        dataSource={data}
        pagination={{
          current: page,
          pageSize: size,
          total,
          showSizeChanger: true,
          onChange: (p, s) => { setPage(p); setSize(s) },
        }}
        columns={[
          { title: 'Task ID', dataIndex: 'taskId', width: 90 },
          { title: '产品ID', dataIndex: 'productId', width: 90 },
          { title: '平台', dataIndex: 'platform', width: 80 },
          { title: '站点', dataIndex: 'marketplace', width: 80 },
          { title: 'ASIN', dataIndex: 'asin', width: 130 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (v) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
          },
          {
            title: '数据源',
            dataIndex: 'source',
            width: 130,
            render: (v) => sourceLabel[v] || v || '-',
          },
          { title: '抓取', dataIndex: 'totalFetched', width: 80 },
          { title: '已存', dataIndex: 'totalSaved', width: 80 },
          { title: '页数', dataIndex: 'pagesCrawled', width: 70 },
          {
            title: '开始',
            dataIndex: 'startTime',
            width: 160,
            render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
          },
          {
            title: '操作',
            width: 260,
            fixed: 'right',
            render: (_, r) => (
              <Space size="small">
                <Button size="small" onClick={() => openDetail(r.taskId)}>详情</Button>
                {(r.status === 'FAILED' || r.status === 'PARTIAL') && (
                  <Button size="small" icon={<RedoOutlined />} onClick={() => onRetry(r.taskId)}>
                    重跑
                  </Button>
                )}
                {(r.status === 'SUCCESS' || r.status === 'PARTIAL') && !r.imported && (
                  <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => onImport(r.taskId)}>
                    导入 review
                  </Button>
                )}
                {r.imported && <Tag color="green">已导入</Tag>}
              </Space>
            ),
          },
        ]}
      />

      {/* 详情弹窗 */}
      <Modal
        title={detailTaskId ? `爬虫任务 #${detailTaskId}` : ''}
        open={!!detailTaskId}
        onCancel={closeDetail}
        footer={[
          <Button key="close" onClick={closeDetail}>关闭</Button>,
          detail && (detail.status === 'FAILED' || detail.status === 'PARTIAL') && (
            <Button key="retry" icon={<RedoOutlined />} onClick={() => onRetry(detail.taskId)}>重跑</Button>
          ),
          detail && (detail.status === 'SUCCESS' || detail.status === 'PARTIAL') && !detail.imported && (
            <Button key="import" type="primary" icon={<DownloadOutlined />} onClick={() => onImport(detail.taskId)}>
              导入 review
            </Button>
          ),
        ].filter(Boolean)}
        width={680}
      >
        {detailLoading && !detail && <Text type="secondary">加载中…</Text>}
        {detail && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[detail.status]}>{detail.status}</Tag>
                {(detail.status === 'PENDING' || detail.status === 'RUNNING') && (
                  <Tag color="processing" style={{ marginLeft: 8 }}>实时刷新中</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="数据源">{sourceLabel[detail.source] || detail.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="产品ID">{detail.productId}</Descriptions.Item>
              <Descriptions.Item label="平台/站点">{detail.platform} / {detail.marketplace}</Descriptions.Item>
              <Descriptions.Item label="ASIN">{detail.asin}</Descriptions.Item>
              <Descriptions.Item label="已抓取">{detail.totalFetched ?? 0}</Descriptions.Item>
              <Descriptions.Item label="已落库">{detail.totalSaved ?? 0}</Descriptions.Item>
              <Descriptions.Item label="页数">{detail.pagesCrawled ?? 0}</Descriptions.Item>
              <Descriptions.Item label="开始时间" span={2}>
                {detail.startTime ? dayjs(detail.startTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="结束时间" span={2}>
                {detail.finishTime ? dayjs(detail.finishTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              {detail.errorMessage && (
                <Descriptions.Item label="错误信息" span={2}>
                  <Text type="danger">{detail.errorMessage}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
            <Progress
              percent={
                detail.status === 'SUCCESS' ? 100
                : detail.status === 'FAILED' ? 0
                : Math.min(99, Math.round(((detail.pagesCrawled || 0) / Math.max(1, maxPages)) * 100))
              }
              status={
                detail.status === 'SUCCESS' ? 'success'
                : detail.status === 'FAILED' ? 'exception'
                : 'active'
              }
              showInfo
            />
          </Space>
        )}
      </Modal>

      {/* 触发抓取弹窗 */}
      <Modal
        title="触发抓取"
        open={triggerOpen}
        onCancel={() => setTriggerOpen(false)}
        onOk={onTrigger}
        okText="提交"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text>商品 ID（productId）</Text>
            <InputNumber
              style={{ width: '100%' }}
              value={triggerProductId}
              onChange={setTriggerProductId}
              placeholder="必填，已存在的商品 ID"
              min={1}
            />
          </div>
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
    </Card>
  )
}