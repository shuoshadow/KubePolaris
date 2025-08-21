import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Input,
  Badge,
  Dropdown,
  Avatar,
  Space,
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  ClusterOutlined,
  DesktopOutlined,
  RocketOutlined,
  AppstoreOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  PlusOutlined,
  ImportOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps as AntMenuProps } from 'antd';
import KubernetesIcon from '../components/KubernetesIcon';

const { Header, Sider, Content } = Layout;
const { Search } = Input;

type MenuItem = Required<AntMenuProps>['items'][number];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/clusters')) return ['clusters'];
    if (path.startsWith('/nodes')) return ['nodes'];
    if (path.startsWith('/workloads')) return ['workloads'];
    if (path.startsWith('/pods')) return ['pods'];
    if (path.startsWith('/search')) return ['search'];
    return ['dashboard'];
  };

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: '仪表盘',
      onClick: () => navigate('/'),
    },
    {
      key: 'cluster-group',
      icon: <KubernetesIcon size={16} color="#326ce5" />,
      label: '集群管理',
      children: [
        {
          key: 'clusters',
          icon: <UnorderedListOutlined />,
          label: '集群列表',
          onClick: () => navigate('/clusters'),
        },
        {
          key: 'cluster-monitor',
          icon: <BarChartOutlined />,
          label: '集群监控',
        },
      ],
    },
    {
      key: 'node-group',
      icon: <DesktopOutlined />,
      label: '节点管理',
      children: [
        {
          key: 'nodes',
          icon: <UnorderedListOutlined />,
          label: '节点列表',
          onClick: () => navigate('/nodes'),
        },
        {
          key: 'node-operations',
          icon: <SettingOutlined />,
          label: '节点操作',
          onClick: () => navigate('/nodes/operations'),
        },
        {
          key: 'node-monitor',
          icon: <BarChartOutlined />,
          label: '节点监控',
        },
      ],
    },
    {
      key: 'workload-group',
      icon: <RocketOutlined />,
      label: '工作负载',
      children: [
        {
          key: 'workloads',
          icon: <UnorderedListOutlined />,
          label: '工作负载列表',
          onClick: () => navigate('/workloads'),
        },
      ],
    },
    {
      key: 'pod-group',
      icon: <AppstoreOutlined />,
      label: 'Pod管理',
      children: [
        {
          key: 'pods',
          icon: <UnorderedListOutlined />,
          label: 'Pod列表',
          onClick: () => navigate('/pods'),
        },
      ],
    },
    {
      key: 'search',
      icon: <SearchOutlined />,
      label: '全局搜索',
      onClick: () => navigate('/search'),
    },
  ];

  const userMenuItems: AntMenuProps['items'] = [
    {
      key: 'profile',
      label: '个人设置',
    },
    {
      key: 'logout',
      label: '退出登录',
    },
  ];

  const handleSearch = (value: string) => {
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          zIndex: 1000,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 16 }}>
            <img 
              src="/src/assets/kubernetes.png" 
              alt="Kubernetes" 
              style={{ width: '32px', height: '32px', marginRight: 8 }} 
            />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>K8s管理平台</span>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: 600, margin: '0 24px' }}>
          <Search
            placeholder="搜索Pod、Deployment、Service..."
            allowClear
            enterButton={<SearchOutlined />}
            size="middle"
            onSearch={handleSearch}
            style={{ width: '100%' }}
          />
        </div>

        <Space size="middle">
          <Badge count={3} size="small">
            <Button type="text" icon={<BellOutlined />} size="large" />
          </Badge>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>Admin</span>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Layout style={{ marginTop: 64 }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            position: 'fixed',
            left: 0,
            top: 60,
            bottom: 0,
            zIndex: 999,
            background: '#ffffff',
            boxShadow: '2px 0 8px 0 rgba(0, 0, 0, 0.06)',
            borderRight: '1px solid #e8eaec',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            items={menuItems}
            style={{ 
              height: '100%', 
              borderRight: 0,
              background: '#ffffff',
              padding: '12px 0'
            }}
          />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
          <Content
            style={{
              margin: '24px 16px',
              padding: 24,
              minHeight: 280,
              background: '#f0f2f5',
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;