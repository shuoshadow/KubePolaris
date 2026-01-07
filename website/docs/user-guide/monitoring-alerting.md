---
sidebar_position: 6
---

# 监控告警

KubePolaris 集成 Prometheus 和 Grafana，提供完整的监控告警能力。

## 监控概览

### 内置监控

KubePolaris 提供基础监控指标：

- 集群资源使用总览
- 节点资源使用率
- Pod 状态统计
- 工作负载健康状态

### Prometheus 集成

配置 Prometheus 后可获得更丰富的指标：

- 详细资源使用趋势
- 自定义指标查询
- 长期数据存储
- 告警规则支持

### Grafana 集成

配置 Grafana 后可直接在 KubePolaris 中查看监控面板：

- 内嵌 Dashboard
- 无需切换系统
- 统一访问控制

## 配置监控

### 配置 Prometheus

1. 进入 **系统设置** → **监控配置**
2. 填写 Prometheus 信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 地址 | Prometheus 服务地址 | `http://prometheus:9090` |
| 超时 | 查询超时时间 | `30s` |
| 认证 | Basic Auth（可选） | - |

3. 点击 **测试连接**
4. 保存配置

### 配置 Grafana

1. 填写 Grafana 信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 地址 | Grafana 服务地址 | `http://grafana:3000` |
| API Key | Grafana API 密钥 | `eyJ...` |
| Org ID | 组织 ID | `1` |

2. 创建 Grafana API Key：
   - 登录 Grafana
   - 进入 **Configuration** → **API Keys**
   - 创建新 Key（需要 Viewer 权限）
   - 复制 Key 值

3. 保存配置

### 配置 AlertManager

1. 填写 AlertManager 信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 地址 | AlertManager 服务地址 | `http://alertmanager:9093` |

2. 测试并保存

## 查看监控

### 集群监控

在集群详情页查看：

- CPU 使用率趋势图
- 内存使用率趋势图
- Pod 数量变化
- 节点状态分布

### 节点监控

在节点详情页查看：

- CPU 使用率（按核心）
- 内存使用详情
- 磁盘 IO
- 网络流量

### 工作负载监控

在工作负载详情页查看：

- 资源使用率
- Pod 副本状态
- 请求延迟（如有）
- 错误率（如有）

### Pod 监控

在 Pod 详情页查看：

- 容器资源使用
- 重启历史
- OOM 事件

## Grafana 面板

### 预置 Dashboard

KubePolaris 提供预置的 Grafana Dashboard：

| Dashboard | 用途 |
|-----------|------|
| Cluster Overview | 集群总览 |
| Node Details | 节点详情 |
| Pod Details | Pod 详情 |
| Workload Details | 工作负载详情 |

### 导入 Dashboard

1. 进入 **系统设置** → **监控配置**
2. 点击 **Dashboard 管理**
3. 导入 JSON 或输入 Dashboard ID
4. 配置显示位置

### 自定义 Dashboard

在 Grafana 中创建 Dashboard 后：

1. 复制 Dashboard UID
2. 在 KubePolaris 中添加引用
3. 配置显示位置

## 告警管理

### 查看告警

在 **告警中心** 页面查看：

- 当前活跃告警
- 告警历史
- 按严重程度筛选
- 按集群筛选

### 告警详情

点击告警查看详情：

- 告警名称和描述
- 触发时间
- 影响范围
- 标签和注解
- 相关资源链接

### 告警状态

| 状态 | 说明 |
|------|------|
| 🔴 **Firing** | 告警触发中 |
| 🟢 **Resolved** | 告警已恢复 |
| 🟡 **Pending** | 等待确认 |
| ⚪ **Silenced** | 已静默 |

### 静默告警

临时屏蔽告警：

1. 点击告警的 **静默** 按钮
2. 设置静默时长
3. 填写静默原因
4. 确认

### 告警规则

在 **系统设置** → **告警规则** 管理规则：

#### 内置规则

| 规则 | 条件 | 严重程度 |
|------|------|---------|
| 节点 Down | 节点 NotReady > 5 分钟 | Critical |
| Pod 崩溃 | CrashLoopBackOff | Warning |
| CPU 使用率高 | > 80% 持续 15 分钟 | Warning |
| 内存使用率高 | > 85% 持续 15 分钟 | Warning |
| 磁盘使用率高 | > 90% | Warning |
| PVC 容量不足 | > 85% | Warning |
| 证书即将过期 | < 30 天 | Warning |

#### 自定义规则

创建自定义 Prometheus 告警规则：

```yaml
groups:
- name: custom-alerts
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m])) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }}"
```

## 通知渠道

### 配置通知

在 **系统设置** → **通知配置** 设置：

#### 邮件通知

```yaml
type: email
settings:
  smtp_host: smtp.example.com
  smtp_port: 587
  username: alerts@example.com
  password: xxxxxx
  from: KubePolaris <alerts@example.com>
  to:
    - ops@example.com
    - dev@example.com
```

#### 钉钉通知

```yaml
type: dingtalk
settings:
  webhook: https://oapi.dingtalk.com/robot/send?access_token=xxx
  secret: SECxxx  # 加签密钥（可选）
```

#### 企业微信

```yaml
type: wechat
settings:
  webhook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
```

#### Slack

```yaml
type: slack
settings:
  webhook: https://hooks.slack.com/services/xxx/xxx/xxx
  channel: "#alerts"
```

#### Webhook

```yaml
type: webhook
settings:
  url: https://your-webhook.example.com/alerts
  headers:
    Authorization: Bearer xxx
```

### 通知策略

配置告警路由：

```yaml
routes:
  - match:
      severity: critical
    receiver: pager-duty
    continue: true
  - match:
      severity: warning
    receiver: email
  - match:
      team: backend
    receiver: backend-slack
```

## 最佳实践

### 监控策略

1. **分层监控**
   - 基础设施层（节点、网络）
   - 平台层（Kubernetes 组件）
   - 应用层（业务指标）

2. **合理的告警阈值**
   - 避免过于敏感
   - 避免告警风暴
   - 定期调整优化

3. **告警分级**
   - Critical: 需要立即处理
   - Warning: 需要关注
   - Info: 仅记录

### 常用 PromQL

```promql
# 节点 CPU 使用率
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 节点内存使用率
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Pod CPU 使用
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod)

# Pod 内存使用
sum(container_memory_working_set_bytes{container!=""}) by (pod)

# Pod 重启次数
sum(kube_pod_container_status_restarts_total) by (pod)

# Deployment 副本状态
kube_deployment_status_replicas_unavailable > 0
```

## 故障排查

### Prometheus 连接失败

1. 检查地址是否正确
2. 检查网络连通性
3. 检查认证配置

### Grafana 面板不显示

1. 检查 API Key 权限
2. 检查 Dashboard 存在
3. 检查时间范围

### 告警不触发

1. 检查 AlertManager 配置
2. 检查告警规则语法
3. 查看 Prometheus 告警状态

## 下一步

- [日志中心](./log-center) - 集中日志管理
- [权限管理](./rbac-permissions) - RBAC 配置

