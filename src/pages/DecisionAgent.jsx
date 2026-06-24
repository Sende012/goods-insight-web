import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
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
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const planColor = {
  CATEGORY_FULL: 'geekblue',
  QUICK_SCAN: 'cyan',
  IDEA_PIPELINE: 'purple',
}
const planLabel = {
  CATEGORY_FULL: '完整决策流水线',
  QUICK_SCAN: '快速类目扫描',
  IDEA_PIPELINE: '创意流水线',
}

const statusColor = {
  PENDING: 'default',
  RUNNING: 'processing',
  SUCCESS: 'success',
  PARTIAL: 'warning',
  FAILED: 'error',
  SKIPPED: 'default',
}
const statusLabel = {
  PENDING: '等待中',
  RUNNING: '执行中',
  SUCCESS: '成功',
  PARTIAL: '部分成功',
  FAILED: '失败',
  SKIPPED: '已跳过',
}

const stepStatusIcon = {
  PENDING: <ReloadOutlined spin />,
  RUNNING: <ReloadOutlined spin style={{ color: '#1890ff' }} />,
  SUCCESS: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  SKIPPED: <Tag>跳过</Tag>,
  FAILED: <CloseCircleOutlined style={{ color: '#f5222d' }} />,
}

/** 解析 JSON 字符串字段（前端解析后端透传的 JSON） */
function parseJson(s, fallback) {
  if (!s) return fallback
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch { return fallback }
}

export default function DecisionAgent() {
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)

  const [runs, setRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [runsTotal, setRunsTotal] = useState(0)
  const [runsPage, setRunsPage] = useState(1)
  const [runsSize, setRunsSize] = useState(10)
  const [filterPlan, setFilterPlan] = useState(undefined)
  const [filterStatus, setFilterStatus] = useState(undefined)

  const [runModalOpen, setRunModalOpen] = useState(false)
  const [runForm] = Form.useForm()
  const [running, setRunning] = useState(false)

  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [polling, setPolling] = useState(false)

  const loadPlans = async () => {
    setPlansLoading(true)
    try {
      const r = await api.listAgentPlans()
      setPlans(r || [])
    } finally {
      setPlansLoading(false)
    }
  }

  const loadRuns = async (page = runsPage, size = runsSize, planName = filterPlan, status = filterStatus) => {
    setRunsLoading(true)
    try {
      const r = await api.pageAgentRuns({ page, size, planName, status })
      setRuns(r?.records || [])
      setRunsTotal(r?.total || 0)
    } finally {
      setRunsLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
    loadRuns(1, runsSize, undefined, undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 启动运行
  const onRun = async () => {
    try {
      const v = await runForm.validateFields()
      setRunning(true)
      const id = await api.runAgent({
        planName: v.planName,
        params: {
          category: v.category,
          marketplace: v.marketplace,
          asinLimit: v.asinLimit,
          sellPrice: v.sellPrice,
          asin: v.asin,
          productName: v.productName,
          cogs: v.cogs,
          fbaFee: v.fbaFee,
          referralFeePct: v.referralFeePct,
          adCost: v.adCost,
          interests: v.interests ? v.interests.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          materials: v.materials ? v.materials.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          processes: v.processes ? v.processes.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          ideaCount: v.ideaCount,
        },
      })
      message.success('运行启动成功，正在拉取详情...')
      setRunModalOpen(false)
      runForm.resetFields()
      // 立刻拉详情（同步接口，运行完会直接返回 final）
      onShowDetail(id)
      loadRuns()
    } catch (e) {
      // ignored
    } finally {
      setRunning(false)
    }
  }

  const onShowDetail = async (id) => {
    const r = await api.getAgentRun(id)
    setDetail(r)
    setDetailOpen(true)
    // 如果还在 RUNNING，开启轮询
    if (r?.status === 'RUNNING' || r?.status === 'PENDING') {
      setPolling(true)
      pollDetail(id)
    } else {
      setPolling(false)
    }
  }

  const pollDetail = async (id) => {
    let timer = null
    const tick = async () => {
      try {
        const r = await api.getAgentRun(id)
        setDetail(r)
        if (r?.status === 'RUNNING' || r?.status === 'PENDING') {
          timer = setTimeout(tick, 3000)
        } else {
          setPolling(false)
          loadRuns()
        }
      } catch (e) {
        setPolling(false)
      }
    }
    tick()
  }

  const onDeleteRun = async (id) => {
    const ok = await api.deleteAgentRun(id)
    if (ok) {
      message.success('已删除')
      loadRuns()
    }
  }

  // 选中 plan 时提示所需参数
  const onPlanChange = (planName) => {
    const p = plans.find((x) => x.name === planName)
    if (!p) return
    // CATEGORY_FULL / IDEA_PIPELINE 都需要 category
    if (planName !== 'QUICK_SCAN' && !runForm.getFieldValue('category')) {
      runForm.setFieldsValue({ category: 'wireless earbuds' })
    }
    // CATEGORY_FULL / IDEA_PIPELINE 都需要 sellPrice
    if (planName === 'CATEGORY_FULL' && !runForm.getFieldValue('sellPrice')) {
      runForm.setFieldsValue({ sellPrice: 29.99 })
    }
  }

  const stats = useMemo(() => {
    const total = runs.length
    const success = runs.filter((r) => r.status === 'SUCCESS').length
    const running = runs.filter((r) => r.status === 'RUNNING').length
    const failed = runs.filter((r) => r.status === 'FAILED').length
    return { total, success, running, failed }
  }, [runs])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>
        <RobotOutlined /> 决策代理
      </Title>
      <Text type="secondary">
        V2.0 决策代理框架：把类目扫描 / 风险评分 / 创意生成串成一条流水线。
        选 plan → 填参数 → 同步执行（1~3 分钟）→ 看汇总建议。
      </Text>

      {/* 内置计划卡片 */}
      <Card title="内置决策计划" loading={plansLoading}>
        {plans.length === 0 ? (
          <Empty />
        ) : (
          <Row gutter={16}>
            {plans.map((p) => (
              <Col span={8} key={p.name}>
                <Card
                  size="small"
                  hoverable
                  style={{ borderColor: '#d9d9d9' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Tag color={planColor[p.name] || 'default'}>{planLabel[p.name] || p.name}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{p.description}</Text>
                    <div>
                      <Text strong style={{ fontSize: 12 }}>步骤：</Text>
                      {p.steps.map((s, i) => (
                        <Tag key={i} color="blue" style={{ marginTop: 4 }}>{i + 1}. {s}</Tag>
                      ))}
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* 历史记录 */}
      <Card
        title="运行历史"
        extra={
          <Space>
            <Select
              placeholder="计划"
              allowClear
              style={{ width: 180 }}
              value={filterPlan}
              onChange={(v) => { setFilterPlan(v); loadRuns(1, runsSize, v, filterStatus) }}
              options={plans.map((p) => ({ value: p.name, label: p.label }))}
            />
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 130 }}
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); loadRuns(1, runsSize, filterPlan, v) }}
              options={[
                { value: 'PENDING', label: '等待中' },
                { value: 'RUNNING', label: '执行中' },
                { value: 'SUCCESS', label: '成功' },
                { value: 'PARTIAL', label: '部分成功' },
                { value: 'FAILED', label: '失败' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => loadRuns(runsPage, runsSize, filterPlan, filterStatus)}>
              刷新
            </Button>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setRunModalOpen(true)}>
              启动新运行
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="当前页总数" value={stats.total} suffix="条" /></Card></Col>
          <Col span={6}><Card><Statistic title="成功" value={stats.success} valueStyle={{ color: '#52c41a' }} suffix="条" /></Card></Col>
          <Col span={6}><Card><Statistic title="执行中" value={stats.running} valueStyle={{ color: '#1890ff' }} suffix="条" /></Card></Col>
          <Col span={6}><Card><Statistic title="失败" value={stats.failed} valueStyle={{ color: '#f5222d' }} suffix="条" /></Card></Col>
        </Row>
        <Table
          rowKey="id"
          loading={runsLoading}
          dataSource={runs}
          pagination={{
            current: runsPage,
            pageSize: runsSize,
            total: runsTotal,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, s) => { setRunsPage(p); setRunsSize(s); loadRuns(p, s, filterPlan, filterStatus) },
          }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 70 },
            {
              title: '计划', width: 200,
              render: (_, r) => <Tag color={planColor[r.planName] || 'default'}>{planLabel[r.planName] || r.planName}</Tag>,
            },
            {
              title: '状态', width: 110,
              render: (_, r) => <Tag color={statusColor[r.status]}>{statusLabel[r.status] || r.status}</Tag>,
            },
            {
              title: '进度', width: 160,
              render: (_, r) => (
                <Progress
                  percent={r.totalSteps ? Math.round((r.finishedSteps / r.totalSteps) * 100) : 0}
                  size="small"
                  status={r.status === 'FAILED' ? 'exception' : r.status === 'PARTIAL' ? 'normal' : r.status === 'SUCCESS' ? 'success' : 'active'}
                />
              ),
            },
            { title: '输入摘要', dataIndex: 'inputSummary', ellipsis: true },
            {
              title: '用时', width: 110,
              render: (_, r) => {
                if (!r.startedAt || !r.finishedAt) return '-'
                const ms = dayjs(r.finishedAt).diff(dayjs(r.startedAt), 'second')
                return ms < 60 ? `${ms}秒` : `${Math.floor(ms / 60)}分${ms % 60}秒`
              },
            },
            {
              title: '启动时间', width: 170,
              render: (_, r) => r.createdTime ? dayjs(r.createdTime).format('YYYY-MM-DD HH:mm') : '-',
            },
            {
              title: '操作', width: 160, fixed: 'right',
              render: (_, r) => (
                <Space size={4}>
                  <Button size="small" type="link" onClick={() => onShowDetail(r.id)}>详情</Button>
                  <Popconfirm title="确认删除？" onConfirm={() => onDeleteRun(r.id)} okText="删除" cancelText="取消">
                    <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* 启动 Modal */}
      <Modal
        title="启动决策代理运行"
        open={runModalOpen}
        onCancel={() => setRunModalOpen(false)}
        onOk={onRun}
        okText="启动（同步执行 1~3 分钟）"
        cancelText="取消"
        confirmLoading={running}
        destroyOnClose
        width={720}
      >
        <Alert
          type="info"
          showIcon
          message="同步阻塞调用"
          description="运行将串行执行每个 agent，可能耗时 1~3 分钟（受 LLM 影响）。前端会显示进度。"
          style={{ marginBottom: 16 }}
        />
        <Form form={runForm} layout="vertical" initialValues={{
          planName: 'CATEGORY_FULL',
          marketplace: 'US',
          asinLimit: 100,
          sellPrice: 29.99,
          referralFeePct: 15,
          ideaCount: 5,
        }}>
          <Form.Item label="计划" name="planName" rules={[{ required: true }]}>
            <Select
              options={plans.map((p) => ({ value: p.name, label: p.label }))}
              onChange={onPlanChange}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="类目（必填）" name="category" rules={[{ required: true, message: '请输入类目名' }]}>
                <Input placeholder="wireless earbuds" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="站点" name="marketplace">
                <Select options={[
                  { value: 'US', label: 'US' },
                  { value: 'UK', label: 'UK' },
                  { value: 'DE', label: 'DE' },
                  { value: 'JP', label: 'JP' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="ASIN 数" name="asinLimit">
                <InputNumber style={{ width: '100%' }} min={10} max={200} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="售价 USD（必填）" name="sellPrice" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ASIN（可选）" name="asin">
                <Input placeholder="B08N5WRWNW" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="产品名（可选）" name="productName">
                <Input placeholder="Wireless Earbuds Pro" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}><Form.Item label="COGS" name="cogs"><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item></Col>
            <Col span={6}><Form.Item label="FBA Fee" name="fbaFee"><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item></Col>
            <Col span={6}><Form.Item label="佣金 %" name="referralFeePct"><InputNumber style={{ width: '100%' }} min={0} max={50} /></Form.Item></Col>
            <Col span={6}><Form.Item label="广告成本" name="adCost"><InputNumber style={{ width: '100%' }} min={0} step={0.01} /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="兴趣方向（逗号分隔，可选）" name="interests">
                <Input placeholder="outdoor, sports" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="生成创意数" name="ideaCount">
                <InputNumber style={{ width: '100%' }} min={1} max={5} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="工厂材料（逗号分隔，可选）" name="materials">
            <Input placeholder="ABS, silicone" />
          </Form.Item>
          <Form.Item label="工厂工艺（逗号分隔，可选）" name="processes">
            <Input placeholder="injection molding" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情 Modal */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined />
            决策代理运行详情 #{detail?.id}
            {polling && <Tag color="processing">轮询中</Tag>}
          </Space>
        }
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setPolling(false) }}
        onOk={() => { setDetailOpen(false); setPolling(false) }}
        okText="关闭"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={960}
      >
        {detail ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Card><Statistic title="状态" valueRender={() => <Tag color={statusColor[detail.status]}>{statusLabel[detail.status] || detail.status}</Tag>} /></Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="进度"
                    value={detail.totalSteps ? Math.round((detail.finishedSteps / detail.totalSteps) * 100) : 0}
                    suffix="%"
                  />
                  <Progress
                    percent={detail.totalSteps ? Math.round((detail.finishedSteps / detail.totalSteps) * 100) : 0}
                    size="small"
                    status={detail.status === 'FAILED' ? 'exception' : detail.status === 'PARTIAL' ? 'normal' : detail.status === 'SUCCESS' ? 'success' : 'active'}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="用时"
                    value={detail.startedAt && detail.finishedAt
                      ? `${dayjs(detail.finishedAt).diff(dayjs(detail.startedAt), 'second')}秒`
                      : '-'}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="完成步骤"
                    value={detail.finishedSteps || 0}
                    suffix={`/ ${detail.totalSteps || 0}`}
                  />
                </Card>
              </Col>
            </Row>

            <Card size="small" title="执行步骤">
              <Steps
                direction="vertical"
                size="small"
                current={(detail.steps || []).length}
                items={(detail.steps || []).map((s) => ({
                  title: (
                    <Space>
                      <Text strong>{s.agentLabel || s.agentName}</Text>
                      <Tag color={statusColor[s.status]}>{statusLabel[s.status] || s.status}</Tag>
                      {s.durationMs != null && <Text type="secondary" style={{ fontSize: 12 }}>{s.durationMs}ms</Text>}
                    </Space>
                  ),
                  description: s.outputSummary || s.errorMessage,
                  status: s.status === 'SUCCESS' ? 'finish'
                    : s.status === 'FAILED' ? 'error'
                    : s.status === 'RUNNING' ? 'process'
                    : 'wait',
                  icon: stepStatusIcon[s.status],
                }))}
              />
            </Card>

            {detail.finalRecommendation && (
              <Card size="small" title="综合建议">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {detail.finalRecommendation}
                </Paragraph>
              </Card>
            )}

            {detail.errorMessage && (
              <Alert type="error" showIcon message="运行失败" description={detail.errorMessage} />
            )}

            <Card size="small" title="输入 / 步骤详情">
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="计划">
                  <Tag color={planColor[detail.planName]}>{planLabel[detail.planName] || detail.planName}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="输入摘要">{detail.inputSummary || '-'}</Descriptions.Item>
                <Descriptions.Item label="输入参数">
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 160, overflow: 'auto', fontSize: 12 }}>
                    {detail.inputParams ? JSON.stringify(parseJson(detail.inputParams, {}), null, 2) : '-'}
                  </pre>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {(detail.steps || []).length > 0 && (
              <Card size="small" title="各步输出快照">
                <Tabs
                  size="small"
                  items={(detail.steps || []).map((s) => ({
                    key: String(s.id),
                    label: `${s.agentLabel} (${statusLabel[s.status] || s.status})`,
                    children: s.outputPayload ? (
                      <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 280, overflow: 'auto', fontSize: 12 }}>
                        {JSON.stringify(parseJson(s.outputPayload, {}), null, 2)}
                      </pre>
                    ) : <Empty />,
                  }))}
                />
              </Card>
            )}
          </Space>
        ) : (
          <Empty />
        )}
      </Modal>
    </Space>
  )
}