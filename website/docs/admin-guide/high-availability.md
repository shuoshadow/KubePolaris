---
sidebar_position: 2
---

# 高可用部署

本文档介绍如何部署高可用的 KubePolaris 集群。

## 架构设计

### 高可用组件

| 组件 | HA 策略 | 说明 |
|------|---------|------|
| Backend | 多副本 | 无状态，可水平扩展 |
| Frontend | 多副本 | 无状态，可水平扩展 |
| MySQL | 主从复制 | 建议使用云数据库 |
| 负载均衡 | 多节点 | 对外入口 |

### 推荐配置

| 规模 | Backend 副本 | Frontend 副本 | 数据库 |
|------|-------------|--------------|--------|
| 小型 | 2 | 2 | 主从 |
| 中型 | 3 | 3 | 云 RDS |
| 大型 | 5+ | 3+ | 云 RDS + 读写分离 |

## Kubernetes 部署

### values.yaml 配置

```yaml title="values-ha.yaml"
# 后端配置
backend:
  replicaCount: 3
  
  resources:
    limits:
      cpu: 4000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 1Gi

  # Pod 反亲和性
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/component: backend
          topologyKey: kubernetes.io/hostname

  # 拓扑分布约束
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: ScheduleAnyway
      labelSelector:
        matchLabels:
          app.kubernetes.io/component: backend

# 前端配置
frontend:
  replicaCount: 3
  
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app.kubernetes.io/component: frontend
            topologyKey: kubernetes.io/hostname

# 使用外部数据库
mysql:
  internal:
    enabled: false
  external:
    enabled: true
    host: mysql.example.com
    port: 3306
    database: kubepolaris
    username: kubepolaris
    existingSecret: kubepolaris-mysql-secret

# Ingress 配置
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "3600"
  hosts:
    - host: kubepolaris.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubepolaris-tls
      hosts:
        - kubepolaris.example.com

# PDB 配置
podDisruptionBudget:
  enabled: true
  minAvailable: 2

# HPA 配置
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### 部署命令

```bash
helm install kubepolaris kubepolaris/kubepolaris \
  -f values-ha.yaml \
  -n kubepolaris \
  --create-namespace
```

## 数据库高可用

### 云数据库

推荐使用云厂商的托管数据库服务：

- **阿里云 RDS**: 支持主备实例、读写分离
- **AWS RDS**: Multi-AZ 部署
- **腾讯云 MySQL**: 支持主从同步

### 自建 MySQL HA

使用 MySQL InnoDB Cluster 或 Galera Cluster：

```yaml title="mysql-cluster-values.yaml"
# 使用 MySQL Operator
architecture: group-replication
groupReplication:
  enabled: true
  secondary:
    replicaCount: 2
```

### 连接池配置

```yaml
database:
  max_idle_conns: 20
  max_open_conns: 200
  conn_max_lifetime: 3600
```

## 负载均衡

### Kubernetes Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubepolaris
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    # WebSocket 支持
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "3600"
    nginx.ingress.kubernetes.io/websocket-services: "kubepolaris-backend"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - kubepolaris.example.com
      secretName: kubepolaris-tls
  rules:
    - host: kubepolaris.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kubepolaris-frontend
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: kubepolaris-backend
                port:
                  number: 8080
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: kubepolaris-backend
                port:
                  number: 8080
```

### 外部负载均衡

配置云负载均衡器：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubepolaris-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 8080
  selector:
    app: kubepolaris
```

## 会话管理

### WebSocket 会话

WebSocket 连接需要会话保持：

```yaml
# Ingress 会话保持
nginx.ingress.kubernetes.io/affinity: "cookie"
nginx.ingress.kubernetes.io/session-cookie-hash: "sha1"
```

### JWT Token

使用相同的 JWT Secret 确保所有实例可以验证 Token：

```yaml
# 所有实例使用相同的 JWT Secret
security:
  jwtSecret: your-shared-secret
```

## 健康检查

### Kubernetes 探针

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### 健康检查端点

```
GET /api/health
{
  "status": "healthy",
  "database": "connected",
  "uptime": "10h30m"
}

GET /api/health/ready
{
  "ready": true
}
```

## 监控告警

### 关键指标

| 指标 | 告警条件 |
|------|---------|
| 副本数 | < 期望值 |
| CPU 使用率 | > 80% |
| 内存使用率 | > 85% |
| API 延迟 | P99 > 1s |
| 数据库连接 | 失败 |
| 证书过期 | < 30 天 |

### Prometheus 告警规则

```yaml
groups:
  - name: kubepolaris
    rules:
      - alert: KubePolarisDown
        expr: up{job="kubepolaris"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "KubePolaris instance down"

      - alert: KubePolarisHighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job="kubepolaris"}[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"

      - alert: KubePolarisReplicasLow
        expr: kube_deployment_status_replicas_available{deployment="kubepolaris"} < 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low replica count"
```

## 灾难恢复

### 备份策略

```bash
# 每日全量备份
0 2 * * * /scripts/backup-full.sh

# 每小时增量备份
0 * * * * /scripts/backup-incremental.sh
```

### 恢复步骤

1. 准备新环境
2. 恢复数据库
3. 部署应用
4. 验证功能
5. 切换流量

### RTO/RPO

| 指标 | 目标 |
|------|------|
| RTO (恢复时间) | < 30 分钟 |
| RPO (数据丢失) | < 1 小时 |

## 最佳实践

### 部署检查清单

- [ ] 多副本部署
- [ ] Pod 反亲和性配置
- [ ] 数据库 HA 配置
- [ ] 负载均衡配置
- [ ] SSL/TLS 证书
- [ ] 健康检查配置
- [ ] PDB 配置
- [ ] 备份策略
- [ ] 监控告警

### 容量规划

定期评估资源使用：
- 管理集群数量增长
- API 请求增长
- WebSocket 连接数
- 数据库存储

### 定期演练

- 故障转移演练
- 恢复演练
- 扩容演练

## 下一步

- [安全加固](./security) - 安全配置
- [备份恢复](./backup-restore) - 备份策略

