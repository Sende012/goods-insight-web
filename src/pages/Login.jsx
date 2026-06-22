import { useState, useEffect, useRef } from 'react'
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Tabs,
  message,
  Space,
  Modal,
  Steps,
  Result,
} from 'antd'
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { useNavigate, Navigate } from 'react-router-dom'
import { api, setAuth, getToken } from '../api/client'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('login')

  // 忘记密码弹窗
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState(0)
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resetLoading, setResetLoading] = useState(false)
  const [emailForm] = Form.useForm()
  const [resetForm] = Form.useForm()
  const timerRef = useRef(null)

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [countdown])

  // 已登录直接跳走
  if (getToken()) return <Navigate to="/" replace />

  const onLogin = async (values) => {
    setLoading(true)
    try {
      const res = await api.login(values.account, values.password)
      setAuth(res.token, {
        userId: res.userId,
        username: res.username,
        email: res.email,
      })
      message.success(`欢迎回来，${res.username}`)
      navigate('/', { replace: true })
    } catch (e) {
      // 拦截器已提示
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values) => {
    setLoading(true)
    try {
      await api.register({
        username: values.username,
        password: values.password,
        email: values.email,
      })
      message.success('注册成功，请登录')
      setTab('login')
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const openForgot = () => {
    setForgotStep(0)
    setForgotEmail('')
    setCountdown(0)
    emailForm.resetFields()
    resetForm.resetFields()
    setForgotOpen(true)
  }

  const closeForgot = () => {
    setForgotOpen(false)
  }

  const onSendCode = async () => {
    try {
      const v = await emailForm.validateFields()
      setSendLoading(true)
      await api.sendResetCode(v.email)
      setForgotEmail(v.email)
      message.success('验证码已发送，请查收邮箱')
      setForgotStep(1)
      setCountdown(60)
    } catch (e) {
      // 表单校验失败 或 拦截器已提示
    } finally {
      setSendLoading(false)
    }
  }

  const onSubmitReset = async () => {
    try {
      const v = await resetForm.validateFields()
      setResetLoading(true)
      await api.resetPassword(v.email || forgotEmail, v.code, v.newPassword)
      setForgotStep(2)
    } catch (e) {
      // ignore
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: 4 }}>
              Goods Insight
            </Title>
            <Text type="secondary">亚马逊 AI 洞察平台</Text>
          </div>

          <Tabs
            activeKey={tab}
            onChange={setTab}
            centered
            items={[
              {
                key: 'login',
                label: '登录',
                children: (
                  <Form layout="vertical" onFinish={onLogin} autoComplete="off">
                    <Form.Item
                      name="account"
                      label="账号"
                      rules={[{ required: true, message: '请输入账号' }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="用户名 / 邮箱"
                        size="large"
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                        size="large"
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 8 }}>
                      <div style={{ textAlign: 'right' }}>
                        <Button type="link" size="small" onClick={openForgot} style={{ padding: 0 }}>
                          忘记密码？
                        </Button>
                      </div>
                    </Form.Item>
                    <Form.Item style={{ marginTop: 8 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        size="large"
                      >
                        登录
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: '注册',
                children: (
                  <Form layout="vertical" onFinish={onRegister} autoComplete="off">
                    <Form.Item
                      name="username"
                      label="用户名"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, message: '至少 3 个字符' },
                      ]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '邮箱格式不对' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="email@example.com" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 6, message: '至少 6 个字符' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码（至少 6 位）"
                        size="large"
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        size="large"
                      >
                        注册
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      {/* 忘记密码弹窗（分步） */}
      <Modal
        title="重置密码"
        open={forgotOpen}
        onCancel={closeForgot}
        footer={null}
        width={440}
        destroyOnClose
      >
        <Steps
          current={forgotStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: '输入邮箱' },
            { title: '验证码' },
            { title: '完成' },
          ]}
        />

        {forgotStep === 0 && (
          <Form form={emailForm} layout="vertical" onFinish={onSendCode}>
            <Form.Item
              name="email"
              label="注册邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '邮箱格式不对' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="email@example.com" size="large" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={sendLoading}
                block
                size="large"
              >
                发送验证码
              </Button>
            </Form.Item>
          </Form>
        )}

        {forgotStep === 1 && (
          <Form form={resetForm} layout="vertical" onFinish={onSubmitReset}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              验证码已发送至 <Text strong>{forgotEmail}</Text>
            </Text>
            <Form.Item name="email" initialValue={forgotEmail} hidden>
              <Input />
            </Form.Item>
            <Form.Item
              name="code"
              label="验证码"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '6 位数字' },
              ]}
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder="6 位数字"
                size="large"
                maxLength={6}
                suffix={
                  <Button
                    type="link"
                    size="small"
                    disabled={countdown > 0}
                    onClick={onSendCode}
                    style={{ padding: 0 }}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
                  </Button>
                }
              />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '至少 6 个字符' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="新密码" size="large" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请再次输入新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="再次输入" size="large" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={resetLoading}
                block
                size="large"
              >
                重置密码
              </Button>
            </Form.Item>
          </Form>
        )}

        {forgotStep === 2 && (
          <Result
            status="success"
            title="密码已重置"
            subTitle="请使用新密码登录"
            extra={[
              <Button key="login" type="primary" onClick={() => { closeForgot(); setTab('login') }}>
                返回登录
              </Button>,
            ]}
          />
        )}
      </Modal>
    </div>
  )
}