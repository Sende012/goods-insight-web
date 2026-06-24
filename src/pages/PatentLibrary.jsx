import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
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
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  FileProtectOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../api/client'

const { Title, Text } = Typography

const SOURCE_OPTIONS = [
  { value: 'USPTO', label: 'USPTO（美国）' },
  { value: 'GOOGLE_PATENTS', label: 'Google Patents' },
  { value: 'EUIPO', label: 'EUIPO（欧盟）' },
]

const STATUS_META = {
  1: { label: '活跃', color: 'green' },
  0: { label: '失效', color: 'default' },
}

export default function PatentLibrary() {
  const [form] = Form.useForm()
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)

  const [upsertOpen, setUpsertOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const loadList = async () => {
    setLoading(true)
    try {
      const r = await api.pagePatents({
        keyword: keyword || undefined,
        category: category || undefined,
        source: source || undefined,
        page, size,
      })
      setList(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadList() }, [page, size])

  const onSearch = () => {
    setPage(1)
    loadList()
  }

  const onUpsert = async () => {
    try {
      const v = await form.validateFields()
      setSubmitting(true)
      const body = {
        ...v,
        filingDate: v.filingDate ? v.filingDate.format('YYYY-MM-DD') : null,
        issueDate: v.issueDate ? v.issueDate.format('YYYY-MM-DD') : null,
        expiryDate: v.expiryDate ? v.expiryDate.format('YYYY-MM-DD') : null,
      }
      await api.upsertPatent(body)
      message.success(editing ? '更新成功' : '入库成功')
      setUpsertOpen(false)
      setEditing(null)
      form.resetFields()
      loadList()
    } catch (e) { /* ignored */ }
    finally { setSubmitting(false) }
  }

  const onEdit = (rec) => {
    setEditing(rec)
    form.setFieldsValue({
      patentNumber: rec.patentNumber,
      title: rec.title,
      inventor: rec.inventor,
      assignee: rec.assignee,
      filingDate: rec.filingDate ? dayjs(rec.filingDate) : null,
      issueDate: rec.issueDate ? dayjs(rec.issueDate) : null,
      expiryDate: rec.expiryDate ? dayjs(rec.expiryDate) : null,
      category: rec.category,
      description: rec.description,
      source: rec.source || 'USPTO',
      isActive: rec.isActive == null ? 1 : rec.isActive,
    })
    setUpsertOpen(true)
  }

  const onNew = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ source: 'USPTO', isActive: 1 })
    setUpsertOpen(true)
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>专利库（V0.1）</Title>
        <Text type="secondary">
          来自 USPTO / Google Patents / EUIPO 的参考数据，用于风险评估的「专利」维度评分。
          当前 V0.1 仅手动录入；USPTO 抓取在 V0.2 接入。
        </Text>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="专利总数" value={total} prefix={<FileProtectOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃专利"
              value={list.filter((x) => x.isActive === 1).length}
              suffix={`/ ${list.length}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="当前结果分类"
              value={new Set(list.map((x) => x.category).filter(Boolean)).size}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="来源"
              value={new Set(list.map((x) => x.source).filter(Boolean)).size}
              suffix="种"
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={<span><SearchOutlined /> 检索 / 录入</span>}
        extra={
          <Space>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onNew}>
              新增专利
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadList} />
          </Space>
        }
      >
        <Space wrap size="middle">
          <Input
            allowClear
            placeholder="关键词（标题 / 描述）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={onSearch}
            style={{ width: 240 }}
          />
          <Input
            allowClear
            placeholder="类目（如 Headphones）"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onPressEnter={onSearch}
            style={{ width: 200 }}
          />
          <Select
            allowClear
            placeholder="来源"
            value={source}
            onChange={setSource}
            options={SOURCE_OPTIONS}
            style={{ width: 180 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
            搜索
          </Button>
        </Space>
      </Card>

      <Card size="small" title={`结果（${total}）`}>
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
            { title: '专利号', dataIndex: 'patentNumber', width: 140, fixed: 'left' },
            { title: '标题', dataIndex: 'title', ellipsis: true },
            { title: '类目', dataIndex: 'category', width: 140, ellipsis: true },
            { title: '受让人', dataIndex: 'assignee', width: 160, ellipsis: true },
            { title: '申请日', dataIndex: 'filingDate', width: 110,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
            { title: '到期日', dataIndex: 'expiryDate', width: 110,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
            { title: '来源', dataIndex: 'source', width: 110,
              render: (v) => v ? <Tag>{v}</Tag> : '-' },
            {
              title: '状态', dataIndex: 'isActive', width: 80,
              render: (v) => {
                const m = STATUS_META[v] || { label: '-', color: 'default' }
                return <Tag color={m.color}>{m.label}</Tag>
              },
            },
            {
              title: '操作', width: 100, fixed: 'right',
              render: (_, r) => (
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEdit(r)} />
                </Space>
              ),
            },
          ]}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={editing ? `编辑专利 #${editing.id}` : '新增专利'}
        open={upsertOpen}
        onCancel={() => { setUpsertOpen(false); setEditing(null); form.resetFields() }}
        onOk={onUpsert}
        confirmLoading={submitting}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="专利号" name="patentNumber" rules={[{ required: true, message: '请输入专利号' }]}>
                <Input placeholder="US12345678B2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="来源" name="source">
                <Select options={SOURCE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="Method and apparatus for ..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="发明人" name="inventor">
                <Input placeholder="John Smith" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="受让人（公司）" name="assignee">
                <Input placeholder="Apple Inc." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="申请日" name="filingDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="授权日" name="issueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="到期日" name="expiryDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="类目" name="category" tooltip="用于风险评分的专利维度匹配，建议与 asin_database.categoryId 对齐">
                <Input placeholder="如 Headphones / Phone Stand" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="isActive" tooltip="0=失效 / 1=活跃">
                <Select
                  options={[
                    { value: 1, label: '活跃' },
                    { value: 0, label: '失效' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="权利要求 / 摘要 / 设计要点" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={detail ? `专利详情 #${detail.id}` : '详情'}
        open={!!detail}
        onClose={() => setDetail(null)}
        width={600}
        destroyOnClose
      >
        {detail ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="专利号">{detail.patentNumber}</Descriptions.Item>
              <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
              <Descriptions.Item label="类目">{detail.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="发明人">{detail.inventor || '-'}</Descriptions.Item>
              <Descriptions.Item label="受让人">{detail.assignee || '-'}</Descriptions.Item>
              <Descriptions.Item label="申请日">{detail.filingDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="授权日">{detail.issueDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="到期日">{detail.expiryDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源">{detail.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {STATUS_META[detail.isActive]?.label || detail.isActive}
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                <div style={{ whiteSpace: 'pre-wrap' }}>{detail.description || '-'}</div>
              </Descriptions.Item>
            </Descriptions>
            <Space>
              <Button icon={<EditOutlined />} onClick={() => { setDetail(null); onEdit(detail) }}>
                编辑
              </Button>
            </Space>
          </Space>
        ) : <Empty />}
      </Drawer>
    </Space>
  )
}