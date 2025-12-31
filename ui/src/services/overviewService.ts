import { request } from '../utils/api';

// ========== 类型定义 ==========

// 集群统计数据
export interface ClusterStatsData {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
}

// 节点统计数据
export interface NodeStatsData {
  total: number;
  ready: number;
  notReady: number;
}

// Pod 统计数据
export interface PodStatsData {
  total: number;
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
}

// 版本分布
export interface VersionDistribution {
  version: string;
  count: number;
  clusters: string[];
}

// 总览统计响应
export interface OverviewStatsResponse {
  clusterStats: ClusterStatsData;
  nodeStats: NodeStatsData;
  podStats: PodStatsData;
  versionDistribution: VersionDistribution[];
}

// 资源使用数据
export interface ResourceUsageData {
  usagePercent: number;
  used: number;
  total: number;
  unit: string;
}

// 资源使用率响应
export interface ResourceUsageResponse {
  cpu: ResourceUsageData;
  memory: ResourceUsageData;
  storage: ResourceUsageData;
}

// 集群资源计数
export interface ClusterResourceCount {
  clusterId: number;
  clusterName: string;
  value: number;
}

// 资源分布响应
export interface ResourceDistributionResponse {
  podDistribution: ClusterResourceCount[];
  nodeDistribution: ClusterResourceCount[];
  cpuDistribution: ClusterResourceCount[];
  memoryDistribution: ClusterResourceCount[];
}

// 数据点
export interface DataPoint {
  timestamp: number;
  value: number;
}

// 集群趋势序列
export interface ClusterTrendSeries {
  clusterId: number;
  clusterName: string;
  dataPoints: DataPoint[];
}

// 趋势数据响应
export interface TrendResponse {
  podTrends: ClusterTrendSeries[];
  nodeTrends: ClusterTrendSeries[];
}

// 异常工作负载
export interface AbnormalWorkload {
  name: string;
  namespace: string;
  clusterId: number;
  clusterName: string;
  type: string;
  reason: string;
  message: string;
  duration: string;
  severity: 'warning' | 'critical';
}

// ========== API 服务 ==========

export const overviewService = {
  // 获取总览统计数据
  getStats: () => {
    return request.get<OverviewStatsResponse>('/overview/stats');
  },

  // 获取资源使用率
  getResourceUsage: () => {
    return request.get<ResourceUsageResponse>('/overview/resource-usage');
  },

  // 获取资源分布
  getDistribution: () => {
    return request.get<ResourceDistributionResponse>('/overview/distribution');
  },

  // 获取趋势数据
  getTrends: (params?: { timeRange?: string; step?: string }) => {
    return request.get<TrendResponse>('/overview/trends', { params });
  },

  // 获取异常工作负载
  getAbnormalWorkloads: (params?: { limit?: number }) => {
    return request.get<AbnormalWorkload[]>('/overview/abnormal-workloads', { params });
  },
};

