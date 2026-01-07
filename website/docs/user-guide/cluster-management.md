---
sidebar_position: 1
---

# 集群管理

KubePolaris 支持同时管理多个 Kubernetes 集群。本文档介绍如何添加、管理和监控集群。

## 集群总览

在 **集群管理** 页面，你可以看到所有已导入集群的概览信息：

- 集群名称和状态
- API Server 地址
- Kubernetes 版本
- 节点数量
- 资源使用情况

## 添加集群

### 步骤 1：进入添加页面

点击 **集群管理** → **添加集群** 按钮。

### 步骤 2：填写基本信息

| 字段 | 说明 | 示例 |
|------|------|------|
| 集群名称 | 用于标识集群的唯一名称 | `production-cluster` |
| 描述 | 集群用途说明（可选） | `生产环境主集群` |
| API Server | Kubernetes API 服务器地址 | `https://192.168.1.100:6443` |

### 步骤 3：配置认证

KubePolaris 支持多种认证方式：

#### 方式一：上传 Kubeconfig 文件

最简单的方式，直接上传现有的 kubeconfig 文件：

1. 点击 **上传 Kubeconfig**
2. 选择本地的 kubeconfig 文件
3. 系统会自动解析配置

```bash
# 获取 kubeconfig 文件位置
echo $KUBECONFIG
# 通常在 ~/.kube/config
```

#### 方式二：填写 Token

使用 ServiceAccount Token 认证：

1. 选择 **Token 认证**
2. 填写 Token 值
3. 填写 CA 证书（可选，用于 HTTPS 验证）

```bash
# 创建 ServiceAccount 并获取 Token
kubectl create serviceaccount kubepolaris -n kube-system

# 创建 ClusterRoleBinding
kubectl create clusterrolebinding kubepolaris-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=kube-system:kubepolaris

# 获取 Token (Kubernetes 1.24+)
kubectl create token kubepolaris -n kube-system --duration=8760h
```

#### 方式三：客户端证书

使用客户端证书认证：

1. 选择 **证书认证**
2. 上传客户端证书 (`client.crt`)
3. 上传客户端密钥 (`client.key`)
4. 上传 CA 证书 (`ca.crt`)

### 步骤 4：测试连接

点击 **测试连接** 按钮验证配置：

- ✅ **连接成功**: 显示 Kubernetes 版本信息
- ❌ **连接失败**: 显示错误信息，根据提示修正

### 步骤 5：保存

确认配置无误后，点击 **保存** 完成集群添加。

## 集群详情

点击集群名称进入详情页，可以查看：

### 总览标签页

- **资源统计**: CPU、内存、存储使用率
- **节点状态**: Ready/NotReady 节点分布
- **工作负载**: Deployment、Pod 等数量统计
- **近期事件**: 最新的集群事件

### 节点标签页

查看集群中所有节点的详细信息：

- 节点名称和状态
- 角色（Master/Worker）
- 资源容量和使用率
- 标签和污点

### 命名空间标签页

列出所有命名空间及其资源统计。

### 事件标签页

实时查看集群事件，支持按类型筛选：
- Normal（正常）
- Warning（警告）

## 集群操作

### 编辑集群

1. 点击集群行的 **编辑** 按钮
2. 修改集群信息或认证配置
3. 测试连接后保存

### 刷新状态

点击 **刷新** 按钮手动更新集群状态。

### 删除集群

1. 点击集群行的 **删除** 按钮
2. 在确认对话框中输入集群名称
3. 点击确认删除

:::warning 注意
删除集群只会从 KubePolaris 移除管理记录，不会影响实际的 Kubernetes 集群。
:::

## 集群监控

### 内置监控

KubePolaris 内置基础监控指标：

- CPU 使用率趋势
- 内存使用率趋势
- Pod 数量变化
- 节点状态变化

### Prometheus 集成

配置 Prometheus 后可获得更丰富的监控数据：

1. 进入 **系统设置** → **监控配置**
2. 填写 Prometheus 地址
3. 保存配置

### Grafana 面板

集成 Grafana 后可在集群详情页直接查看监控面板：

1. 配置 Grafana 地址和 API Key
2. 选择要展示的 Dashboard
3. 在集群详情页查看内嵌面板

## 最佳实践

### 集群命名规范

建议使用有意义的命名规范：

```
<环境>-<区域>-<用途>-<序号>
```

示例：
- `prod-us-east-app-01`
- `staging-cn-north-test`
- `dev-local-minikube`

### 权限最小化

为 KubePolaris 创建专用的 ServiceAccount，按需授予权限：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubepolaris-readonly
rules:
- apiGroups: [""]
  resources: ["pods", "services", "nodes", "namespaces", "events"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
  verbs: ["get", "list", "watch"]
```

### 定期检查连接

建议定期检查集群连接状态：
- 证书过期检查
- Token 有效性验证
- 网络连通性测试

## 常见问题

### 无法连接到集群

1. **检查网络**: 确保 KubePolaris 能访问 API Server
2. **检查防火墙**: 确保 6443 端口开放
3. **检查证书**: 确保证书未过期且正确

```bash
# 测试连接
curl -k https://<api-server>:6443/healthz
```

### 认证失败

1. **Token 过期**: 重新生成 Token
2. **权限不足**: 检查 ClusterRoleBinding
3. **证书错误**: 确认使用正确的 CA 证书

### 集群状态异常

1. 检查 Kubernetes 集群本身是否正常
2. 检查 API Server 是否可访问
3. 查看 KubePolaris 日志获取详细错误

## 下一步

- [工作负载管理](./workload-management) - 管理 Deployment 等
- [节点管理](./node-management) - 管理集群节点

