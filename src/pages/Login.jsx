import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Tabs, message, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Navigate } from 'react-router-dom'
import { api, setAuth, getToken } from '../api/client'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('login')

  // 已登录直接跳走
  if (getToken()) return <Navigate to="/" replace />

  const onLogin = async (values) => {
    setLoading(true)
    try {
      const res = await api.login(values.account, values.password)
      // res 已经被响应拦截器 normalize 过：{ token, userId, username, email, defaultWorkspaceId, expiresAt }
      setAuth(res.token, {
        userId: res.userId,
        username: res.username,
        email: res.email,
      })
      message.success(`欢迎回来，${res.username}`)
      navigate('/', { replace: true })
    } catch (e) {
      // 拦截器已经弹过 message
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
            <Text type="secondary">亚马逊评论 AI 洞察平台</Text>
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
                    <Form.Item>
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
    </div>
  )
}