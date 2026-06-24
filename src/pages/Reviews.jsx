import { useEffect, useRef, useState } from 'react'
import {
  Card,
  Select,
  Space,
  Table,
  Tag,
  Button,
  Typography,
  Empty,
  Modal,
  Progress,
  Input,
  message,
  Tooltip,
  Tabs,
  Rate,
  Upload,
} from 'antd'
import {
  InboxOutlined,
  ReloadOutlined,
  StarFilled,
  SearchOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
} from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

const ratingColor = { 1: 'red', 2: 'volcano', 3: 'gold', 4: 'lime', 5: 'green' }

export default function Reviews() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialProductId = searchParams.get('productId')
    ? Number(searchParams.get('productId'))
    : undefined

  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState(initialProductId)
  const [rating, setRating] = useState()
  const [keyword, setKeyword] = useState('')
  const [keywordInput, setKeywordInput] = useState('')

  // 评论列表
  const [reviews, setReviews] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [loading, setLoading] = useState(false)

  // 导入历史
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)

  // 上传 Modal
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadProductId, setUploadProductId] = useState()
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  // 详情 Modal
  const [detail, setDetail] = useState(null)
  const dropRef = useRef(null)

  useEffect(() => {
    api.listProducts({ page: 1, size: 100 }).then((r) => {
      setProducts(r?.records || r || [])
      if (!productId && r?.records?.[0]?.id) {
        setProductId(r.records[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (productId) {
      setSearchParams({ productId }, { replace: true })
    }
  }, [productId])

  const loadReviews = async () => {
    if (!productId) return
    setLoading(true)
    try {
      const r = await api.listReviews({ productId, page, size, rating, keyword })
      setReviews(r?.records || [])
      setTotal(r?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  const loadJobs = async () => {
    if (!productId) return
    setJobsLoading(true)
    try {
      const r = await api.listImportJobs({ productId, page: 1, size: 20 })
      setJobs(r?.records || [])
    } finally {
      setJobsLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [productId, page, size, rating, keyword])

  useEffect(() => {
    loadJobs()
  }, [productId])

  const openUpload = () => {
    setUploadProductId(productId)
    setUploadFile(null)
    setUploadResult(null)
    setUploadOpen(true)
  }

  const handleUpload = async () => {
    if (!uploadProductId) {
      message.warning('请选择产品')
      return
    }
    if (!uploadFile) {
      message.warning('请选择 CSV 文件')
      return
    }
    setUploading(true)
    const hide = message.loading('正在解析并导入…', 0)
    try {
      const r = await api.uploadReviews(uploadProductId, uploadFile)
      hide()
      setUploadResult(r)
      message.success(`导入完成：新增 ${r.successCount}，跳过 ${r.skipCount}`)
      // 刷新当前视图
      if (uploadProductId === productId) {
        loadReviews()
        loadJobs()
      }
    } catch (e) {
      hide()
    } finally {
      setUploading(false)
    }
  }

  const draggerProps = {
    name: 'file',
    multiple: false,
    accept: '.csv',
    showUploadList: false,
    beforeUpload: (file) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        message.error('只支持 .csv 文件')
        return Upload.LIST_IGNORE
      }
      if (file.size > 20 * 1024 * 1024) {
        message.error('文件不能超过 20MB')
        return Upload.LIST_IGNORE
      }
      setUploadFile(file)
      return false // 阻止默认上传，自己用 axios
    },
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>评论管理</Title>

      <Card>
        <Space wrap size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Text>产品：</Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 320 }}
              value={productId}
              onChange={(v) => { setProductId(v); setPage(1) }}
              placeholder="选择产品"
              options={products.map((p) => ({
                value: p.id,
                label: `${p.productName} (${p.asin || 'no-asin'})`,
              }))}
            />
            <Select
              allowClear
              placeholder="评分"
              style={{ width: 120 }}
              value={rating}
              onChange={(v) => { setRating(v); setPage(1) }}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: '★'.repeat(n) }))}
            />
            <Input
              allowClear
              placeholder="搜索标题/正文"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onPressEnter={() => { setKeyword(keywordInput); setPage(1) }}
            />
            <Button onClick={() => { setKeyword(keywordInput); setPage(1) }}>搜索</Button>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadReviews}>刷新</Button>
            <Button type="primary" icon={<InboxOutlined />} onClick={openUpload}>
              上传 CSV
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title={`评论列表 (${total})`}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={reviews}
          pagination={{
            current: page,
            pageSize: size,
            total,
            showSizeChanger: true,
            onChange: (p, s) => { setPage(p); setSize(s) },
          }}
          locale={{ emptyText: <Empty description="暂无评论，先上传 CSV 或从 Amazon 抓取" /> }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 70 },
            {
              title: '评分',
              dataIndex: 'rating',
              width: 110,
              render: (v) => v ? (
                <Tag color={ratingColor[v] || 'default'}>
                  <StarFilled style={{ marginRight: 4 }} />{v}
                </Tag>
              ) : '-',
            },
            {
              title: '标题',
              dataIndex: 'reviewTitle',
              width: 220,
              ellipsis: true,
              render: (v) => v ? (
                <Tooltip title={v}>
                  <a onClick={() => setDetail(reviews.find((r) => r.reviewTitle === v))}>{v}</a>
                </Tooltip>
              ) : '-',
            },
            {
              title: '内容',
              dataIndex: 'reviewContent',
              ellipsis: true,
              render: (v) => v ? (
                <Tooltip title={v}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{v.slice(0, 80)}{v.length > 80 ? '…' : ''}</Text>
                </Tooltip>
              ) : '-',
            },
            { title: '来源', dataIndex: 'sourcePlatform', width: 100, render: (v) => <Tag>{v || '-'}</Tag> },
            {
              title: '导入时间',
              dataIndex: 'createdTime',
              width: 170,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
            },
          ]}
        />
      </Card>

      <Card title="导入历史" size="small">
        <Table
          rowKey="id"
          size="small"
          loading={jobsLoading}
          dataSource={jobs}
          pagination={false}
          locale={{ emptyText: <Text type="secondary">暂无导入记录</Text> }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 70 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (v) => {
                const c = { SUCCESS: 'green', FAILED: 'red', PROCESSING: 'blue' }[v] || 'default'
                return <Tag color={c}>{v}</Tag>
              },
            },
            { title: '文件名', dataIndex: 'fileName', ellipsis: true },
            { title: '总数', dataIndex: 'totalCount', width: 80 },
            { title: '新增', dataIndex: 'successCount', width: 80, render: (v) => <Text type="success">{v}</Text> },
            { title: '跳过', dataIndex: 'skipCount', width: 80, render: (v) => <Text type="secondary">{v}</Text> },
            {
              title: '耗时',
              width: 140,
              render: (_, r) => {
                if (!r.startTime || !r.finishTime) return '-'
                const ms = dayjs(r.finishTime).diff(dayjs(r.startTime))
                return `${ms}ms`
              },
            },
            {
              title: '开始',
              dataIndex: 'startTime',
              width: 170,
              render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
            },
            {
              title: '错误',
              dataIndex: 'errorMessage',
              ellipsis: true,
              render: (v) => v ? <Text type="danger">{v}</Text> : '-',
            },
          ]}
        />
      </Card>

      {/* 详情 Modal */}
      <Modal
        title="评论详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        width={640}
      >
        {detail && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              <Rate disabled value={detail.rating || 0} />
              <Tag color={ratingColor[detail.rating] || 'default'}>评分 {detail.rating}</Tag>
              <Tag>{detail.sourcePlatform}</Tag>
            </Space>
            <div>
              <Text type="secondary">标题</Text>
              <Title level={5} style={{ margin: '4px 0' }}>{detail.reviewTitle || '（无标题）'}</Title>
            </div>
            <div>
              <Text type="secondary">内容</Text>
              <Paragraph style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                {detail.reviewContent || '（无内容）'}
              </Paragraph>
            </div>
            <Text type="secondary">
              评论 ID：{detail.reviewId} · 导入时间：{dayjs(detail.createdTime).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          </Space>
        )}
      </Modal>

      {/* 上传 CSV Modal */}
      <Modal
        title="上传评论 CSV"
        open={uploadOpen}
        onCancel={() => !uploading && setUploadOpen(false)}
        onOk={handleUpload}
        okText={uploadResult ? '完成' : '开始导入'}
        okButtonProps={{ disabled: uploading, loading: uploading }}
        cancelButtonProps={{ disabled: uploading }}
        width={560}
        destroyOnClose
      >
        {!uploadResult ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text>目标产品</Text>
              <Select
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                value={uploadProductId}
                onChange={setUploadProductId}
                placeholder="选择产品"
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.productName} (${p.asin || 'no-asin'})`,
                }))}
              />
            </div>

            <div ref={dropRef}>
              <Dragger {...draggerProps} style={{ padding: '8px 0' }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#1677ff' }} />
                </p>
                <p className="ant-upload-text">点击或拖拽 CSV 文件到此处</p>
                <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                  支持列：<Text code>review_id</Text>、<Text code>rating</Text>、<Text code>title</Text>、<Text code>content</Text> · 单文件 ≤ 20MB
                </p>
                {uploadFile && (
                  <div style={{ marginTop: 12 }}>
                    <Tag color="blue" style={{ padding: '4px 8px' }}>
                      已选择：{uploadFile.name}（{(uploadFile.size / 1024).toFixed(1)} KB）
                    </Tag>
                  </div>
                )}
              </Dragger>
            </div>

            <Card size="small" style={{ background: '#fafafa' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                导入逻辑：按 (product_id, review_id) 幂等去重；新增 ≥1 条时自动创建 analysis_job。
              </Text>
            </Card>
          </Space>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              {uploadResult.successCount > 0
                ? <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 32 }} />
                : <CloseCircleTwoTone twoToneColor="#faad14" style={{ fontSize: 32 }} />}
              <Title level={4} style={{ margin: 0 }}>导入完成</Title>
            </Space>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text>总数：<Text strong>{uploadResult.totalCount}</Text> 条</Text>
              <Text>新增：<Text strong style={{ color: '#52c41a' }}>{uploadResult.successCount}</Text> 条</Text>
              <Text>跳过：<Text strong>{uploadResult.skipCount}</Text> 条（重复 review_id）</Text>
              <Text>导入任务 ID：<Text code>{uploadResult.importJobId}</Text></Text>
              {uploadResult.analysisJobId && (
                <Text>已自动创建分析任务 ID：<Text code>{uploadResult.analysisJobId}</Text></Text>
              )}
            </Space>

            {uploadResult.totalCount > 0 && (
              <Progress
                percent={Math.round((uploadResult.successCount / uploadResult.totalCount) * 100)}
                status={uploadResult.successCount > 0 ? 'success' : 'normal'}
              />
            )}
          </Space>
        )}
      </Modal>
    </Space>
  )
}
