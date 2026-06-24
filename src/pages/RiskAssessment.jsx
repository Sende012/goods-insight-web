import { useEffect, useState } from 'react'
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
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  DeleteOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const LEVEL_META = {
  LOW: { label: '低风险', color: 'green', tag: '推荐进入' },
  MEDIUM: { label: '中风险', color: 'orange', tag: '差异化后进入' },
  HIGH: { label: '高风险', color: 'red', tag: '不建议进入' },
}

const ACTION_META = {
  ENTER_NOW: { label: '推荐进入', color: 'green' },
  DIFFERENTIATE_OR_SKIP: { label: '差异化或换赛道', color: 'orange' },
  AVOID: { label: '不建议进入', color: 'red' },
  WAIT: { label: '继续观察', color: 'blue' },
}

function scoreColor(score) {
  if (score >= 80) return '#52c41a'
  if (score >= 60) return '#faad14'
  return '#ff4d4f'
}

function dimColor(score) {
  if (score >= 22) return '#52c41a'
  if (score >= 12) return '#faad14'
  return '#ff4d4f'
}

const DIM_LABELS = {
  compliance: '合规',
  competition: '竞争',
  profit: '利润',
  patent: '专利',
}

export default function RiskAssessment() {
  const [form] = Form.useForm()
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [assessing, setAssessing] = useState(false)
  const [latest, setLatest] = useState(null)
  const [detail, setDetail] = useState(null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [level, setLevel] = useState()

  const loadList = async () => {
    setLoading(true)
    try {
      const r = await api.pageRiskScores({ level: level || undefined, page, size })
      setList(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [page, size, level])

  const onAssess = async () => {
    try {
      const v = await form.validateFields()
      setAssessing(true)
      const r = await api.assessRisk(v)
      setLatest(r)
      message.success(`风险评估完成：总分 ${r.totalScore}（${LEVEL_META[r.level]?.label || r.level}）`)
      setPage(1)
      loadList()
    } catch (e) { /* ignored */ }
    finally { setAssessing(false) }
  }

  const onDelete = async (id) => {
    try {
      await api.softDeleteRiskScore(id)
      message.success('已删除')
      loadList()
      if (detail && detail.id === id) setDetail(null)
      if (latest && latest.id === id) setLatest(null)
    } catch (e) { /* ignored */ }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>风险评估（场景 S3）</Title>
      <Text type="secondary">
        四维评分（合规 / 竞争 / 利润 / 专利，各 25 分，总分 100）→ AI 综合判定给出建议。
        当前 v0.1 专利库未接入，专利维度固定中等分（15）+ 警告，强烈建议人工核查 USPTO / Google Patents。
      </Text>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="评估总数"
              value={total}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="最近总分"
              value={latest?.totalScore ?? '-'}
              valueStyle={{ color: latest ? scoreColor(latest.totalScore) : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="最近等级"
              value={latest ? LEVEL_META[latest.level]?.label || latest.level : '-'}
              valueStyle={{ color: latest ? scoreColor(latest.totalScore) : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="AI 建议"
              value={latest ? (ACTION_META[parseWarnings(latest.warnings)?.llm?.action]?.label || '查看详情') : '-'}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={10}>
          <Card
            title={<span><ThunderboltOutlined /> 评估参数</span>}
            size="small"
            extra={
              <Button
                size="small"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={assessing}
                onClick={onAssess}
              >
                立即评估
              </Button>
            }
          >
            <Form form={form} layout="vertical" initialValues={{ referralFeePct: 15 }}>
              <Form.Item label="ASIN（可选）" name="asin" tooltip="填了会自动从 ASIN 库拉类目">
                <Input placeholder="B0XXXXXX" />
              </Form.Item>
              <Form.Item label="产品名" name="productName">
                <Input placeholder="如 Wireless Earbuds Pro" />
              </Form.Item>
              <Form.Item label="类目名" name="categoryName" tooltip="如 Headphones / 耳机">
                <Input placeholder="如 Headphones" />
              </Form.Item>
              <Form.Item label="售价 ($)" name="sellPrice" rules={[{ required: true, message: '请输入售价' }]}>
                <InputNumber style={{ width: '100%' }} min={0.01} step={0.5} precision={2} />
              </Form.Item>
              <Form.Item label="采购成本 ($)" name="cogs">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} />
              </Form.Item>
              <Form.Item label="FBA 费 ($)" name="fbaFee">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} />
              </Form.Item>
              <Form.Item label="平台佣金率 (%)" name="referralFeePct">
                <InputNumber style={{ width: '100%' }} min={0} max={50} step={0.5} precision={1} />
              </Form.Item>
              <Form.Item label="广告费 ($)" name="adCost">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={14}>
          {latest ? (
            <RiskResultCard item={latest} onViewDetail={() => setDetail(latest)} />
          ) : (
            <Card title="评估结果" size="small">
              <Empty description="填写左侧表单后点击「立即评估」" />
            </Card>
          )}
        </Col>
      </Row>

      <Card
        title={<span><SafetyCertificateOutlined /> 历史评估（{total}）</span>}
        size="small"
        extra={
          <Space>
            <Select
              size="small"
              allowClear
              placeholder="按等级过滤"
              value={level}
              onChange={setLevel}
              options={[
                { value: 'LOW', label: '低风险' },
                { value: 'MEDIUM', label: '中风险' },
                { value: 'HIGH', label: '高风险' },
              ]}
              style={{ width: 120 }}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={loadList} />
          </Space>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={list}
          pagination={{
            current: page, pageSize: size, total,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (p, s) => { setPage(p); setSize(s) },
          }}
          onRow={(r) => ({ onClick: () => setDetail(r) })}
          columns={[
            { title: 'ASIN', dataIndex: 'asin', width: 130, render: (v) => v || '-' },
            { title: '类目', dataIndex: 'category', width: 160, ellipsis: true },
            {
              title: '总分', dataIndex: 'totalScore', width: 90,
              render: (v) => <Text strong style={{ color: scoreColor(v) }}>{v}</Text>,
            },
            {
              title: '等级', dataIndex: 'level', width: 100,
              render: (v) => <Tag color={LEVEL_META[v]?.color}>{LEVEL_META[v]?.label || v}</Tag>,
            },
            {
              title: '建议', width: 130,
              render: (_, r) => {
                const w = parseWarnings(r.warnings)
                const a = w?.llm?.action
                return a ? <Tag color={ACTION_META[a]?.color}>{ACTION_META[a]?.label || a}</Tag> : '-'
              },
            },
            {
              title: '时间', dataIndex: 'createdTime', width: 140,
              render: (v) => dayjs(v).format('MM-DD HH:mm'),
            },
            {
              title: '操作', width: 80,
              render: (_, r) => (
                <Popconfirm title="删除？" onConfirm={() => onDelete(r.id)}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={detail ? `风险评估 #${detail.id}` : '详情'}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {detail && <RiskResultCard item={detail} inline />}
      </Modal>
    </Space>
  )
}

function RiskResultCard({ item, inline, onViewDetail }) {
  const breakdown = parseBreakdown(item.breakdown)
  const warnings = parseWarnings(item.warnings)
  const ruleW = warnings?.ruleWarnings || []
  const llm = warnings?.llm || null
  return (
    <Card
      title={inline ? null : '评估结果'}
      size="small"
      extra={inline ? null : (
        onViewDetail ? <Button size="small" onClick={onViewDetail}>查看完整</Button> : null
      )}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Progress
              type="circle"
              percent={item.totalScore}
              strokeColor={scoreColor(item.totalScore)}
              format={(v) => <span style={{ color: scoreColor(v) }}>{v}</span>}
            />
          </Col>
          <Col span={16}>
            <Space direction="vertical" size={4}>
              <Tag color={LEVEL_META[item.level]?.color} style={{ fontSize: 14, padding: '4px 10px' }}>
                {LEVEL_META[item.level]?.label || item.level}（{LEVEL_META[item.level]?.tag}）
              </Tag>
              <Text type="secondary">ASIN: {item.asin || '（无）'}</Text>
              <Text type="secondary">类目: {item.category || '（未指定）'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.createdTime).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </Space>
          </Col>
        </Row>

        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>四维评分</Text>
          <Row gutter={12}>
            {Object.keys(DIM_LABELS).map((k) => (
              <Col span={6} key={k}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{DIM_LABELS[k]}</Text>
                  <Progress
                    percent={(breakdown?.[k] || 0) * 4}
                    strokeColor={dimColor(breakdown?.[k] || 0)}
                    format={() => <span style={{ color: dimColor(breakdown?.[k] || 0) }}>{breakdown?.[k] || 0}/25</span>}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {llm && (
          <Card size="small" type="inner" title="AI 建议">
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <div>
                <Tag color={ACTION_META[llm.action]?.color || 'default'}>{ACTION_META[llm.action]?.label || llm.action}</Tag>
              </div>
              <Paragraph style={{ marginBottom: 4 }}>{llm.reason || '（无说明）'}</Paragraph>
              {Array.isArray(llm.riskFactors) && llm.riskFactors.length > 0 && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>主要风险：</Text>
                  <div style={{ marginTop: 4 }}>
                    {llm.riskFactors.map((r, i) => <Tag color="red" key={i}>{r}</Tag>)}
                  </div>
                </div>
              )}
              {Array.isArray(llm.suggestions) && llm.suggestions.length > 0 && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>可执行建议：</Text>
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {llm.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </Space>
          </Card>
        )}

        {ruleW.length > 0 && (
          <Alert
            type="info"
            showIcon
            message="规则识别"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {ruleW.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            }
          />
        )}
      </Space>
    </Card>
  )
}

function parseBreakdown(s) {
  if (!s) return {}
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

function parseWarnings(s) {
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
