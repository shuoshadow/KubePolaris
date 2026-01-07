---
sidebar_position: 4
---

# 工作负载 API

## 获取工作负载列表

### 请求

```
GET /api/clusters/:clusterId/workloads
```

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| namespace | string | 命名空间 |
| type | string | 类型: deployment/statefulset/daemonset |
| page | int | 页码 |
| pageSize | int | 每页数量 |
| search | string | 搜索关键字 |

### 响应

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "name": "nginx",
        "namespace": "default",
        "type": "deployment",
        "replicas": 3,
        "readyReplicas": 3,
        "images": ["nginx:1.21"],
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "total": 1
  }
}
```

## 获取 Deployment 详情

### 请求

```
GET /api/clusters/:clusterId/namespaces/:namespace/deployments/:name
```

### 响应

```json
{
  "code": 200,
  "data": {
    "name": "nginx",
    "namespace": "default",
    "labels": {
      "app": "nginx"
    },
    "annotations": {},
    "replicas": 3,
    "readyReplicas": 3,
    "availableReplicas": 3,
    "strategy": {
      "type": "RollingUpdate",
      "rollingUpdate": {
        "maxSurge": "25%",
        "maxUnavailable": "25%"
      }
    },
    "containers": [
      {
        "name": "nginx",
        "image": "nginx:1.21",
        "ports": [{"containerPort": 80}],
        "resources": {
          "limits": {"cpu": "500m", "memory": "512Mi"},
          "requests": {"cpu": "100m", "memory": "128Mi"}
        }
      }
    ],
    "conditions": [
      {
        "type": "Available",
        "status": "True",
        "reason": "MinimumReplicasAvailable"
      }
    ],
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-07T10:00:00Z"
  }
}
```

## 创建 Deployment

### 请求

```
POST /api/clusters/:clusterId/namespaces/:namespace/deployments
```

### 参数

```json
{
  "name": "nginx",
  "replicas": 3,
  "labels": {
    "app": "nginx"
  },
  "containers": [
    {
      "name": "nginx",
      "image": "nginx:1.21",
      "ports": [{"containerPort": 80}],
      "resources": {
        "limits": {"cpu": "500m", "memory": "512Mi"},
        "requests": {"cpu": "100m", "memory": "128Mi"}
      }
    }
  ]
}
```

## 更新 Deployment

### 请求

```
PUT /api/clusters/:clusterId/namespaces/:namespace/deployments/:name
```

### 使用 YAML 更新

```
PUT /api/clusters/:clusterId/namespaces/:namespace/deployments/:name/yaml
```

## 删除 Deployment

### 请求

```
DELETE /api/clusters/:clusterId/namespaces/:namespace/deployments/:name
```

## 扩缩容

### 请求

```
POST /api/clusters/:clusterId/namespaces/:namespace/deployments/:name/scale
```

### 参数

```json
{
  "replicas": 5
}
```

### 响应

```json
{
  "code": 200,
  "message": "Scaled successfully",
  "data": {
    "replicas": 5
  }
}
```

## 重启

### 请求

```
POST /api/clusters/:clusterId/namespaces/:namespace/deployments/:name/restart
```

### 响应

```json
{
  "code": 200,
  "message": "Restart initiated",
  "data": null
}
```

## 回滚

### 请求

```
POST /api/clusters/:clusterId/namespaces/:namespace/deployments/:name/rollback
```

### 参数

```json
{
  "revision": 2
}
```

## 获取修订历史

### 请求

```
GET /api/clusters/:clusterId/namespaces/:namespace/deployments/:name/revisions
```

### 响应

```json
{
  "code": 200,
  "data": [
    {
      "revision": 3,
      "createdAt": "2026-01-07T10:00:00Z",
      "changeCause": "kubectl set image"
    },
    {
      "revision": 2,
      "createdAt": "2026-01-06T10:00:00Z",
      "changeCause": "kubectl apply"
    }
  ]
}
```

## 更新镜像

### 请求

```
POST /api/clusters/:clusterId/namespaces/:namespace/deployments/:name/image
```

### 参数

```json
{
  "container": "nginx",
  "image": "nginx:1.22"
}
```

