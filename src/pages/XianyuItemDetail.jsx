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
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ShopOutlined,
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

const CONDITION_META = {
  BRAND_NEW:  { label: '全新',   color: 'green' },
  LIKE_NEW:   { label: '99新',   color: 'cyan' },
  EXCELLENT:  { label: '95新',   color: 'blue' },
  GOOD:       { label: '9成新',  color: 'geekblue' },
  FAIR:       { label: '7-8成新', color: 'orange' },
  POOR:       { label: '5成及以下', color: 'red' },
}

function scoreColor(score) {
  if (score == null) return '#999'
  if (score >= 80) return '#52c41a'
  if (score >= 50) return '#faad14'
  return '#ff4d4f'
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

export default function XianyuItemDetail() {
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
      const r = await api.pageXianyuItemDetail({ status: status || undefined, page, size })
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
    const hide = message.loading('AI 详情分析中（约 30~60 秒）...', 0)
    try {
      const r = await api.runXianyuItemDetail({
        itemId: v.itemId.trim(),
        includeRaw: v.includeRaw || false,
      })
      setLatest(r)
      if (r.status === 'SUCCESS') {
        message.success(`分析完成：信任分 ${r.trustScore ?? '-'}（${LEVEL_META[r.trustLevel]?.label || r.trustLevel}）`)
      } else if (r.status === 'FAILED') {
        message.warning('分析失败：' + (r.errorMessage || '未知错误'))
      } else {
        message.info(`状态：${r.status}`)
      }
      setPage(1)
      loadList()
    } catch (e) { /* axios 拦截器已提示 */ }
    finally { hide(); setAnalyzing(false) }
  }

  const onView = async (row) => {
    try {
      const r = await api.getXianyuItemDetail(row.id)
      setDetail(r)
      setDetailOpen(true)
    } catch (e) { /* */ }
  }

  const onDelete = async (id) => {
    try {
      await api.deleteXianyuItemDetail(id)
      message.success('已删除')
      loadList()
      if (detail?.id === id) { setDetail(null); setDetailOpen(false) }
      if (latest?.id === id) setLatest(null)
    } catch (e) { /* */ }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>
        <ShopOutlined /> 闲鱼商品详情分析（V3.0 P1 S-X2）
      </Title>
      <Text type="secondary">
        输入闲鱼 itemId，AI 会从 crawler 抓取商品详情 + 卖家档案 + 历史评论聚合，输出 0~100 信任分 + 4 维评分 + 风险点 + 亮点 + 给买家建议。
        <Text type="warning">  注意：v0.1 需在 Nacos 配置 crawler.xianyu.cookies 才能真实抓取，否则返回空详情（FAILED）。</Text>
      </Text>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="分析总数" value={total} prefix={<ShopOutlined />} />
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
              title="信任分"
              value={latest?.trustScore ?? '-'}
              valueStyle={{ color: latest ? scoreColor(latest.trustScore) : undefined }}
              suffix={latest ? '/ 100' : ''}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="信任等级"
              value={latest ? (LEVEL_META[latest.trustLevel]?.label || latest.trustLevel || '-') : '-'}
              valueStyle={{ color: latest ? scoreColor(latest.trustScore) : undefined }}
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
            <Form form={form} layout="vertical" initialValues={{ includeRaw: false }}>
              <Form.Item
                label="闲鱼 itemId"
                name="itemId"
                rules={[{ required: true, message: '请输入 itemId' }]}
                tooltip="形如 7xxxxxxxxx（纯数字 ID）"
              >
                <Input placeholder="如 789012345678" onPressEnter={onAnalyze} />
              </Form.Item>
              <Form.Item label="包含 raw 元数据" name="includeRaw" tooltip="是否在响应中带 rawMeta 完整快照">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={16}>
          {latest ? (
            <DetailResultCard item={latest} onViewDetail={() => { setDetail(latest); setDetailOpen(true) }} />
          ) : (
            <Card title="分析结果" size="small">
              <Empty description="填写左侧 itemId 后点击「立即分析」" />
            </Card>
          )}
        </Col>
      </Row>

      <Card
        title={<span><ShopOutlined /> 历史分析（{total}）</span>}
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
            { title: 'itemId', dataIndex: 'itemId', width: 130, ellipsis: true },
            { title: '标题', dataIndex: 'title', ellipsis: true, width: 200 },
            { title: '价格', dataIndex: 'price', width: 80, render: (v) => v ? `¥${v}` : '-' },
            {
              title: '成色', dataIndex: 'conditionLevel', width: 90,
              render: (v) => v ? <Tag color={CONDITION_META[v]?.color}>{CONDITION_META[v]?.label || v}</Tag> : '-',
            },
            {
              title: '信任分', dataIndex: 'trustScore', width: 80,
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
        title={detail ? `闲鱼详情 #${detail.id} - ${detail.itemId}` : '详情'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {detail && <DetailResultCard item={detail} inline />}
      </Modal>
    </Space>
  )
}

function DetailResultCard({ item, inline, onViewDetail }) {
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
              percent={item.trustScore || 0}
              strokeColor={scoreColor(item.trustScore)}
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
              <Text strong style={{ fontSize: 16 }}>{item.title || '（无标题）'}</Text>
              <Space>
                <Text type="secondary">itemId:</Text>
                <Text code copyable>{item.itemId}</Text>
              </Space>
              <Space>
                <Text type="secondary">价格：</Text>
                {item.price ? <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>¥{item.price}</Text> : '-'}
                {item.originalPrice && <Text type="secondary" delete>¥{item.originalPrice}</Text>}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.createdTime).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </Space>
          </Col>
        </Row>

        <Descriptions size="small" column={3} bordered>
          <Descriptions.Item label="成色">
            {item.conditionLevel
              ? <Tag color={CONDITION_META[item.conditionLevel]?.color}>{CONDITION_META[item.conditionLevel]?.label || item.conditionLevel}</Tag>
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="类目路径" span={2}>{item.categoryPath || '-'}</Descriptions.Item>
          <Descriptions.Item label="位置">{item.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="浏览/想要/收藏">
            {item.viewCount ?? 0} / {item.wantCount ?? 0} / {item.favoriteCount ?? 0}
          </Descriptions.Item>
          <Descriptions.Item label="Google Taxonomy">
            {item.commonCategoryId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="卖家 ID">{item.sellerId || '-'}</Descriptions.Item>
          <Descriptions.Item label="卖家昵称">{item.sellerNickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="卖家信用">
            {item.sellerCredit || '-'}
          </Descriptions.Item>
        </Descriptions>

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
          <Card size="small" type="inner" title={`给买家建议（${llmAdvice.length}）`}>
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
