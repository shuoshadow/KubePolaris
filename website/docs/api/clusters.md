---
sidebar_position: 3
---

# 集群 API

## 获取集群列表

### 请求

```
GET /api/clusters
```

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码，默认 1 |
| pageSize | int | 每页数量，默认 20 |
| search | string | 搜索关键字 |
| status | string | 状态筛选 |

### 示例

```bash
curl -X GET "https://kubepolaris.example.com/api/clusters?page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

### 响应

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "production",
        "apiServer": "https://k8s.example.com:6443",
        "status": "connected",
        "version": "v1.28.0",
        "nodeCount": 5,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

## 获取集群详情

### 请求

```
GET /api/clusters/:id
```

### 示例

```bash
curl -X GET https://kubepolaris.example.com/api/clusters/1 \
  -H "Authorization: Bearer <token>"
```

### 响应

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "production",
    "description": "生产环境集群",
    "apiServer": "https://k8s.example.com:6443",
    "status": "connected",
    "version": "v1.28.0",
    "nodeCount": 5,
    "podCount": 120,
    "namespaceCount": 15,
    "resources": {
      "cpu": {
        "capacity": "40",
        "used": "25.5",
        "percentage": 63.75
      },
      "memory": {
        "capacity": "160Gi",
        "used": "95Gi",
        "percentage": 59.37
      }
    },
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-07T10:00:00Z"
  }
}
```

## 创建集群

### 请求

```
POST /api/clusters
```

### 参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 集群名称 |
| description | string | 否 | 描述 |
| apiServer | string | 是 | API Server 地址 |
| kubeConfig | string | 否 | kubeconfig 内容 (base64) |
| token | string | 否 | Token |
| caCert | string | 否 | CA 证书 (base64) |

### 示例

```bash
curl -X POST https://kubepolaris.example.com/api/clusters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production",
    "description": "生产环境集群",
    "apiServer": "https://k8s.example.com:6443",
    "kubeConfig": "YXBpVmVyc2lvbjogdjEK..."
  }'
```

### 响应

```json
{
  "code": 201,
  "message": "Cluster created successfully",
  "data": {
    "id": 1,
    "name": "production"
  }
}
```

## 更新集群

### 请求

```
PUT /api/clusters/:id
```

### 参数

同创建集群。

### 示例

```bash
curl -X PUT https://kubepolaris.example.com/api/clusters/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新描述"
  }'
```

## 删除集群

### 请求

```
DELETE /api/clusters/:id
```

### 示例

```bash
curl -X DELETE https://kubepolaris.example.com/api/clusters/1 \
  -H "Authorization: Bearer <token>"
```

### 响应

```json
{
  "code": 200,
  "message": "Cluster deleted successfully",
  "data": null
}
```

## 测试集群连接

### 请求

```
POST /api/clusters/:id/test
```

### 示例

```bash
curl -X POST https://kubepolaris.example.com/api/clusters/1/test \
  -H "Authorization: Bearer <token>"
```

### 响应

```json
{
  "code": 200,
  "data": {
    "connected": true,
    "version": "v1.28.0",
    "message": "Connection successful"
  }
}
```

## 获取集群资源统计

### 请求

```
GET /api/clusters/:id/stats
```

### 响应

```json
{
  "code": 200,
  "data": {
    "nodes": {
      "total": 5,
      "ready": 5,
      "notReady": 0
    },
    "pods": {
      "total": 120,
      "running": 115,
      "pending": 3,
      "failed": 2
    },
    "deployments": {
      "total": 25,
      "available": 24,
      "unavailable": 1
    },
    "resources": {
      "cpu": {
        "capacity": "40",
        "allocatable": "38",
        "used": "25.5"
      },
      "memory": {
        "capacity": "160Gi",
        "allocatable": "155Gi",
        "used": "95Gi"
      }
    }
  }
}
```

