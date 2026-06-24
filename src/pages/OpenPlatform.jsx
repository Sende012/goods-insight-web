import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  ApiOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const STATUS_TAG = {
  ACTIVE: <Tag color="green">ACTIVE</Tag>,
  REVOKED: <Tag color="red">REVOKED</Tag>,
  EXPIRED: <Tag color="orange">EXPIRED</Tag>,
}

const QUOTA_TAG = {
  OK: <Tag color="green">OK</Tag>,
  NEAR_LIMIT: <Tag color="orange">即将用尽</Tag>,
  EXCEEDED: <Tag color="red">已超额</Tag>,
}

export default function OpenPlatform() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState(undefined)
  const [createOpen, setCreateOpen] = useState(false)
  const [created, setCreated] = useState(null) // {keyId, plainSecret, name}
  const [usageOpen, setUsageOpen] = useState(false)
  const [usage, setUsage] = useState(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.listApiKeys(statusFilter)
      setKeys(Array.isArray(res) ? res : [])
    } catch (e) {
      message.error('加载失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const res = await api.createApiKey({
        name: values.name,
        monthlyQuota: values.monthlyQuota,
        qpsLimit: values.qpsLimit,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      })
      setCreateOpen(false)
      setCreated(res)
      form.resetFields()
      load()
    } catch (e) {
      if (e.errorFields) return
      message.error('创建失败：' + e.message)
    }
  }

  const handleRevoke = async (id) => {
    try {
      await api.revokeApiKey(id)
      message.success('已撤销')
      load()
    } catch (e) {
      message.error('撤销失败：' + e.message)
    }
  }

  const openUsage = async (id) => {
    setUsageOpen(true)
    setUsageLoading(true)
    try {
      const res = await api.getApiKeyUsage(id, 7)
      setUsage(res)
    } catch (e) {
      message.error('加载用量失败：' + e.message)
    } finally {
      setUsageLoading(false)
    }
  }

  // 统计
  const activeCount = keys.filter(k => k.status === 'ACTIVE').length
  const totalUsed = keys.reduce((s, k) => s + (k.monthlyUsed || 0), 0)
  const exceededCount = keys.filter(k => k.quotaStatus === 'EXCEEDED').length
  const totalQuota = keys.reduce((s, k) => s + (k.monthlyQuota || 0), 0)

  return (
    <div>
      <Title level={3}>
        <ApiOutlined /> API 开放平台
      </Title>
      <Paragraph type="secondary">
        管理对外开放 API 的访问凭证。所有开放接口（/open/v1/**）走 HMAC-SHA256 签名 + QPS/月配额限流，
        每次调用写入审计日志。
      </Paragraph>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="活跃 Key" value={activeCount} suffix={`/ ${keys.length}`}
              prefix={<KeyOutlined />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月已用" value={totalUsed} suffix={`/ ${totalQuota}`}
              prefix={<ThunderboltOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="超额 Key" value={exceededCount} suffix="个"
              valueStyle={{ color: exceededCount > 0 ? '#cf1322' : '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总配额" value={totalQuota} suffix="次/月" />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            创建 API Key
          </Button>
          <Select
            allowClear
            placeholder="按状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'REVOKED', label: 'REVOKED' },
              { value: 'EXPIRED', label: 'EXPIRED' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>

        <Table
          rowKey="id"
          dataSource={keys}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: '名称', dataIndex: 'name', key: 'name' },
            {
              title: 'Key ID',
              dataIndex: 'keyId',
              key: 'keyId',
              render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
            },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => STATUS_TAG[v] || v },
            {
              title: '本月用量',
              key: 'quota',
              width: 240,
              render: (_, r) => {
                const used = r.monthlyUsed || 0
                const total = r.monthlyQuota || 1
                const pct = Math.min(100, Math.round((used / total) * 100))
                return (
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Progress percent={pct} size="small" showInfo={false}
                      status={pct >= 100 ? 'exception' : pct >= 80 ? 'active' : 'normal'} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{used} / {r.monthlyQuota} {QUOTA_TAG[r.quotaStatus]}</Text>
                  </Space>
                )
              },
            },
            { title: 'QPS 上限', dataIndex: 'qpsLimit', key: 'qpsLimit', width: 100 },
            {
              title: '过期时间', dataIndex: 'expiresAt', key: 'expiresAt', width: 160,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : <Text type="secondary">永不过期</Text>,
            },
            {
              title: '最后调用', dataIndex: 'lastUsedAt', key: 'lastUsedAt', width: 160,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : <Text type="secondary">未使用</Text>,
            },
            {
              title: '操作', key: 'action', width: 160, fixed: 'right',
              render: (_, r) => (
                <Space>
                  <Tooltip title="查看用量">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => openUsage(r.id)} />
                  </Tooltip>
                  {r.status === 'ACTIVE' && (
                    <Popconfirm title="确定撤销？撤销后无法恢复" onConfirm={() => handleRevoke(r.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* 创建表单 Modal */}
      <Modal
        title="创建 API Key"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ monthlyQuota: 10000, qpsLimit: 10 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例：电商集成 - 订单系统" />
          </Form.Item>
          <Form.Item label="月配额" name="monthlyQuota" tooltip="每月调用次数上限">
            <InputNumber min={1} max={1000000} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="QPS 上限" name="qpsLimit" tooltip="单 key 每秒调用上限">
            <InputNumber min={1} max={1000} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建成功 — 显示完整 secret（仅此一次） */}
      <Modal
        title="API Key 创建成功"
        open={!!created}
        onCancel={() => setCreated(null)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setCreated(null)}>我已保存</Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message="secret 只显示一次！请立即复制保存，关闭后无法再次查看。"
          style={{ marginBottom: 16 }}
        />
        {created && (
          <>
            <Paragraph>
              <Text strong>Key ID：</Text>
              <Text code copyable>{created.keyId}</Text>
            </Paragraph>
            <Paragraph>
              <Text strong>Secret：</Text>
              <Text code copyable style={{ wordBreak: 'break-all' }}>{created.plainSecret}</Text>
            </Paragraph>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              签名算法：HMAC-SHA256(secret, METHOD + "\n" + PATH + "\n" + timestamp + "\n" + sha256(body))
            </Paragraph>
          </>
        )}
      </Modal>

      {/* 用量详情 Drawer */}
      <Drawer
        title="API Key 用量详情"
        open={usageOpen}
        onClose={() => setUsageOpen(false)}
        width={720}
      >
        {usageLoading && <Text>加载中…</Text>}
        {!usageLoading && usage && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space size="large" wrap>
                <Statistic title="Key ID" value={usage.keyId} />
                <Statistic title="月配额" value={usage.monthlyQuota} />
                <Statistic
                  title="本月已用"
                  value={usage.monthlyUsed}
                  valueStyle={{ color: usage.quotaStatus === 'EXCEEDED' ? '#cf1322' : '#3f8600' }}
                />
                {QUOTA_TAG[usage.quotaStatus] || usage.quotaStatus}
              </Space>
            </Card>

            <Title level={5}>最近 7 天每日调用</Title>
            {usage.dailyStats && usage.dailyStats.length > 0 ? (
              <Table
                size="small"
                rowKey="day"
                dataSource={usage.dailyStats}
                pagination={false}
                columns={[
                  { title: '日期', dataIndex: 'day' },
                  { title: '调用数', dataIndex: 'callCount' },
                  { title: '平均耗时', dataIndex: 'avgCostMs', render: (v) => v ? `${Math.round(v)}ms` : '-' },
                  { title: '错误数', dataIndex: 'errorCount' },
                ]}
              />
            ) : <Empty description="无数据" />}

            <Title level={5} style={{ marginTop: 24 }}>状态码分布</Title>
            {usage.statusDistribution && usage.statusDistribution.length > 0 ? (
              <Table
                size="small"
                rowKey="statusCode"
                dataSource={usage.statusDistribution}
                pagination={false}
                columns={[
                  { title: '状态码', dataIndex: 'statusCode', render: (v) => <Tag>{v}</Tag> },
                  { title: '次数', dataIndex: 'count' },
                ]}
              />
            ) : <Empty description="无数据" />}

            <Title level={5} style={{ marginTop: 24 }}>最近 50 条调用日志</Title>
            {usage.recentLogs && usage.recentLogs.length > 0 ? (
              <Table
                size="small"
                rowKey="id"
                dataSource={usage.recentLogs}
                pagination={false}
                scroll={{ x: 600 }}
                columns={[
                  {
                    title: '时间', dataIndex: 'createdTime', width: 140,
                    render: (v) => dayjs(v).format('MM-DD HH:mm:ss'),
                  },
                  { title: '方法', dataIndex: 'method', width: 60 },
                  {
                    title: '端点', dataIndex: 'endpoint', ellipsis: true,
                    render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text>,
                  },
                  {
                    title: '状态', dataIndex: 'statusCode', width: 80,
                    render: (v) => <Tag color={v < 400 ? 'green' : 'red'}>{v}</Tag>,
                  },
                  { title: '耗时', dataIndex: 'costMs', width: 80, render: (v) => `${v}ms` },
                ]}
              />
            ) : <Empty description="无数据" />}
          </>
        )}
      </Drawer>
    </div>
  )
}
