import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Alert, Spin, Select, Space, Button, Typography } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Line, Area } from '@ant-design/plots';
import { clusterService } from '../services/clusterService';

const { Title, Text } = Typography;
const { Option } = Select;

interface MonitoringChartsProps {
  clusterId?: string;
  nodeId?: string;
}

interface MetricData {
  timestamp: number;
  value: number;
}

const MonitoringCharts: React.FC<MonitoringChartsProps> = ({ clusterId, nodeId }) => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取监控数据
  const fetchMetrics = async () => {
    if (!clusterId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await clusterService.getClusterMetrics(clusterId, {
        range: timeRange,
        step: timeRange === '1h' ? '1m' : timeRange === '6h' ? '5m' : '10m',
      });
      
      console.log('获取到的监控数据:', response);
      
      // 检查响应格式
      if (response && response.data) {
        setMetrics(response.data);
      } else {
        console.error('监控数据格式不正确:', response);
        setError('监控数据格式不正确');
      }
    } catch (err: any) {
      console.error('获取监控数据失败:', err);
      setError(err.message || '获取监控数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 时间范围变化时重新获取数据
  useEffect(() => {
    fetchMetrics();
  }, [clusterId, timeRange]);

  // 处理时间范围变化
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchMetrics();
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  // 如果没有数据，显示加载状态或错误信息
  if (loading && !metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载监控数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="获取监控数据失败"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  // 如果没有集群ID，显示提示信息
  if (!clusterId) {
    return (
      <Alert
        message="未选择集群"
        description="请先选择一个集群以查看监控数据"
        type="info"
        showIcon
      />
    );
  }

  // 如果没有数据，显示空状态
  if (!metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <BarChartOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
        <div>暂无监控数据</div>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          style={{ marginTop: 16 }}
        >
          刷新
        </Button>
      </div>
    );
  }

  // 获取当前指标值
  const cpuUsage = metrics?.cpu?.current || 0;
  const memoryUsage = metrics?.memory?.current || 0;
  const diskUsage = metrics?.disk?.current || 0;
  const networkInUsage = metrics?.network?.in?.current || 0;
  const networkOutUsage = metrics?.network?.out?.current || 0;

  // 准备图表数据
  const cpuChartData = metrics?.cpu?.series?.map((item: any) => ({
    time: formatTimestamp(item.timestamp),
    value: item.value,
    category: 'CPU使用率',
  })) || [];

  const memoryChartData = metrics?.memory?.series?.map((item: any) => ({
    time: formatTimestamp(item.timestamp),
    value: item.value,
    category: '内存使用率',
  })) || [];

  const networkChartData = [
    ...(metrics?.network?.in?.series?.map((item: any) => ({
      time: formatTimestamp(item.timestamp),
      value: item.value,
      category: '入站流量',
    })) || []),
    ...(metrics?.network?.out?.series?.map((item: any) => ({
      time: formatTimestamp(item.timestamp),
      value: item.value,
      category: '出站流量',
    })) || []),
  ];

  // 图表配置
  const lineConfig = {
    data: cpuChartData,
    xField: 'time',
    yField: 'value',
    seriesField: 'category',
    yAxis: {
      label: {
        formatter: (v: string) => `${v}%`,
      },
    },
    point: {
      size: 3,
      shape: 'circle',
    },
    smooth: true,
  };

  const memoryConfig = {
    data: memoryChartData,
    xField: 'time',
    yField: 'value',
    seriesField: 'category',
    yAxis: {
      label: {
        formatter: (v: string) => `${v}%`,
      },
    },
    areaStyle: () => {
      return {
        fill: 'l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff',
      };
    },
  };

  const networkConfig = {
    data: networkChartData,
    xField: 'time',
    yField: 'value',
    seriesField: 'category',
    yAxis: {
      label: {
        formatter: (v: string) => `${v}%`,
      },
    },
    color: ['#1890ff', '#52c41a'],
  };

  return (
    <div>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>集群监控</Title>
        <Space>
          <Select 
            value={timeRange} 
            onChange={handleTimeRangeChange}
            style={{ width: 120 }}
          >
            <Option value="1h">最近1小时</Option>
            <Option value="6h">最近6小时</Option>
            <Option value="12h">最近12小时</Option>
            <Option value="1d">最近1天</Option>
            <Option value="7d">最近7天</Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="CPU使用率"
              value={cpuUsage}
              suffix="%"
              precision={1}
              prefix={<BarChartOutlined />}
              valueStyle={{ 
                color: cpuUsage > 80 ? '#ff4d4f' : '#52c41a' 
              }}
            />
            <Progress 
              percent={cpuUsage} 
              size="small" 
              status={cpuUsage > 80 ? 'exception' : 'success'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="内存使用率"
              value={memoryUsage}
              suffix="%"
              precision={1}
              prefix={<DashboardOutlined />}
              valueStyle={{ 
                color: memoryUsage > 80 ? '#ff4d4f' : '#52c41a' 
              }}
            />
            <Progress 
              percent={memoryUsage} 
              size="small" 
              status={memoryUsage > 80 ? 'exception' : 'success'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="磁盘使用率"
              value={diskUsage}
              suffix="%"
              precision={1}
              prefix={<CloudServerOutlined />}
              valueStyle={{ 
                color: diskUsage > 80 ? '#ff4d4f' : '#52c41a' 
              }}
            />
            <Progress 
              percent={diskUsage} 
              size="small" 
              status={diskUsage > 80 ? 'exception' : 'success'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="网络使用率"
              value={networkInUsage}
              suffix="%"
              precision={1}
              prefix={<LineChartOutlined />}
              valueStyle={{ 
                color: networkInUsage > 80 ? '#ff4d4f' : '#52c41a' 
              }}
            />
            <Progress 
              percent={networkInUsage} 
              size="small" 
              status={networkInUsage > 80 ? 'exception' : 'success'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={12}>
            <Card title="CPU使用率趋势" size="small">
              <div style={{ height: 250 }}>
                <Line {...lineConfig} />
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="内存使用率趋势" size="small">
              <div style={{ height: 250 }}>
                <Area {...memoryConfig} />
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="网络流量趋势" size="small">
              <div style={{ height: 250 }}>
                <Line {...networkConfig} />
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 节点和Pod状态统计 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="节点状态" size="small">
            <Statistic 
              title="就绪节点" 
              value={metrics?.nodes?.Ready || 0} 
              suffix={`/ ${(metrics?.nodes?.Ready || 0) + (metrics?.nodes?.NotReady || 0)}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Pod状态" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic 
                  title="运行中" 
                  value={metrics?.pods?.Running || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="等待中" 
                  value={metrics?.pods?.Pending || 0}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="失败" 
                  value={(metrics?.pods?.Failed || 0) + (metrics?.pods?.Unknown || 0)}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MonitoringCharts;
