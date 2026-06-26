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
  ShopOutlined,
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
  FAILED:   { label: '失败/无数据', color: 'red' },
}

const MARKET_META = {
  GROWING:   { label: '上升期', color: 'green' },
  PEAK:      { label: '成熟期', color: 'blue' },
  DECLINING: { label: '下行期', color: 'red' },
  UNKNOWN:   { label: '未知',   color: 'default' },
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

const CONDITION_META = {
  BRAND_NEW:  { label: '全新',   color: 'green' },
  LIKE_NEW:   { label: '99新',   color: 'cyan' },
  EXCELLENT:  { label: '95新',   color: 'blue' },
  GOOD:       { label: '9成新',  color: 'geekblue' },
  FAIR:       { label: '7-8成新', color: 'orange' },
  POOR:       { label: '5成及以下', color: 'red' },
}

const SELLER_TYPE_META = {
  C2C: { label: '个人卖家', color: 'blue' },
  B2C: { label: '企业卖家', color: 'green' },
}

const PRESETS = ['二手手机', '二手 iPad', '二手相机', '二手笔记本', '球鞋', '潮玩']

function diffColor(score) {
  if (score == null) return '#999'
  if (score >= 70) return '#ff4d4f'
  if (score >= 40) return '#faad14'
  return '#52c41a'
}

function pct(v) {
  if (v == null) return 0
  return Math.round(v * 1000) / 10
}

export default function XianyuCategoryScan() {
  const [category, setCategory] = useState('二手手机')
  const [limit, setLimit] = useState(30)
  const [maxPages, setMaxPages] = useState(2)
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
      const r = await api.pageXianyuCategoryScan({ status: status || undefined, page, size })
      setList(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [page, size, status])

  const onScan = async () => {
    if (!category.trim()) {
      message.warning('请输入闲鱼类目名')
      return
    }
    setScanning(true)
    try {
      const r = await api.runXianyuCategoryScan({
        category: category.trim(),
        marketplace: 'CN',
        asinLimit: limit,
        maxPages,
      })
      setLatest(r)
      if (r.status === 'SUCCESS') {
        message.success('扫描完成')
      } else if (r.status === 'FAILED') {
        message.warning('扫描失败或暂无样本（已用规则 fallback）')
      } else {
        message.info(`状态：${r.status}`)
      }
      setPage(1)
      loadList()
    } catch (e) { /* axios 拦截器已提示 */ }
    finally { setScanning(false) }
  }

  const onDelete = async (id) => {
    try {
      await api.deleteXianyuCategoryScan(id)
      message.success('已删除')
      loadList()
      if (detail?.id === id) setDetail(null)
      if (latest?.id === id) setLatest(null)
    } catch (e) { /* ignored */ }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>
        <ShopOutlined /> 闲鱼类目扫描（V3.0 MVP）
      </Title>
      <Text type="secondary">
        输入闲鱼类目名（如"二手手机"），AI 会从 crawler 拉取闲鱼商品（mtop/H5 双路径），
        统计价格分布 + 成色分布 + 卖家类型分布，输出细分机会、闲鱼特定警告、AI 综合研判。
        <Text type="warning">  注意：v0.1 需在 Nacos 配置 crawler.xianyu.cookies[0] 才能真实抓取，否则返回空样本（FAILED）。</Text>
      </Text>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="扫描总数" value={total} prefix={<ShopOutlined />} />
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
              value={latest?.niches ? (latest.niches.length || 0) : 0}
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
                <Text type="secondary" style={{ fontSize: 12 }}>闲鱼类目</Text>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="如 二手手机"
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
                <Text type="secondary" style={{ fontSize: 12 }}>商品数（Top N）</Text>
                <InputNumber
                  value={limit}
                  onChange={(v) => setLimit(v || 30)}
                  min={5}
                  max={100}
                  step={5}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>翻页数（每页 20 条评论）</Text>
                <InputNumber
                  value={maxPages}
                  onChange={(v) => setMaxPages(v || 2)}
                  min={1}
                  max={5}
                  style={{ width: '100%' }}
                />
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={16}>
          {latest ? (
            <XianyuResultPanel item={latest} onViewDetail={() => setDetail(latest)} />
          ) : (
            <Card title="扫描结果" size="small">
              <Empty description="填写左侧表单后点击「立即扫描」" />
            </Card>
          )}
        </Col>
      </Row>

      <Card
        title={<span><ShopOutlined /> 历史扫描（{total}）</span>}
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
            {
              title: '状态', dataIndex: 'status', width: 100,
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
        title={detail ? `闲鱼扫描 #${detail.id} - ${detail.category}` : '详情'}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {detail && <XianyuResultPanel item={detail} inline />}
      </Modal>
    </Space>
  )
}

function XianyuResultPanel({ item, inline, onViewDetail }) {
  const niches = useMemo(() => item.niches || [], [item.niches])
  const priceDist = item.priceDistribution || {}
  const conditionDist = item.conditionDistribution || {}
  const sellerTypeDist = item.sellerTypeDistribution || {}
  const nextSteps = item.nextSteps || []
  const xianyuWarnings = item.xianyuSpecificWarnings || []
  const topSummary = item.topSummary || []

  // 成色饼图
  const conditionPieData = Object.keys(conditionDist)
      .filter((k) => conditionDist[k] > 0)
      .map((k) => ({ name: CONDITION_META[k]?.label || k, value: pct(conditionDist[k]) }))
  const sellerTypePieData = Object.keys(sellerTypeDist)
      .filter((k) => sellerTypeDist[k] > 0)
      .map((k) => ({ name: SELLER_TYPE_META[k]?.label || k, value: pct(sellerTypeDist[k]) }))

  return (
    <Card
      title={inline ? null : '扫描结果'}
      size="small"
      extra={inline ? null : (onViewDetail ? <Button size="small" onClick={onViewDetail}>查看完整</Button> : null)}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions size="small" column={4} bordered>
          <Descriptions.Item label="类目">
            {item.category}（{item.marketplace || 'CN'}）
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

        {item.aiSummary && (
          <Card size="small" type="inner" title="AI 综合研判">
            <Paragraph style={{ marginBottom: 0 }}>{item.aiSummary}</Paragraph>
          </Card>
        )}

        {xianyuWarnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="闲鱼特定警告"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {xianyuWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            }
          />
        )}

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

        <Row gutter={12}>
          <Col span={8}>
            <Card size="small" type="inner" title="价格分布（CNY）">
              {Object.keys(priceDist).length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' },
                    xAxis: { type: 'category', data: Object.keys(priceDist) },
                    yAxis: { type: 'value' },
                    series: [{ type: 'bar', data: Object.values(priceDist), itemStyle: { color: '#1677ff' } }],
                  }}
                  style={{ height: 200 }}
                />
              ) : <Empty />}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" type="inner" title="成色分布">
              {conditionPieData.length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
                    legend: { bottom: 0, type: 'scroll' },
                    series: [{
                      type: 'pie',
                      radius: ['35%', '70%'],
                      data: conditionPieData,
                    }],
                  }}
                  style={{ height: 200 }}
                />
              ) : <Empty description="无成色数据" />}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" type="inner" title="卖家类型分布">
              {sellerTypePieData.length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
                    legend: { bottom: 0 },
                    series: [{
                      type: 'pie',
                      radius: ['35%', '70%'],
                      data: sellerTypePieData,
                    }],
                  }}
                  style={{ height: 200 }}
                />
              ) : <Empty description="无卖家类型数据" />}
            </Card>
          </Col>
        </Row>

        {topSummary.length > 0 && (
          <Card size="small" type="inner" title={`Top 闲鱼商品（${topSummary.length}）`}>
            <Table
              size="small"
              rowKey={(r, i) => i}
              pagination={{ pageSize: 5 }}
              dataSource={topSummary}
              columns={[
                { title: 'itemId', dataIndex: 'itemId', width: 130, ellipsis: true },
                { title: '标题', dataIndex: 'title', ellipsis: true },
                { title: '价格', dataIndex: 'price', width: 80,
                  render: (v) => v ? `¥${v}` : '-' },
                { title: '想要', dataIndex: 'wantCount', width: 60 },
                { title: '浏览', dataIndex: 'viewCount', width: 60 },
                { title: '成色', dataIndex: 'condition', width: 80,
                  render: (v) => v ? <Tag color={CONDITION_META[v]?.color}>{CONDITION_META[v]?.label || v}</Tag> : '-' },
                { title: '卖家', dataIndex: 'sellerType', width: 80,
                  render: (v) => v ? <Tag color={SELLER_TYPE_META[v]?.color}>{SELLER_TYPE_META[v]?.label || v}</Tag> : '-' },
                { title: '位置', dataIndex: 'location', width: 100, ellipsis: true },
              ]}
            />
          </Card>
        )}

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
          <Alert type="error" showIcon message="扫描错误" description={item.errorMessage} />
        )}
      </Space>
    </Card>
  )
}
