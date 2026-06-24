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
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'

const { Title, Text } = Typography

/** 把带 children 的扁平列表转 antd Tree 需要的 {title, key, children, ...} */
function buildTreeData(nodes) {
  return (nodes || []).map((n) => ({
    title: (
      <Space>
        <Text strong>{n.nameEn}</Text>
        {n.nameZh && <Text type="secondary">{n.nameZh}</Text>}
        <Tag color="blue">L{n.level}</Tag>
        {n.productCount != null && <Text type="secondary" style={{ fontSize: 12 }}>{n.productCount.toLocaleString()} 商品</Text>}
      </Space>
    ),
    key: n.categoryId,
    raw: n,
    children: n.children ? buildTreeData(n.children) : undefined,
  }))
}

export default function CategoryTree() {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(false)
  const [maxLevel, setMaxLevel] = useState(3)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const loadTree = async (lv) => {
    setLoading(true)
    try {
      const r = await api.getCategoryTree(lv)
      setTree(r || [])
    } finally {
      setLoading(false)
    }
  }

  const onSeed = async () => {
    try {
      const n = await api.seedCategories()
      message.success(`种子数据加载完成：${n} 条`)
      loadTree(maxLevel)
    } catch (e) {
      // ignored
    }
  }

  const onSearch = async (kw) => {
    if (!kw || !kw.trim()) {
      setSearchResults([])
      return
    }
    const r = await api.searchCategory(kw.trim(), 30)
    setSearchResults(r || [])
  }

  const onUpsert = async () => {
    try {
      const v = await form.validateFields()
      await api.upsertCategory(v)
      message.success('保存成功')
      setModalOpen(false)
      form.resetFields()
      loadTree(maxLevel)
    } catch (e) { /* ignored */ }
  }

  const onSelectNode = async (keys, info) => {
    const raw = info.node.raw
    if (raw) {
      try {
        const full = await api.getCategoryByCategoryId(raw.categoryId)
        setSelected(full)
      } catch {
        setSelected(raw)
      }
    }
  }

  useEffect(() => {
    loadTree(maxLevel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLevel])

  const treeData = useMemo(() => buildTreeData(tree), [tree])

  const stats = useMemo(() => {
    let total = 0
    const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0 }
    const walk = (list) => {
      for (const n of list || []) {
        total++
        if (byLevel[n.level] != null) byLevel[n.level]++
        if (n.children) walk(n.children)
      }
    }
    walk(tree)
    return { total, byLevel }
  }, [tree])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>类目库</Title>
      <Text type="secondary">
        类目树 v0.1：按 Amazon 类目层级展示（1=大类 → 2=中类 → 3=小类 → 4=叶子），可手动录入或加载种子数据。
      </Text>

      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="类目总数" value={stats.total} prefix={<ApartmentOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="大类 (L1)" value={stats.byLevel[1]} /></Card></Col>
        <Col span={6}><Card><Statistic title="中类 (L2)" value={stats.byLevel[2]} /></Card></Col>
        <Col span={6}><Card><Statistic title="小类 (L3+)" value={stats.byLevel[1] + stats.byLevel[2] + stats.byLevel[3] + stats.byLevel[4] - stats.byLevel[1] - stats.byLevel[2]} /></Card></Col>
      </Row>

      <Card
        title="类目树"
        extra={
          <Space wrap>
            <span style={{ fontSize: 12 }}>展开层级：</span>
            <Select
              size="small"
              value={maxLevel}
              onChange={setMaxLevel}
              options={[1, 2, 3, 4].map((v) => ({ value: v, label: `L1~${'L'.repeat(v)}` }))}
              style={{ width: 100 }}
            />
            <Input.Search
              size="small"
              placeholder="搜索名称"
              allowClear
              onSearch={onSearch}
              style={{ width: 200 }}
            />
            <Button size="small" icon={<ThunderboltOutlined />} onClick={onSeed}>加载种子</Button>
            <Button size="small" icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}>
              新增类目
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => loadTree(maxLevel)} />
          </Space>
        }
      >
        {searchResults.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`搜索结果 ${searchResults.length} 条，点击行选中`}
            onClose={() => setSearchResults([])}
            closable
          />
        )}
        {treeData.length === 0 ? (
          <Empty description="暂无数据，点击「加载种子」快速填充" />
        ) : (
          <Tree
            treeData={treeData}
            defaultExpandAll={maxLevel <= 2}
            showLine
            onSelect={onSelectNode}
          />
        )}
      </Card>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="搜索结果" size="small">
            <Table
              size="small"
              rowKey="categoryId"
              dataSource={searchResults}
              pagination={false}
              onRow={(r) => ({ onClick: () => setSelected(r) })}
              columns={[
                { title: '类目 ID', dataIndex: 'categoryId', width: 110 },
                { title: '英文名', dataIndex: 'nameEn' },
                { title: '中文名', dataIndex: 'nameZh', width: 120 },
                { title: '层级', dataIndex: 'level', width: 70, render: (v) => <Tag>L{v}</Tag> },
                { title: '父类目', dataIndex: 'parentId', width: 110, render: (v) => v || '-' },
              ]}
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="选中节点" size="small">
            {!selected ? <Empty description="点击树节点或搜索结果查看详情" /> : (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="类目 ID">{selected.categoryId}</Descriptions.Item>
                <Descriptions.Item label="英文名">{selected.nameEn}</Descriptions.Item>
                <Descriptions.Item label="中文名">{selected.nameZh || '-'}</Descriptions.Item>
                <Descriptions.Item label="层级"><Tag color="blue">L{selected.level}</Tag></Descriptions.Item>
                <Descriptions.Item label="父类目">{selected.parentId || '-'}</Descriptions.Item>
                <Descriptions.Item label="完整路径">{selected.path || '-'}</Descriptions.Item>
                <Descriptions.Item label="商品数">{selected.productCount != null ? selected.productCount.toLocaleString() : '-'}</Descriptions.Item>
                <Descriptions.Item label="均价">{selected.avgPrice != null ? `$${selected.avgPrice}` : '-'}</Descriptions.Item>
                <Descriptions.Item label="数据源">{selected.source || '-'}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="新增/编辑类目"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onUpsert}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ level: 1, source: 'MANUAL' }}>
          <Form.Item label="类目 ID" name="categoryId" rules={[{ required: true, message: '请输入类目 ID' }]}>
            <Input placeholder="Amazon 类目 ID，如 172282" />
          </Form.Item>
          <Form.Item label="英文名" name="nameEn" rules={[{ required: true }]}>
            <Input placeholder="如 Cell Phones" />
          </Form.Item>
          <Form.Item label="中文名" name="nameZh">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="父类目 ID" name="parentId">
            <Input placeholder="可选，留空表示根节点" />
          </Form.Item>
          <Form.Item label="层级" name="level" rules={[{ required: true }]}>
            <Select options={[1, 2, 3, 4].map((v) => ({ value: v, label: `L${v}` }))} />
          </Form.Item>
          <Form.Item label="完整路径" name="path">
            <Input placeholder="留空则服务端按父节点自动拼" />
          </Form.Item>
          <Form.Item label="商品数" name="productCount">
            <InputNumber style={{ width: '100%' }} min={0} step={100} />
          </Form.Item>
          <Form.Item label="均价 ($)" name="avgPrice">
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
          </Form.Item>
          <Form.Item label="数据源" name="source">
            <Select options={[
              { value: 'MANUAL', label: '手动' },
              { value: 'PA_API', label: 'PA-API' },
              { value: 'THIRD_PARTY', label: '第三方' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}