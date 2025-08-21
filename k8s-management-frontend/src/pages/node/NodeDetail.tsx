import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Row,
  Col,
  Button,
  Space,
  Tabs,
  Tag,
  Statistic,
  Progress,
  Descriptions,
  Table,
  Divider,
  Badge,
  Tooltip,
  Input,
  Modal,
  message,
  Dropdown,
  Menu,
  Result,
  Empty,
  Select,
  Alert,
  Checkbox,
  InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DesktopOutlined,
  CodeOutlined,
  EditOutlined,
  SettingOutlined,
  DownOutlined,
  PauseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { nodeService } from '../../services/nodeService';
import type { Node, NodeTaint, Pod, NodeCondition } from '../../types';
import type { ColumnsType } from 'antd/es/table';
import KubectlTerminal from '../../components/KubectlTerminal';
import MonitoringCharts from '../../components/MonitoringCharts';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const NodeDetail: React.FC = () => {
  const { clusterId, nodeName } = useParams<{ clusterId: string; nodeName: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [node, setNode] = useState<Node | null>(null);
  const [pods, setPods] = useState<Pod[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingPods, setLoadingPods] = useState(false);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [taintModalVisible, setTaintModalVisible] = useState(false);
  const [newLabelKey, setNewLabelKey] = useState('');
  const [newLabelValue, setNewLabelValue] = useState('');
  const [newTaintKey, setNewTaintKey] = useState('');
  const [newTaintValue, setNewTaintValue] = useState('');
  const [newTaintEffect, setNewTaintEffect] = useState<'NoSchedule' | 'PreferNoSchedule' | 'NoExecute'>('NoSchedule');
  const [drainModalVisible, setDrainModalVisible] = useState(false);
  const [drainOptions, setDrainOptions] = useState({
    ignoreDaemonSets: true,
    deleteLocalData: false,
    force: false,
    gracePeriodSeconds: 30,
  });

  // 获取节点详情
  const fetchNodeDetail = async () => {
    if (!clusterId || !nodeName) return;
    
    setLoading(true);
    try {
      const response = await nodeService.getNode(clusterId, nodeName);
      setNode(response.data);
    } catch (error) {
      console.error('获取节点详情失败:', error);
      message.error('获取节点详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取节点上的Pod列表 - 暂时使用模拟数据，后续可以添加到nodeService中
  const fetchNodePods = async () => {
    if (!clusterId || !nodeName) return;
    
    setLoadingPods(true);
    try {
      // 这里应该使用真实API，暂时使用模拟数据
      const mockPods: Pod[] = [
        {
          id: '1',
          name: 'nginx-deployment-7d5c6d8b4f-abc123',
          namespace: 'default',
          clusterId: clusterId || '',
          nodeName: nodeName || '',
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
        {
          id: '2',
          name: 'api-server-5d7c9d4b3f-def456',
          namespace: 'kube-system',
          clusterId: clusterId || '',
          nodeName: nodeName || '',
          status: 'Running',
          phase: 'Running',
          restartCount: 0,
          cpuUsage: 0.2,
          memoryUsage: 128,
          containers: [
            {
              name: 'api-server',
              image: 'k8s.gcr.io/kube-apiserver:v1.28.2',
              ready: true,
              restartCount: 0,
              state: { running: { startedAt: '2024-01-15T10:35:00Z' } },
            },
          ],
          labels: { component: 'apiserver', tier: 'control-plane' },
          createdAt: '2024-01-15T10:35:00Z',
        },
      ];
      setPods(mockPods);
    } catch (error) {
      console.error('获取节点Pod列表失败:', error);
      setPods([]);
    } finally {
      setLoadingPods(false);
    }
  };

  // 刷新所有数据
  const refreshAllData = () => {
    fetchNodeDetail();
    fetchNodePods();
  };

  // 处理节点操作
  const handleCordon = async () => {
    try {
      await nodeService.cordonNode(clusterId || '', nodeName || '');
      message.success(`节点 ${nodeName} 封锁成功`);
      fetchNodeDetail();
    } catch (error) {
      console.error('节点封锁失败:', error);
      message.error(`节点 ${nodeName} 封锁失败`);
    }
  };

  const handleUncordon = async () => {
    try {
      await nodeService.uncordonNode(clusterId || '', nodeName || '');
      message.success(`节点 ${nodeName} 解封成功`);
      fetchNodeDetail();
    } catch (error) {
      console.error('节点解封失败:', error);
      message.error(`节点 ${nodeName} 解封失败`);
    }
  };

  const handleDrain = async () => {
    try {
      await nodeService.drainNode(clusterId || '', nodeName || '', drainOptions);
      message.success(`节点 ${nodeName} 驱逐成功`);
      setDrainModalVisible(false);
      fetchNodeDetail();
    } catch (error) {
      console.error('节点驱逐失败:', error);
      message.error(`节点 ${nodeName} 驱逐失败`);
    }
  };

  // 处理标签操作
  const handleAddLabel = () => {
    if (!newLabelKey || !newLabelValue) {
      message.warning('标签的键和值不能为空');
      return;
    }
    
    message.success(`添加标签: ${newLabelKey}=${newLabelValue}`);
    // TODO: 实现添加标签的API调用
    setNewLabelKey('');
    setNewLabelValue('');
    setLabelModalVisible(false);
  };

  const handleRemoveLabel = (key: string) => {
    message.success(`移除标签: ${key}`);
    // TODO: 实现移除标签的API调用
  };

  // 处理污点操作
  const handleAddTaint = () => {
    if (!newTaintKey) {
      message.warning('污点的键不能为空');
      return;
    }
    
    message.success(`添加污点: ${newTaintKey}=${newTaintValue}:${newTaintEffect}`);
    // TODO: 实现添加污点的API调用
    setNewTaintKey('');
    setNewTaintValue('');
    setNewTaintEffect('NoSchedule');
    setTaintModalVisible(false);
  };

  const handleRemoveTaint = (taint: NodeTaint) => {
    message.success(`移除污点: ${taint.key}`);
    // TODO: 实现移除污点的API调用
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Ready':
        return <Tag icon={<CheckCircleOutlined />} color="success">就绪</Tag>;
      case 'NotReady':
        return <Tag icon={<CloseCircleOutlined />} color="error">未就绪</Tag>;
      default:
        return <Tag icon={<ExclamationCircleOutlined />} color="default">未知</Tag>;
    }
  };

  // 获取节点条件状态
  const getConditionStatus = (condition: NodeCondition) => {
    if (condition.status === 'True') {
      return <Badge status="success" text="正常" />;
    } else if (condition.status === 'False') {
      // 对于某些条件，False是正常的（如DiskPressure, MemoryPressure等）
      if (['DiskPressure', 'MemoryPressure', 'PIDPressure', 'NetworkUnavailable'].includes(condition.type)) {
        return <Badge status="success" text="正常" />;
      }
      return <Badge status="error" text="异常" />;
    } else {
      return <Badge status="default" text="未知" />;
    }
  };

  // Pod表格列定义
  const podColumns: ColumnsType<Pod> = [
    {
      title: '状态',
      key: 'status',
      width: 60,
      render: (_, record) => {
        if (record.status === 'Running') {
          return <Badge status="success" />;
        } else if (record.status === 'Pending') {
          return <Badge status="processing" />;
        } else if (record.status === 'Succeeded') {
          return <Badge status="default" />;
        } else {
          return <Badge status="error" />;
        }
      },
    },
    {
      title: 'Pod名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/clusters/${clusterId}/namespaces/${record.namespace}/pods/${text}`)}>
          {text}
        </a>
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
      key: 'podStatus',
      render: (status) => {
        if (status === 'Running') {
          return <Tag color="success">运行中</Tag>;
        } else if (status === 'Pending') {
          return <Tag color="processing">等待中</Tag>;
        } else if (status === 'Succeeded') {
          return <Tag color="default">已完成</Tag>;
        } else {
          return <Tag color="error">异常</Tag>;
        }
      },
    },
    {
      title: '重启次数',
      dataIndex: 'restartCount',
      key: 'restartCount',
    },
    {
      title: 'CPU',
      key: 'cpuUsage',
      render: (_, record) => `${record.cpuUsage * 1000}m`,
    },
    {
      title: '内存',
      key: 'memoryUsage',
      render: (_, record) => `${record.memoryUsage}Mi`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => new Date(time).toLocaleString(),
    },
  ];

  // 更多操作菜单
  const moreActionsMenu = (
    <Menu>
      {node?.taints?.some(t => t.effect === 'NoSchedule') ? (
        <Menu.Item key="uncordon" onClick={handleUncordon} icon={<CheckCircleOutlined />}>
          解除封锁 (Uncordon)
        </Menu.Item>
      ) : (
        <Menu.Item key="cordon" onClick={handleCordon} icon={<PauseCircleOutlined />}>
          封锁节点 (Cordon)
        </Menu.Item>
      )}
      <Menu.Item 
        key="drain" 
        onClick={() => setDrainModalVisible(true)} 
        icon={<WarningOutlined />}
        danger
      >
        驱逐节点 (Drain)
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="labels" onClick={() => setLabelModalVisible(true)} icon={<EditOutlined />}>
        编辑标签
      </Menu.Item>
      <Menu.Item key="taints" onClick={() => setTaintModalVisible(true)} icon={<SettingOutlined />}>
        管理污点
      </Menu.Item>
      <Menu.Item key="events" icon={<InfoCircleOutlined />}>
        查看事件
      </Menu.Item>
    </Menu>
  );

  // 初始化加载
  useEffect(() => {
    if (clusterId && nodeName) {
      fetchNodeDetail();
      fetchNodePods();
    }
  }, [clusterId, nodeName]);

  if (!node && !loading) {
    return (
      <Card>
        <Result
          status="404"
          title="节点不存在"
          subTitle="请检查节点名称是否正确"
          extra={
            <Button type="primary" onClick={() => navigate(`/clusters/${clusterId}/nodes`)}>
              返回节点列表
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ marginBottom: 16 }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/clusters/${clusterId}/nodes`)}
          >
            返回节点列表
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {nodeName}
          </Title>
          {node && getStatusTag(node.status)}
        </Space>
        <Text type="secondary">节点详细信息和监控数据</Text>
      </div>

      {/* 节点基本信息卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={18}>
            <Descriptions column={3}>
              <Descriptions.Item label="角色">
                <Space>
                  {node?.roles.map(role => {
                    const isMaster = role.toLowerCase().includes('master') || role.toLowerCase().includes('control-plane');
                    return (
                      <Tag key={role} color={isMaster ? 'gold' : 'blue'}>
                        {role}
                      </Tag>
                    );
                  })}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="版本">{node?.version}</Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(node?.status || 'Unknown')}</Descriptions.Item>
              <Descriptions.Item label="操作系统">{node?.osImage}</Descriptions.Item>
              <Descriptions.Item label="内核版本">{node?.kernelVersion}</Descriptions.Item>
              <Descriptions.Item label="容器运行时">{node?.containerRuntime}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {node?.createdAt && new Date(node.createdAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button 
                  icon={<CodeOutlined />} 
                  onClick={() => setActiveTab('terminal')}
                >
                  节点终端
                </Button>
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => setLabelModalVisible(true)}
                >
                  编辑标签
                </Button>
                <Dropdown overlay={moreActionsMenu}>
                  <Button>
                    更多操作 <DownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 标签页内容 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="概览" key="overview">
            <Row gutter={16}>
              <Col span={8}>
                <Card title="节点状态" bordered={false}>
                  <Statistic
                    title="状态"
                    value={node?.status || 'Unknown'}
                    valueStyle={{ color: node?.status === 'Ready' ? '#3f8600' : '#cf1322' }}
                    prefix={node?.status === 'Ready' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  />
                  <Divider />
                  <div>
                    <Text strong>调度状态: </Text>
                    {node?.taints?.some(t => t.effect === 'NoSchedule') ? (
                      <Tag icon={<PauseCircleOutlined />} color="warning">已禁用调度</Tag>
                    ) : (
                      <Tag icon={<CheckCircleOutlined />} color="success">可调度</Tag>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text strong>节点条件: </Text>
                    <div style={{ marginTop: 8 }}>
                      {node?.conditions?.map((condition, index) => (
                        <div key={index} style={{ marginBottom: 4 }}>
                          <Space>
                            {getConditionStatus(condition)}
                            <Text>{condition.type}</Text>
                          </Space>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="资源使用" bordered={false}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>CPU使用率</Text>
                      <Text>{node?.cpuUsage}%</Text>
                    </div>
                    <Progress
                      percent={node?.cpuUsage || 0}
                      status={
                        (node?.cpuUsage || 0) > 80
                          ? 'exception'
                          : (node?.cpuUsage || 0) > 60
                            ? 'active'
                            : 'success'
                      }
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>内存使用率</Text>
                      <Text>{node?.memoryUsage}%</Text>
                    </div>
                    <Progress
                      percent={node?.memoryUsage || 0}
                      status={
                        (node?.memoryUsage || 0) > 80
                          ? 'exception'
                          : (node?.memoryUsage || 0) > 60
                            ? 'active'
                            : 'success'
                      }
                    />
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="Pod统计" bordered={false}>
                  <Statistic
                    title="Pod数量"
                    value={`${node?.podCount || 0}/${node?.maxPods || 0}`}
                    prefix={<DesktopOutlined />}
                  />
                  <Divider />
                  <Progress
                    percent={node ? Math.round((node.podCount / node.maxPods) * 100) : 0}
                    status="active"
                  />
                </Card>
              </Col>
            </Row>

            <Card title="系统信息" style={{ marginTop: 16 }} bordered={false}>
              <Descriptions column={2}>
                <Descriptions.Item label="操作系统">{node?.osImage}</Descriptions.Item>
                <Descriptions.Item label="内核版本">{node?.kernelVersion}</Descriptions.Item>
                <Descriptions.Item label="容器运行时">{node?.containerRuntime}</Descriptions.Item>
                <Descriptions.Item label="CPU容量">{node?.cpuCapacity}</Descriptions.Item>
                <Descriptions.Item label="内存容量">{node?.memoryCapacity}</Descriptions.Item>
                <Descriptions.Item label="最大Pod数">{node?.maxPods}</Descriptions.Item>
              </Descriptions>
            </Card>
          </TabPane>

          <TabPane tab="Pod" key="pods">
            <Card title={`运行中的Pod (${pods.length}个)`} bordered={false}>
              <Table
                columns={podColumns}
                dataSource={pods}
                rowKey="id"
                pagination={false}
                loading={loadingPods}
              />
            </Card>
          </TabPane>

          <TabPane tab="标签" key="labels">
            <Card title="系统标签" bordered={false} style={{ marginBottom: 16 }}>
              <Space wrap>
                {node?.labels && Object.entries(node.labels)
                  .filter(([key]) => key.startsWith('kubernetes.io/') || key.startsWith('node.kubernetes.io/') || key.startsWith('topology.kubernetes.io/'))
                  .map(([key, value]) => (
                    <Tag key={key} color="blue">
                      {key}={value}
                    </Tag>
                  ))}
              </Space>
            </Card>

            <Card title="自定义标签" bordered={false}>
              <Space wrap style={{ marginBottom: 16 }}>
                {node?.labels && Object.entries(node.labels)
                  .filter(([key]) => !key.startsWith('kubernetes.io/') && !key.startsWith('node.kubernetes.io/') && !key.startsWith('topology.kubernetes.io/'))
                  .map(([key, value]) => (
                    <Tag
                      key={key}
                      closable
                      onClose={() => handleRemoveLabel(key)}
                    >
                      {key}={value}
                    </Tag>
                  ))}
              </Space>

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setLabelModalVisible(true)}
              >
                添加标签
              </Button>
            </Card>
          </TabPane>

          <TabPane tab="污点" key="taints">
            <Card title="当前污点" bordered={false}>
              {node?.taints && node.taints.length > 0 ? (
                node.taints.map((taint, index) => (
                  <Card
                    key={index}
                    type="inner"
                    style={{ marginBottom: 16 }}
                    title={`${taint.key}${taint.value ? `=${taint.value}` : ''}:${taint.effect}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveTaint(taint)}
                      >
                        删除
                      </Button>
                    }
                  >
                    <Descriptions column={1}>
                      <Descriptions.Item label="键">{taint.key}</Descriptions.Item>
                      {taint.value && <Descriptions.Item label="值">{taint.value}</Descriptions.Item>}
                      <Descriptions.Item label="效果">
                        <Tag color={
                          taint.effect === 'NoSchedule' ? 'orange' :
                          taint.effect === 'PreferNoSchedule' ? 'blue' : 'red'
                        }>
                          {taint.effect}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="说明">
                        {taint.effect === 'NoSchedule' && '不调度新Pod到此节点'}
                        {taint.effect === 'PreferNoSchedule' && '尽量不调度新Pod到此节点'}
                        {taint.effect === 'NoExecute' && '驱逐不能容忍此污点的现有Pod'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ))
              ) : (
                <Empty description="暂无污点" />
              )}

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setTaintModalVisible(true)}
                style={{ marginTop: 16 }}
              >
                添加污点
              </Button>
            </Card>
          </TabPane>

          <TabPane tab="监控" key="monitoring">
            <MonitoringCharts clusterId={clusterId} nodeId={nodeName} />
          </TabPane>

          <TabPane tab="终端" key="terminal">
            <Card bordered={false}>
              <KubectlTerminal
                clusterId={clusterId || ''}
                namespace="default"
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* 标签编辑模态框 */}
      <Modal
        title="编辑节点标签"
        visible={labelModalVisible}
        onCancel={() => setLabelModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setLabelModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleAddLabel}>
            添加标签
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>系统标签 (只读):</Text>
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              {node?.labels && Object.entries(node.labels)
                .filter(([key]) => key.startsWith('kubernetes.io/') || key.startsWith('node.kubernetes.io/') || key.startsWith('topology.kubernetes.io/'))
                .map(([key, value]) => (
                  <Tag key={key} color="blue">
                    {key}={value}
                  </Tag>
                ))}
            </Space>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text>自定义标签:</Text>
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              {node?.labels && Object.entries(node.labels)
                .filter(([key]) => !key.startsWith('kubernetes.io/') && !key.startsWith('node.kubernetes.io/') && !key.startsWith('topology.kubernetes.io/'))
                .map(([key, value]) => (
                  <Tag
                    key={key}
                    closable
                    onClose={() => handleRemoveLabel(key)}
                  >
                    {key}={value}
                  </Tag>
                ))}
            </Space>
          </div>
        </div>

        <Divider />

        <div>
          <Text>添加新标签:</Text>
          <div style={{ marginTop: 8 }}>
            <Input
              placeholder="键"
              value={newLabelKey}
              onChange={(e) => setNewLabelKey(e.target.value)}
              style={{ width: '45%', marginRight: '5%' }}
            />
            <Input
              placeholder="值"
              value={newLabelValue}
              onChange={(e) => setNewLabelValue(e.target.value)}
              style={{ width: '45%' }}
            />
          </div>
        </div>
      </Modal>

      {/* 污点编辑模态框 */}
      <Modal
        title="管理节点污点"
        visible={taintModalVisible}
        onCancel={() => setTaintModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTaintModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleAddTaint}>
            添加污点
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>添加新污点:</Text>
          <div style={{ marginTop: 8 }}>
            <Input
              placeholder="键"
              value={newTaintKey}
              onChange={(e) => setNewTaintKey(e.target.value)}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <Input
              placeholder="值 (可选)"
              value={newTaintValue}
              onChange={(e) => setNewTaintValue(e.target.value)}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <Select
              placeholder="效果"
              value={newTaintEffect}
              onChange={(value) => setNewTaintEffect(value as any)}
              style={{ width: '100%' }}
            >
              <Select.Option value="NoSchedule">NoSchedule (不调度新Pod)</Select.Option>
              <Select.Option value="PreferNoSchedule">PreferNoSchedule (尽量不调度)</Select.Option>
              <Select.Option value="NoExecute">NoExecute (驱逐现有Pod)</Select.Option>
            </Select>
          </div>
        </div>

        <Divider />

        <div>
          <Text>污点效果说明:</Text>
          <ul>
            <li><Text strong>NoSchedule:</Text> 不会调度新的Pod到此节点，但现有Pod不受影响</li>
            <li><Text strong>PreferNoSchedule:</Text> 尽量不调度新的Pod到此节点，但不保证</li>
            <li><Text strong>NoExecute:</Text> 不仅不会调度新Pod，还会驱逐不能容忍此污点的现有Pod</li>
          </ul>
        </div>
      </Modal>

      {/* 驱逐节点模态框 */}
      <Modal
        title="驱逐节点"
        visible={drainModalVisible}
        onCancel={() => setDrainModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDrainModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" danger onClick={handleDrain}>
            确认驱逐
          </Button>,
        ]}
      >
        <Alert
          message="警告"
          description={`您确定要对节点 "${nodeName}" 执行驱逐操作吗？此操作将禁用节点调度并驱逐所有非系统Pod，可能影响正在运行的服务。`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Text strong>高级选项:</Text>
          <div style={{ marginTop: 8 }}>
            <Checkbox
              checked={drainOptions.ignoreDaemonSets}
              onChange={(e) => setDrainOptions({ ...drainOptions, ignoreDaemonSets: e.target.checked })}
            >
              忽略DaemonSet Pod
            </Checkbox>
          </div>
          <div style={{ marginTop: 8 }}>
            <Checkbox
              checked={drainOptions.deleteLocalData}
              onChange={(e) => setDrainOptions({ ...drainOptions, deleteLocalData: e.target.checked })}
            >
              删除本地存储的Pod
            </Checkbox>
          </div>
          <div style={{ marginTop: 8 }}>
            <Checkbox
              checked={drainOptions.force}
              onChange={(e) => setDrainOptions({ ...drainOptions, force: e.target.checked })}
            >
              强制删除 (--force)
            </Checkbox>
          </div>
          <div style={{ marginTop: 8 }}>
            <Text>宽限期:</Text>
            <InputNumber
              min={0}
              max={3600}
              value={drainOptions.gracePeriodSeconds}
              onChange={(value) => setDrainOptions({ ...drainOptions, gracePeriodSeconds: value as number })}
              style={{ marginLeft: 8 }}
            />
            <Text style={{ marginLeft: 8 }}>秒</Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NodeDetail;
