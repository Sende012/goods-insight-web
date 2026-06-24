import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
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
  CompassOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const STATUS_META = {
  PENDING:  { label: '等待中',   color: 'default' },
  RUNNING:  { label: '扫描中',   color: 'processing' },
  SUCCESS:  { label: '已完成',   color: 'green' },
  FAILED:   { label: '失败',     color: 'red' },
}

const MARKET_META = {
  GROWING:   { label: '上升期', color: 'green' },
  PEAK:      { label: '成熟期', color: 'blue' },
  DECLINING: { label: '下行期', color: 'red' },
}

const COMP_META = {
  LOW:    { label: '低', color: 'green' },
  MEDIUM: { label: '中', color: 'orange' },
  HIGH:   { label: '高', color: 'red' },
}

const DIFF_META = {
  LOW:    { label: '低', color: 'green' },
  MEDIUM: { label: '中', color: 'orange' },
  HIGH:   { label: '高', color: 'red' },
}

const PRESETS = ['Headphones', 'Pet Carrier', 'Yoga Mat', 'Coffee Mug', 'Phone Stand', 'Lunch Box']

function diffColor(score) {
  if (score == null) return '#999'
  if (score >= 70) return '#ff4d4f'
  if (score >= 40) return '#faad14'
  return '#52c41a'
}

function parseJson(s) {
  if (!s) return null
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch { return null }
}

export default function CategoryScan() {
  const [category, setCategory] = useState('')
  const [marketplace, setMarketplace] = useState('US')
  const [limit, setLimit] = useState(100)
  const [scanning, setScanning] = useState(false)
  const [latest, setLatest] = useState(null)
  const [detail, setDetail] = useState(null)

  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [status, setStatus] = useState()

  const loadList = async () => {
    setLoading(true)
    try {
      const r = await api.pageCategoryScan({ status: status || undefined, page, size })
      setList(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [page, size, status])

  const onScan = async () => {
    if (!category.trim()) {
      message.warning('请输入类目名或类目 ID')
      return
    }
    setScanning(true)
    try {
      const r = await api.runCategoryScan({
        category: category.trim(),
        marketplace,
        asinLimit: limit,
      })
      setLatest(r)
      message.success(`扫描完成：${r.status === 'SUCCESS' ? '成功' : r.status === 'FAILED' ? '失败（已用规则 fallback）' : r.status}`)
      setPage(1)
      loadList()
    } catch (e) { /* axios 拦截器已提示 */ }
    finally { setScanning(false) }
  }

  const onDelete = async (id) => {
    try {
      await api.deleteCategoryScan(id)
      message.success('已删除')
      loadList()
      if (detail?.id === id) setDetail(null)
      if (latest?.id === id) setLatest(null)
    } catch (e) { /* ignored */ }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>类目扫描（场景 S1）</Title>
      <Text type="secondary">
        输入类目名（如 Headphones）或 Amazon 官方类目 ID，AI 会从 asin_database 拉取 Top 样本（按 BSR 升序），
        统计价格分布 + 评分聚合 + 基线趋势，输出细分机会、3/12 月趋势、AI 综合研判。
      </Text>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="扫描总数" value={total} prefix={<CompassOutlined />} />
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
              title="进入难度分"
              value={latest?.entryDifficultyScore ?? '-'}
              valueStyle={{ color: latest ? diffColor(latest.entryDifficultyScore) : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="细分机会数"
              value={latest?.niches ? (parseJson(latest.niches)?.length || 0) : 0}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card
            title={<span><ThunderboltOutlined /> 扫描参数</span>}
            size="small"
            extra={
              <Button
                size="small"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={scanning}
                onClick={onScan}
              >
                立即扫描
              </Button>
            }
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>类目</Text>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="如 Headphones / 耳机"
                  onPressEnter={onScan}
                />
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>推荐：</Text>
                  <Space wrap size={4} style={{ marginTop: 4 }}>
                    {PRESETS.map((p) => (
                      <Tag key={p} style={{ cursor: 'pointer' }} onClick={() => setCategory(p)}>
                        {p}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>站点</Text>
                <Select
                  value={marketplace}
                  onChange={setMarketplace}
                  options={[
                    { value: 'US', label: 'US' },
                    { value: 'DE', label: 'DE' },
                    { value: 'JP', label: 'JP' },
                    { value: 'UK', label: 'UK' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>样本数（Top N）</Text>
                <InputNumber
                  value={limit}
                  onChange={(v) => setLimit(v || 100)}
                  min={10}
                  max={200}
                  step={10}
                  style={{ width: '100%' }}
                />
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={16}>
          {latest ? (
            <ScanResultPanel item={latest} onViewDetail={() => setDetail(latest)} />
          ) : (
            <Card title="扫描结果" size="small">
              <Empty description="填写左侧表单后点击「立即扫描」" />
            </Card>
          )}
        </Col>
      </Row>

      <Card
        title={<span><CompassOutlined /> 历史扫描（{total}）</span>}
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
          onRow={(r) => ({ onClick: () => setDetail(r) })}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '类目', dataIndex: 'category', width: 160, ellipsis: true },
            { title: '站点', dataIndex: 'marketplace', width: 70 },
            {
              title: '状态', dataIndex: 'status', width: 90,
              render: (v) => <Tag color={STATUS_META[v]?.color}>{STATUS_META[v]?.label || v}</Tag>,
            },
            {
              title: '市场阶段', dataIndex: 'marketStatus', width: 100,
              render: (v) => v ? <Tag color={MARKET_META[v]?.color}>{MARKET_META[v]?.label || v}</Tag> : '-',
            },
            {
              title: '竞争', dataIndex: 'competitionLevel', width: 80,
              render: (v) => v ? <Tag color={COMP_META[v]?.color}>{COMP_META[v]?.label || v}</Tag> : '-',
            },
            {
              title: '难度分', dataIndex: 'entryDifficultyScore', width: 80,
              render: (v) => v == null ? '-' : <Text strong style={{ color: diffColor(v) }}>{v}</Text>,
            },
            {
              title: '样本数', dataIndex: 'asinSampleCount', width: 80,
              render: (v) => v == null ? '-' : v,
            },
            {
              title: '时间', dataIndex: 'createdTime', width: 140,
              render: (v) => dayjs(v).format('MM-DD HH:mm'),
            },
            {
              title: '操作', width: 70,
              render: (_, r) => (
                <Popconfirm title="删除？" onConfirm={(e) => { e.stopPropagation(); onDelete(r.id) }}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={detail ? `类目扫描 #${detail.id} - ${detail.category}` : '详情'}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {detail && <ScanResultPanel item={detail} inline />}
      </Modal>
    </Space>
  )
}

function ScanResultPanel({ item, inline, onViewDetail }) {
  const niches = useMemo(() => parseJson(item.niches) || [], [item.niches])
  const priceDist = useMemo(() => parseJson(item.priceDistribution) || {}, [item.priceDistribution])
  const reviewAgg = useMemo(() => parseJson(item.reviewAggregates) || {}, [item.reviewAggregates])
  const trend3m = useMemo(() => parseJson(item.trend3m), [item.trend3m])
  const trend12m = useMemo(() => parseJson(item.trend12m), [item.trend12m])
  const nextSteps = useMemo(() => parseJson(item.nextSteps) || [], [item.nextSteps])

  return (
    <Card
      title={inline ? null : '扫描结果'}
      size="small"
      extra={inline ? null : (onViewDetail ? <Button size="small" onClick={onViewDetail}>查看完整</Button> : null)}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions size="small" column={4} bordered>
          <Descriptions.Item label="类目">
            {item.category}（{item.marketplace || 'US'}）
          </Descriptions.Item>
          <Descriptions.Item label="样本数">{item.asinSampleCount ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="市场阶段">
            {item.marketStatus
              ? <Tag color={MARKET_META[item.marketStatus]?.color}>{MARKET_META[item.marketStatus]?.label || item.marketStatus}</Tag>
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="竞争">
            {item.competitionLevel
              ? <Tag color={COMP_META[item.competitionLevel]?.color}>{COMP_META[item.competitionLevel]?.label || item.competitionLevel}</Tag>
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="进入难度分" span={2}>
            <Progress
              percent={item.entryDifficultyScore || 0}
              strokeColor={diffColor(item.entryDifficultyScore)}
              format={(v) => <span style={{ color: diffColor(v) }}>{v} / 100</span>}
            />
          </Descriptions.Item>
          <Descriptions.Item label="时间" span={2}>
            {item.createdTime ? dayjs(item.createdTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>

        {/* AI 总结 */}
        {item.aiSummary && (
          <Card size="small" type="inner" title="AI 综合研判">
            <Paragraph style={{ marginBottom: 0 }}>{item.aiSummary}</Paragraph>
          </Card>
        )}

        {/* 细分机会 */}
        {niches.length > 0 && (
          <Card size="small" type="inner" title={`细分机会（${niches.length}）`}>
            <Row gutter={[12, 12]}>
              {niches.map((n, i) => (
                <Col span={12} key={i}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div>
                        <Text strong style={{ fontSize: 14 }}>{n.name}</Text>{' '}
                        {n.difficulty && (
                          <Tag color={DIFF_META[n.difficulty]?.color} style={{ marginLeft: 6 }}>
                            难度 {DIFF_META[n.difficulty]?.label || n.difficulty}
                          </Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>目标用户：{n.targetUser || '-'}</Text>
                      <Text style={{ fontSize: 13 }}>痛点：{n.painPoint || '-'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>机会：{n.reason || '-'}</Text>
                      {n.differentiation && (
                        <Text type="secondary" style={{ fontSize: 12 }}>差异点：{n.differentiation}</Text>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* 价格分布 + 评分聚合 + 趋势 */}
        <Row gutter={12}>
          <Col span={12}>
            <Card size="small" type="inner" title="价格分布">
              {Object.keys(priceDist).length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' },
                    xAxis: { type: 'category', data: Object.keys(priceDist) },
                    yAxis: { type: 'value' },
                    series: [{ type: 'bar', data: Object.values(priceDist), itemStyle: { color: '#1677ff' } }],
                  }}
                  style={{ height: 220 }}
                />
              ) : <Empty />}
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" type="inner" title="评分聚合">
              <Space direction="vertical" size={4}>
                <Text>平均评分：<Text strong>{reviewAgg.avgRating ?? '-'}</Text></Text>
                <Text>总评论数：<Text strong>{(reviewAgg.totalReviews || 0).toLocaleString()}</Text></Text>
                <Text>样本数：<Text strong>{reviewAgg.sampleSize ?? '-'}</Text></Text>
                {(reviewAgg.commonPainPoints || []).length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>共性痛点：</Text>
                    <div style={{ marginTop: 4 }}>
                      {(reviewAgg.commonPainPoints || []).map((p, i) => <Tag color="red" key={i}>{p}</Tag>)}
                    </div>
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Card size="small" type="inner" title="3 个月趋势">
              {trend3m?.dataPoints?.length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' },
                    xAxis: { type: 'category', data: trend3m.dataPoints.map((p) => p.date) },
                    yAxis: { type: 'value' },
                    series: [{ type: 'line', data: trend3m.dataPoints.map((p) => p.value), smooth: true, areaStyle: {} }],
                  }}
                  style={{ height: 200 }}
                />
              ) : <Empty description="无趋势数据" />}
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" type="inner" title="12 个月趋势">
              {trend12m?.dataPoints?.length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' },
                    xAxis: { type: 'category', data: trend12m.dataPoints.map((p) => p.date) },
                    yAxis: { type: 'value' },
                    series: [{ type: 'line', data: trend12m.dataPoints.map((p) => p.value), smooth: true, areaStyle: {} }],
                  }}
                  style={{ height: 200 }}
                />
              ) : <Empty description="无趋势数据" />}
            </Card>
          </Col>
        </Row>

        {nextSteps.length > 0 && (
          <Alert
            type="success"
            showIcon
            message="下一步建议"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {nextSteps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            }
          />
        )}

        {item.errorMessage && (
          <Alert type="error" showIcon message="LLM 错误" description={item.errorMessage} />
        )}
      </Space>
    </Card>
  )
}
