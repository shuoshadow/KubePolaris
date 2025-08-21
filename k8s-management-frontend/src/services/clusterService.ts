import { request } from '../utils/api';
import type { Cluster, ClusterStats, PaginatedResponse } from '../types';

export const clusterService = {
  // 获取集群列表
  getClusters: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }) => {
    return request.get<PaginatedResponse<Cluster>>('/clusters', { params });
  },

  // 获取集群详情
  getCluster: (clusterId: string) => {
    return request.get<Cluster>(`/clusters/${clusterId}`);
  },

  // 导入集群
  importCluster: (data: {
    name: string;
    apiServer: string;
    kubeconfig?: string;
    token?: string;
    caCert?: string;
  }) => {
    return request.post<Cluster>('/clusters/import', data);
  },

  // 删除集群
  deleteCluster: (clusterId: string) => {
    return request.delete(`/clusters/${clusterId}`);
  },

  // 获取集群统计信息
  getClusterStats: () => {
    return request.get<ClusterStats>('/clusters/stats');
  },

  // 获取集群概览信息
  getClusterOverview: (clusterId: string) => {
    return request.get(`/clusters/${clusterId}/overview`);
  },

  // 获取集群监控数据
  getClusterMetrics: (clusterId: string, params: {
    range: string;
    step?: string;
  }) => {
    return request.get(`/clusters/${clusterId}/metrics`, { params });
  },

  // 测试集群连接
  testConnection: (data: {
    apiServer: string;
    kubeconfig?: string;
    token?: string;
    caCert?: string;
  }) => {
    return request.post('/clusters/test-connection', data);
  },
};