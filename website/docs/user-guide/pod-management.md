---
sidebar_position: 3
---

# Pod 管理

Pod 是 Kubernetes 中最小的部署单元。本文档介绍如何在 KubePolaris 中查看和管理 Pod。

## 查看 Pod

### Pod 列表

进入 **Pod 管理** 页面：

1. 选择目标集群
2. 选择命名空间（或选择"全部"查看所有）
3. 使用搜索框按名称过滤
4. 按状态筛选（Running/Pending/Failed 等）

列表显示信息：
- Pod 名称
- 状态和阶段
- 就绪容器数
- 重启次数
- 所在节点
- 创建时间
- IP 地址

### 状态说明

| 状态 | 说明 |
|------|------|
| 🟢 **Running** | Pod 正常运行中 |
| 🟡 **Pending** | Pod 等待调度或启动 |
| 🔴 **Failed** | Pod 运行失败 |
| ⚫ **Succeeded** | Pod 成功完成（Job） |
| ⚪ **Unknown** | 无法获取状态 |

### Pod 详情

点击 Pod 名称进入详情页：

#### 基本信息
- Pod 名称、命名空间、UID
- 所在节点
- Pod IP 和主机 IP
- QoS 等级
- 创建时间
- 标签和注解

#### 容器列表
- 容器名称和镜像
- 容器状态
- 资源使用
- 端口映射
- 环境变量
- 挂载卷

#### 状态条件
- Initialized
- Ready
- ContainersReady
- PodScheduled

#### 事件
查看 Pod 相关事件，帮助排查问题。

## 查看日志

### 实时日志

1. 在 Pod 详情页点击 **日志**
2. 选择容器（多容器 Pod）
3. 查看实时日志流

功能特性：
- **实时刷新**: 自动滚动显示最新日志
- **暂停/继续**: 暂停自动滚动查看历史
- **搜索过滤**: 按关键字过滤日志
- **时间范围**: 选择查看时间范围
- **下载**: 导出日志文件

### 历史日志

查看已终止容器的日志：

1. 选择 **Previous** 选项
2. 或在容器列表中选择已终止的容器

### 日志选项

| 选项 | 说明 |
|------|------|
| **Container** | 选择容器 |
| **Previous** | 查看上次运行的日志 |
| **Lines** | 显示行数限制 |
| **Since** | 时间范围 |
| **Timestamps** | 显示时间戳 |

## 终端访问

### 进入容器

1. 在 Pod 详情页点击 **终端**
2. 选择容器（多容器 Pod）
3. 在 Web 终端中执行命令

```bash
# 常用命令示例
ls -la
cat /etc/hosts
env | grep MY_
ps aux
```

### 终端功能

- **多终端**: 支持同时开多个终端
- **全屏**: 全屏模式便于操作
- **复制粘贴**: 支持文本复制粘贴
- **命令历史**: 支持上下键查看历史
- **自动重连**: 断线自动重连

详细说明请参考 [终端访问](./terminal-access)。

## Pod 操作

### 删除 Pod

1. 点击 Pod 行的 **删除** 按钮
2. 确认删除

:::info 说明
如果 Pod 由工作负载（Deployment 等）管理，删除后会自动重建。
:::

### 强制删除

对于卡在 Terminating 状态的 Pod：

1. 点击 **强制删除**
2. 确认操作

等同于：
```bash
kubectl delete pod <pod-name> --force --grace-period=0
```

### 查看 YAML

在详情页的 **YAML** 标签查看完整配置。

### 复制 Pod 名称

快速复制 Pod 名称用于 kubectl 命令。

## 容器管理

### 查看容器详情

点击容器名称查看：

- 镜像信息
- 状态详情
- 资源配置
- 端口映射
- 环境变量
- 挂载点
- 健康检查配置

### 容器操作

| 操作 | 说明 |
|------|------|
| **日志** | 查看容器日志 |
| **终端** | 进入容器终端 |
| **重启** | 重启容器（通过删除 Pod） |

## 资源监控

### 实时指标

在 Pod 详情页查看：

- CPU 使用率
- 内存使用量
- 网络 IO
- 磁盘 IO

### 历史趋势

配置 Prometheus 后可查看：

- 过去 1 小时/6 小时/24 小时趋势
- 资源使用率峰值
- 重启记录

## 问题诊断

### 常见状态问题

#### ImagePullBackOff

镜像拉取失败：

1. 检查镜像地址是否正确
2. 检查网络连接
3. 检查镜像仓库认证

```bash
# 创建 imagePullSecret
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password>
```

#### CrashLoopBackOff

容器反复崩溃：

1. 查看容器日志
2. 检查健康检查配置
3. 检查资源是否充足
4. 检查应用启动命令

#### Pending

Pod 无法调度：

1. 检查节点资源
2. 检查节点污点
3. 检查 PVC 状态
4. 检查节点选择器

#### OOMKilled

内存超限被杀：

1. 增加内存限制
2. 检查内存泄漏
3. 优化应用内存使用

### 诊断工具

**事件查看**
```
查看事件可快速定位问题原因
```

**描述 Pod**
```bash
kubectl describe pod <pod-name>
```

**容器日志**
```bash
kubectl logs <pod-name> -c <container-name>
```

## 批量操作

### 批量删除

1. 选择多个 Pod（勾选框）
2. 点击 **批量删除**
3. 确认操作

### 按标签筛选

使用标签快速筛选：

```
app=nginx
environment=production
```

## 最佳实践

### Pod 命名

使用有意义的名称前缀：
- Deployment: `<name>-<hash>-<random>`
- StatefulSet: `<name>-<ordinal>`

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

配置适当的探针：

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

### 优雅终止

配置终止等待时间：

```yaml
terminationGracePeriodSeconds: 30
```

## 下一步

- [终端访问](./terminal-access) - Web 终端详细使用
- [日志中心](./log-center) - 集中日志管理

