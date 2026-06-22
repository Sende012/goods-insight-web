import { Layout, Menu, Typography, theme, Avatar, Dropdown, Space } from 'antd'
import {
  DashboardOutlined,
  PlusCircleOutlined,
  SwapOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CloudDownloadOutlined,
  CommentOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUser, clearAuth } from '../api/client'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '概览' },
  { key: '/analysis/new', icon: <PlusCircleOutlined />, label: '新建分析' },
  { key: '/compare', icon: <SwapOutlined />, label: '竞品对比' },
  { key: '/category', icon: <AppstoreOutlined />, label: '类目扫描' },
  { key: '/jobs', icon: <UnorderedListOutlined />, label: '任务中心' },
  { key: '/crawl-tasks', icon: <CloudDownloadOutlined />, label: '爬虫任务' },
  { key: '/reviews', icon: <CommentOutlined />, label: '评论管理' },
]

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const user = getCurrentUser()

  const selectedKey =
    menuItems.find((m) => m.key !== '/' && location.pathname.startsWith(m.key))?.key ||
    (location.pathname === '/' ? '/' : '/')

  const onLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') onLogout()
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark" breakpoint="lg" collapsedWidth="0">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            Goods Insight
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: '0 24px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Title level={4} style={{ margin: 0, lineHeight: '64px' }}>
            亚马逊 AI 洞察平台
          </Title>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <span>{user?.username || '未登录'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}