import type { ApiResponse, Node, PaginatedResponse } from '../types';
import { request } from '../utils/api';

export interface NodeListParams {
  clusterId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface NodeOverview {
  totalNodes: number;
  readyNodes: number;
  notReadyNodes: number;
  maintenanceNodes: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
}

export const nodeService = {
  // 获取节点列表
  getNodes: async (params: NodeListParams): Promise<ApiResponse<PaginatedResponse<Node>>> => {
    const { clusterId, page = 1, pageSize = 10, status, search } = params;
    const queryParams = new URLSearchParams();
    
    if (page) queryParams.append('page', page.toString());
    if (pageSize) queryParams.append('pageSize', pageSize.toString());
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);
    
    return request.get(`/clusters/${clusterId}/nodes?${queryParams.toString()}`);
  },

  // 获取节点详情
  getNode: async (clusterId: string, name: string): Promise<ApiResponse<Node>> => {
    return request.get(`/clusters/${clusterId}/nodes/${name}`);
  },

  // 获取节点概览信息
  getNodeOverview: async (clusterId: string): Promise<ApiResponse<NodeOverview>> => {
    return request.get(`/clusters/${clusterId}/nodes/overview`);
  },

  // 封锁节点 (Cordon)
  cordonNode: async (clusterId: string, name: string): Promise<ApiResponse<null>> => {
    return request.post(`/clusters/${clusterId}/nodes/${name}/cordon`);
  },

  // 解封节点 (Uncordon)
  uncordonNode: async (clusterId: string, name: string): Promise<ApiResponse<null>> => {
    return request.post(`/clusters/${clusterId}/nodes/${name}/uncordon`);
  },

  // 驱逐节点 (Drain)
  drainNode: async (
    clusterId: string, 
    name: string, 
    options: {
      ignoreDaemonSets?: boolean;
      deleteLocalData?: boolean;
      force?: boolean;
      gracePeriodSeconds?: number;
    } = {}
  ): Promise<ApiResponse<null>> => {
    return request.post(`/clusters/${clusterId}/nodes/${name}/drain`, options);
  },
};