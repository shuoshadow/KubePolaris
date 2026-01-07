---
sidebar_position: 2
---

# Prometheus 集成

KubePolaris 集成 Prometheus 提供丰富的监控指标。

## 功能

- 集群资源使用趋势
- 节点资源监控
- Pod 资源监控
- 自定义 PromQL 查询

## 配置

### 配置步骤

1. 进入 **系统设置** → **监控配置**
2. 填写 Prometheus 配置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 地址 | Prometheus 服务地址 | `http://prometheus:9090` |
| 超时 | 查询超时时间 | `30s` |
| 用户名 | Basic Auth 用户名（可选） | - |
| 密码 | Basic Auth 密码（可选） | - |

3. 测试连接并保存

### Kubernetes 内部访问

如果 Prometheus 在同一 Kubernetes 集群：

```
http://prometheus-server.monitoring.svc.cluster.local:80
```

## 使用

### 内置指标

配置后可在以下位置查看监控数据：

- **集群详情** - 集群资源使用趋势
- **节点详情** - 节点 CPU/内存/磁盘
- **Pod 详情** - Pod 资源使用

### 自定义查询

在监控页面执行自定义 PromQL：

```promql
# CPU 使用率
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
```

## 常用 PromQL

### 节点指标

```promql
# 节点 CPU 使用率
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 节点内存使用率
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# 节点磁盘使用率
(1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100
```

### Pod 指标

```promql
# Pod CPU 使用
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod)

# Pod 内存使用
sum(container_memory_working_set_bytes{container!=""}) by (pod)
```

### 集群指标

```promql
# 集群节点数
count(kube_node_info)

# 运行中 Pod 数
sum(kube_pod_status_phase{phase="Running"})

# Deployment 可用副本
sum(kube_deployment_status_replicas_available) by (deployment)
```

## 故障排查

### 连接失败

1. 检查 Prometheus 地址
2. 检查网络连通性
3. 检查认证配置

### 数据缺失

1. 确认 Prometheus 有对应指标
2. 检查时间范围
3. 验证 PromQL 语法

