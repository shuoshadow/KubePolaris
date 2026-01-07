---
sidebar_position: 2
---

# 认证 API

## 登录

### 请求

```
POST /api/auth/login
```

### 参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

### 示例

```bash
curl -X POST https://kubepolaris.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expire": "2026-01-08T10:00:00Z",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

## 登出

### 请求

```
POST /api/auth/logout
```

### 示例

```bash
curl -X POST https://kubepolaris.example.com/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

## 刷新 Token

### 请求

```
POST /api/auth/refresh
```

### 示例

```bash
curl -X POST https://kubepolaris.example.com/api/auth/refresh \
  -H "Authorization: Bearer <refresh-token>"
```

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expire": "2026-01-08T10:00:00Z"
  }
}
```

## 当前用户信息

### 请求

```
GET /api/auth/me
```

### 示例

```bash
curl -X GET https://kubepolaris.example.com/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "permissions": [
      "cluster:view",
      "cluster:create",
      "cluster:delete",
      "workload:view",
      "workload:edit"
    ],
    "createdAt": "2026-01-01T00:00:00Z",
    "lastLogin": "2026-01-07T10:00:00Z"
  }
}
```

## 修改密码

### 请求

```
POST /api/auth/change-password
```

### 参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码 |

### 示例

```bash
curl -X POST https://kubepolaris.example.com/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "old123",
    "newPassword": "new456"
  }'
```

### 响应

```json
{
  "code": 200,
  "message": "Password changed successfully",
  "data": null
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| 401001 | 用户名或密码错误 |
| 401002 | Token 已过期 |
| 401003 | Token 无效 |
| 401004 | 账号已锁定 |
| 403001 | 权限不足 |

