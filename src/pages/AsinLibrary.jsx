import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
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
  CloudUploadOutlined,
  FireOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text } = Typography

export default function AsinLibrary() {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [topBsr, setTopBsr] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form] = Form.useForm()

  const loadPage = async () => {
    setLoading(true)
    try {
      const r = await api.pageAsinDatabase({ categoryId: categoryId || undefined, brand: brand || undefined, page, size })
      setRows(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  const loadTopBsr = async (cid) => {
    if (!cid) {
      setTopBsr([])
      return
    }
    try {
      const r = await api.topAsinByBsr(cid, 10)
      setTopBsr(r || [])
    } catch {
      setTopBsr([])
    }
  }

  const loadCategories = async () => {
    try {
      const r = await api.listCategoryByLevel(2)
      setCategoryOptions((r || []).map((c) => ({ value: c.categoryId, label: `${c.nameEn} / ${c.nameZh || ''}` })))
    } catch {
      setCategoryOptions([])
    }
  }

  useEffect(() => { loadCategories() }, [])
  useEffect(() => {
    loadPage()
    loadTopBsr(categoryId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, categoryId, brand])

  const onSeed = async () => {
    try {
      const n = await api.seedAsinDatabase()
      message.success(`种子数据加载完成：${n} 条`)
      loadPage()
    } catch (e) { /* ignored */ }
  }

  const onUpsert = async () => {
    try {
      const v = await form.validateFields()
      await api.upsertAsin(v)
      message.success('保存成功')
      setModalOpen(false)
      form.resetFields()
      loadPage()
    } catch (e) { /* ignored */ }
  }

  const onSearch = async () => {
    if (!brand) return
    setPage(1)
    loadPage()
  }

  const stats = useMemo(() => {
    const list = rows
    let avgPrice = 0
    let avgRating = 0
    let withRating = 0
    let totalReviews = 0
    for (const r of list) {
      if (r.price) avgPrice += Number(r.price)
      if (r.rating) { avgRating += Number(r.rating); withRating++ }
      if (r.reviewCount) totalReviews += Number(r.reviewCount)
    }
    return {
      avgPrice: list.length ? (avgPrice / list.length).toFixed(2) : '0',
      avgRating: withRating ? (avgRating / withRating).toFixed(2) : '-',
      totalReviews,
      count: total,
    }
  }, [rows, total])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>ASIN 库</Title>
      <Text type="secondary">
        ASIN 库 v0.1：按类目过滤浏览，支持 BSR 排序。手动录入或加载种子数据；后续接入 PA-API 自动同步。
      </Text>

      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="当前页" value={rows.length} suffix={`/ ${stats.count}`} /></Card></Col>
        <Col span={6}><Card><Statistic title="页均价" value={stats.avgPrice} prefix="$" /></Card></Col>
        <Col span={6}><Card><Statistic title="页均评分" value={stats.avgRating} suffix="/5" /></Card></Col>
        <Col span={6}><Card><Statistic title="页评论数" value={stats.totalReviews} /></Card></Col>
      </Row>

      <Card
        title="ASIN 列表"
        extra={
          <Space wrap>
            <Select
              size="small"
              allowClear
              placeholder="按类目过滤"
              options={categoryOptions}
              value={categoryId || undefined}
              onChange={setCategoryId}
              style={{ width: 220 }}
            />
            <Input
              size="small"
              placeholder="按品牌过滤"
              allowClear
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              onPressEnter={() => { setPage(1); loadPage() }}
              prefix={<SearchOutlined />}
              style={{ width: 180 }}
            />
            <Button size="small" icon={<CloudUploadOutlined />} onClick={onSeed}>加载种子</Button>
            <Button size="small" icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}>
              新增 ASIN
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadPage} />
          </Space>
        }
      >
        <Table
          rowKey="asin"
          loading={loading}
          dataSource={rows}
          pagination={{
            current: page, pageSize: size, total,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (p, s) => { setPage(p); setSize(s) },
          }}
          onRow={(r) => ({ onClick: () => setSelected(r) })}
          columns={[
            {
              title: '图片', dataIndex: 'imageUrl', width: 60,
              render: (v) => v ? <Image src={v} width={40} height={40} style={{ objectFit: 'contain' }} fallback="📦" /> : '📦',
            },
            { title: 'ASIN', dataIndex: 'asin', width: 130 },
            { title: '标题', dataIndex: 'title', ellipsis: true },
            { title: '品牌', dataIndex: 'brand', width: 110 },
            {
              title: '价格', dataIndex: 'price', width: 90, align: 'right',
              render: (v) => v != null ? <Text strong>${Number(v).toFixed(2)}</Text> : '-',
            },
            {
              title: 'BSR', dataIndex: 'bsrRank', width: 80,
              render: (v) => v != null ? <Tag color="orange">#{v}</Tag> : '-',
            },
            {
              title: '评分', dataIndex: 'rating', width: 80,
              render: (v) => v != null ? `${Number(v).toFixed(1)} ⭐` : '-',
            },
            {
              title: '评论数', dataIndex: 'reviewCount', width: 100, align: 'right',
              render: (v) => v != null ? v.toLocaleString() : '-',
            },
            {
              title: '标识', width: 100,
              render: (_, r) => (
                <Space size={4}>
                  {r.isAmazonChoice === 1 && <Tag color="orange">AC</Tag>}
                  {r.isPrime === 1 && <Tag color="blue">Prime</Tag>}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={<span><FireOutlined /> 当前类目 BSR Top 10</span>} size="small">
            {!categoryId ? <Empty description="选择上方类目查看 Top 10" /> : (
              <Table
                size="small"
                rowKey="asin"
                dataSource={topBsr}
                pagination={false}
                onRow={(r) => ({ onClick: () => setSelected(r) })}
                columns={[
                  { title: '排名', dataIndex: 'bsrRank', width: 70, render: (v) => <Tag color="orange">#{v}</Tag> },
                  { title: 'ASIN', dataIndex: 'asin', width: 130 },
                  { title: '标题', dataIndex: 'title', ellipsis: true },
                  { title: '品牌', dataIndex: 'brand', width: 110 },
                  { title: '价格', dataIndex: 'price', width: 80, align: 'right', render: (v) => v != null ? `$${Number(v).toFixed(2)}` : '-' },
                  { title: '评分', dataIndex: 'rating', width: 70, render: (v) => v != null ? `${Number(v).toFixed(1)} ⭐` : '-' },
                ]}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="ASIN 详情" size="small">
            {!selected ? <Empty description="点击列表行查看详情" /> : (
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="ASIN" span={2}>{selected.asin}</Descriptions.Item>
                <Descriptions.Item label="标题" span={2}>{selected.title}</Descriptions.Item>
                <Descriptions.Item label="品牌">{selected.brand || '-'}</Descriptions.Item>
                <Descriptions.Item label="类目">{selected.categoryId || '-'}</Descriptions.Item>
                <Descriptions.Item label="价格">{selected.price != null ? `$${selected.price}` : '-'}</Descriptions.Item>
                <Descriptions.Item label="BSR">{selected.bsrRank != null ? `#${selected.bsrRank}` : '-'}</Descriptions.Item>
                <Descriptions.Item label="评分">{selected.rating != null ? `${selected.rating} ⭐` : '-'}</Descriptions.Item>
                <Descriptions.Item label="评论数">{selected.reviewCount != null ? selected.reviewCount.toLocaleString() : '-'}</Descriptions.Item>
                <Descriptions.Item label="重量">{selected.weightG != null ? `${selected.weightG} g` : '-'}</Descriptions.Item>
                <Descriptions.Item label="尺寸">{selected.sizeCm || '-'}</Descriptions.Item>
                <Descriptions.Item label="Prime">{selected.isPrime === 1 ? '是' : '否'}</Descriptions.Item>
                <Descriptions.Item label="Amazon's Choice">{selected.isAmazonChoice === 1 ? '是' : '否'}</Descriptions.Item>
                <Descriptions.Item label="爬取状态" span={2}>
                  <Tag>{selected.crawlStatus || 'PENDING'}</Tag>
                  {selected.lastCrawled && <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{dayjs(selected.lastCrawled).format('YYYY-MM-DD HH:mm')}</Text>}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="新增/编辑 ASIN"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onUpsert}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ isPrime: 1, isAmazonChoice: 0 }}>
          <Form.Item label="ASIN" name="asin" rules={[{ required: true, message: '请输入 ASIN（如 B0XXXXXX）' }]}>
            <Input placeholder="B0XXXXXX（10 位）" />
          </Form.Item>
          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="商品标题" />
          </Form.Item>
          <Form.Item label="品牌" name="brand">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="关联类目 ID" name="categoryId">
            <Select allowClear showSearch options={categoryOptions} placeholder="可选" />
          </Form.Item>
          <Form.Item label="价格 ($)" name="price">
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
          </Form.Item>
          <Form.Item label="BSR 排名" name="bsrRank">
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item label="评分 (1-5)" name="rating">
            <InputNumber style={{ width: '100%' }} min={0} max={5} step={0.1} precision={2} />
          </Form.Item>
          <Form.Item label="评论数" name="reviewCount">
            <InputNumber style={{ width: '100%' }} min={0} step={1} />
          </Form.Item>
          <Form.Item label="重量 (g)" name="weightG">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="Prime" name="isPrime" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Amazon's Choice" name="isAmazonChoice" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}