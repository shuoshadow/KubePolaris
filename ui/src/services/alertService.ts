import { request } from '../utils/api';

// ========== 类型定义 ==========

// 认证配置
export interface MonitoringAuth {
  type: 'none' | 'basic' | 'bearer';
  username?: string;
  password?: string;
  token?: string;
}

// Alertmanager 配置
export interface AlertManagerConfig {
  enabled: boolean;
  endpoint: string;
  auth?: MonitoringAuth | null;
  options?: Record<string, unknown>;
}

// 告警状态
export interface AlertStatus {
  state: 'active' | 'suppressed' | 'resolved';
  silencedBy: string[];
  inhibitedBy: string[];
}

// 告警
export interface Alert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  generatorURL: string;
  fingerprint: string;
  status: AlertStatus;
}

// 告警分组
export interface AlertGroup {
  labels: Record<string, string>;
  receiver: string;
  alerts: Alert[];
}

// 匹配器
export interface Matcher {
  name: string;
  value: string;
  isRegex: boolean;
  isEqual: boolean;
}

// 静默状态
export interface SilenceStatus {
  state: 'active' | 'pending' | 'expired';
}

// 静默规则
export interface Silence {
  id: string;
  matchers: Matcher[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
  status: SilenceStatus;
  updatedAt?: string;
}

// 创建静默规则请求
export interface CreateSilenceRequest {
  matchers: Matcher[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
}

// 告警统计
export interface AlertStats {
  total: number;
  firing: number;
  pending: number;
  resolved: number;
  suppressed: number;
  bySeverity: Record<string, number>;
}

// 接收器
export interface Receiver {
  name: string;
}

// Alertmanager 状态
export interface AlertManagerStatus {
  cluster: {
    name: string;
    status: string;
    peers: { name: string; address: string }[];
  };
  versionInfo: {
    version: string;
    revision: string;
    branch: string;
    buildUser: string;
    buildDate: string;
    goVersion: string;
  };
  config: {
    original: string;
  };
  uptime: string;
}

// 告警查询参数
export interface AlertQueryParams {
  severity?: string;
  alertname?: string;
  filter?: string;
}

// ========== API 服务 ==========

export const alertService = {
  // ========== 配置相关 ==========
  
  // 获取 Alertmanager 配置
  getConfig: (clusterId: string | number) => {
    return request.get<AlertManagerConfig>(`/clusters/${clusterId}/alertmanager/config`);
  },

  // 更新 Alertmanager 配置
  updateConfig: (clusterId: string | number, config: AlertManagerConfig) => {
    return request.put<void>(`/clusters/${clusterId}/alertmanager/config`, config);
  },

  // 测试 Alertmanager 连接
  testConnection: (clusterId: string | number, config: AlertManagerConfig) => {
    return request.post<void>(`/clusters/${clusterId}/alertmanager/test-connection`, config);
  },

  // 获取 Alertmanager 状态
  getStatus: (clusterId: string | number) => {
    return request.get<AlertManagerStatus>(`/clusters/${clusterId}/alertmanager/status`);
  },

  // 获取配置模板
  getConfigTemplate: (clusterId: string | number) => {
    return request.get<AlertManagerConfig>(`/clusters/${clusterId}/alertmanager/template`);
  },

  // ========== 告警相关 ==========

  // 获取告警列表
  getAlerts: (clusterId: string | number, params?: AlertQueryParams) => {
    return request.get<Alert[]>(`/clusters/${clusterId}/alerts`, { params });
  },

  // 获取告警分组
  getAlertGroups: (clusterId: string | number) => {
    return request.get<AlertGroup[]>(`/clusters/${clusterId}/alerts/groups`);
  },

  // 获取告警统计
  getAlertStats: (clusterId: string | number) => {
    return request.get<AlertStats>(`/clusters/${clusterId}/alerts/stats`);
  },

  // ========== 静默规则相关 ==========

  // 获取静默规则列表
  getSilences: (clusterId: string | number) => {
    return request.get<Silence[]>(`/clusters/${clusterId}/silences`);
  },

  // 创建静默规则
  createSilence: (clusterId: string | number, silence: CreateSilenceRequest) => {
    return request.post<Silence>(`/clusters/${clusterId}/silences`, silence);
  },

  // 删除静默规则
  deleteSilence: (clusterId: string | number, silenceId: string) => {
    return request.delete<void>(`/clusters/${clusterId}/silences/${silenceId}`);
  },

  // ========== 接收器相关 ==========

  // 获取接收器列表
  getReceivers: (clusterId: string | number) => {
    return request.get<Receiver[]>(`/clusters/${clusterId}/receivers`);
  },
};

export default alertService;

