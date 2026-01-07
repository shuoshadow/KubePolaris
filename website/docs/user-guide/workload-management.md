---
sidebar_position: 2
---

# 工作负载管理

KubePolaris 提供直观的界面来管理 Kubernetes 工作负载，包括 Deployment、StatefulSet、DaemonSet、Job 和 CronJob。

## 工作负载类型

| 类型 | 用途 | 特点 |
|------|------|------|
| **Deployment** | 无状态应用 | 支持滚动更新、扩缩容 |
| **StatefulSet** | 有状态应用 | 稳定的网络标识和持久存储 |
| **DaemonSet** | 节点守护进程 | 每个节点运行一个 Pod |
| **Job** | 一次性任务 | 运行至完成 |
| **CronJob** | 定时任务 | 按计划周期运行 |

## 查看工作负载

### 工作负载列表

进入 **工作负载** 页面查看所有工作负载：

- 选择集群和命名空间
- 按类型筛选（Deployment/StatefulSet 等）
- 搜索工作负载名称
- 查看状态、副本数、镜像等信息

### 工作负载详情

点击工作负载名称进入详情页：

#### 概览

- 基本信息（名称、命名空间、创建时间）
- 副本状态（期望数/就绪数/可用数）
- 标签和选择器
- 更新策略

#### Pod 列表

查看工作负载关联的所有 Pod：

- Pod 名称和状态
- 所在节点
- 重启次数
- 资源使用

#### 事件

查看与该工作负载相关的事件。

#### YAML

查看和编辑原始 YAML 配置。

## 创建工作负载

### 使用表单创建

1. 点击 **创建工作负载**
2. 选择工作负载类型
3. 填写基本信息：

**基本配置**
```
名称: my-deployment
命名空间: default
副本数: 3
```

**容器配置**
```
镜像: nginx:1.21
端口: 80
资源限制:
  CPU: 500m
  内存: 512Mi
```

**环境变量**
```
MY_VAR: value
SECRET_KEY: <从 Secret 引用>
```

**存储卷**
- ConfigMap 挂载
- Secret 挂载
- PVC 挂载
- EmptyDir

4. 点击 **创建**

### 使用 YAML 创建

1. 点击 **创建工作负载** → **YAML 模式**
2. 粘贴或编写 YAML：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
```

3. 点击 **创建**

## 工作负载操作

### 扩缩容

快速调整副本数量：

1. 在列表中点击 **扩缩容** 按钮
2. 输入新的副本数
3. 点击确认

或使用滑块快速调整。

### 重启

滚动重启所有 Pod：

1. 点击 **重启** 按钮
2. 确认操作

:::info 说明
重启通过更新 Pod 模板的 annotation 触发滚动更新，不会造成服务中断。
:::

### 更新镜像

快速更新容器镜像：

1. 点击 **更新镜像**
2. 选择容器（多容器 Pod）
3. 输入新镜像地址
4. 确认更新

### 回滚

回滚到之前的版本：

1. 进入工作负载详情 → **修订历史**
2. 查看历史版本列表
3. 点击目标版本的 **回滚** 按钮
4. 确认操作

### 暂停/恢复

暂停 Deployment 的更新：

```
# 暂停后，对 Deployment 的修改不会触发滚动更新
# 适用于需要进行多项修改的场景
```

### 编辑 YAML

1. 进入详情页 → **YAML** 标签
2. 编辑配置
3. 点击 **保存**

YAML 编辑器功能：
- 语法高亮
- 自动补全
- 格式验证
- 差异对比

### 删除

1. 点击 **删除** 按钮
2. 确认删除（输入工作负载名称）

:::warning 警告
删除工作负载会同时删除其管理的所有 Pod！
:::

## 高级功能

### 资源监控

在工作负载详情页查看：

- CPU 使用率趋势
- 内存使用率趋势
- 网络 IO
- Pod 重启次数

### 日志聚合

聚合查看工作负载下所有 Pod 的日志：

1. 点击 **日志** 按钮
2. 选择要查看的容器
3. 设置时间范围
4. 使用关键字过滤

### 自动伸缩 (HPA)

配置水平自动伸缩：

1. 进入详情页 → **自动伸缩**
2. 启用 HPA
3. 配置参数：

```yaml
最小副本数: 2
最大副本数: 10
目标 CPU 使用率: 80%
目标内存使用率: 80%
```

### 亲和性配置

配置 Pod 调度策略：

**节点亲和性**
```yaml
nodeAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
    nodeSelectorTerms:
    - matchExpressions:
      - key: node-type
        operator: In
        values:
        - compute
```

**Pod 反亲和性**
```yaml
podAntiAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
  - labelSelector:
      matchLabels:
        app: nginx
    topologyKey: kubernetes.io/hostname
```

## 最佳实践

### 资源配置

始终设置资源请求和限制：

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### 健康检查

配置存活和就绪探针：

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 更新策略

合理配置滚动更新策略：

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 25%
```

### 使用标签

合理使用标签组织工作负载：

```yaml
labels:
  app: myapp
  environment: production
  team: backend
  version: v1.2.0
```

## 常见问题

### Pod 一直 Pending

1. 检查资源是否充足
2. 检查节点是否有污点
3. 检查 PVC 是否已绑定
4. 查看事件获取详细原因

### 镜像拉取失败

1. 检查镜像地址是否正确
2. 检查镜像仓库认证
3. 检查网络连接
4. 创建 imagePullSecrets

### 健康检查失败

1. 检查探针配置
2. 增加 initialDelaySeconds
3. 检查应用启动时间
4. 验证健康检查端点

## 下一步

- [Pod 管理](./pod-management) - 管理单个 Pod
- [终端访问](./terminal-access) - 使用 Web 终端

