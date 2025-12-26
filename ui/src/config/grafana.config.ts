// Grafana Dashboard 和 Panel 配置
// ⚠️ 请根据实际情况修改 UID 和 Panel ID

export const GRAFANA_CONFIG = {
  cluster: {
    // ⚠️ 修改为你导入的集群 Dashboard UID
    dashboardUid: 'StarsL_cn_K8S',
    panels: {
      cpuUsage: 75,
      memoryUsage: 4,
      podStatus: 6,
      networkTraffic: 8,
      nodeOverview: 10,
      apiserverRequests: 12,
    },
  },
  node: {
    // ⚠️ 修改为你导入的节点 Dashboard UID
    dashboardUid: 'node-exporter-full',
    panels: {
      cpuUsage: 2,
      memoryUsage: 4,
      diskUsage: 6,
      networkIO: 8,
      loadAverage: 10,
    },
  },
  pod: {
    // ⚠️ 修改为你导入的 Pod Dashboard UID
    // 推荐使用 Dashboard ID: 6417 (Kubernetes Pod Monitoring)
    dashboardUid: 'k8s-pod-monitoring',
    panels: {
      cpuUsage: 2,
      memoryUsage: 4,
      networkTraffic: 6,
      containerRestarts: 8,
      cpuThrottling: 10,
      diskIO: 12,
    },
  },
  workload: {
    // ⚠️ 修改为你导入的工作负载 Dashboard UID
    dashboardUid: 'k8s-workload-monitoring',
    panels: {
      cpuUsageMulti: 2,
      memoryUsageMulti: 4,
      podStatus: 6,
      replicaCount: 8,
      restartCount: 10,
    },
  },
};

// 时间范围映射
export const TIME_RANGE_MAP: Record<string, { from: string; to: string }> = {
  '1h': { from: 'now-1h', to: 'now' },
  '6h': { from: 'now-6h', to: 'now' },
  '24h': { from: 'now-24h', to: 'now' },
  '7d': { from: 'now-7d', to: 'now' },
};

// 根据集群名生成 Grafana 数据源 UID
// 与后端 GenerateDataSourceUID 保持一致
export const generateDataSourceUID = (clusterName: string): string => {
  const uid = clusterName.toLowerCase().replace(/[_ ]/g, '-');
  return `prometheus-${uid}`;
};
