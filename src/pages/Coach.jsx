import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  List,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  FireOutlined,
  LikeOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const itemTypeColor = {
  TREND: 'green',
  OPPORTUNITY: 'gold',
  RISK_ALERT: 'red',
  IDEA: 'blue',
}
const itemTypeLabel = {
  TREND: '趋势机会',
  OPPORTUNITY: '新机会',
  RISK_ALERT: '风险告警',
  IDEA: '选品创意',
}

const actionColor = {
  ENTER_NOW: 'green',
  DIFFERENTIATE: 'gold',
  WAIT: 'blue',
  AVOID: 'red',
}
const actionLabel = {
  ENTER_NOW: '立即进入',
  DIFFERENTIATE: '差异化',
  WAIT: '观望',
  AVOID: '不建议',
}

const statusColor = {
  NEW: 'default',
  LIKE: 'green',
  DISLIKE: 'red',
  DONE: 'blue',
  SKIPPED: 'default',
}
const statusLabel = {
  NEW: '未处理',
  LIKE: '已采纳',
  DISLIKE: '已忽略',
  DONE: '已完成',
  SKIPPED: '已跳过',
}

function parseJson(s, fallback) {
  if (!s) return fallback
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch { return fallback }
}

export default function Coach() {
  const [today, setToday] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [recent, setRecent] = useState([])
  const [recentLoading, setRecentLoading] = useState(false)
  const [historyModal, setHistoryModal] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [historical, setHistorical] = useState(null)

  const loadToday = async () => {
    setLoading(true)
    try {
      const r = await api.getCoachToday()
      setToday(r)
    } finally {
      setLoading(false)
    }
  }

  const loadRecent = async () => {
    setRecentLoading(true)
    try {
      const r = await api.getCoachRecent(30)
      setRecent(r || [])
    } finally {
      setRecentLoading(false)
    }
  }

  useEffect(() => {
    loadToday()
    loadRecent()
  }, [])

  const onGenerate = async () => {
    setGenerating(true)
    try {
      await api.generateCoach()
      message.success('已生成今日推荐')
      loadToday()
      loadRecent()
    } catch (e) {
      // ignored
    } finally {
      setGenerating(false)
    }
  }

  const onFeedback = async (itemIndex, status) => {
    if (!today) return
    const ok = await api.feedbackCoach({
      recommendationId: today.id,
      itemIndex,
      status,
    })
    if (ok) {
      message.success('反馈已记录')
      loadToday()
    }
  }

  const onShowHistory = async (rec) => {
    const r = await api.getCoachById(rec.id)
    setHistorical(r)
    setSelectedDate(r)
    setHistoryModal(true)
  }

  const stats = useMemo(() => {
    const items = parseJson(today?.itemsJson, [])
    const newCount = items.filter((it) => !it.status || it.status === 'NEW').length
    const likeCount = items.filter((it) => it.status === 'LIKE' || it.status === 'DONE').length
    const dislikeCount = items.filter((it) => it.status === 'DISLIKE' || it.status === 'SKIPPED').length
    return { total: items.length, newCount, likeCount, dislikeCount }
  }, [today])

  const sourceSummary = parseJson(today?.sourceSummary, {})

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>
        <RobotOutlined /> AI 选品教练
      </Title>
      <Text type="secondary">
        V2.0 P3：每日基于趋势预警 / 类目扫描 / 风险评分 / 创意生成的真实数据 → LLM 综合推理 → 给出 3~5 条可执行推荐。
        默认每日早 8 点生成；也可手动触发。
      </Text>

      {/* 今日推荐 */}
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: '#fa541c' }} />
            <span>今日推荐 · {today?.recommendDate || '加载中'}</span>
            {today?.errorMessage && <Tag color="warning">降级</Tag>}
          </Space>
        }
        loading={loading}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadToday}>刷新</Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={generating}
              onClick={onGenerate}
            >
              重新生成
            </Button>
          </Space>
        }
      >
        {today ? (
          <>
            {/* 统计卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="推荐数" value={stats.total} suffix="条" /></Card></Col>
              <Col span={6}><Card><Statistic title="未处理" value={stats.newCount} valueStyle={{ color: '#fa8c16' }} suffix="条" /></Card></Col>
              <Col span={6}><Card><Statistic title="已采纳" value={stats.likeCount} valueStyle={{ color: '#52c41a' }} suffix="条" /></Card></Col>
              <Col span={6}><Card><Statistic title="已忽略" value={stats.dislikeCount} valueStyle={{ color: '#999' }} suffix="条" /></Card></Col>
            </Row>

            {/* 数据源摘要 */}
            {Object.keys(sourceSummary).length > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={
                  <Space>
                    <Text strong>数据源：</Text>
                    <Tag>趋势事件 {sourceSummary.trendEvents || 0}</Tag>
                    <Tag>类目扫描 {sourceSummary.scans || 0}</Tag>
                    <Tag>风险评分 {sourceSummary.risks || 0}</Tag>
                    <Tag>选品创意 {sourceSummary.ideas || 0}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      · 生成时间 {today.createdTime ? dayjs(today.createdTime).format('YYYY-MM-DD HH:mm') : '-'}
                      · 来源 {today.generatedBy || 'system'}
                    </Text>
                  </Space>
                }
              />
            )}

            {/* 总评 */}
            {today.summary && (
              <Card size="small" style={{ marginBottom: 16, background: '#fffbe6' }}>
                <Text strong>总评：</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>{today.summary}</Paragraph>
              </Card>
            )}

            {/* 推荐条目 */}
            {parseJson(today.itemsJson, []).length === 0 ? (
              <Empty
                description={
                  today.errorMessage
                    ? `暂无推荐：${today.errorMessage}`
                    : '暂无足够数据，今日不推荐'
                }
              />
            ) : (
              <List
                dataSource={parseJson(today.itemsJson, [])}
                renderItem={(item, idx) => (
                  <List.Item
                    key={idx}
                    actions={[
                      <Button
                        key="like"
                        size="small"
                        type={item.status === 'LIKE' ? 'primary' : 'default'}
                        icon={<LikeOutlined />}
                        onClick={() => onFeedback(idx, 'LIKE')}
                      >
                        采纳
                      </Button>,
                      <Button
                        key="done"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => onFeedback(idx, 'DONE')}
                      >
                        完成
                      </Button>,
                      <Button
                        key="dislike"
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => onFeedback(idx, 'DISLIKE')}
                      >
                        忽略
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag color={itemTypeColor[item.type] || 'default'}>{itemTypeLabel[item.type] || item.type}</Tag>
                          <Text strong>{item.title}</Text>
                          {item.category && <Tag color="cyan">{item.category}</Tag>}
                          {item.action && <Tag color={actionColor[item.action] || 'default'}>{actionLabel[item.action] || item.action}</Tag>}
                          <Tag color={statusColor[item.status || 'NEW']}>{statusLabel[item.status || 'NEW'] || item.status}</Tag>
                          <Progress
                            percent={item.score || 0}
                            size="small"
                            style={{ width: 120 }}
                            strokeColor={item.score >= 80 ? '#52c41a' : item.score >= 60 ? '#1890ff' : '#fa8c16'}
                          />
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Text>{item.reason}</Text>
                          {item.refId && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              关联 {item.refType || '实体'} #{item.refId}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </>
        ) : (
          <Empty />
        )}
      </Card>

      {/* 历史日期 */}
      <Card title="历史推荐">
        <List
          loading={recentLoading}
          dataSource={recent}
          renderItem={(r) => (
            <List.Item
              key={r.id}
              actions={[
                <Button key="view" size="small" onClick={() => onShowHistory(r)}>
                  查看
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{r.recommendDate}</Text>
                    <Tag color={r.itemCount > 0 ? 'blue' : 'default'}>{r.itemCount} 条</Tag>
                    {r.errorMessage && <Tag color="warning">降级</Tag>}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text>{r.summary || '（无总评）'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      生成于 {r.createdTime ? dayjs(r.createdTime).format('YYYY-MM-DD HH:mm') : '-'} · 来源 {r.generatedBy || 'system'}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 历史详情 Modal */}
      <Modal
        title={`历史推荐 · ${selectedDate?.recommendDate || ''}`}
        open={historyModal}
        onCancel={() => setHistoryModal(false)}
        onOk={() => setHistoryModal(false)}
        okText="关闭"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={800}
      >
        {historical ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="日期">{historical.recommendDate}</Descriptions.Item>
              <Descriptions.Item label="总评">{historical.summary || '-'}</Descriptions.Item>
              <Descriptions.Item label="数据源">
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, margin: 0, fontSize: 12 }}>
                  {historical.sourceSummary ? JSON.stringify(parseJson(historical.sourceSummary, {}), null, 2) : '-'}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="生成时间">
                {historical.createdTime ? dayjs(historical.createdTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              {historical.errorMessage && (
                <Descriptions.Item label="错误">{historical.errorMessage}</Descriptions.Item>
              )}
            </Descriptions>
            <div>
              <Text strong>推荐条目：</Text>
              {parseJson(historical.itemsJson, []).length === 0 ? (
                <Empty />
              ) : (
                <List
                  style={{ marginTop: 8 }}
                  size="small"
                  dataSource={parseJson(historical.itemsJson, [])}
                  renderItem={(item, idx) => (
                    <List.Item>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={itemTypeColor[item.type] || 'default'}>{itemTypeLabel[item.type] || item.type}</Tag>
                          <Text strong>{item.title}</Text>
                          <Tag color={statusColor[item.status || 'NEW']}>{statusLabel[item.status || 'NEW'] || item.status}</Tag>
                        </Space>
                        <Text>{item.reason}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Space>
        ) : (
          <Empty />
        )}
      </Modal>
    </Space>
  )
}