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
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  AlertOutlined,
  AreaChartOutlined,
  BulbOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const phaseColor = {
  STARTING: 'green',
  GROWING: 'cyan',
  MATURE: 'gold',
  DECLINING: 'red',
}
const phaseLabel = {
  STARTING: '起步期',
  GROWING: '增长期',
  MATURE: '成熟期',
  DECLINING: '衰退期',
}

const actionColor = {
  ENTER_NOW: 'green',
  DIFFERENTIATE: 'gold',
  WAIT: 'blue',
  AVOID: 'red',
}
const actionLabel = {
  ENTER_NOW: '立即进入',
  DIFFERENTIATE: '差异化后进入',
  WAIT: '观望',
  AVOID: '不建议进入',
}

const alertTypeColor = {
  GROWTH_SPIKE: 'green',
  DECLINE: 'red',
  NEW_OPPORTUNITY: 'gold',
}
const alertTypeLabel = {
  GROWTH_SPIKE: '增长预警',
  DECLINE: '衰退预警',
  NEW_OPPORTUNITY: '新机会',
}

const DATA_TYPE_OPTIONS = [
  { value: 'SEARCH_VOLUME', label: '搜索量' },
  { value: 'BSR', label: 'BSR 排名（越小越好）' },
  { value: 'REVIEW_COUNT', label: '评论数 / 增速' },
]

const SOURCE_OPTIONS = [
  { value: 'MANUAL', label: '手动录入' },
  { value: 'PA_API', label: 'PA-API' },
  { value: 'THIRD_PARTY', label: '第三方 API' },
  { value: 'CRAWLER', label: '自建爬虫' },
]

/** 安全把 JSON 字符串字段解析为对象/数组 */
function parseJson(s, fallback) {
  if (!s) return fallback
  if (typeof s === 'object') return s
  try {
    return JSON.parse(s)
  } catch {
    return fallback
  }
}

export default function Trend() {
  const [keyword, setKeyword] = useState('wireless earbuds')
  const [dataType, setDataType] = useState('SEARCH_VOLUME')
  const [series, setSeries] = useState([])
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [forecast, setForecast] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)

  const [subs, setSubs] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [subForm] = Form.useForm()

  // 最近预测列表
  const [recent, setRecent] = useState([])
  const [recentLoading, setRecentLoading] = useState(false)

  // 录入趋势数据
  const [upsertForm] = Form.useForm()
  const [upserting, setUpserting] = useState(false)

  // 预警事件列表
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsSize, setEventsSize] = useState(20)
  const [eventsFilterType, setEventsFilterType] = useState(undefined)
  const [eventsFilterAck, setEventsFilterAck] = useState(undefined)
  const [eventDetail, setEventDetail] = useState(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)

  const loadSeries = async (kw, dt) => {
    if (!kw) return
    setSeriesLoading(true)
    try {
      const r = await api.getTrendSeries({ keyword: kw, dataType: dt, lookbackMonths: 12 })
      setSeries(r || [])
    } finally {
      setSeriesLoading(false)
    }
  }

  const loadForecastLatest = async (kw) => {
    if (!kw) return
    try {
      const r = await api.getLatestForecast(kw)
      setForecast(r || null)
    } catch (e) { /* ignored */ }
  }

  const loadSubs = async () => {
    setSubsLoading(true)
    try {
      const r = await api.listAlertSubscriptions()
      setSubs(r || [])
    } finally {
      setSubsLoading(false)
    }
  }

  const loadRecent = async () => {
    setRecentLoading(true)
    try {
      const r = await api.listRecentForecasts(20)
      setRecent(r || [])
    } finally {
      setRecentLoading(false)
    }
  }

  const loadEvents = async (page = eventsPage, size = eventsSize, alertType = eventsFilterType, isAck = eventsFilterAck) => {
    setEventsLoading(true)
    try {
      const r = await api.pageAlertEvents({
        page, size,
        alertType: alertType || undefined,
        isAcknowledged: isAck == null ? undefined : (isAck ? 1 : 0),
      })
      setEvents(r?.records || [])
      setEventsTotal(r?.total || 0)
    } finally {
      setEventsLoading(false)
    }
  }

  const onAckEvent = async (id) => {
    const ok = await api.acknowledgeAlertEvent(id)
    if (ok) {
      message.success('已确认')
      loadEvents()
    }
  }

  const onDeleteEvent = async (id) => {
    const ok = await api.deleteAlertEvent(id)
    if (ok) {
      message.success('已删除')
      loadEvents()
    }
  }

  const onShowEventDetail = async (id) => {
    const r = await api.getAlertEvent(id)
    setEventDetail(r)
    setEventDetailOpen(true)
  }

  // 统计
  const eventStats = useMemo(() => {
    const total = events.length
    const unack = events.filter((e) => e.isAcknowledged !== 1).length
    const critical = events.filter((e) => e.severity === 'CRITICAL').length
    return { total, unack, critical }
  }, [events])

  useEffect(() => {
    if (keyword) {
      loadSeries(keyword, dataType)
      loadForecastLatest(keyword)
    }
    loadSubs()
    loadRecent()
    loadEvents(1, eventsSize, undefined, undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 触发预测
  const onForecast = async () => {
    if (!keyword) {
      message.warning('请输入关键词')
      return
    }
    setForecastLoading(true)
    try {
      const r = await api.forecastTrend({
        keyword,
        dataType,
        lookbackMonths: 12,
        forceRefresh: false,
      })
      setForecast(r)
      message.success('预测完成')
      loadRecent()
    } catch (e) {
      // ignored
    } finally {
      setForecastLoading(false)
    }
  }

  // 录入单条
  const onUpsert = async () => {
    try {
      const v = await upsertForm.validateFields()
      setUpserting(true)
      await api.upsertTrendData({
        ...v,
        dataMonth: v.dataMonth ? dayjs(v.dataMonth).format('YYYY-MM-DD') : null,
      })
      message.success('录入成功')
      upsertForm.resetFields()
      loadSeries(keyword, dataType)
    } catch (e) { /* ignored */ } finally {
      setUpserting(false)
    }
  }

  // 订阅
  const onSubscribe = async () => {
    try {
      const v = await subForm.validateFields()
      await api.createAlertSubscription(v)
      message.success('订阅成功')
      setSubModalOpen(false)
      subForm.resetFields()
      loadSubs()
    } catch (e) { /* ignored */ }
  }

  const onDeleteSub = async (id) => {
    const ok = await api.deleteAlertSubscription(id)
    if (ok) {
      message.success('已删除')
      loadSubs()
    }
  }

  const onToggleSub = async (id, active) => {
    const ok = await api.toggleAlertSubscription(id, active)
    if (ok) {
      loadSubs()
    }
  }

  // ECharts 配置：历史 + 3m 预测（拼接）
  const chartOption = useMemo(() => {
    const months = series.map((s) => s.dataMonth)
    const values = series.map((s) => Number(s.dataValue))
    const rec = parseJson(forecast?.forecast3m, [])
    const forecastMonths = (Array.isArray(rec) ? rec : []).map((p) => p.month)
    const forecastValues = (Array.isArray(rec) ? rec : []).map((p) => Number(p.value))
    const lowArr = (Array.isArray(rec) ? rec : []).map((p) => Number(p.low))
    const highArr = (Array.isArray(rec) ? rec : []).map((p) => Number(p.high))

    // 历史最后一点 + 预测第一个点连起来（避免断裂）
    const lastMonth = months[months.length - 1]
    const lastVal = values[values.length - 1]
    const mergedForecastMonths = lastMonth ? [lastMonth, ...forecastMonths] : forecastMonths
    const mergedForecastValues = lastVal != null ? [lastVal, ...forecastValues] : forecastValues
    const mergedLow = lastVal != null ? [lastVal, ...lowArr] : lowArr
    const mergedHigh = lastVal != null ? [lastVal, ...highArr] : highArr

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['历史', '预测', '上界', '下界'] },
      grid: { left: 50, right: 30, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: [...months, ...forecastMonths.filter((m) => !months.includes(m))] },
      yAxis: { type: 'value', name: dataType === 'BSR' ? 'BSR' : '数值' },
      series: [
        {
          name: '历史',
          type: 'line',
          data: values,
          smooth: true,
          itemStyle: { color: '#1890ff' },
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.15 },
        },
        {
          name: '预测',
          type: 'line',
          data: mergedForecastValues,
          smooth: true,
          itemStyle: { color: '#fa8c16' },
          lineStyle: { width: 2, type: 'dashed' },
        },
        {
          name: '上界',
          type: 'line',
          data: mergedHigh,
          smooth: true,
          itemStyle: { color: '#fa8c16', opacity: 0.3 },
          lineStyle: { opacity: 0.3, type: 'dotted' },
          symbol: 'none',
        },
        {
          name: '下界',
          type: 'line',
          data: mergedLow,
          smooth: true,
          itemStyle: { color: '#fa8c16', opacity: 0.3 },
          lineStyle: { opacity: 0.3, type: 'dotted' },
          symbol: 'none',
        },
      ],
    }
  }, [series, forecast, dataType])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>趋势预警</Title>
      <Text type="secondary">
        趋势库 v0.1：录入搜索量/BSR/评论增速的月度时间序列，AI 给出阶段判定 + 3 个月预测 + 行动建议。可订阅预警。
      </Text>

      {/* 查询区 */}
      <Card>
        <Space wrap>
          <Input
            placeholder="关键词，如 wireless earbuds"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => loadSeries(keyword, dataType)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            value={dataType}
            onChange={(v) => { setDataType(v); loadSeries(keyword, v) }}
            options={DATA_TYPE_OPTIONS}
            style={{ width: 200 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => { loadSeries(keyword, dataType); loadForecastLatest(keyword) }}>
            刷新数据
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={forecastLoading}
            onClick={onForecast}
          >
            触发 AI 预测
          </Button>
        </Space>
      </Card>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="时间序列" extra={series.length > 0 ? <Tag>{series.length} 个数据点</Tag> : null}>
            {series.length === 0 ? (
              <Empty description="trend_data 中无该关键词数据，请先在下方录入" />
            ) : (
              <ReactECharts option={chartOption} style={{ height: 360 }} />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <ForecastPanel forecast={forecast} keyword={keyword} dataType={dataType} />
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="recent"
        items={[
          {
            key: 'recent',
            label: '最近预测',
            icon: <AreaChartOutlined />,
            children: (
              <Card>
                <Table
                  rowKey="id"
                  loading={recentLoading}
                  dataSource={recent}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '关键词', dataIndex: 'keyword' },
                    {
                      title: '阶段', width: 110,
                      render: (_, r) => r.currentPhase ? <Tag color={phaseColor[r.currentPhase] || 'default'}>{phaseLabel[r.currentPhase] || r.currentPhase}</Tag> : '-',
                    },
                    {
                      title: '置信度', width: 100, align: 'right',
                      render: (_, r) => r.confidence != null ? (Number(r.confidence) * 100).toFixed(0) + '%' : '-',
                    },
                    {
                      title: '预测时间', width: 170,
                      render: (_, r) => r.forecastTime ? dayjs(r.forecastTime).format('YYYY-MM-DD HH:mm') : '-',
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'subscriptions',
            label: '预警订阅',
            icon: <AlertOutlined />,
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setSubModalOpen(true)}>
                    新建订阅
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  loading={subsLoading}
                  dataSource={subs}
                  pagination={false}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '关键词', dataIndex: 'keyword' },
                    {
                      title: '类型', width: 130,
                      render: (_, r) => <Tag color={alertTypeColor[r.alertType] || 'default'}>{alertTypeLabel[r.alertType] || r.alertType}</Tag>,
                    },
                    {
                      title: '阈值', width: 110, align: 'right',
                      render: (_, r) => r.threshold != null ? `${r.threshold}%` : '-',
                    },
                    {
                      title: '激活', width: 100,
                      render: (_, r) => (
                        <Switch
                          checked={r.isActive === 1}
                          onChange={(v) => onToggleSub(r.id, v)}
                        />
                      ),
                    },
                    {
                      title: '最后触发', width: 170,
                      render: (_, r) => r.lastTriggered ? dayjs(r.lastTriggered).format('YYYY-MM-DD HH:mm') : '从未',
                    },
                    {
                      title: '操作', width: 130,
                      render: (_, r) => (
                        <Popconfirm title="确认删除？" onConfirm={() => onDeleteSub(r.id)} okText="删除" cancelText="取消">
                          <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'events',
            label: '预警事件',
            icon: <AlertOutlined />,
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card><Statistic title="当前页事件数" value={eventStats.total} suffix="条" /></Card>
                  </Col>
                  <Col span={8}>
                    <Card><Statistic title="未确认" value={eventStats.unack} valueStyle={{ color: '#fa8c16' }} suffix="条" /></Card>
                  </Col>
                  <Col span={8}>
                    <Card><Statistic title="CRITICAL 严重度" value={eventStats.critical} valueStyle={{ color: '#f5222d' }} suffix="条" /></Card>
                  </Col>
                </Row>
                <Card
                  title="预警事件列表"
                  extra={
                    <Space>
                      <Select
                        placeholder="类型"
                        allowClear
                        style={{ width: 160 }}
                        value={eventsFilterType}
                        onChange={(v) => { setEventsFilterType(v); loadEvents(1, eventsSize, v, eventsFilterAck) }}
                        options={[
                          { value: 'GROWTH_SPIKE', label: '增长预警' },
                          { value: 'DECLINE', label: '衰退预警' },
                          { value: 'NEW_OPPORTUNITY', label: '新机会' },
                        ]}
                      />
                      <Select
                        placeholder="确认状态"
                        allowClear
                        style={{ width: 140 }}
                        value={eventsFilterAck}
                        onChange={(v) => { setEventsFilterAck(v); loadEvents(1, eventsSize, eventsFilterType, v) }}
                        options={[
                          { value: false, label: '未确认' },
                          { value: true, label: '已确认' },
                        ]}
                      />
                      <Button icon={<ReloadOutlined />} onClick={() => loadEvents(eventsPage, eventsSize, eventsFilterType, eventsFilterAck)}>
                        刷新
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    rowKey="id"
                    loading={eventsLoading}
                    dataSource={events}
                    pagination={{
                      current: eventsPage,
                      pageSize: eventsSize,
                      total: eventsTotal,
                      showSizeChanger: true,
                      showTotal: (t) => `共 ${t} 条`,
                      onChange: (p, s) => { setEventsPage(p); setEventsSize(s); loadEvents(p, s, eventsFilterType, eventsFilterAck) },
                    }}
                    columns={[
                      { title: 'ID', dataIndex: 'id', width: 60 },
                      { title: '关键词', dataIndex: 'keyword', width: 160 },
                      {
                        title: '类型', width: 120,
                        render: (_, r) => <Tag color={alertTypeColor[r.alertType] || 'default'}>{alertTypeLabel[r.alertType] || r.alertType}</Tag>,
                      },
                      {
                        title: '严重度', width: 100,
                        render: (_, r) => {
                          const c = r.severity === 'CRITICAL' ? 'red' : r.severity === 'WARN' ? 'orange' : 'blue'
                          return <Tag color={c}>{r.severity || '-'}</Tag>
                        },
                      },
                      {
                        title: '指标', width: 110, align: 'right',
                        render: (_, r) => r.metricValue != null ? Number(r.metricValue).toFixed(3) : '-',
                      },
                      {
                        title: '阈值', width: 110, align: 'right',
                        render: (_, r) => r.threshold != null ? Number(r.threshold).toFixed(3) : '-',
                      },
                      {
                        title: '消息', dataIndex: 'message', ellipsis: true,
                      },
                      {
                        title: '触发时间', width: 170,
                        render: (_, r) => r.createdTime ? dayjs(r.createdTime).format('YYYY-MM-DD HH:mm') : '-',
                      },
                      {
                        title: '状态', width: 90,
                        render: (_, r) => r.isAcknowledged === 1 ? <Tag color="green">已确认</Tag> : <Tag color="orange">未确认</Tag>,
                      },
                      {
                        title: '操作', width: 200, fixed: 'right',
                        render: (_, r) => (
                          <Space size={4}>
                            <Button size="small" type="link" onClick={() => onShowEventDetail(r.id)}>详情</Button>
                            {r.isAcknowledged !== 1 && (
                              <Button size="small" type="link" onClick={() => onAckEvent(r.id)}>确认</Button>
                            )}
                            <Popconfirm title="确认删除？" onConfirm={() => onDeleteEvent(r.id)} okText="删除" cancelText="取消">
                              <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                    scroll={{ x: 1100 }}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'ingest',
            label: '数据录入',
            icon: <PlusOutlined />,
            children: (
              <Card title="手动录入单条">
                <Form
                  form={upsertForm}
                  layout="vertical"
                  initialValues={{ source: 'MANUAL', dataType: 'SEARCH_VOLUME' }}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="关键词" name="keyword" rules={[{ required: true }]}>
                        <Input placeholder="wireless earbuds" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="数据类型" name="dataType" rules={[{ required: true }]}>
                        <Select options={DATA_TYPE_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="来源" name="source">
                        <Select options={SOURCE_OPTIONS} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="月份" name="dataMonth" rules={[{ required: true, message: '请选择月份' }]}>
                        <Input placeholder="2026-06" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="数值" name="dataValue" rules={[{ required: true, message: '请输入数值' }]}>
                        <InputNumber style={{ width: '100%' }} min={0} step={1} placeholder="12000" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="关联类目（可选）" name="category">
                    <Input placeholder="如 Electronics" />
                  </Form.Item>
                  <Button type="primary" loading={upserting} onClick={onUpsert} icon={<PlusOutlined />}>
                    录入
                  </Button>
                  <Text type="secondary" style={{ marginLeft: 12 }}>
                    dataMonth 格式：YYYY-MM-DD（按当月 1 号存）
                  </Text>
                </Form>
              </Card>
            ),
          },
        ]}
      />

      {/* 新建订阅 Modal */}
      <Modal
        title="新建预警订阅"
        open={subModalOpen}
        onCancel={() => setSubModalOpen(false)}
        onOk={onSubscribe}
        okText="订阅"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={subForm} layout="vertical" initialValues={{ alertType: 'GROWTH_SPIKE', threshold: 30, active: true }}>
          <Form.Item label="关键词" name="keyword" rules={[{ required: true, message: '请输入关键词' }]}>
            <Input placeholder="wireless earbuds" />
          </Form.Item>
          <Form.Item label="预警类型" name="alertType" rules={[{ required: true }]}>
            <Select options={[
              { value: 'GROWTH_SPIKE', label: '增长预警（连续 N 月涨幅超阈值）' },
              { value: 'DECLINE', label: '衰退预警（连续 N 月跌幅超阈值）' },
              { value: 'NEW_OPPORTUNITY', label: '新机会（起步期识别）' },
            ]} />
          </Form.Item>
          <Form.Item label="阈值（%）" name="threshold" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={5} placeholder="30" />
          </Form.Item>
          <Form.Item label="立即激活" name="active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预警事件详情 Modal */}
      <Modal
        title="预警事件详情"
        open={eventDetailOpen}
        onCancel={() => setEventDetailOpen(false)}
        onOk={() => setEventDetailOpen(false)}
        okText="关闭"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={720}
      >
        {eventDetail ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="ID">{eventDetail.id}</Descriptions.Item>
              <Descriptions.Item label="关键词">{eventDetail.keyword}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={alertTypeColor[eventDetail.alertType] || 'default'}>{alertTypeLabel[eventDetail.alertType] || eventDetail.alertType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="严重度">
                <Tag color={eventDetail.severity === 'CRITICAL' ? 'red' : eventDetail.severity === 'WARN' ? 'orange' : 'blue'}>{eventDetail.severity}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="指标值">{eventDetail.metricValue != null ? Number(eventDetail.metricValue).toFixed(4) : '-'}</Descriptions.Item>
              <Descriptions.Item label="阈值">{eventDetail.threshold != null ? Number(eventDetail.threshold).toFixed(4) : '-'}</Descriptions.Item>
              <Descriptions.Item label="触发时间" span={2}>
                {eventDetail.createdTime ? dayjs(eventDetail.createdTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="消息" span={2}>
                <Paragraph style={{ marginBottom: 0 }}>{eventDetail.message}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="快照（JSON）" span={2}>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, maxHeight: 280, overflow: 'auto', fontSize: 12 }}>
                  {eventDetail.snapshot ? JSON.stringify(parseJson(eventDetail.snapshot, {}), null, 2) : '-'}
                </pre>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : (
          <Empty />
        )}
      </Modal>
    </Space>
  )
}

function ForecastPanel({ forecast, keyword, dataType }) {
  if (!forecast) {
    return (
      <Card title={<span><BulbOutlined /> AI 预测结果</span>}>
        <Empty description="点击「触发 AI 预测」生成分析" />
      </Card>
    )
  }
  const ai = parseJson(forecast.aiRecommendation, {})
  const forecast3m = parseJson(forecast.forecast3m, [])
  return (
    <Card title={<span><BulbOutlined /> AI 预测结果</span>}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Row gutter={8}>
          <Col span={12}>
            <Statistic
              title="阶段"
              valueRender={() => (
                <Tag color={phaseColor[forecast.currentPhase] || 'default'} style={{ fontSize: 14, padding: '2px 10px' }}>
                  {phaseLabel[forecast.currentPhase] || forecast.currentPhase}
                </Tag>
              )}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="置信度"
              value={Number(forecast.confidence || 0) * 100}
              precision={0}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="建议动作">
            <Tag color={actionColor[ai.action] || 'default'}>{actionLabel[ai.action] || ai.action || '-'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="规则阶段（LLM 不可用时）">{ai.rulePhase || '-'}</Descriptions.Item>
          <Descriptions.Item label="LLM 阶段">{ai.llmPhase || '-'}</Descriptions.Item>
          <Descriptions.Item label="推荐理由">
            <Paragraph style={{ marginBottom: 0 }}>{ai.reason || '-'}</Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="风险点">
            <Space wrap>
              {(ai.riskFactors || []).length === 0 && <Text type="secondary">无</Text>}
              {(ai.riskFactors || []).map((r, i) => <Tag key={i} color="orange">{r}</Tag>)}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <div>
          <Text strong>3 个月预测：</Text>
          <Space direction="vertical" size={4} style={{ marginTop: 8, width: '100%' }}>
            {Array.isArray(forecast3m) && forecast3m.length > 0 ? forecast3m.map((p, i) => (
              <Space key={i} size="small">
                <Tag>{p.month}</Tag>
                <Text strong>{Number(p.value).toFixed(2)}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ( {Number(p.low).toFixed(2)} ~ {Number(p.high).toFixed(2)} )
                </Text>
              </Space>
            )) : <Text type="secondary">无</Text>}
          </Space>
        </div>

        {forecast.forecastTime && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            预测时间：{dayjs(forecast.forecastTime).format('YYYY-MM-DD HH:mm')}
          </Text>
        )}
      </Space>
    </Card>
  )
}