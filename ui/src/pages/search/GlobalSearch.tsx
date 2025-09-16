import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Input,
  Tabs,
  List,
  Tag,
  Space,
  Button,
  Empty,
  Spin,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  ClusterOutlined,
  DesktopOutlined,
  ContainerOutlined,
  RocketOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { SearchResult } from '../../types';
import { searchService } from '../../services/searchService';

const { Title, Text } = Typography;
const { Search } = Input;

const GlobalSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // 处理标签切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };
  const [query, setQuery] = useState(searchParams.get('q') || '');

  // 从URL参数获取搜索关键词
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      performSearch(urlQuery);
    }
  }, [searchParams]);


  // 执行搜索
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await searchService.globalSearch(searchQuery);
      setSearchResults(response.data.results || []);
    } catch (error) {
      message.error('搜索失败，请稍后重试');
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setQuery(value);
    setSearchParams({ q: value });
    performSearch(value);
  };

  // 按类型过滤结果
  const getFilteredResults = (type: string) => {
    if (type === 'all') {
      return searchResults;
    }
    const filtered = searchResults.filter(result => result.type === type);
    return filtered;
  };

  // 获取资源类型统计
  const getTypeStats = () => {
    const stats = {
      cluster: 0,
      node: 0,
      pod: 0,
      workload: 0,
    };
    
    searchResults.forEach(result => {
      stats[result.type]++;
    });
    
    return stats;
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string, type: string) => {
    switch (type) {
      case 'cluster':
        return status === 'healthy' ? 'green' : 'red';
      case 'node':
        return status === 'Ready' ? 'green' : 'red';
      case 'pod':
        return status === 'Running' ? 'green' : 'orange';
      case 'workload':
        return 'blue';
      default:
        return 'default';
    }
  };

  // 获取资源类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cluster':
        return <ClusterOutlined />;
      case 'node':
        return <DesktopOutlined />;
      case 'pod':
        return <ContainerOutlined />;
      case 'workload':
        return <RocketOutlined />;
      default:
        return <EyeOutlined />;
    }
  };

  // 处理资源点击
  const handleResourceClick = (result: SearchResult) => {
    switch (result.type) {
      case 'cluster':
        navigate(`/clusters/${result.clusterId}/overview`);
        break;
      case 'node':
        navigate(`/clusters/${result.clusterId}/nodes/${result.name}`);
        break;
      case 'pod':
        navigate(`/clusters/${result.clusterId}/pods/${result.namespace}/${result.name}`);
        break;
      case 'workload':
        navigate(`/clusters/${result.clusterId}/workloads/${result.namespace}/${result.name}?type=${result.kind}`);
        break;
    }
  };

  const stats = getTypeStats();

  const tabItems = [
    {
      key: 'all',
      label: `全部 (${searchResults.length})`,
      children: (
        <List
          dataSource={getFilteredResults('all')}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无搜索结果" /> }}
          renderItem={(item: SearchResult) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleResourceClick(item)}
                >
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={getTypeIcon(item.type)}
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag color={getStatusColor(item.status, item.type)}>
                      {item.status}
                    </Tag>
                    {item.kind && <Tag>{item.kind}</Tag>}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">
                      {item.type === 'cluster' && `API Server: ${item.description}`}
                      {item.type === 'node' && `Pod CIDR: ${item.description}`}
                      {item.type === 'pod' && `节点: ${item.description}`}
                      {item.type === 'workload' && `副本数: ${item.description}`}
                    </Text>
                    <Space>
                      <Text type="secondary">集群: {item.clusterName}</Text>
                      {item.namespace && (
                        <Text type="secondary">命名空间: {item.namespace}</Text>
                      )}
                      {item.ip && <Text type="secondary">IP: {item.ip}</Text>}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'cluster',
      label: `集群 (${stats.cluster})`,
      children: (
        <List
          dataSource={getFilteredResults('cluster')}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无集群搜索结果" /> }}
          renderItem={(item: SearchResult) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleResourceClick(item)}
                >
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<ClusterOutlined />}
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag color={getStatusColor(item.status, item.type)}>
                      {item.status}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">API Server: {item.description}</Text>
                    <Text type="secondary">集群ID: {item.clusterId}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'node',
      label: `节点 (${stats.node})`,
      children: (
        <List
          dataSource={getFilteredResults('node')}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无节点搜索结果" /> }}
          renderItem={(item: SearchResult) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleResourceClick(item)}
                >
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<DesktopOutlined />}
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag color={getStatusColor(item.status, item.type)}>
                      {item.status}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">Pod CIDR: {item.description}</Text>
                    <Space>
                      <Text type="secondary">集群: {item.clusterName}</Text>
                      {item.ip && <Text type="secondary">IP: {item.ip}</Text>}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'pod',
      label: `容器组 (${stats.pod})`,
      children: (
        <List
          dataSource={getFilteredResults('pod')}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无容器组搜索结果" /> }}
          renderItem={(item: SearchResult) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleResourceClick(item)}
                >
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<ContainerOutlined />}
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag color={getStatusColor(item.status, item.type)}>
                      {item.status}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">节点: {item.description}</Text>
                    <Space>
                      <Text type="secondary">集群: {item.clusterName}</Text>
                      <Text type="secondary">命名空间: {item.namespace}</Text>
                      {item.ip && <Text type="secondary">IP: {item.ip}</Text>}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'workload',
      label: `工作负载 (${stats.workload})`,
      children: (
        <List
          dataSource={getFilteredResults('workload')}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无工作负载搜索结果" /> }}
          renderItem={(item: SearchResult) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleResourceClick(item)}
                >
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<RocketOutlined />}
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Tag color={getStatusColor(item.status, item.type)}>
                      {item.status}
                    </Tag>
                    {item.kind && <Tag>{item.kind}</Tag>}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">副本数: {item.description}</Text>
                    <Space>
                      <Text type="secondary">集群: {item.clusterName}</Text>
                      <Text type="secondary">命名空间: {item.namespace}</Text>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>全局搜索</Title>
        <Search
          placeholder="搜索集群、节点、容器组、工作负载..."
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
          style={{ maxWidth: '600px' }}
        />
      </div>

      {query && (
        <>
          {/* 搜索结果统计 */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="集群"
                  value={stats.cluster}
                  prefix={<ClusterOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="节点"
                  value={stats.node}
                  prefix={<DesktopOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="容器组"
                  value={stats.pod}
                  prefix={<ContainerOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="工作负载"
                  value={stats.workload}
                  prefix={<RocketOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 搜索结果 */}
          <Card style={{ position: 'relative' }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              type="card"
              size="large"
            />
            {loading && (
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                background: 'rgba(255, 255, 255, 0.8)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                zIndex: 10
              }}>
                <Spin size="large" />
              </div>
            )}
          </Card>
        </>
      )}

      {!query && (
        <Card>
          <Empty
            description="请输入搜索关键词开始搜索"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;