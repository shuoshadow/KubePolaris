---
sidebar_position: 1
---

# API 概述

KubePolaris 提供 RESTful API，支持通过 API 进行自动化操作。

## 基本信息

| 项目 | 值 |
|------|-----|
| 基础路径 | `/api` |
| 版本 | v1 |
| 协议 | HTTP/HTTPS |
| 格式 | JSON |

## 认证

### JWT Token

所有 API 请求需要携带 JWT Token：

```bash
curl -H "Authorization: Bearer <your-token>" \
  https://kubepolaris.example.com/api/clusters
```

### 获取 Token

```bash
# 登录获取 Token
curl -X POST https://kubepolaris.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 响应
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expire": "2026-01-08T10:00:00Z"
  }
}
```

### 刷新 Token

```bash
curl -X POST https://kubepolaris.example.com/api/auth/refresh \
  -H "Authorization: Bearer <your-token>"
```

## 响应格式

### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 实际数据
  }
}
```

### 分页响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "Invalid request",
  "data": null
}
```

## 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## API 端点

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/auth/refresh` | 刷新 Token |
| GET | `/api/auth/me` | 当前用户信息 |

### 集群

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/clusters` | 集群列表 |
| POST | `/api/clusters` | 添加集群 |
| GET | `/api/clusters/:id` | 集群详情 |
| PUT | `/api/clusters/:id` | 更新集群 |
| DELETE | `/api/clusters/:id` | 删除集群 |
| POST | `/api/clusters/:id/test` | 测试连接 |

### 节点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/clusters/:id/nodes` | 节点列表 |
| GET | `/api/clusters/:id/nodes/:name` | 节点详情 |
| POST | `/api/clusters/:id/nodes/:name/cordon` | 禁止调度 |
| POST | `/api/clusters/:id/nodes/:name/uncordon` | 恢复调度 |
| POST | `/api/clusters/:id/nodes/:name/drain` | 排空节点 |

### 工作负载

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/clusters/:id/workloads` | 工作负载列表 |
| GET | `/api/clusters/:id/namespaces/:ns/deployments/:name` | Deployment 详情 |
| PUT | `/api/clusters/:id/namespaces/:ns/deployments/:name` | 更新 Deployment |
| DELETE | `/api/clusters/:id/namespaces/:ns/deployments/:name` | 删除 Deployment |
| POST | `/api/clusters/:id/namespaces/:ns/deployments/:name/scale` | 扩缩容 |
| POST | `/api/clusters/:id/namespaces/:ns/deployments/:name/restart` | 重启 |

### Pod

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/clusters/:id/pods` | Pod 列表 |
| GET | `/api/clusters/:id/namespaces/:ns/pods/:name` | Pod 详情 |
| DELETE | `/api/clusters/:id/namespaces/:ns/pods/:name` | 删除 Pod |
| GET | `/api/clusters/:id/namespaces/:ns/pods/:name/logs` | Pod 日志 |

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 用户列表 |
| POST | `/api/users` | 创建用户 |
| GET | `/api/users/:id` | 用户详情 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

## 示例

### 获取集群列表

```bash
curl -X GET https://kubepolaris.example.com/api/clusters \
  -H "Authorization: Bearer <token>"
```

### 创建集群

```bash
curl -X POST https://kubepolaris.example.com/api/clusters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production",
    "apiServer": "https://k8s.example.com:6443",
    "kubeConfig": "base64-encoded-kubeconfig"
  }'
```

### 扩缩容

```bash
curl -X POST https://kubepolaris.example.com/api/clusters/1/namespaces/default/deployments/nginx/scale \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"replicas": 5}'
```

## SDK

### Go SDK

```go
import "github.com/kubepolaris/kubepolaris-go-sdk"

client := kubepolaris.NewClient(
    kubepolaris.WithBaseURL("https://kubepolaris.example.com"),
    kubepolaris.WithToken("your-token"),
)

clusters, err := client.Clusters.List(context.Background())
```

### Python SDK

```python
from kubepolaris import Client

client = Client(
    base_url="https://kubepolaris.example.com",
    token="your-token"
)

clusters = client.clusters.list()
```

## 更多

- [认证](./authentication) - 认证详情
- [集群 API](./clusters) - 集群 API 详情

