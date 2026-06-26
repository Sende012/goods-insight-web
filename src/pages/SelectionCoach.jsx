import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Collapse,
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
  AimOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const STATUS_META = {
  PENDING:  { label: '等待中', color: 'default' },
  RUNNING:  { label: '生成中', color: 'processing' },
  SUCCESS:  { label: '已生成', color: 'green' },
  FAILED:   { label: '部分失败', color: 'orange' },
}

const ACTION_META = {
  ENTER_NOW:       { label: '立即进入', color: 'green' },
  DIFFERENTIATE:   { label: '差异化', color: 'blue' },
  WAIT:            { label: '继续观望', color: 'orange' },
  AVOID:           { label: '不建议', color: 'red' },
}

const SUB_ENGINE_META = {
  scan:     { title: 'S1 类目扫描', color: '#1890ff' },
  forecast: { title: 'S2 趋势预测', color: '#52c41a' },
  risk:     { title: 'S3 风险评估', color: '#fa8c16' },
  profit:   { title: 'P0 利润估算', color: '#13c2c2' },
  idea:     { title: 'S4 选品创意', color: '#722ed1' },
}

const PRESETS = ['phone case', 'yoga mat', 'pet carrier', 'lunch box', 'water bottle']
const MATERIAL_OPTS = ['silicone', 'TPU', 'ABS', 'stainless steel', 'fabric', 'wood', 'glass']
const PROCESS_OPTS = ['injection molding', 'CNC', 'printing', 'assembly', 'sewing']
const CERT_OPTS = ['FDA', 'CE', 'FCC', 'ROHS', 'CPSIA']
const INTEREST_OPTS = ['phone accessories', 'kitchen', 'outdoor', 'pet', 'baby', 'fitness']

// 平台 / 站点联动：CN 站点禁选国际平台；非 CN 站点禁选国内平台
const PLATFORM_OPTS = [
  { value: 'AMAZON', label: 'Amazon 亚马逊' },
  { value: 'EBAY',   label: 'eBay' },
  { value: 'SHOPIFY', label: 'Shopify' },
  { value: 'XIANYU', label: '闲鱼' },
  { value: 'PDD',    label: '拼多多' },
  { value: 'TAOBAO', label: '淘宝' },
  { value: 'JD',     label: '京东' },
]
const CN_MARKETPLACES = ['CN']
const CN_PLATFORMS = ['XIANYU', 'PDD', 'TAOBAO', 'JD']
const INTL_PLATFORMS = ['AMAZON', 'EBAY', 'SHOPIFY']

function filterMarketplacesByPlatform(platform) {
  // 国际平台 → 不限 CN；但 CN 站点对应国内平台
  if (INTL_PLATFORMS.includes(platform)) {
    return [
      { value: 'US', label: 'US 美国' },
      { value: 'UK', label: 'UK 英国' },
      { value: 'DE', label: 'DE 德国' },
      { value: 'JP', label: 'JP 日本' },
    ]
  }
  // 国内平台 → 仅 CN
  return [{ value: 'CN', label: 'CN 中国' }]
}

function filterPlatformsByMarketplace(marketplace) {
  if (CN_MARKETPLACES.includes(marketplace)) {
    return PLATFORM_OPTS.filter((p) => CN_PLATFORMS.includes(p.value))
  }
  return PLATFORM_OPTS.filter((p) => INTL_PLATFORMS.includes(p.value))
}

function parseJson(s, fallback = null) {
  if (!s) return fallback
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch { return fallback }
}

/** 解包 {"text": "..."} 形式；不是的话原样返回 */
function unwrapText(s) {
  const v = parseJson(s, null)
  if (v && typeof v === 'object' && typeof v.text === 'string') return v.text
  return s || ''
}

function scoreColor(score) {
  if (score == null) return '#999'
  if (score >= 80) return '#52c41a'
  if (score >= 60) return '#1890ff'
  if (score >= 40) return '#faad14'
  return '#ff4d4f'
}

export default function SelectionCoach() {
  const [form] = Form.useForm()
  const platform = Form.useWatch('platform', form) || 'AMAZON'
  const [generating, setGenerating] = useState(false)
  const [latest, setLatest] = useState(null)
  const [detail, setDetail] = useState(null)

  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState()
  const [platformFilter, setPlatformFilter] = useState()
  const [detailOpen, setDetailOpen] = useState(false)

  const loadList = async () => {
    setLoading(true)
    try {
      const r = await api.pageSelectionCoach({
        status: statusFilter || undefined,
        platform: platformFilter || undefined,
        page, size,
      })
      setList(r?.records || [])
      setTotal(r?.total || 0)
    } catch (e) {
      // toast already shown by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [page, size, statusFilter, platformFilter])

  const onGenerate = async () => {
    let v
    try { v = await form.validateFields() } catch { return }
    const body = {
      keyword: v.keyword,
      platform: v.platform || 'AMAZON',
      marketplace: v.marketplace || 'US',
      platformProductId: v.platformProductId || undefined,
      asin: v.asin || undefined,
      sellPrice: v.sellPrice,
      cogs: v.cogs,
      fbaFee: v.fbaFee,
      referralFeePct: v.referralFeePct ?? 15,
      adCost: v.adCost,
      materials: v.materials,
      processes: v.processes,
      certifications: v.certifications,
      interests: v.interests,
      monthlyCapacity: v.monthlyCapacity,
      targetPrice: v.targetPrice,
      existingProducts: v.existingProducts,
      painPoints: v.painPoints,
    }
    setGenerating(true)
    const hide = message.loading('AI 选品教练生成中，预计 1.5~3 分钟（5 个子引擎 + 综合 LLM）...', 0)
    try {
      const r = await api.runSelectionCoach(body)
      setLatest(r)
      message.success('决策报告已生成')
      loadList()
    } catch (e) {
      // toast already shown
    } finally {
      hide()
      setGenerating(false)
    }
  }

  const onView = async (row) => {
    try {
      const r = await api.getSelectionCoach(row.id)
      setDetail(r)
      setDetailOpen(true)
    } catch (e) { /* */ }
  }

  const onDelete = async (row) => {
    try {
      await api.deleteSelectionCoach(row.id)
      message.success('已删除')
      loadList()
    } catch (e) { /* */ }
  }

  return (
    <div>
      <Title level={3}>
        <AimOutlined /> AI 选品教练 · 决策报告
      </Title>
      <Text type="secondary">
        输入类目/关键词 + 价格/工厂能力/兴趣方向，一次跑 5 个决策引擎（类目扫描/趋势/风险/利润/创意）+ 综合 LLM 合成，
        输出 0~100 终判分 + 5 维雷达 + 最终建议。预计 1.5~3 分钟。
      </Text>

      <Card title="报告参数" style={{ marginTop: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ platform: 'AMAZON', marketplace: 'US', referralFeePct: 15 }}
          onValuesChange={(changed, all) => {
            // 平台 ↔ 站点联动
            if ('platform' in changed) {
              const allowed = filterMarketplacesByPlatform(changed.platform)
              form.setFieldsValue({ marketplace: allowed[0]?.value })
            }
            if ('marketplace' in changed) {
              const allowed = filterPlatformsByMarketplace(changed.marketplace)
              const cur = form.getFieldValue('platform')
              if (!allowed.find((p) => p.value === cur)) {
                form.setFieldsValue({ platform: allowed[0]?.value })
              }
            }
          }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                label="关键词 / 类目"
                name="keyword"
                rules={[{ required: true, message: '请输入关键词或类目' }]}
              >
                <Select
                  showSearch
                  allowClear
                  mode="combobox"
                  placeholder="如 phone case / yoga mat"
                  options={PRESETS.map((p) => ({ value: p }))}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="平台" name="platform" tooltip="选平台后自动联动站点">
                <Select options={PLATFORM_OPTS} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item label="站点" name="marketplace" tooltip="受平台限制">
                <Select options={filterMarketplacesByPlatform(platform)} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="平台商品 ID（选填）" name="platformProductId" tooltip="AMAZON→ASIN / XIANYU→itemId / TAOBAO→itemId / PDD→goodsId / JD→sku">
                <Input placeholder="如 B0C5XYZ123 / 789012345678" allowClear />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="目标售价区间（选填）" name="targetPrice">
                <Input placeholder="如 $25~35" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={4}>
              <Form.Item label="售价" name="sellPrice">
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="采购成本" name="cogs">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="FBA 费" name="fbaFee">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="佣金率 %" name="referralFeePct">
                <InputNumber min={0} max={50} step={0.5} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="广告成本" name="adCost">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="月产能" name="monthlyCapacity">
                <InputNumber min={0} step={100} style={{ width: '100%' }} placeholder="如 5000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="工厂材料（多选）" name="materials">
                <Select mode="multiple" allowClear options={MATERIAL_OPTS.map((v) => ({ value: v }))} placeholder="如 silicone / TPU" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="工厂工艺（多选）" name="processes">
                <Select mode="multiple" allowClear options={PROCESS_OPTS.map((v) => ({ value: v }))} placeholder="如 injection molding" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="已有认证（多选）" name="certifications">
                <Select mode="multiple" allowClear options={CERT_OPTS.map((v) => ({ value: v }))} placeholder="如 FDA / CE" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="兴趣方向（多选）" name="interests">
                <Select mode="multiple" allowClear options={INTEREST_OPTS.map((v) => ({ value: v }))} placeholder="如 phone accessories" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="现有产品（选填）" name="existingProducts">
                <Input placeholder="如 普通塑料收纳盒 / 不锈钢保温杯" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="痛点描述（选填）" name="painPoints">
            <Input.TextArea rows={2} placeholder="如 评论里 1 星提到'硅胶易发黄'" allowClear />
          </Form.Item>

          <Space>
            <Button
              type="primary"
              size="large"
              icon={<ThunderboltOutlined />}
              loading={generating}
              onClick={onGenerate}
            >
              生成决策报告
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => form.resetFields()}
            >
              重置
            </Button>
            <Text type="secondary">必填：关键词</Text>
          </Space>
        </Form>
      </Card>

      {/* 最新结果展示 */}
      {latest && <ReportView report={latest} title="最新报告" />}

      {/* 历史记录表 */}
      <Card
        title="历史报告"
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Select
              allowClear
              placeholder="平台筛选"
              style={{ width: 120 }}
              value={platformFilter}
              onChange={setPlatformFilter}
              options={PLATFORM_OPTS}
            />
            <Select
              allowClear
              placeholder="状态筛选"
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'SUCCESS', label: '已生成' },
                { value: 'FAILED', label: '失败' },
                { value: 'RUNNING', label: '生成中' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={loadList}>刷新</Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={list}
          pagination={{
            current: page, pageSize: size, total,
            showSizeChanger: true,
            onChange: (p, s) => { setPage(p); if (s !== size) setSize(s) },
          }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '关键词', dataIndex: 'inputKeyword', width: 140 },
            {
              title: '平台', dataIndex: 'platform', width: 100,
              render: (p) => p ? <Tag color="purple">{p}</Tag> : <Tag>AMAZON</Tag>,
            },
            { title: '站点', dataIndex: 'inputMarketplace', width: 60 },
            {
              title: '状态', dataIndex: 'status', width: 100,
              render: (s) => {
                const m = STATUS_META[s] || { label: s, color: 'default' }
                return <Tag color={m.color}>{m.label}</Tag>
              },
            },
            {
              title: '动作', dataIndex: 'action', width: 100,
              render: (a) => {
                if (!a) return <Text type="secondary">-</Text>
                const m = ACTION_META[a] || { label: a, color: 'default' }
                return <Tag color={m.color}>{m.label}</Tag>
              },
            },
            {
              title: '总分', dataIndex: 'overallScore', width: 80,
              render: (s) => s == null ? '-' : <Tag color={scoreColor(s)} style={{ fontWeight: 600 }}>{s}</Tag>,
            },
            {
              title: '耗时',
              dataIndex: 'durationMs',
              width: 90,
              render: (ms) => ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`,
            },
            {
              title: '生成时间', dataIndex: 'createdTime', width: 170,
              render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-',
            },
            {
              title: '操作', width: 140, fixed: 'right',
              render: (_, row) => (
                <Space size="small">
                  <Button size="small" icon={<EyeOutlined />} onClick={() => onView(row)}>查看</Button>
                  <Popconfirm title="确认删除?" onConfirm={() => onDelete(row)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width="90%"
        style={{ top: 24 }}
        title={`决策报告 #${detail?.id || ''}`}
        destroyOnClose
      >
        {detail && <ReportView report={detail} />}
      </Modal>
    </div>
  )
}

function ReportView({ report, title = '决策报告' }) {
  if (!report) return null

  const radar = parseJson(report.radarDimensions, {}) || {}
  const recommendations = parseJson(report.finalRecommendations, []) || []
  const riskFactors = parseJson(report.riskFactors, []) || []
  const actionMeta = ACTION_META[report.action] || { label: report.action, color: 'default' }
  const statusMeta = STATUS_META[report.status] || { label: report.status, color: 'default' }

  const radarOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: '市场机会', max: 100 },
        { name: '趋势',     max: 100 },
        { name: '风险安全', max: 100 },
        { name: '利润',     max: 100 },
        { name: '创意可行性', max: 100 },
      ],
      radius: '65%',
      splitNumber: 4,
      axisName: { color: '#666', fontSize: 13 },
      splitArea: { areaStyle: { color: ['#fafafa', '#fff'] } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          Number(radar.market) || 0,
          Number(radar.trend) || 0,
          Number(radar.risk) || 0,
          Number(radar.profit) || 0,
          Number(radar.idea) || 0,
        ],
        name: '决策报告评分',
        areaStyle: { color: 'rgba(24,144,255,0.25)' },
        lineStyle: { color: '#1890ff', width: 2 },
        itemStyle: { color: '#1890ff' },
      }],
    }],
  }), [radar])

  const subEngines = [
    { key: 'scan',     name: report.scanTaskId ? `task#${report.scanTaskId}` : null, status: report.scanStatus,     summary: unwrapText(report.scanSummary),     error: report.scanError },
    { key: 'forecast', name: report.forecastId ? `forecast#${report.forecastId}` : null, status: report.forecastStatus, summary: unwrapText(report.forecastSummary), error: report.forecastError },
    { key: 'risk',     name: report.riskId ? `risk#${report.riskId}` : null,     status: report.riskStatus,     summary: unwrapText(report.riskSummary),     error: report.riskError },
    { key: 'profit',   name: report.profitId ? `profit#${report.profitId}` : null, status: report.profitStatus,   summary: unwrapText(report.profitSummary),   error: report.profitError },
    { key: 'idea',     name: report.ideaIds ? `${parseJson(report.ideaIds, []).length} 个创意` : null, status: report.ideaStatus, summary: unwrapText(report.ideaSummary), error: report.ideaError },
  ]

  return (
    <Card
      title={title}
      style={{ marginTop: 16 }}
      extra={
        <Space>
          <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
          <Tag color={actionMeta.color}>{actionMeta.label}</Tag>
          {report.durationMs != null && (
            <Text type="secondary">耗时 {(report.durationMs / 1000).toFixed(1)}s</Text>
          )}
        </Space>
      }
    >
      {/* Stat 行：总分 + 5 维数字 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Progress
              type="circle"
              percent={Math.min(100, report.overallScore || 0)}
              strokeColor={scoreColor(report.overallScore)}
              format={(p) => (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 600 }}>{p}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>/ 100</div>
                </div>
              )}
            />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary">总分 · {actionMeta.label}</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Statistic title="市场机会" value={radar.market ?? '-'} valueStyle={{ color: scoreColor(Number(radar.market)) }} />
        </Col>
        <Col span={6}>
          <Statistic title="趋势" value={radar.trend ?? '-'} valueStyle={{ color: scoreColor(Number(radar.trend)) }} />
        </Col>
        <Col span={6}>
          <Statistic title="风险安全（越高越安全）" value={radar.risk ?? '-'} valueStyle={{ color: scoreColor(Number(radar.risk)) }} />
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 12 }}>
        <Col span={6}><Statistic title="利润" value={radar.profit ?? '-'} valueStyle={{ color: scoreColor(Number(radar.profit)) }} /></Col>
        <Col span={6}><Statistic title="创意可行性" value={radar.idea ?? '-'} valueStyle={{ color: scoreColor(Number(radar.idea)) }} /></Col>
        <Col span={6}><Statistic title="综合 LLM 耗时" value={report.llmDurationMs ? `${(report.llmDurationMs / 1000).toFixed(1)}s` : '-'} /></Col>
        <Col span={6}><Statistic title="关键词" value={report.inputKeyword} /></Col>
      </Row>

      {/* 雷达图 + 摘要 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={10}>
          <Card title="5 维雷达" size="small">
            <ReactECharts option={radarOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card title="AI 综合研判" size="small" style={{ background: '#fffbe6', borderColor: '#ffe58f' }}>
            {report.finalSummary ? (
              <Paragraph style={{ marginBottom: 0, fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {report.finalSummary}
              </Paragraph>
            ) : <Empty description="无综合研判" />}
          </Card>
          {report.errorMessage && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message="综合生成说明"
              description={report.errorMessage}
            />
          )}
        </Col>
      </Row>

      {/* 建议 + 风险 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title={`可执行建议（${recommendations.length}）`} size="small">
            {recommendations.length === 0 ? <Empty description="无" /> : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {recommendations.map((r, i) => (
                  <Tag color="blue" key={i} style={{ whiteSpace: 'normal', height: 'auto', padding: '4px 8px', fontSize: 13 }}>
                    {i + 1}. {r}
                  </Tag>
                ))}
              </Space>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={`综合风险点（${riskFactors.length}）`} size="small">
            {riskFactors.length === 0 ? <Empty description="无" /> : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {riskFactors.map((r, i) => (
                  <Tag color="orange" key={i} style={{ whiteSpace: 'normal', height: 'auto', padding: '4px 8px', fontSize: 13 }}>
                    {i + 1}. {r}
                  </Tag>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* 5 个子引擎折叠卡 */}
      <Card title="5 个子引擎结果" size="small" style={{ marginTop: 16 }}>
        <Collapse
          accordion
          items={subEngines.map((e) => {
            const meta = SUB_ENGINE_META[e.key] || { title: e.key, color: '#999' }
            const st = e.status === 'SUCCESS' ? 'success' : e.status === 'FAILED' ? 'exception' : 'normal'
            return {
              key: e.key,
              label: (
                <Space>
                  <Tag color={meta.color}>{meta.title}</Tag>
                  {e.name && <Text type="secondary">{e.name}</Text>}
                  <Tag color={st === 'success' ? 'green' : st === 'exception' ? 'red' : 'default'}>
                    {e.status || 'N/A'}
                  </Tag>
                </Space>
              ),
              children: e.summary ? (
                <pre style={{
                  background: '#fafafa', padding: 12, borderRadius: 4,
                  fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 320, overflow: 'auto',
                }}>{e.summary}</pre>
              ) : <Empty description="无数据" />,
              extra: e.error ? <Tag color="red">error</Tag> : null,
            }
          })}
        />
      </Card>

      {/* 输入快照 */}
      <Card title="输入快照" size="small" style={{ marginTop: 16 }}>
        <Descriptions size="small" column={3} bordered>
          <Descriptions.Item label="关键词">{report.inputKeyword}</Descriptions.Item>
          <Descriptions.Item label="站点">{report.inputMarketplace}</Descriptions.Item>
          <Descriptions.Item label="ASIN">{report.inputAsin || '-'}</Descriptions.Item>
          <Descriptions.Item label="售价">${report.inputSellPrice ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="采购成本">${report.inputCogs ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="FBA 费">${report.inputFbaFee ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="佣金率">{report.inputReferralFeePct ?? 15}%</Descriptions.Item>
          <Descriptions.Item label="广告成本">${report.inputAdCost ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="月产能">{report.inputCapacity ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="材料" span={3}>
            {(parseJson(report.inputMaterials, []) || []).join(', ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="工艺" span={3}>
            {(parseJson(report.inputProcesses, []) || []).join(', ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="认证" span={3}>
            {(parseJson(report.inputCertifications, []) || []).join(', ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="兴趣方向" span={3}>
            {(parseJson(report.inputInterests, []) || []).join(', ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="现有产品" span={3}>{report.inputExistingProducts || '-'}</Descriptions.Item>
          <Descriptions.Item label="痛点" span={3}>{report.inputPainPoints || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </Card>
  )
}