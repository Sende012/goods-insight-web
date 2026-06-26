import { Layout, Menu, Typography, theme, Avatar, Dropdown, Space } from 'antd'
import {
  DashboardOutlined,
  PlusCircleOutlined,
  SwapOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CloudDownloadOutlined,
  CommentOutlined,
  CalculatorOutlined,
  LineChartOutlined,
  ApartmentOutlined,
  BarcodeOutlined,
  BulbOutlined,
  SafetyOutlined,
  FileProtectOutlined,
  RobotOutlined,
  FireOutlined,
  AimOutlined,
  UserOutlined,
  LogoutOutlined,
  ApiOutlined,
  ShopOutlined,
  SettingOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getCurrentUser, clearAuth } from '../api/client'

const { Header, Sider, Content } = Layout
const { Title } = Typography

// 菜单分组：公共顶级 + 4 个子菜单
// 子菜单 parent key 不会触发 navigate（onClick 内过滤）
const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '概览' },

  // 公共运营
  {
    key: 'group-ops',
    icon: <SettingOutlined />,
    label: '运营中心',
    children: [
      { key: '/jobs',        icon: <UnorderedListOutlined />, label: '任务中心' },
      { key: '/reviews',     icon: <CommentOutlined />,       label: '评论管理' },
      { key: '/crawl-tasks', icon: <CloudDownloadOutlined />, label: '爬虫任务' },
    ],
  },

  // 亚马逊选品（V1.0 / V2.0）
  {
    key: 'group-amazon',
    icon: <GlobalOutlined />,
    label: '亚马逊选品',
    children: [
      { key: '/analysis/new',  icon: <PlusCircleOutlined />,   label: '新建分析' },
      { key: '/compare',       icon: <SwapOutlined />,         label: '竞品对比' },
      { key: '/category',      icon: <AppstoreOutlined />,     label: '类目扫描' },
      { key: '/categories',    icon: <ApartmentOutlined />,    label: '类目库' },
      { key: '/asin-library',  icon: <BarcodeOutlined />,      label: 'ASIN 库' },
      { key: '/profit',        icon: <CalculatorOutlined />,   label: '利润估算' },
      { key: '/trend',         icon: <LineChartOutlined />,    label: '趋势预警' },
      { key: '/risk',          icon: <SafetyOutlined />,       label: '风险评估' },
      { key: '/patents',       icon: <FileProtectOutlined />,  label: '专利库' },
      { key: '/ideas',         icon: <BulbOutlined />,         label: 'AI 创意' },
    ],
  },

  // 闲鱼选品（V3.0）
  {
    key: 'group-xianyu',
    icon: <ShopOutlined />,
    label: '闲鱼选品',
    children: [
      { key: '/xianyu-scan',        icon: <ShopOutlined />,  label: '闲鱼扫描' },
      { key: '/xianyu-item-detail', icon: <ShopOutlined />,  label: '商品详情' },
      { key: '/xianyu-seller',      icon: <UserOutlined />,  label: '卖家分析' },
    ],
  },

  // 决策中心（V2.0 P3，跨平台）
  {
    key: 'group-decision',
    icon: <AimOutlined />,
    label: '决策中心',
    children: [
      { key: '/agent',           icon: <RobotOutlined />, label: '决策代理' },
      { key: '/coach',           icon: <FireOutlined />,  label: 'AI 教练' },
      { key: '/selection-coach', icon: <AimOutlined />,   label: '决策报告' },
      { key: '/open-platform',   icon: <ApiOutlined />,   label: 'API 开放平台' },
    ],
  },
]

// 父级 key 集合（点击不导航）
const PARENT_KEYS = new Set(menuItems.filter((m) => m.children).map((m) => m.key))

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const user = getCurrentUser()

  // 选中叶子项 + 自动展开其父级
  const flatItems = menuItems.flatMap((m) => (m.children ? m.children : [m]))
  const matched = flatItems
    .filter((m) => m.key !== '/' && location.pathname.startsWith(m.key))
    .sort((a, b) => b.key.length - a.key.length)[0]
  const selectedKey = matched?.key || (location.pathname === '/' ? '/' : '/')
  const selectedParent = menuItems.find((m) => m.children?.some((c) => c.key === selectedKey))

  // 自动展开当前所在组 + 用户手动展开过的组
  const [manualOpenKeys, setManualOpenKeys] = useState([])
  const openKeys = Array.from(new Set([
    ...(selectedParent ? [selectedParent.key] : []),
    ...manualOpenKeys,
  ]))

  const onOpenChange = (keys) => {
    const auto = selectedParent ? [selectedParent.key] : []
    setManualOpenKeys(keys.filter((k) => !auto.includes(k)))
  }

  const onMenuClick = ({ key }) => {
    if (PARENT_KEYS.has(key)) return // 父级只展开/折叠，不导航
    navigate(key)
  }

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
          openKeys={openKeys}
          onOpenChange={onOpenChange}
          items={menuItems}
          onClick={onMenuClick}
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