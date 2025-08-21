import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Progress,
  Statistic,
  Divider,
  Tooltip,
  Badge,
  Dropdown,
  Menu,
  message,
} from 'antd';
import {
  ReloadOutlined,
  DesktopOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  CodeOutlined,
  MoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { nodeService, type NodeListParams, type NodeOverview } from '../../services/nodeService';
import { clusterService } from '../../services/clusterService';
import type { Node, NodeTaint, Cluster } from '../../types';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

const NodeList: React.FC = () => {
  const { clusterId: routeClusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [overview, setOverview] = useState<NodeOverview | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string>(routeClusterId || '1');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNodes, setSelectedNodes] = useState<React.Key[]>([]);

  // 获取集群列表
  const fetchClusters = async () => {
    try {
      const response = await clusterService.getClusters();
      setClusters(response.data.items);
    } catch (error) {
      console.error('获取集群列表失败:', error);
    }
  };

  // 获取节点列表
  const fetchNodes = async (params: NodeListParams = { clusterId: selectedClusterId }) => {
    console.log('fetchNodes called with params:', params);
    if (!params.clusterId) {
      console.log('fetchNodes: no clusterId provided');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Making request to nodeService.getNodes with params:', {
        ...params,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      const response = await nodeService.getNodes({
        ...params,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      
      console.log('nodeService.getNodes response:', response);
      setNodes(response.data.items);
      setPagination({
        ...pagination,
        total: response.data.total,
      });
    } catch (error) {
      console.error('获取节点列表失败:', error);
      message.error('获取节点列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取节点概览
  const fetchNodeOverview = async () => {
    console.log('fetchNodeOverview called with clusterId:', selectedClusterId);
    if (!selectedClusterId) {
      console.log('fetchNodeOverview: clusterId is empty, skipping overview');
      return;
    }
    
    try {
      console.log('Making request to nodeService.getNodeOverview with clusterId:', selectedClusterId);
      const response = await nodeService.getNodeOverview(selectedClusterId);
      console.log('nodeService.getNodeOverview response:', response);
      setOverview(response.data);
    } catch (error) {
      console.error('获取节点概览失败:', error);
    }
  };

  // 集群切换
  const handleClusterChange = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    setPagination({ ...pagination, current: 1 });
    // 重置搜索和筛选条件
    setSearchText('');
    setStatusFilter('all');
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchNodes({ clusterId: selectedClusterId });
    if (selectedClusterId) {
      fetchNodeOverview();
    }
  };

  // 搜索节点
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
    fetchNodes({
      clusterId: selectedClusterId,
      search: value,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  // 状态筛选
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination({ ...pagination, current: 1 });
    fetchNodes({
      clusterId: selectedClusterId,
      search: searchText,
      status: value !== 'all' ? value : undefined,
    });
  };

  // 表格分页变化
  const handleTableChange = (pagination: any) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
    });
    
    fetchNodes({
      clusterId: selectedClusterId,
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: searchText,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  // 节点选择变化
  const handleSelectionChange = (selectedRowKeys: React.Key[]) => {
    setSelectedNodes(selectedRowKeys);
  };

  // 批量操作
  const handleBatchCordon = () => {
    message.info(`批量封锁 ${selectedNodes.length} 个节点`);
    // TODO: 实现批量封锁逻辑
  };

  const handleBatchUncordon = () => {
    message.info(`批量解封 ${selectedNodes.length} 个节点`);
    // TODO: 实现批量解封逻辑
  };

  const handleBatchLabel = () => {
    message.info(`批量添加标签到 ${selectedNodes.length} 个节点`);
    // TODO: 实现批量添加标签逻辑
  };

  // 单个节点操作
  const handleViewDetail = (name: string) => {
    navigate(`/clusters/${selectedClusterId}/nodes/${name}`);
  };

  const handleNodeTerminal = (name: string) => {
    message.info(`打开节点终端: ${name}`);
    // TODO: 实现节点终端逻辑
  };

  const handleCordon = async (name: string) => {
    try {
      await nodeService.cordonNode(selectedClusterId, name);
      message.success(`节点 ${name} 封锁成功`);
      handleRefresh();
    } catch (error) {
      console.error('节点封锁失败:', error);
      message.error(`节点 ${name} 封锁失败`);
    }
  };

  const handleUncordon = async (name: string) => {
    try {
      await nodeService.uncordonNode(selectedClusterId, name);
      message.success(`节点 ${name} 解封成功`);
      handleRefresh();
    } catch (error) {
      console.error('节点解封失败:', error);
      message.error(`节点 ${name} 解封失败`);
    }
  };

  const handleDrain = async (name: string) => {
    try {
      await nodeService.drainNode(selectedClusterId, name, {
        ignoreDaemonSets: true,
        deleteLocalData: true,
        gracePeriodSeconds: 30,
      });
      message.success(`节点 ${name} 驱逐成功`);
      handleRefresh();
    } catch (error) {
      console.error('节点驱逐失败:', error);
      message.error(`节点 ${name} 驱逐失败`);
    }
  };

  // 获取节点状态标签
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

  // 获取节点状态图标
  const getStatusIcon = (node: Node) => {
    if (node.status === 'Ready') {
      // 检查是否有污点
      const hasNoScheduleTaint = node.taints?.some(
        taint => taint.effect === 'NoSchedule' || taint.effect === 'NoExecute'
      );
      
      if (hasNoScheduleTaint) {
        return <Badge status="warning" />;
      }
      
      // 检查资源使用率
      if (node.cpuUsage > 80 || node.memoryUsage > 80) {
        return <Badge status="warning" />;
      }
      
      return <Badge status="success" />;
    } else if (node.status === 'NotReady') {
      return <Badge status="error" />;
    } else {
      return <Badge status="default" />;
    }
  };

  // 获取角色标签
  const getRoleTags = (roles: string[]) => {
    return (
      <Space>
        {roles.map(role => {
          const isMaster = role.toLowerCase().includes('master') || role.toLowerCase().includes('control-plane');
          return (
            <Tag key={role} color={isMaster ? 'gold' : 'blue'}>
              {isMaster ? 'M' : 'W'}
            </Tag>
          );
        })}
      </Space>
    );
  };

  // 获取污点提示
  const getTaintTooltip = (taints: NodeTaint[]) => {
    if (!taints || taints.length === 0) {
      return '无污点';
    }
    
    return (
      <div>
        <div>污点信息:</div>
        {taints.map((taint, index) => (
          <div key={index}>
            {taint.key}{taint.value ? `=${taint.value}` : ''}:{taint.effect}
          </div>
        ))}
      </div>
    );
  };

  // 表格列定义
  const columns: ColumnsType<Node> = [
    {
      title: '状态',
      key: 'status',
      width: 60,
      render: (_, record) => getStatusIcon(record),
    },
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => (
        <Space>
          <DesktopOutlined style={{ color: '#1890ff' }} />
          <a onClick={() => handleViewDetail(text)}>{text}</a>
        </Space>
      ),
    },
    {
      title: '角色',
      key: 'roles',
      width: 80,
      render: (_, record) => getRoleTags(record.roles),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: '就绪状态',
      key: 'readyStatus',
      width: 80,
      render: (_, record) => getStatusTag(record.status),
    },
    {
      title: 'CPU使用率',
      key: 'cpuUsage',
      width: 100,
      render: (_, record) => (
        <Progress
          percent={record.cpuUsage}
          size="small"
          status={
            record.cpuUsage > 80 
              ? 'exception' 
              : record.cpuUsage > 60 
                ? 'active' 
                : 'success'
          }
        />
      ),
    },
    {
      title: '内存使用率',
      key: 'memoryUsage',
      width: 100,
      render: (_, record) => (
        <Progress
          percent={record.memoryUsage}
          size="small"
          status={
            record.memoryUsage > 80 
              ? 'exception' 
              : record.memoryUsage > 60 
                ? 'active' 
                : 'success'
          }
        />
      ),
    },
    {
      title: 'Pod数量',
      key: 'podCount',
      width: 80,
      render: (_, record) => `${record.podCount}/${record.maxPods}`,
    },
    {
      title: '污点',
      key: 'taints',
      width: 100,
      render: (_, record) => (
        <Tooltip title={getTaintTooltip(record.taints)}>
          <Tag color={record.taints?.length ? 'orange' : 'default'}>
            {record.taints?.length || 0}个
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.name)}
            title="查看详情"
          />
          <Button
            type="text"
            icon={<CodeOutlined />}
            onClick={() => handleNodeTerminal(record.name)}
            title="节点终端"
          />
          <Dropdown
            overlay={
              <Menu>
                {record.taints?.some(t => t.effect === 'NoSchedule') ? (
                  <Menu.Item key="uncordon" onClick={() => handleUncordon(record.name)}>
                    解除封锁 (Uncordon)
                  </Menu.Item>
                ) : (
                  <Menu.Item key="cordon" onClick={() => handleCordon(record.name)}>
                    封锁节点 (Cordon)
                  </Menu.Item>
                )}
                <Menu.Item key="drain" onClick={() => handleDrain(record.name)}>
                  驱逐节点 (Drain)
                </Menu.Item>
                <Menu.Item key="labels">编辑标签</Menu.Item>
                <Menu.Item key="taints">编辑污点</Menu.Item>
                <Menu.Item key="events">查看事件</Menu.Item>
              </Menu>
            }
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // 初始化加载
  useEffect(() => {
    fetchClusters();
  }, []);

  // 当选中的集群ID变化时，重新获取数据
  useEffect(() => {
    if (selectedClusterId) {
      console.log('Calling fetchNodes and fetchNodeOverview with clusterId:', selectedClusterId);
      fetchNodes({ clusterId: selectedClusterId });
      fetchNodeOverview();
    }
  }, [selectedClusterId]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={2}>节点管理</Title>
          <Text type="secondary">管理集群中的节点，查看节点状态和资源使用情况</Text>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select
            value={selectedClusterId}
            style={{ width: '100%' }}
            onChange={handleClusterChange}
            placeholder="选择集群"
            loading={clusters.length === 0}
          >
            {clusters.map(cluster => (
              <Option key={cluster.id} value={cluster.id.toString()}>
                {cluster.name}
              </Option>
            ))}
          </Select>
        </div>
      </div>

      {/* 节点概览 */}
      {overview && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总节点"
                value={overview.totalNodes || 0}
                prefix={<DesktopOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="就绪节点"
                value={overview.readyNodes || 0}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="异常节点"
                value={overview.notReadyNodes || 0}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="维护节点"
                value={overview.maintenanceNodes || 0}
                prefix={<PauseCircleOutlined />}
              />
            </Col>
          </Row>
          <Divider />
          <Row gutter={16}>
            <Col span={8}>
              <div>CPU使用率</div>
              <Progress
                percent={overview.cpuUsage || 0}
                status={
                  (overview.cpuUsage || 0) > 80
                    ? 'exception'
                    : (overview.cpuUsage || 0) > 60
                      ? 'active'
                      : 'success'
                }
              />
            </Col>
            <Col span={8}>
              <div>内存使用率</div>
              <Progress
                percent={overview.memoryUsage || 0}
                status={
                  (overview.memoryUsage || 0) > 80
                    ? 'exception'
                    : (overview.memoryUsage || 0) > 60
                      ? 'active'
                      : 'success'
                }
              />
            </Col>
            <Col span={8}>
              <div>存储使用率</div>
              <Progress
                percent={overview.storageUsage || 0}
                status={
                  (overview.storageUsage || 0) > 80
                    ? 'exception'
                    : (overview.storageUsage || 0) > 60
                      ? 'active'
                      : 'success'
                }
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 工具栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input.Search
            placeholder="搜索节点名称、IP、标签..."
            onSearch={handleSearch}
            enterButton
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col span={4}>
          <Select
            value={statusFilter}
            style={{ width: '100%' }}
            onChange={handleStatusChange}
          >
            <Option value="all">全部状态</Option>
            <Option value="ready">就绪</Option>
            <Option value="notready">未就绪</Option>
            <Option value="cordoned">已封锁</Option>
            <Option value="maintenance">维护中</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Col>
      </Row>

      {/* 节点列表 */}
      <Card title="节点列表">
        <Table
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedNodes,
            onChange: handleSelectionChange,
          }}
          columns={columns}
          dataSource={nodes}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个节点`,
          }}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 批量操作栏 */}
      {selectedNodes.length > 0 && (
        <Card
          style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            right: 20,
            zIndex: 1000,
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              已选中 {selectedNodes.length} 个节点
            </Col>
            <Col>
              <Space>
                <Button onClick={handleBatchCordon}>批量封锁</Button>
                <Button onClick={handleBatchUncordon}>批量解封</Button>
                <Button onClick={handleBatchLabel}>批量添加标签</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default NodeList;