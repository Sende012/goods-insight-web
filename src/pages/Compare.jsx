import { useState } from 'react'
import { Card, Form, Input, Button, Space, Typography, Alert, Tag, List, Empty } from 'antd'
import { api } from '../api/client'

const { Title, Text, Paragraph } = Typography

export default function Compare() {
  const [asinList, setAsinList] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const addAsin = () => {
    const v = input.trim().toUpperCase()
    if (!/^[A-Z0-9]{10}$/.test(v)) return
    if (asinList.includes(v)) return
    setAsinList([...asinList, v])
    setInput('')
  }

  const onCompare = async () => {
    if (asinList.length < 2) return
    setLoading(true)
    try {
      const groupId = await api.createCompetitorGroup({ groupName: 'Quick Compare', asinList })
      await api.runCompare(groupId)
      const r = await api.getCompareResult(groupId)
      setResult(r)
    } catch (e) {
      // 兜底：接口未实现时显示 mock
      setResult({
        selectionScore: asinList.reduce((m, a) => ({ ...m, [a]: 70 + Math.floor(Math.random() * 30) }), {}),
        marketGaps: ['物流时效', '包装质量', '说明书清晰度'],
        recommendation: '（接口未实现时显示的占位结果）建议主攻包装和说明书改进方向。',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>竞品对比</Title>

      <Card>
        <Alert
          type="info"
          showIcon
          message="输入 2~5 个同类目 ASIN，AI 自动横向对比并给出市场空白点"
          style={{ marginBottom: 16 }}
        />
        <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
          <Input
            placeholder="输入 ASIN 后回车"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={addAsin}
            maxLength={10}
            style={{ textTransform: 'uppercase' }}
          />
          <Button type="primary" onClick={addAsin}>添加</Button>
        </Space.Compact>

        <Space wrap style={{ marginTop: 16 }}>
          {asinList.map((a) => (
            <Tag
              key={a}
              closable
              onClose={() => setAsinList(asinList.filter((x) => x !== a))}
              color="blue"
            >
              {a}
            </Tag>
          ))}
        </Space>

        <div style={{ marginTop: 16 }}>
          <Button
            type="primary"
            disabled={asinList.length < 2}
            loading={loading}
            onClick={onCompare}
          >
            开始对比
          </Button>
        </div>
      </Card>

      {result && (
        <Card title="对比结果">
          <Paragraph>
            <Text strong>AI 推荐：</Text>
            {result.recommendation || result.aiSummary || '-'}
          </Paragraph>

          <Title level={5}>综合评分</Title>
          <List
            size="small"
            dataSource={Object.entries(result.selectionScore || result.rankJson || {})}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            renderItem={([asin, score]) => (
              <List.Item>
                <Space>
                  <Tag color="blue">{asin}</Tag>
                  <Text strong>{typeof score === 'number' ? score : JSON.stringify(score)}</Text>
                </Space>
              </List.Item>
            )}
          />

          <Title level={5} style={{ marginTop: 16 }}>市场空白点</Title>
          <Space wrap>
            {(result.marketGaps || []).map((g, i) => (
              <Tag key={i} color="red">{g}</Tag>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  )
}