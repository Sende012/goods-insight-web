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
  CalculatorOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const levelColor = {
  EXCELLENT: 'green',
  GOOD: 'cyan',
  MARGINAL: 'gold',
  POOR: 'orange',
  LOSS: 'red',
}

const levelLabel = {
  EXCELLENT: '优秀',
  GOOD: '良好',
  MARGINAL: '勉强',
  POOR: '较差',
  LOSS: '亏损',
}

const MARKETPLACE_OPTIONS = [
  { value: 'US', label: 'US 美国' },
  { value: 'UK', label: 'UK 英国' },
  { value: 'DE', label: 'DE 德国' },
  { value: 'FR', label: 'FR 法国' },
  { value: 'JP', label: 'JP 日本' },
  { value: 'IT', label: 'IT 意大利' },
  { value: 'ES', label: 'ES 西班牙' },
]

/** 把后端可能返回的"JSON 字符串字段"安全解析成对象 */
function parseJsonObject(s) {
  if (!s) return null
  if (typeof s === 'object') return s
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export default function ProfitEstimator() {
  const [form] = Form.useForm()

  // 历史列表状态
  const [history, setHistory] = useState([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [historySize, setHistorySize] = useState(10)
  const [asinFilter, setAsinFilter] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)

  // 最新一次估算结果
  const [latest, setLatest] = useState(null) // { record, breakdown }
  const [submitting, setSubmitting] = useState(false)

  // 详情 Modal
  const [detail, setDetail] = useState(null)

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const r = await api.listProfitEstimations({
        page: historyPage,
        size: historySize,
        asin: asinFilter || undefined,
      })
      setHistory(r?.records || [])
      setHistoryTotal(r?.total || 0)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, historySize, asinFilter])

  // 提交估算
  const onSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const record = await api.estimateProfit(values)
      const breakdown = parseJsonObject(record.estimationJson)
      setLatest({ record, breakdown })
      message.success('估算完成')
      // 刷新历史（新的排在最前）
      setHistoryPage(1)
      loadHistory()
    } catch (e) {
      // antd 表单校验失败 / 接口报错，已在拦截器提示
    } finally {
      setSubmitting(false)
    }
  }

  // 重置表单
  const onReset = () => {
    form.resetFields()
    setLatest(null)
  }

  // 删除一条历史
  const onDelete = async (id) => {
    try {
      const ok = await api.deleteProfitEstimation(id)
      if (ok) {
        message.success('已删除')
        loadHistory()
        if (latest?.record?.id === id) setLatest(null)
      } else {
        message.warning('删除失败')
      }
    } catch {
      // ignored
    }
  }

  // 从历史里点详情
  const openDetail = async (id) => {
    try {
      const record = await api.getProfitEstimation(id)
      const breakdown = parseJsonObject(record.estimationJson)
      setDetail({ record, breakdown })
    } catch {
      // ignored
    }
  }

  // 顶部统计：4 张卡片（按当前 history 统计）
  const stats = useMemo(() => {
    const list = history || []
    const totalCount = historyTotal
    const levels = { EXCELLENT: 0, GOOD: 0, MARGINAL: 0, POOR: 0, LOSS: 0 }
    let totalNet = 0
    list.forEach((r) => {
      const b = parseJsonObject(r.estimationJson)
      if (b?.level && levels[b.level] !== undefined) levels[b.level] += 1
      if (b?.netProfit != null) totalNet += Number(b.netProfit) || 0
    })
    return { totalCount, levels, totalNet }
  }, [history, historyTotal])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>利润估算</Title>
      <Text type="secondary">
        公式法 v0.1：填入售价、成本、FBA、佣金率、广告等参数，自动算出净利润、毛利率、等级与告警。
      </Text>

      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="估算总数" value={stats.totalCount} prefix={<CalculatorOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="优秀 + 良好"
              value={stats.levels.EXCELLENT + stats.levels.GOOD}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="亏损数"
              value={stats.levels.LOSS}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="当前页净利润合计"
              value={stats.totalNet}
              precision={2}
              prefix="$"
              valueStyle={{ color: stats.totalNet >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="新建估算" extra={
            <Space>
              <Button onClick={onReset} icon={<ReloadOutlined />}>重置</Button>
              <Button type="primary" onClick={onSubmit} loading={submitting} icon={<CalculatorOutlined />}>
                计算并保存
              </Button>
            </Space>
          }>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                marketplace: 'US',
                referralFeePct: 15,
                cogs: 0,
                fbaFee: 0,
                adCost: 0,
                otherCost: 0,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="ASIN" name="asin" tooltip="关联商品（可空）">
                    <Input placeholder="如 B0XXXXXX" maxLength={20} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="站点" name="marketplace">
                    <Select options={MARKETPLACE_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="产品名" name="productName">
                <Input placeholder="可选，展示用" maxLength={255} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="售价 ($)"
                    name="sellPrice"
                    rules={[{ required: true, message: '请输入售价' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} precision={2} placeholder="29.99" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <span>
                        佣金率 (%)
                        <Tooltip title="Amazon 类目佣金率通常 8-45%，默认 15%">
                          <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                        </Tooltip>
                      </span>
                    }
                    name="referralFeePct"
                    rules={[{ required: true, message: '请输入佣金率' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.5} precision={2} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="采购/生产成本 ($)" name="cogs">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="5.00" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="FBA 履约费 ($)" name="fbaFee">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="4.50" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="广告成本 ($)" name="adCost">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="3.00" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="其他成本 ($)" name="otherCost">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} placeholder="0" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        <Col span={10}>
          <Card title="最新估算结果">
            {!latest ? (
              <Empty description="提交后查看 breakdown" />
            ) : (
              <ResultView breakdown={latest.breakdown} record={latest.record} />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="历史记录"
        extra={
          <Space>
            <Input
              prefix={<SearchOutlined />}
              placeholder="按 ASIN 过滤"
              allowClear
              value={asinFilter}
              onChange={(e) => { setAsinFilter(e.target.value); setHistoryPage(1) }}
              style={{ width: 220 }}
            />
            <Button icon={<ReloadOutlined />} onClick={loadHistory}>刷新</Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={historyLoading}
          dataSource={history}
          pagination={{
            current: historyPage,
            pageSize: historySize,
            total: historyTotal,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, s) => { setHistoryPage(p); setHistorySize(s) },
          }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: 'ASIN', dataIndex: 'asin', width: 130, render: (v) => v || '-' },
            { title: '产品名', dataIndex: 'productName', ellipsis: true, render: (v) => v || '-' },
            {
              title: '等级',
              width: 100,
              render: (_, r) => {
                const b = parseJsonObject(r.estimationJson)
                const lv = b?.level
                return lv ? <Tag color={levelColor[lv] || 'default'}>{levelLabel[lv] || lv}</Tag> : '-'
              },
            },
            {
              title: '净利率',
              width: 100,
              align: 'right',
              render: (_, r) => {
                const b = parseJsonObject(r.estimationJson)
                if (b?.netMarginPct == null) return '-'
                return (
                  <span style={{ color: b.netMarginPct >= 15 ? '#52c41a' : b.netMarginPct < 5 ? '#ff4d4f' : '#faad14' }}>
                    {Number(b.netMarginPct).toFixed(2)}%
                  </span>
                )
              },
            },
            {
              title: '净利润',
              width: 110,
              align: 'right',
              render: (_, r) => {
                const b = parseJsonObject(r.estimationJson)
                if (b?.netProfit == null) return '-'
                return (
                  <span style={{ color: b.netProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    ${Number(b.netProfit).toFixed(2)}
                  </span>
                )
              },
            },
            {
              title: '创建时间',
              dataIndex: 'createdTime',
              width: 170,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
            },
            {
              title: '操作',
              width: 130,
              render: (_, r) => (
                <Space>
                  <Button size="small" type="link" onClick={() => openDetail(r.id)}>详情</Button>
                  <Popconfirm
                    title="确认删除？"
                    description="软删除，可通过 DB 恢复"
                    onConfirm={() => onDelete(r.id)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* 详情 Modal */}
      <Modal
        title={detail ? `估算详情 #${detail.record.id}` : ''}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        width={640}
        destroyOnClose
      >
        {detail && <ResultView breakdown={detail.breakdown} record={detail.record} showInputParams />}
      </Modal>
    </Space>
  )
}

function ResultView({ breakdown, record, showInputParams = false }) {
  if (!breakdown) return <Empty description="无 breakdown 数据" />
  const margin = Number(breakdown.netMarginPct || 0)
  const net = Number(breakdown.netProfit || 0)
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="净利润"
            value={net}
            precision={2}
            prefix="$"
            valueStyle={{ color: net >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 20 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="净利率"
            value={margin}
            precision={2}
            suffix="%"
            valueStyle={{ color: margin >= 15 ? '#52c41a' : margin < 5 ? '#ff4d4f' : '#faad14', fontSize: 20 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="等级"
            valueRender={() => (
              <Tag color={levelColor[breakdown.level] || 'default'} style={{ fontSize: 14, padding: '2px 10px' }}>
                {levelLabel[breakdown.level] || breakdown.level}
              </Tag>
            )}
          />
        </Col>
      </Row>

      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="售价">${num(breakdown.sellPrice)}</Descriptions.Item>
        <Descriptions.Item label="采购成本">${num(breakdown.cogs)}</Descriptions.Item>
        <Descriptions.Item label="FBA 履约费">${num(breakdown.fbaFee)}</Descriptions.Item>
        <Descriptions.Item label="佣金 {num(breakdown.referralFeePct)}%">${num(breakdown.referralFee)}</Descriptions.Item>
        <Descriptions.Item label="广告成本">${num(breakdown.adCost)}</Descriptions.Item>
        <Descriptions.Item label="其他成本">${num(breakdown.otherCost)}</Descriptions.Item>
        <Descriptions.Item label="总成本" span={2}><b>${num(breakdown.totalCost)}</b></Descriptions.Item>
        <Descriptions.Item label="毛利润">${num(breakdown.grossProfit)}</Descriptions.Item>
        <Descriptions.Item label="净利润"><b>${num(breakdown.netProfit)}</b></Descriptions.Item>
      </Descriptions>

      {breakdown.warnings && breakdown.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="告警"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {breakdown.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          }
        />
      )}

      {showInputParams && record?.inputParams && (
        <Card size="small" title="原始输入" style={{ background: '#fafafa' }}>
          <Paragraph copyable={{ text: record.inputParams }} style={{ marginBottom: 0, fontSize: 12 }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{record.inputParams}</pre>
          </Paragraph>
        </Card>
      )}
    </Space>
  )
}

function num(v) {
  if (v == null) return '0.00'
  return Number(v).toFixed(2)
}
