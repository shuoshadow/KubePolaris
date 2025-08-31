import React from 'react';
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
  DatabaseOutlined,
  SafetyOutlined,
  MonitorOutlined,
  FileTextOutlined,
  AlertOutlined,
  DollarOutlined,
  EyeOutlined,
  UploadOutlined,
  ApiOutlined,
  CloudServerOutlined,
  HddOutlined,
  KeyOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { MenuProps as AntMenuProps } from 'antd';
import KubernetesIcon from '../components/KubernetesIcon';

const { Header, Sider, Content } = Layout;

// 自定义滚动条和菜单样式
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #d9d9d9;
    border-radius: 3px;
    transition: background-color 0.2s;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #bfbfbf;
  }
  
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #d9d9d9 transparent;
  }
  
  .compact-menu .ant-menu-item {
    height: 32px !important;
    line-height: 1.2 !important;
    margin: 2px 0 !important;
    padding: 6px 12px !important;
    font-size: 13px !important;
  }
  
  .compact-menu .ant-menu-submenu-title {
    height: 32px !important;
    line-height: 1.2 !important;
    margin: 2px 0 !important;
    padding: 6px 12px !important;
    font-size: 13px !important;
  }
  
  .compact-menu .ant-menu-item-group-title {
    font-size: 12px !important;
    line-height: 1.2 !important;
    padding: 4px 12px !important;
  }
  
  .compact-menu .ant-menu-submenu .ant-menu-item {
    height: 28px !important;
    line-height: 1.2 !important;
    margin: 1px 0 !important;
    padding: 4px 12px 4px 32px !important;
    font-size: 12px !important;
  }
  
  .compact-menu .ant-menu-submenu-arrow {
    font-size: 10px !important;
  }
  
  .compact-menu .ant-menu-submenu-open > .ant-menu-submenu-title {
    background-color: transparent !important;
    color: rgba(0, 0, 0, 0.88) !important;
  }
  
  .compact-menu .ant-menu-submenu-open > .ant-menu-submenu-title:hover {
    background-color: #f5f5f5 !important;
  }
  
  .compact-menu .ant-menu-submenu-open .ant-menu-submenu-arrow {
    display: none !important;
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = scrollbarStyles;
  if (!document.head.querySelector('style[data-scrollbar]')) {
    styleElement.setAttribute('data-scrollbar', 'true');
    document.head.appendChild(styleElement);
  }
}
const { Search } = Input;

type MenuItem = Required<AntMenuProps>['items'][number];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 判断是否在集群详情页面
  const isClusterDetailPage = () => {
    return location.pathname.match(/\/clusters\/[^\/]+\//);
  };
  
  // 获取所有需要展开的菜单键
  const getOpenKeys = () => {
    if (isClusterDetailPage()) {
      return ['kubernetes-resources', 'cluster', 'cloud-native-observability', 'cloud-native-cost'];
    }
    return [];
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    
    // 集群详情页面的路由匹配
    if (path.match(/\/clusters\/[^\/]+\/overview/)) return ['cluster-overview'];
    if (path.match(/\/clusters\/[^\/]+\/workloads/)) return ['k8s-workloads'];
    if (path.match(/\/clusters\/[^\/]+\/services/)) return ['k8s-services'];
    if (path.match(/\/clusters\/[^\/]+\/storage/)) return ['k8s-storage'];
    if (path.match(/\/clusters\/[^\/]+\/configs/)) return ['k8s-configs'];
    if (path.match(/\/clusters\/[^\/]+\/namespaces/)) return ['k8s-namespaces'];
    if (path.match(/\/clusters\/[^\/]+\/nodes/)) return ['cluster-nodes'];
    if (path.match(/\/clusters\/[^\/]+\/config-center/)) return ['cluster-config'];
    if (path.match(/\/clusters\/[^\/]+\/upgrade/)) return ['cluster-upgrade'];
    if (path.match(/\/clusters\/[^\/]+\/plugins/)) return ['cluster-plugins'];
    if (path.match(/\/clusters\/[^\/]+\/monitoring/)) return ['observability-monitoring'];
    if (path.match(/\/clusters\/[^\/]+\/logs/)) return ['observability-logs'];
    if (path.match(/\/clusters\/[^\/]+\/alerts/)) return ['observability-alerts'];
    if (path.match(/\/clusters\/[^\/]+\/cost-insights/)) return ['cost-insights'];
    
    // 主页面的路由匹配
    if (path.startsWith('/clusters') && !path.match(/\/clusters\/[^\/]+\//)) return ['cluster-management'];
    if (path.startsWith('/permissions')) return ['permission-management'];
    
    return ['overview'];
  };

  // 主页面侧边栏菜单
  const mainMenuItems: MenuItem[] = [
    {
      key: 'overview',
      label: '总览',
      onClick: () => navigate('/'),
    },
    {
      key: 'cluster-management',
      label: '集群管理',
      onClick: () => navigate('/clusters'),
    },
    {
      key: 'permission-management',
      label: '权限管理',
      onClick: () => navigate('/permissions'),
    },
  ];

  // 集群详情页侧边栏菜单
  const clusterDetailMenuItems: MenuItem[] = [
    {
      key: 'cluster-overview',
      label: '概览',
      onClick: () => {
        const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
        if (clusterMatch) {
          navigate(`/clusters/${clusterMatch[1]}/overview`);
        }
      },
    },
    {
      key: 'kubernetes-resources',
      label: 'Kubernetes资源',
      children: [
        {
          key: 'k8s-workloads',
          icon: <RocketOutlined />,
          label: '工作负载',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/workloads`);
            }
          },
        },
        {
          key: 'k8s-services',
          icon: <ApiOutlined />,
          label: '服务',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/services`);
            }
          },
        },
        {
          key: 'k8s-storage',
          icon: <HddOutlined />,
          label: '存储',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/storage`);
            }
          },
        },
        {
          key: 'k8s-configs',
          icon: <KeyOutlined />,
          label: '配置与密钥',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/configs`);
            }
          },
        },
        {
          key: 'k8s-namespaces',
          icon: <TagsOutlined />,
          label: '命名空间',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/namespaces`);
            }
          },
        },
      ],
    },
    {
      key: 'cluster',
      label: '集群',
      children: [
        {
          key: 'cluster-nodes',
          icon: <DesktopOutlined />,
          label: '节点管理',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/nodes`);
            }
          },
        },
        {
          key: 'cluster-config',
          icon: <SettingOutlined />,
          label: '配置中心',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/config-center`);
            }
          },
        },
        {
          key: 'cluster-upgrade',
          icon: <UploadOutlined />,
          label: '集群升级',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/upgrade`);
            }
          },
        },
        {
          key: 'cluster-plugins',
          icon: <AppstoreOutlined />,
          label: '插件中心',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/plugins`);
            }
          },
        },
      ],
    },
    {
      key: 'cloud-native-observability',
      label: '云原生观测',
      children: [
        {
          key: 'observability-monitoring',
          icon: <BarChartOutlined />,
          label: '监控中心',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/monitoring`);
            }
          },
        },
        {
          key: 'observability-logs',
          icon: <FileTextOutlined />,
          label: '日志中心',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/logs`);
            }
          },
        },
        {
          key: 'observability-alerts',
          icon: <AlertOutlined />,
          label: '告警中心',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/alerts`);
            }
          },
        },
      ],
    },
    {
      key: 'cloud-native-cost',
      label: '云原生成本治理',
      children: [
        {
          key: 'cost-insights',
          icon: <EyeOutlined />,
          label: '成本洞察',
          onClick: () => {
            const clusterMatch = location.pathname.match(/\/clusters\/([^\/]+)/);
            if (clusterMatch) {
              navigate(`/clusters/${clusterMatch[1]}/cost-insights`);
            }
          },
        },
      ],
    },
  ];

  // 根据当前页面选择对应的菜单
  const menuItems = isClusterDetailPage() ? clusterDetailMenuItems : mainMenuItems;

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
          width={192}
          style={{
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
            zIndex: 999,
            background: '#fafafa',
            boxShadow: '2px 0 12px 0 rgba(0, 0, 0, 0.08)',
            borderRight: '1px solid #e0e0e0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'thin',
              scrollbarColor: '#d9d9d9 transparent',
              padding: '6px 0',
            }}
            className="custom-scrollbar"
          >
            <Menu
              mode="inline"
              selectedKeys={getSelectedKeys()}
              openKeys={getOpenKeys()}
              items={menuItems}
              className="compact-menu"
              style={{ 
                height: 'auto',
                minHeight: '100%',
                borderRight: 0,
                background: 'transparent',
                padding: '6px 8px',
              }}
            />
          </div>
        </Sider>

        <Layout style={{ marginLeft: 192 }}>
          <Content
            style={{
              margin: '24px 24px',
              padding: 24,
              minHeight: 'calc(100vh - 112px)',
              background: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
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