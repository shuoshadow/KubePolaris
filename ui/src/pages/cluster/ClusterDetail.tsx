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

  // 刷新所有数据
  const refreshAllData = () => {
    fetchClusterDetail();
    fetchClusterOverview();
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


  // 使用监控图表组件
  const ClusterMonitoring = () => (
    <MonitoringCharts clusterId={id} />
  );

  // Tabs配置
  const tabItems = [
    // {
    //   key: 'overview',
    //   label: (
    //     <span>
    //       <BarChartOutlined />
    //       监控概览
    //     </span>
    //   ),
    //   children: <ClusterMonitoring />,
    // },
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
              <Descriptions.Item label="容器子网">todo cidr（可用/总IP数：1024/4096）</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 统计卡片 */}
          <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 16 }}>
            <Title level={4} style={{ marginBottom: 16 }}>资源概览</Title>
            <Row gutter={[16, 16]}>
              {/* 节点概览 */}
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/clusters/${id}/nodes`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clusters/${id}/nodes`); }}
                        style={{ background: 'linear-gradient(135deg,#20d6b5,#18b47b)', color: '#fff', borderRadius: 12, padding: '16px 20px', textAlign: 'center', cursor: 'pointer' }}>
                        <div style={{ opacity: 0.9, marginBottom: 4 }}>总节点</div>
                        <div style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <DesktopOutlined />
                          {clusterOverview?.nodes?.total || 0}
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/clusters/${id}/pods`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clusters/${id}/pods`); }}
                        style={{ background: 'linear-gradient(135deg,#2d6bff,#1b74f9)', color: '#fff', borderRadius: 12, padding: '16px 20px', textAlign: 'center', cursor: 'pointer' }}>
                        <div style={{ opacity: 0.9, marginBottom: 4 }}>Pod总数</div>
                        <div style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <AppstoreOutlined />
                          {clusterOverview?.pods?.total || 0}
                        </div>
                      </div>
                    </Col>
                  </Row>
              </Col>

              {/* 工作负载概览（仅总数，渐变数字卡） */}
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/clusters/${id}/workloads`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clusters/${id}/workloads`); }}
                  style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)', color: '#fff', borderRadius: 12, padding: '16px 20px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ opacity: 0.9, marginBottom: 4 }}>工作负载总数</div>
                  <div style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <AppstoreOutlined />
                    {
                      (clusterOverview?.deployments || 0) +
                      (clusterOverview?.statefulsets || 0) +
                      (clusterOverview?.daemonsets || 0) +
                      (clusterOverview?.jobs || 0) +
                      (clusterOverview?.rollouts || 0)
                    }
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

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