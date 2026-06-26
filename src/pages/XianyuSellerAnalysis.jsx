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
  UserOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const STATUS_META = {
  PENDING:  { label: '等待中', color: 'default' },
  RUNNING:  { label: '分析中', color: 'processing' },
  SUCCESS:  { label: '已生成', color: 'green' },
  FAILED:   { label: '失败',   color: 'red' },
}

const LEVEL_META = {
  HIGH:   { label: '高信任', color: 'green' },
  MEDIUM: { label: '中信任', color: 'orange' },
  LOW:    { label: '低信任', color: 'red' },
}

const CREDIT_META = {
  EXCELLENT: { label: '极好', color: 'green' },
  GOOD:      { label: '良好', color: 'blue' },
  NORMAL:    { label: '一般', color: 'default' },
  BAD:       { label: '较差', color: 'red' },
}

const SELLER_TYPE_META = {
  C2C: { label: '个人卖家', color: 'blue' },
  B2C: { label: '企业卖家', color: 'green' },
}

const DIM_LABELS = {
  credit:  '信用',
  deals:   '历史成交',
  rate:    '好评率',
  active:  '活跃度',
}

function scoreColor(score) {
  if (score == null) return '#999'
  if (score >= 80) return '#52c41a'
  if (score >= 50) return '#faad14'
  return '#ff4d4f'
}

function dimColor(score) {
  if (score == null) return '#999'
  if (score >= 22) return '#52c41a'
  if (score >= 12) return '#faad14'
  return '#ff4d4f'
}

function parseJson(s, fallback = null) {
  if (!s) return fallback
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch { return fallback }
}

function parseJsonArray(s) {
  if (Array.isArray(s)) return s
  if (!s || typeof s !== 'string') return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export default function XianyuSellerAnalysis() {
  const [form] = Form.useForm()
  const [analyzing, setAnalyzing] = useState(false)
  const [latest, setLatest] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [status, setStatus] = useState()

  const loadList = async () => {
    setLoading(true)
    try {
      const r = await api.pageXianyuSellerAnalysis({ status: status || undefined, page, size })
      setList(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [page, size, status])

  const onAnalyze = async () => {
    let v
    try { v = await form.validateFields() } catch { return }
    setAnalyzing(true)
    const hide = message.loading('AI 卖家分析中（约 30~60 秒）...', 0)
    try {
      const r = await api.runXianyuSellerAnalysis({
        sellerId: v.sellerId.trim(),
      })
      setLatest(r)
      if (r.status === 'SUCCESS') {
        message.success(`分析完成：总分 ${r.totalScore ?? '-'}（${LEVEL_META[r.trustLevel]?.label || r.trustLevel}）`)
      } else if (r.status === 'FAILED') {
        message.warning('分析失败：' + (r.errorMessage || '未知错误'))
      } else {
        message.info(`状态：${r.status}`)
      }
      setPage(1)
      loadList()
    } catch (e) { /* */ }
    finally { hide(); setAnalyzing(false) }
  }

  const onView = async (row) => {
    try {
      const r = await api.getXianyuSellerAnalysis(row.id)
      setDetail(r)
      setDetailOpen(true)
    } catch (e) { /* */ }
  }

  const onDelete = async (id) => {
    try {
      await api.deleteXianyuSellerAnalysis(id)
      message.success('已删除')
      loadList()
      if (detail?.id === id) { setDetail(null); setDetailOpen(false) }
      if (latest?.id === id) setLatest(null)
    } catch (e) { /* */ }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>
        <UserOutlined /> 闲鱼卖家分析（V3.0 P1 S-X3）
      </Title>
      <Text type="secondary">
        输入闲鱼 sellerId，AI 会从 crawler 抓取卖家档案（信用/销量/好评率/实名）+ 在售商品 + 历史评论聚合，
        按 4 维规则评分（信用/历史成交/好评率/活跃度，各 25 分，总分 100）+ LLM 兜底输出风险点/亮点/建议。
        <Text type="warning">  注意：v0.1 需在 Nacos 配置 crawler.xianyu.cookies + seller-crawl.enabled 才能真实抓取。</Text>
      </Text>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="分析总数" value={total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="最近状态"
              value={latest ? (STATUS_META[latest.status]?.label || latest.status) : '-'}
              valueStyle={{
                color: latest?.status === 'SUCCESS' ? '#52c41a'
                  : latest?.status === 'FAILED' ? '#ff4d4f' : undefined,
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总分"
              value={latest?.totalScore ?? '-'}
              valueStyle={{ color: latest ? scoreColor(latest.totalScore) : undefined }}
              suffix={latest ? '/ 100' : ''}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="信任等级"
              value={latest ? (LEVEL_META[latest.trustLevel]?.label || latest.trustLevel || '-') : '-'}
              valueStyle={{ color: latest ? scoreColor(latest.totalScore) : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card
            title={<span><ThunderboltOutlined /> 分析参数</span>}
            size="small"
            extra={
              <Button
                size="small"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={analyzing}
                onClick={onAnalyze}
              >
                立即分析
              </Button>
            }
          >
            <Form form={form} layout="vertical">
              <Form.Item
                label="闲鱼 sellerId"
                name="sellerId"
                rules={[{ required: true, message: '请输入 sellerId' }]}
                tooltip="形如 3xxxxxxxxx（纯数字 ID）"
              >
                <Input placeholder="如 3123456789" onPressEnter={onAnalyze} />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 12 }}>
                系统会自动调用 crawler.fetchXianyuSeller → 抓取卖家档案 → 4 维规则评分 → LLM 兜底 → 落库
              </Text>
            </Form>
          </Card>
        </Col>

        <Col span={16}>
          {latest ? (
            <SellerResultCard item={latest} onViewDetail={() => { setDetail(latest); setDetailOpen(true) }} />
          ) : (
            <Card title="分析结果" size="small">
              <Empty description="填写左侧 sellerId 后点击「立即分析」" />
            </Card>
          )}
        </Col>
      </Row>

      <Card
        title={<span><UserOutlined /> 历史分析（{total}）</span>}
        size="small"
        extra={
          <Space>
            <Select
              size="small"
              allowClear
              placeholder="按状态过滤"
              value={status}
              onChange={setStatus}
              options={Object.keys(STATUS_META).map((k) => ({ value: k, label: STATUS_META[k].label }))}
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
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: 'sellerId', dataIndex: 'sellerId', width: 130, ellipsis: true },
            { title: '昵称', dataIndex: 'sellerNickname', width: 120, ellipsis: true },
            {
              title: '信用', dataIndex: 'creditLevel', width: 80,
              render: (v) => v ? <Tag color={CREDIT_META[v]?.color}>{CREDIT_META[v]?.label || v}</Tag> : '-',
            },
            {
              title: '总分', dataIndex: 'totalScore', width: 80,
              render: (v) => v == null ? '-' : <Text strong style={{ color: scoreColor(v) }}>{v}</Text>,
            },
            {
              title: '等级', dataIndex: 'trustLevel', width: 90,
              render: (v) => v ? <Tag color={LEVEL_META[v]?.color}>{LEVEL_META[v]?.label || v}</Tag> : '-',
            },
            {
              title: '状态', dataIndex: 'status', width: 90,
              render: (v) => <Tag color={STATUS_META[v]?.color}>{STATUS_META[v]?.label || v}</Tag>,
            },
            {
              title: '时间', dataIndex: 'createdTime', width: 140,
              render: (v) => v ? dayjs(v).format('MM-DD HH:mm') : '-',
            },
            {
              title: '操作', width: 140, fixed: 'right',
              render: (_, r) => (
                <Space size="small">
                  <Button size="small" icon={<EyeOutlined />} onClick={() => onView(r)}>查看</Button>
                  <Popconfirm title="删除？" onConfirm={() => onDelete(r.id)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={detail ? `闲鱼卖家 #${detail.id} - ${detail.sellerId}` : '详情'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {detail && <SellerResultCard item={detail} inline />}
      </Modal>
    </Space>
  )
}

function SellerResultCard({ item, inline, onViewDetail }) {
  const profile = parseJson(item.profileSnapshot, {}) || {}
  const riskFactors = parseJsonArray(item.riskFactors)
  const highlights = parseJsonArray(item.highlights)
  const llmAdvice = parseJsonArray(item.llmAdvice)

  return (
    <Card
      title={inline ? null : '分析结果'}
      size="small"
      extra={inline ? null : (onViewDetail ? <Button size="small" onClick={onViewDetail}>查看完整</Button> : null)}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Progress
              type="circle"
              percent={item.totalScore || 0}
              strokeColor={scoreColor(item.totalScore)}
              format={(v) => <span style={{ color: scoreColor(v) }}>{v}</span>}
            />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Tag color={LEVEL_META[item.trustLevel]?.color} style={{ fontSize: 14, padding: '4px 10px' }}>
                {LEVEL_META[item.trustLevel]?.label || item.trustLevel || '-'}
              </Tag>
            </div>
          </Col>
          <Col span={16}>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 16 }}>{profile.nickname || item.sellerNickname || '（未获取昵称）'}</Text>
              <Space>
                <Text type="secondary">sellerId:</Text>
                <Text code copyable>{item.sellerId}</Text>
              </Space>
              <Space wrap>
                {profile.creditLevel && (
                  <Tag color={CREDIT_META[profile.creditLevel]?.color}>
                    信用 {CREDIT_META[profile.creditLevel]?.label || profile.creditLevel}
                  </Tag>
                )}
                {profile.sellerType && (
                  <Tag color={SELLER_TYPE_META[profile.sellerType]?.color}>
                    {SELLER_TYPE_META[profile.sellerType]?.label || profile.sellerType}
                  </Tag>
                )}
                {profile.isVerified && <Tag color="green">已实名</Tag>}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.createdTime).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </Space>
          </Col>
        </Row>

        {/* 4 维规则评分 */}
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>4 维规则评分</Text>
          <Row gutter={12}>
            {Object.keys(DIM_LABELS).map((k) => {
              const score = item[k + 'Score']
              return (
                <Col span={6} key={k}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{DIM_LABELS[k]}</Text>
                    <Progress
                      percent={(score || 0) * 4}
                      strokeColor={dimColor(score)}
                      format={() => (
                        <span style={{ color: dimColor(score) }}>{score == null ? '-' : `${score}/25`}</span>
                      )}
                    />
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>

        {/* 卖家档案快照 */}
        {Object.keys(profile).length > 0 && (
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="昵称">{profile.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="信用等级">
              {profile.creditLevel ? <Tag color={CREDIT_META[profile.creditLevel]?.color}>{CREDIT_META[profile.creditLevel]?.label || profile.creditLevel}</Tag> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="卖家类型">
              {profile.sellerType ? <Tag color={SELLER_TYPE_META[profile.sellerType]?.color}>{SELLER_TYPE_META[profile.sellerType]?.label || profile.sellerType}</Tag> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="历史总销量">{profile.totalSold ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="好评率">
              {profile.goodRate != null ? `${(profile.goodRate * 100).toFixed(1)}%` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="在售商品数">{profile.listingCount ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="平均回复时间">
              {profile.responseMinutes != null ? `${profile.responseMinutes} 分钟` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="实名认证">
              {profile.isVerified ? <Tag color="green">是</Tag> : <Tag>否</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="常驻城市">{profile.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="注册时间" span={2}>
              {profile.registerTime ? dayjs(profile.registerTime).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}

        {/* LLM 摘要 */}
        {item.llmSummary && (
          <Card size="small" type="inner" title="AI 综合研判" style={{ background: '#fffbe6', borderColor: '#ffe58f' }}>
            <Paragraph style={{ marginBottom: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {item.llmSummary}
            </Paragraph>
          </Card>
        )}

        {riskFactors.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`风险点（${riskFactors.length}）`}
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {riskFactors.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            }
          />
        )}

        {highlights.length > 0 && (
          <Alert
            type="success"
            showIcon
            message={`亮点（${highlights.length}）`}
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {highlights.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            }
          />
        )}

        {llmAdvice.length > 0 && (
          <Card size="small" type="inner" title={`AI 建议（${llmAdvice.length}）`}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {llmAdvice.map((a, i) => (
                <Tag color="blue" key={i} style={{ whiteSpace: 'normal', height: 'auto', padding: '4px 8px', fontSize: 13 }}>
                  {i + 1}. {a}
                </Tag>
              ))}
            </Space>
          </Card>
        )}

        {item.errorMessage && (
          <Alert type="error" showIcon message="分析错误" description={item.errorMessage} />
        )}
      </Space>
    </Card>
  )
}
