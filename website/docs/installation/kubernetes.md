---
sidebar_position: 2
---

# Kubernetes 部署

使用 Helm Chart 在 Kubernetes 上部署 KubePolaris，这是生产环境的推荐方式。

## 前置要求

- Kubernetes 1.20+
- Helm 3.0+
- kubectl 已配置
- 具有创建命名空间和资源的权限
- （可选）Ingress Controller
- （可选）cert-manager（用于自动证书）

## 快速部署

### 1. 添加 Helm 仓库

```bash
helm repo add kubepolaris https://clay-wangzhi.github.io/KubePolaris
helm repo update
```

### 2. 安装

```bash
# 创建命名空间
kubectl create namespace kubepolaris

# 使用默认配置安装
helm install kubepolaris kubepolaris/kubepolaris \
  -n kubepolaris
```

### 3. 验证

```bash
# 查看 Pod 状态
kubectl get pods -n kubepolaris

# 等待所有 Pod 就绪
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kubepolaris -n kubepolaris --timeout=300s
```

## Helm Chart 配置

### values.yaml 完整参考

```yaml title="values.yaml"
# ============== 全局配置 ==============
global:
  # 镜像仓库
  imageRegistry: ""
  # 镜像拉取密钥
  imagePullSecrets: []
  # 存储类
  storageClass: ""

# ============== 后端配置 ==============
backend:
  # 副本数
  replicaCount: 2

  image:
    repository: kubepolaris/kubepolaris-backend
    tag: "latest"
    pullPolicy: IfNotPresent

  # 服务配置
  service:
    type: ClusterIP
    port: 8080

  # 资源限制
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 512Mi

  # 健康检查
  livenessProbe:
    httpGet:
      path: /api/health
      port: http
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3

  readinessProbe:
    httpGet:
      path: /api/health
      port: http
    initialDelaySeconds: 10
    periodSeconds: 5
    timeoutSeconds: 3
    failureThreshold: 3

  # 环境变量
  env: []
  # - name: KUBEPOLARIS_LOG_LEVEL
  #   value: "info"

  # 从 Secret 加载环境变量
  envFrom: []
  # - secretRef:
  #     name: kubepolaris-secrets

  # 额外的卷挂载
  extraVolumes: []
  extraVolumeMounts: []

  # 节点选择器
  nodeSelector: {}

  # 容忍度
  tolerations: []

  # 亲和性
  affinity: {}

  # Pod 安全上下文
  podSecurityContext:
    fsGroup: 1000

  # 容器安全上下文
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    readOnlyRootFilesystem: false
    allowPrivilegeEscalation: false

  # 服务账号
  serviceAccount:
    create: true
    name: ""
    annotations: {}

# ============== 前端配置 ==============
frontend:
  replicaCount: 2

  image:
    repository: kubepolaris/kubepolaris-frontend
    tag: "latest"
    pullPolicy: IfNotPresent

  service:
    type: ClusterIP
    port: 80

  resources:
    limits:
      cpu: 500m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi

# ============== 数据库配置 ==============
mysql:
  # 使用内置 MySQL
  internal:
    enabled: true
    
    image:
      repository: mysql
      tag: "8.0"

    # 持久化存储
    persistence:
      enabled: true
      size: 20Gi
      storageClass: ""
      accessMode: ReadWriteOnce

    resources:
      limits:
        cpu: 2000m
        memory: 2Gi
      requests:
        cpu: 500m
        memory: 1Gi

    # root 密码（建议使用 existingSecret）
    rootPassword: ""
    # 使用已有的 Secret
    existingSecret: ""
    existingSecretPasswordKey: "mysql-root-password"

  # 使用外部 MySQL
  external:
    enabled: false
    host: ""
    port: 3306
    database: kubepolaris
    username: kubepolaris
    password: ""
    existingSecret: ""
    existingSecretPasswordKey: "password"

# ============== Ingress 配置 ==============
ingress:
  enabled: false
  className: "nginx"
  
  annotations: {}
  # kubernetes.io/ingress.class: nginx
  # cert-manager.io/cluster-issuer: letsencrypt-prod
  # nginx.ingress.kubernetes.io/proxy-body-size: "100m"
  # nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
  # nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
  
  hosts:
    - host: kubepolaris.local
      paths:
        - path: /
          pathType: Prefix

  tls: []
  # - secretName: kubepolaris-tls
  #   hosts:
  #     - kubepolaris.local

# ============== 持久化配置 ==============
persistence:
  # 日志持久化
  logs:
    enabled: false
    size: 10Gi
    storageClass: ""
    accessMode: ReadWriteOnce

# ============== 监控配置 ==============
monitoring:
  # Prometheus ServiceMonitor
  serviceMonitor:
    enabled: false
    interval: 30s
    scrapeTimeout: 10s
    labels: {}

  # Grafana 集成
  grafana:
    enabled: false
    url: ""
    apiKey: ""

  # Prometheus 集成
  prometheus:
    enabled: false
    url: ""

# ============== 告警配置 ==============
alerting:
  alertmanager:
    enabled: false
    url: ""

# ============== 安全配置 ==============
security:
  # JWT 密钥（必须设置）
  jwtSecret: ""
  # 使用已有的 Secret
  existingSecret: ""
  existingSecretJwtKey: "jwt-secret"

# ============== RBAC 配置 ==============
rbac:
  # 创建 ClusterRole 和 ClusterRoleBinding
  create: true
  
  # 管理多集群所需的权限
  rules:
    - apiGroups: [""]
      resources: ["*"]
      verbs: ["get", "list", "watch"]
    - apiGroups: ["apps"]
      resources: ["*"]
      verbs: ["get", "list", "watch"]
    # 根据需要添加更多规则

# ============== Pod 中断预算 ==============
podDisruptionBudget:
  enabled: true
  minAvailable: 1
  # maxUnavailable: 1

# ============== 水平自动伸缩 ==============
autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80
```

## 部署场景

### 场景一：基础部署

最简单的部署，使用内置数据库：

```bash
helm install kubepolaris kubepolaris/kubepolaris \
  -n kubepolaris \
  --set security.jwtSecret="your-secure-jwt-secret-at-least-32-chars"
```

### 场景二：使用外部数据库

连接已有的 MySQL 实例：

```bash
# 创建数据库密钥
kubectl create secret generic kubepolaris-mysql \
  --from-literal=password=your_mysql_password \
  -n kubepolaris

# 安装
helm install kubepolaris kubepolaris/kubepolaris \
  -n kubepolaris \
  --set mysql.internal.enabled=false \
  --set mysql.external.enabled=true \
  --set mysql.external.host=mysql.database.svc.cluster.local \
  --set mysql.external.database=kubepolaris \
  --set mysql.external.username=kubepolaris \
  --set mysql.external.existingSecret=kubepolaris-mysql \
  --set security.jwtSecret="your-secure-jwt-secret"
```

### 场景三：启用 Ingress

对外暴露服务：

```yaml title="values-ingress.yaml"
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
  hosts:
    - host: kubepolaris.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubepolaris-tls
      hosts:
        - kubepolaris.example.com

security:
  jwtSecret: "your-secure-jwt-secret-at-least-32-chars"
```

```bash
helm install kubepolaris kubepolaris/kubepolaris \
  -n kubepolaris \
  -f values-ingress.yaml
```

### 场景四：高可用部署

```yaml title="values-ha.yaml"
backend:
  replicaCount: 3
  resources:
    limits:
      cpu: 4000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 1Gi
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - kubepolaris-backend
          topologyKey: kubernetes.io/hostname

frontend:
  replicaCount: 3

mysql:
  internal:
    enabled: true
    persistence:
      size: 100Gi

podDisruptionBudget:
  enabled: true
  minAvailable: 2

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
```

## 升级

### 升级 Helm Chart

```bash
# 更新仓库
helm repo update

# 查看新版本
helm search repo kubepolaris --versions

# 升级
helm upgrade kubepolaris kubepolaris/kubepolaris \
  -n kubepolaris \
  -f values.yaml

# 查看升级状态
helm history kubepolaris -n kubepolaris
```

### 回滚

```bash
# 查看历史版本
helm history kubepolaris -n kubepolaris

# 回滚到指定版本
helm rollback kubepolaris 1 -n kubepolaris
```

## 卸载

```bash
# 卸载 Chart
helm uninstall kubepolaris -n kubepolaris

# 删除 PVC（注意：会删除所有数据）
kubectl delete pvc -l app.kubernetes.io/name=kubepolaris -n kubepolaris

# 删除命名空间
kubectl delete namespace kubepolaris
```

## 故障排查

### 查看 Pod 日志

```bash
kubectl logs -f deployment/kubepolaris-backend -n kubepolaris
```

### 查看事件

```bash
kubectl get events -n kubepolaris --sort-by='.lastTimestamp'
```

### 检查资源状态

```bash
kubectl describe pod -l app.kubernetes.io/name=kubepolaris -n kubepolaris
```

### 常见问题

**Pod 一直 Pending**

```bash
# 检查节点资源
kubectl describe nodes

# 检查 PVC 状态
kubectl get pvc -n kubepolaris
```

**数据库连接失败**

```bash
# 检查数据库 Pod
kubectl logs -f deployment/kubepolaris-mysql -n kubepolaris

# 验证 Secret
kubectl get secret kubepolaris-mysql -n kubepolaris -o yaml
```

## 下一步

- [源码编译](./source) - 从源码构建
- [高可用部署](../admin-guide/high-availability) - 生产最佳实践

