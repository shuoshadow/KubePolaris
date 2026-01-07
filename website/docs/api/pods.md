---
sidebar_position: 5
---

# Pod API

## 获取 Pod 列表

### 请求

```
GET /api/clusters/:clusterId/pods
```

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| namespace | string | 命名空间 |
| status | string | 状态筛选 |
| nodeName | string | 节点名称 |
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
        "name": "nginx-abc123",
        "namespace": "default",
        "status": "Running",
        "phase": "Running",
        "nodeName": "node-1",
        "podIP": "10.0.0.5",
        "hostIP": "192.168.1.10",
        "restarts": 0,
        "containers": [
          {
            "name": "nginx",
            "image": "nginx:1.21",
            "ready": true,
            "restartCount": 0
          }
        ],
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "total": 1
  }
}
```

## 获取 Pod 详情

### 请求

```
GET /api/clusters/:clusterId/namespaces/:namespace/pods/:name
```

### 响应

```json
{
  "code": 200,
  "data": {
    "name": "nginx-abc123",
    "namespace": "default",
    "uid": "12345-abcde",
    "labels": {
      "app": "nginx"
    },
    "annotations": {},
    "status": {
      "phase": "Running",
      "conditions": [
        {"type": "Ready", "status": "True"},
        {"type": "ContainersReady", "status": "True"}
      ],
      "containerStatuses": [
        {
          "name": "nginx",
          "ready": true,
          "restartCount": 0,
          "state": {
            "running": {
              "startedAt": "2026-01-01T00:00:00Z"
            }
          }
        }
      ]
    },
    "spec": {
      "nodeName": "node-1",
      "containers": [
        {
          "name": "nginx",
          "image": "nginx:1.21",
          "ports": [{"containerPort": 80}],
          "resources": {},
          "volumeMounts": []
        }
      ],
      "volumes": []
    },
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

## 删除 Pod

### 请求

```
DELETE /api/clusters/:clusterId/namespaces/:namespace/pods/:name
```

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| force | bool | 强制删除 |
| gracePeriod | int | 优雅终止时间（秒） |

### 响应

```json
{
  "code": 200,
  "message": "Pod deleted successfully",
  "data": null
}
```

## 获取 Pod 日志

### 请求

```
GET /api/clusters/:clusterId/namespaces/:namespace/pods/:name/logs
```

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| container | string | 容器名称 |
| previous | bool | 上次运行的日志 |
| sinceSeconds | int | 最近 N 秒 |
| tailLines | int | 最后 N 行 |
| timestamps | bool | 显示时间戳 |

### 响应

```json
{
  "code": 200,
  "data": {
    "logs": "2026-01-07T10:00:00Z Starting nginx...\n2026-01-07T10:00:01Z nginx started"
  }
}
```

## Pod 日志流 (WebSocket)

### 请求

```
WS /ws/clusters/:clusterId/namespaces/:namespace/pods/:name/logs
```

### 消息格式

```json
// 发送
{"type": "subscribe", "container": "nginx", "follow": true}

// 接收
{"type": "log", "data": "2026-01-07T10:00:00Z log line..."}
```

## 获取 Pod 事件

### 请求

```
GET /api/clusters/:clusterId/namespaces/:namespace/pods/:name/events
```

### 响应

```json
{
  "code": 200,
  "data": [
    {
      "type": "Normal",
      "reason": "Scheduled",
      "message": "Successfully assigned default/nginx to node-1",
      "firstSeen": "2026-01-01T00:00:00Z",
      "lastSeen": "2026-01-01T00:00:00Z",
      "count": 1
    }
  ]
}
```

## Pod 终端 (WebSocket)

### 请求

```
WS /ws/clusters/:clusterId/namespaces/:namespace/pods/:name/exec
```

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| container | string | 容器名称 |
| command | string | 执行命令，默认 /bin/sh |

### 消息格式

```json
// 发送输入
{"type": "input", "data": "ls -la\n"}

// 发送 resize
{"type": "resize", "cols": 120, "rows": 40}

// 接收输出
{"type": "output", "data": "total 0\ndrwxr-xr-x..."}
```

