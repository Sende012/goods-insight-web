import { useState } from 'react'
import { Card, Input, Button, Space, Typography, Alert, Tag, Descriptions } from 'antd'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

const PRESETS = ['grocery', 'electronics', 'wireless earbuds', 'pet supplies', 'home & kitchen']

export default function CategoryScan() {
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const onScan = async () => {
    if (!category.trim()) return
    setLoading(true)
    try {
      const t = await api.runCategoryScan(category.trim())
      const r = await api.getCategoryScan(t.id)
      setResult(r)
    } catch (e) {
      // 兜底 mock
      setResult({
        competitionLevel: 'HIGH',
        avgRating: 4.2,
        commonPainPoints: ['物流慢', '包装差', '说明书不全'],
        entryDifficulty: 'MEDIUM',
        suggestedNiche: '小包装 / 高端线',
        summary: '（接口未实现时的占位结果）该类目竞争激烈，建议从细分场景切入。',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>类目扫描</Title>

      <Card>
        <Alert
          type="info"
          showIcon
          message="输入类目关键词（如 grocery），AI 会分析该类目 Top 50 ASIN，给出红海/蓝海判断"
          style={{ marginBottom: 16 }}
        />

        <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
          <Input
            placeholder="输入类目关键词"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onPressEnter={onScan}
          />
          <Button type="primary" loading={loading} onClick={onScan}>扫描</Button>
        </Space.Compact>

        <div style={{ marginTop: 12 }}>
          <Text type="secondary">推荐：</Text>
          <Space wrap style={{ marginLeft: 8 }}>
            {PRESETS.map((p) => (
              <Tag key={p} style={{ cursor: 'pointer' }} onClick={() => setCategory(p)}>
                {p}
              </Tag>
            ))}
          </Space>
        </div>
      </Card>

      {result && (
        <Card title={`扫描结果：${category}`}>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="竞争程度">
              <Tag color={result.competitionLevel === 'HIGH' ? 'red' : result.competitionLevel === 'MEDIUM' ? 'orange' : 'green'}>
                {result.competitionLevel || '-'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="进入难度">
              <Tag color={result.entryDifficulty === 'HARD' ? 'red' : result.entryDifficulty === 'MEDIUM' ? 'orange' : 'green'}>
                {result.entryDifficulty || '-'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="平均评分">{result.avgRating?.toFixed?.(2) ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="建议切入方向">{result.suggestedNiche || '-'}</Descriptions.Item>
            <Descriptions.Item label="AI 总结" span={2}>
              {result.summary || result.aiSummary || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="共性痛点" span={2}>
              <Space wrap>
                {(result.commonPainPoints || []).map((p, i) => (
                  <Tag key={i} color="red">{p}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  )
}