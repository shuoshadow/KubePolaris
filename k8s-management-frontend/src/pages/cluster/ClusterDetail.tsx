import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  Button,
  Space,
  Tabs,
  Table,
  Alert,
  Typography,
  Descriptions,
  Badge,
  Tooltip,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  BarChartOutlined,
  DesktopOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClusterOutlined,
  CalendarOutlined,
  ApiOutlined,
  CodeOutlined,
  FolderFilled,
  CloudServerOutlined,
} from '@ant-design/icons';
import KubectlTerminal from '../../components/KubectlTerminal';
import MonitoringCharts from '../../components/MonitoringCharts';
import type { ColumnsType } from 'antd/es/table';
import type { Cluster, Node, Pod } from '../../types';
import { clusterService } from '../../services/clusterService';

const { Title, Text } = Typography;

const ClusterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [clusterOverview, setClusterOverview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingPods, setLoadingPods] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // 获取集群详情
  const fetchClusterDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await clusterService.getCluster(id);
      setCluster(response.data);
    } catch (error) {
      message.error('获取集群详情失败');
      console.error('获取集群详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取集群概览信息
  const fetchClusterOverview = async () => {
    if (!id) return;
    
    setLoadingOverview(true);
    try {
      const response = await clusterService.getClusterOverview(id);
      setClusterOverview(response.data);
    } catch (error) {
      message.error('获取集群概览信息失败');
      console.error('获取集群概览信息失败:', error);
    } finally {
      setLoadingOverview(false);
    }
  };

  // 获取节点列表 - 暂时使用模拟数据，后续可以添加到clusterService中
  const fetchNodes = async () => {
    if (!id) return;
    
    setLoadingNodes(true);
    try {
      // 这里应该使用真实API，暂时使用模拟数据
      const mockNodes: Node[] = [
        {
          id: '1',
          name: 'master-node-1',
          clusterId: id || '',
          status: 'Ready',
          roles: ['master', 'control-plane'],
          version: 'v1.28.2',
          osImage: 'Ubuntu 20.04.6 LTS',
          kernelVersion: '5.4.0-150-generic',
          containerRuntime: 'containerd://1.6.21',
          cpuCapacity: '4',
          memoryCapacity: '8Gi',
          cpuUsage: 45,
          memoryUsage: 62,
          podCount: 15,
          maxPods: 110,
          conditions: [],
          taints: [],
          createdAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          name: 'worker-node-1',
          clusterId: id || '',
          status: 'Ready',
          roles: ['worker'],
          version: 'v1.28.2',
          osImage: 'Ubuntu 20.04.6 LTS',
          kernelVersion: '5.4.0-150-generic',
          containerRuntime: 'containerd://1.6.21',
          cpuCapacity: '8',
          memoryCapacity: '16Gi',
          cpuUsage: 78,
          memoryUsage: 85,
          podCount: 25,
          maxPods: 110,
          conditions: [],
          taints: [],
          createdAt: '2024-01-15T10:35:00Z',
        },
      ];
      setNodes(mockNodes);
    } catch (error) {
      console.error('获取节点列表失败:', error);
      setNodes([]);
    } finally {
      setLoadingNodes(false);
    }
  };

  // 获取Pod列表 - 暂时使用模拟数据，后续可以添加到clusterService中
  const fetchPods = async () => {
    if (!id) return;
    
    setLoadingPods(true);
    try {
      // 这里应该使用真实API，暂时使用模拟数据
      const mockPods: Pod[] = [
        {
          id: '1',
          name: 'nginx-deployment-7d5c6d8b4f-abc123',
          namespace: 'default',
          clusterId: id || '',
          nodeName: 'worker-node-1',
          status: 'Running',
          phase: 'Running',
          restartCount: 0,
          cpuUsage: 0.1,
          memoryUsage: 64,
          containers: [
            {
              name: 'nginx',
              image: 'nginx:1.21',
              ready: true,
              restartCount: 0,
              state: { running: { startedAt: '2024-01-15T10:40:00Z' } },
            },
          ],
          labels: { app: 'nginx', version: 'v1' },
          createdAt: '2024-01-15T10:40:00Z',
        },
      ];
      setPods(mockPods);
    } catch (error) {
      console.error('获取Pod列表失败:', error);
      setPods([]);
    } finally {
      setLoadingPods(false);
    }
  };

  // 刷新所有数据
  const refreshAllData = () => {
    fetchClusterDetail();
    fetchClusterOverview();
    fetchNodes();
    fetchPods();
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      healthy: { color: 'success', icon: <CheckCircleOutlined />, text: '健康' },
      Ready: { color: 'success', icon: <CheckCircleOutlined />, text: '就绪' },
      Running: { color: 'success', icon: <CheckCircleOutlined />, text: '运行中' },
      unhealthy: { color: 'error', icon: <ExclamationCircleOutlined />, text: '异常' },
      NotReady: { color: 'error', icon: <ExclamationCircleOutlined />, text: '未就绪' },
      unknown: { color: 'default', icon: <ExclamationCircleOutlined />, text: '未知' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 节点表格列定义
  const nodeColumns: ColumnsType<Node> = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <DesktopOutlined style={{ color: '#1890ff' }} />
          <a onClick={() => navigate(`/nodes/${text}`)}>{text}</a>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <Space>
          {roles.map(role => (
            <Tag key={role} color={role === 'master' ? 'gold' : 'blue'}>
              {role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'CPU使用率',
      dataIndex: 'cpuUsage',
      key: 'cpuUsage',
      render: (usage) => (
        <Progress
          percent={usage}
          size="small"
          status={usage > 80 ? 'exception' : usage > 60 ? 'active' : 'success'}
        />
      ),
    },
    {
      title: '内存使用率',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      render: (usage) => (
        <Progress
          percent={usage}
          size="small"
          status={usage > 80 ? 'exception' : usage > 60 ? 'active' : 'success'}
        />
      ),
    },
    {
      title: 'Pod数量',
      key: 'podCount',
      render: (_, record) => `${record.podCount}/${record.maxPods}`,
    },
  ];

  // Pod表格列定义
  const podColumns: ColumnsType<Pod> = [
    {
      title: 'Pod名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <AppstoreOutlined style={{ color: '#52c41a' }} />
          <a onClick={() => navigate(`/pods/${record.namespace}/${text}`)}>{text}</a>
        </Space>
      ),
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace',
      render: (namespace) => <Tag color="blue">{namespace}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '节点',
      dataIndex: 'nodeName',
      key: 'nodeName',
    },
    {
      title: '重启次数',
      dataIndex: 'restartCount',
      key: 'restartCount',
      render: (count) => (
        <Badge
          count={count}
          style={{ backgroundColor: count > 0 ? '#faad14' : '#52c41a' }}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => new Date(time).toLocaleString(),
    },
  ];

  // 使用监控图表组件
  const ClusterMonitoring = () => (
    <MonitoringCharts clusterId={id} />
  );

  // Tabs配置
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined />
          监控概览
        </span>
      ),
      children: <ClusterMonitoring />,
    },
    {
      key: 'nodes',
      label: (
        <span>
          <DesktopOutlined />
          节点 ({nodes.length})
        </span>
      ),
      children: (
        <Table
          columns={nodeColumns}
          dataSource={nodes}
          rowKey="id"
          pagination={false}
          loading={loadingNodes}
          locale={{ emptyText: '暂无节点数据' }}
        />
      ),
    },
    {
      key: 'pods',
      label: (
        <span>
          <AppstoreOutlined />
          Pod ({pods.length})
        </span>
      ),
      children: (
        <Table
          columns={podColumns}
          dataSource={pods}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个Pod`,
          }}
          loading={loadingPods}
          locale={{ emptyText: '暂无Pod数据' }}
        />
      ),
    },
    {
      key: 'terminal',
      label: (
        <span>
          <CodeOutlined />
          Kubectl终端
        </span>
      ),
      children: (
        <KubectlTerminal
          clusterId={id || ''}
          namespace="default"
        />
      ),
    },
    {
      key: 'events',
      label: '事件',
      children: (
        <Alert
          message="集群事件"
          description="这里将显示集群的最新事件和日志信息"
          type="info"
          showIcon
        />
      ),
    },
  ];

  useEffect(() => {
    refreshAllData();
  }, [id]);

  if (!cluster && !loading) {
    return (
      <Alert
        message="集群不存在"
        description="请检查集群ID是否正确"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/clusters')}
            style={{ marginRight: 16 }}
          >
            返回集群列表
          </Button>
          <div style={{ flex: 1 }}>
            <Title level={2} style={{ margin: 0 }}>
              <ClusterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              {cluster?.name || 'Loading...'}
            </Title>
            <Text type="secondary">集群详细信息和监控数据</Text>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                refreshAllData();
              }}
              loading={loading}
            >
              刷新
            </Button>
            <Button icon={<BarChartOutlined />} type="primary">
              监控面板
            </Button>
          </Space>
        </div>
      </div>

      {cluster && (
        <>
          {/* 集群基本信息 */}
          <Card style={{ marginBottom: 24 }}>
            <Descriptions title="基本信息" column={3}>
              <Descriptions.Item label="集群名称">{cluster.name}</Descriptions.Item>
              <Descriptions.Item label="版本">{cluster.version}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(cluster.status)}
              </Descriptions.Item>
              <Descriptions.Item label="API Server">
                <Space>
                  <ApiOutlined />
                  <Text code>{cluster.apiServer}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                <Space>
                  <CalendarOutlined />
                  {new Date(cluster.createdAt).toLocaleString()}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="节点"
                  value={clusterOverview?.nodes?.total || 0}
                  prefix={<DesktopOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                  loading={loadingOverview}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="命名空间"
                  value={clusterOverview?.namespaces?.total || 0}
                  prefix={<FolderFilled />}
                  valueStyle={{ color: '#fa8c16' }}
                  loading={loadingOverview}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Service"
                  value={clusterOverview?.services?.total || 0}
                  prefix={<CloudServerOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                  loading={loadingOverview}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Pod"
                  value={clusterOverview?.pods?.total || 0}
                  prefix={<AppstoreOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                  loading={loadingOverview}
                />
              </Card>
            </Col>
          </Row>

          {/* 详细信息标签页 */}
          <Card>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={tabItems}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default ClusterDetail;