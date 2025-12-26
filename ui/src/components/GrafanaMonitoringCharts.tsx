import React, { useState } from 'react';
import { Row, Col, Card, Space, Select, Switch } from 'antd';
import GrafanaPanel from './GrafanaPanel';
import { GRAFANA_CONFIG, TIME_RANGE_MAP } from '../config/grafana.config';

const { Option } = Select;

interface GrafanaMonitoringChartsProps {
  clusterId: string;
  clusterName?: string;
  nodeName?: string;
  namespace?: string;
  podName?: string;
  workloadName?: string;
  type: 'cluster' | 'node' | 'pod' | 'workload';
  lazyLoad?: boolean;
}

const GrafanaMonitoringCharts: React.FC<GrafanaMonitoringChartsProps> = ({
  clusterId,
  clusterName,
  nodeName,
  namespace,
  podName,
  workloadName,
  type,
}) => {
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 构建变量映射
  const variables: Record<string, string> = {
    cluster: clusterName || clusterId,
  };
  
  if (nodeName) variables.node = nodeName;
  if (namespace) variables.namespace = namespace;
  if (podName) variables.pod = podName;
  if (workloadName) variables.workload = workloadName;

  // 获取配置
  const config = GRAFANA_CONFIG[type];
  const { dashboardUid, panels } = config;

  // 时间范围
  const { from, to } = TIME_RANGE_MAP[timeRange];
  const refresh = autoRefresh ? '30s' : undefined;

  // 渲染 Pod 类型的图表
  const renderPodCharts = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.cpuUsage}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="CPU 使用率"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.memoryUsage}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="内存使用率"
          height={250}
        />
      </Col>
      <Col span={24}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.networkTraffic}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="网络流量"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.containerRestarts}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="容器重启次数"
          height={200}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.cpuThrottling}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="CPU 限流"
          height={200}
        />
      </Col>
    </Row>
  );

  // 渲染集群类型的图表
  const renderClusterCharts = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.cpuUsage}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="集群 CPU 使用率"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.memoryUsage}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="集群内存使用率"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.podStatus}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="Pod 状态概览"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.networkTraffic}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="网络流量"
          height={250}
        />
      </Col>
      <Col span={24}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.nodeOverview}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="节点资源使用概览"
          height={300}
        />
      </Col>
    </Row>
  );

  // 渲染节点类型的图表
  const renderNodeCharts = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.cpuUsage}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="CPU 使用率"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.memoryUsage}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="内存使用率"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.diskUsage}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="磁盘使用率"
          height={250}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.networkIO}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="网络 I/O"
          height={250}
        />
      </Col>
    </Row>
  );

  // 渲染工作负载类型的图表
  const renderWorkloadCharts = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.cpuUsageMulti}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="CPU 使用率（多 Pod 对比）"
          height={300}
        />
      </Col>
      <Col span={24}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.memoryUsageMulti}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="内存使用率（多 Pod 对比）"
          height={300}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.podStatus}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="Pod 状态"
          height={200}
        />
      </Col>
      <Col span={12}>
        <GrafanaPanel
          dashboardUid={dashboardUid}
          panelId={panels.restartCount}
          variables={variables}
          from={from}
          to={to}
          refresh={refresh}
          title="重启次数"
          height={200}
        />
      </Col>
    </Row>
  );

  // 根据类型渲染对应图表
  const renderCharts = () => {
    switch (type) {
      case 'cluster':
        return renderClusterCharts();
      case 'node':
        return renderNodeCharts();
      case 'pod':
        return renderPodCharts();
      case 'workload':
        return renderWorkloadCharts();
      default:
        return null;
    }
  };

  return (
    <Card
      title="监控图表 (Grafana)"
      extra={
        <Space>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: 100 }}
          >
            <Option value="1h">1小时</Option>
            <Option value="6h">6小时</Option>
            <Option value="24h">24小时</Option>
            <Option value="7d">7天</Option>
          </Select>
          <Space>
            <span>自动刷新</span>
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              checkedChildren="开"
              unCheckedChildren="关"
            />
          </Space>
        </Space>
      }
    >
      {renderCharts()}
    </Card>
  );
};

export default GrafanaMonitoringCharts;
