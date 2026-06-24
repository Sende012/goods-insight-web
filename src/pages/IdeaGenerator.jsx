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
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  BulbOutlined,
  DeleteOutlined,
  FireOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const MATERIAL_OPTIONS = [
  'ABS', 'PP', 'PE', 'PVC', 'PC', 'PA66', '硅胶', '不锈钢', '铝合金', '玻璃', '竹木', '棉麻',
]
const PROCESS_OPTIONS = [
  '注塑', '吹塑', '吸塑', '冲压', 'CNC', '喷涂', '丝印', '组装', '包装', '激光焊接',
]
const CERT_OPTIONS = [
  'FDA', 'CE', 'FCC', 'RoHS', 'CPSIA', 'UL', 'ETL', 'BPA-Free', 'ISO9001',
]
const INTEREST_OPTIONS = [
  '家居厨房', '3C 电子', '户外露营', '母婴玩具', '美妆个护', '宠物用品',
  '汽车配件', '运动健身', '办公文具', '工具五金',
]
const STATUS_OPTIONS = [
  { value: 'DRAFT', label: '待评估', color: 'default' },
  { value: 'SELECTED', label: '已选中', color: 'green' },
  { value: 'IN_PROGRESS', label: '进行中', color: 'blue' },
  { value: 'REJECTED', label: '已放弃', color: 'red' },
]

const statusMeta = (s) => STATUS_OPTIONS.find((x) => x.value === s) || STATUS_OPTIONS[0]

function feasibilityColor(score) {
  if (score == null) return '#d9d9d9'
  if (score >= 80) return '#52c41a'
  if (score >= 60) return '#faad14'
  return '#ff4d4f'
}

export default function IdeaGenerator() {
  const [capForm] = Form.useForm()
  const [genForm] = Form.useForm()
  const [cap, setCap] = useState(null)
  const [ideas, setIdeas] = useState([])
  const [total, setTotal] = useState(0)
  const [loadingCap, setLoadingCap] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [detail, setDetail] = useState(null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(12)

  const loadCap = async () => {
    setLoadingCap(true)
    try {
      const r = await api.getLatestFactoryCapability()
      setCap(r)
      if (r) {
        capForm.setFieldsValue({
          materials: parseArr(r.materials),
          processes: parseArr(r.processes),
          monthlyCapacity: r.monthlyCapacity,
          targetPrice: r.targetPrice,
          certifications: parseArr(r.certifications),
        })
      }
    } catch (e) { /* ignored */ }
    finally { setLoadingCap(false) }
  }

  const loadIdeas = async () => {
    try {
      const r = await api.pageProductIdeas({ page, size })
      setIdeas(r?.records || [])
      setTotal(r?.total || 0)
    } catch (e) { /* ignored */ }
  }

  useEffect(() => { loadCap() }, [])
  useEffect(() => { loadIdeas() }, [page, size])

  const onSaveCap = async () => {
    try {
      const v = await capForm.validateFields()
      await api.upsertFactoryCapability(v)
      message.success('工厂能力已保存')
      loadCap()
    } catch (e) { /* ignored */ }
  }

  const onGenerate = async () => {
    // 1) 必须先有工厂能力
    let merged
    try {
      const capValues = await capForm.validateFields()
      merged = { ...capValues }
    } catch (e) {
      message.warning('请先填写工厂能力表单')
      return
    }
    const genValues = genForm.getFieldsValue()
    const body = {
      ...merged,
      interests: merged.interests || genValues.interests,
      existingProducts: genValues.existingProducts,
      painPoints: genValues.painPoints,
      ideaCount: genValues.ideaCount || 5,
    }
    setGenerating(true)
    try {
      const r = await api.generateIdeas(body)
      message.success(`已生成 ${r?.length || 0} 个创意`)
      setPage(1)
      loadIdeas()
    } catch (e) {
      // 错误已被 client.js toast
    } finally {
      setGenerating(false)
    }
  }

  const onStatusChange = async (id, status) => {
    try {
      await api.updateProductIdeaStatus(id, status)
      message.success('状态已更新')
      loadIdeas()
      if (detail && detail.id === id) setDetail({ ...detail, status })
    } catch (e) { /* ignored */ }
  }

  const onDelete = async (id) => {
    try {
      await api.softDeleteProductIdea(id)
      message.success('已删除')
      loadIdeas()
      if (detail && detail.id === id) setDetail(null)
    } catch (e) { /* ignored */ }
  }

  const stats = {
    total,
    selected: ideas.filter((i) => i.status === 'SELECTED').length,
    avgFeas: ideas.length
      ? Math.round(ideas.reduce((a, b) => a + (b.feasibilityScore || 0), 0) / ideas.length)
      : 0,
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>AI 选品创意（场景 S4）</Title>
      <Text type="secondary">
        描述你的工厂能力 + 兴趣方向，AI 生成 3~5 个差异化的亚马逊产品概念。
        每个创意包含目标用户、痛点、差异点、价格段、利润估算、可行性评分和关键风险。
      </Text>

      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="总创意数" value={stats.total} prefix={<BulbOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="已选中" value={stats.selected} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="页均可行性" value={stats.avgFeas} suffix="/100" valueStyle={{ color: feasibilityColor(stats.avgFeas) }} /></Card></Col>
        <Col span={6}><Card><Statistic title="工厂能力" value={cap ? '已配置' : '未配置'} valueStyle={{ color: cap ? '#52c41a' : '#faad14' }} /></Card></Col>
      </Row>

      <Row gutter={16}>
        {/* 左侧：工厂能力表单 */}
        <Col span={12}>
          <Card
            title={<span><SaveOutlined /> 工厂能力</span>}
            size="small"
            loading={loadingCap}
            extra={
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSaveCap}>
                保存工厂能力
              </Button>
            }
          >
            <Form form={capForm} layout="vertical">
              <Form.Item label="材料（多选）" name="materials">
                <Select mode="multiple" allowClear options={MATERIAL_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="如 ABS、PP" />
              </Form.Item>
              <Form.Item label="工艺（多选）" name="processes">
                <Select mode="multiple" allowClear options={PROCESS_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="如 注塑、组装" />
              </Form.Item>
              <Form.Item label="月产能（件）" name="monthlyCapacity" rules={[{ required: true, message: '请填写月产能' }]}>
                <InputNumber style={{ width: '100%' }} min={1} step={1000} placeholder="如 50000" />
              </Form.Item>
              <Form.Item label="目标价格段" name="targetPrice" tooltip="如 $15~30">
                <Input placeholder="$15~30" />
              </Form.Item>
              <Form.Item label="已有认证（多选）" name="certifications">
                <Select mode="multiple" allowClear options={CERT_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="如 FDA、CE" />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 右侧：生成参数 + 按钮 */}
        <Col span={12}>
          <Card
            title={<span><ThunderboltOutlined /> 生成参数</span>}
            size="small"
            extra={
              <Button
                size="small"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={generating}
                onClick={onGenerate}
              >
                生成创意
              </Button>
            }
          >
            <Form form={genForm} layout="vertical" initialValues={{ ideaCount: 5 }}>
              <Form.Item label="兴趣方向（多选）" name="interests">
                <Select mode="multiple" allowClear options={INTEREST_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="如 家居厨房、户外露营" />
              </Form.Item>
              <Form.Item label="现有产品（可选）" name="existingProducts" tooltip="工厂目前能做的产品列表">
                <Input.TextArea rows={2} placeholder="如 塑料收纳盒、保鲜盒（避免重复生成同质产品）" />
              </Form.Item>
              <Form.Item label="痛点数据（可选）" name="painPoints" tooltip="v0.1 暂未自动从评论库聚合，手动粘贴差评样本">
                <Input.TextArea rows={3} placeholder="如：1) 收纳盒没有刻度，做饭时量不准；2) ..." />
              </Form.Item>
              <Form.Item label="生成数量" name="ideaCount">
                <Select
                  options={[3, 4, 5].map((v) => ({ value: v, label: `${v} 个` }))}
                  style={{ width: 120 }}
                />
              </Form.Item>
              {generating && <Alert type="info" showIcon message="AI 正在生成创意，通常 15~30 秒..." />}
              {cap == null && (
                <Alert
                  type="warning"
                  showIcon
                  message="尚未配置工厂能力"
                  description="请先在左侧填写并保存工厂能力，再生成创意"
                  style={{ marginTop: 12 }}
                />
              )}
            </Form>
          </Card>
        </Col>
      </Row>

      {/* 创意列表（卡片） */}
      <Card
        title={<span><FireOutlined /> 创意列表（{total}）</span>}
        size="small"
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={loadIdeas} />
        }
      >
        {ideas.length === 0 ? (
          <Empty description="暂无创意，配置工厂能力后点击「生成创意」" />
        ) : (
          <Row gutter={[12, 12]}>
            {ideas.map((it) => (
              <Col key={it.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => setDetail(it)}
                  title={
                    <Space size={4}>
                      <Text strong ellipsis style={{ maxWidth: 180 }}>{it.ideaName}</Text>
                    </Space>
                  }
                  extra={<Tag color={statusMeta(it.status).color}>{statusMeta(it.status).label}</Tag>}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>可行性</Text>
                    <Progress
                      percent={it.feasibilityScore || 0}
                      strokeColor={feasibilityColor(it.feasibilityScore)}
                      size="small"
                    />
                  </div>
                  <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ fontSize: 12, marginBottom: 6, minHeight: 32 }}
                  >
                    {it.differentiation}
                  </Paragraph>
                  <Space wrap size={4}>
                    <Tag color="blue">{it.priceRange}</Tag>
                    {it.estimatedMargin && <Tag color="cyan">{it.estimatedMargin}</Tag>}
                    {it.category && <Tag>{it.category.split('>').slice(-1)[0]?.trim() || it.category}</Tag>}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
        {total > size && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Button
              onClick={() => setSize(size + 12)}
            >加载更多（剩余 {total - ideas.length}）</Button>
          </div>
        )}
      </Card>

      {/* 详情 Modal */}
      <Modal
        title={detail?.ideaName || '创意详情'}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {detail && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="类目" span={2}>{detail.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="目标用户" span={2}>{detail.targetUser || '-'}</Descriptions.Item>
              <Descriptions.Item label="痛点" span={2}>{detail.painPoint || '-'}</Descriptions.Item>
              <Descriptions.Item label="差异点" span={2}>{detail.differentiation || '-'}</Descriptions.Item>
              <Descriptions.Item label="价格段">{detail.priceRange || '-'}</Descriptions.Item>
              <Descriptions.Item label="预估利润率">{detail.estimatedMargin || '-'}</Descriptions.Item>
              <Descriptions.Item label="可行性评分" span={2}>
                <Progress percent={detail.feasibilityScore || 0} strokeColor={feasibilityColor(detail.feasibilityScore)} />
              </Descriptions.Item>
              <Descriptions.Item label="关键风险" span={2}>
                <Space wrap>
                  {(parseArr(detail.keyRisks) || []).map((r, i) => (
                    <Tag color="red" key={i}>{r}</Tag>
                  ))}
                  {!detail.keyRisks || parseArr(detail.keyRisks).length === 0 ? '-' : null}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Select
                  size="small"
                  value={detail.status}
                  options={STATUS_OPTIONS}
                  onChange={(v) => onStatusChange(detail.id, v)}
                  style={{ width: 120 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(detail.createdTime).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>
            <Space>
              <Popconfirm title="确定删除这个创意？" onConfirm={() => onDelete(detail.id)}>
                <Button danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </Space>
          </Space>
        )}
      </Modal>
    </Space>
  )
}

function parseArr(s) {
  if (!s) return []
  if (Array.isArray(s)) return s
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
