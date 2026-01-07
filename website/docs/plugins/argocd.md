---
sidebar_position: 1
---

# ArgoCD 集成

KubePolaris 支持与 ArgoCD 集成，在统一界面中管理 GitOps 应用。

## 功能介绍

- 查看 ArgoCD Applications 列表
- 查看应用同步状态和健康状态
- 执行同步操作
- 查看应用详情和资源树

## 配置

### 前置要求

- ArgoCD 已部署
- 拥有 ArgoCD 访问凭据

### 配置步骤

1. 进入 **系统设置** → **插件配置** → **ArgoCD**
2. 填写配置信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 服务地址 | ArgoCD Server 地址 | `https://argocd.example.com` |
| 用户名 | ArgoCD 登录用户 | `admin` |
| 密码 | ArgoCD 登录密码 | `****` |
| 跳过 TLS 验证 | 是否跳过证书验证 | `false` |

3. 点击 **测试连接**
4. 保存配置

### 使用 Token

推荐使用 API Token 代替密码：

```bash
# 创建 ArgoCD API Token
argocd account generate-token --account admin --id kubepolaris
```

## 使用

### 查看应用列表

1. 进入 **插件** → **ArgoCD**
2. 查看所有 Application
3. 按状态筛选

### 应用状态

| 状态 | 说明 |
|------|------|
| 🟢 Synced | 同步完成 |
| 🟡 OutOfSync | 未同步 |
| 🔴 Unknown | 未知状态 |

### 健康状态

| 状态 | 说明 |
|------|------|
| 💚 Healthy | 健康 |
| 💛 Progressing | 部署中 |
| 💔 Degraded | 降级 |
| ❓ Missing | 资源缺失 |

### 同步应用

1. 点击应用的 **同步** 按钮
2. 选择同步选项：
   - Prune: 删除不在 Git 中的资源
   - Dry Run: 预览同步效果
3. 执行同步

### 查看详情

点击应用名称查看：
- 应用信息
- 同步历史
- 资源树
- 事件

## 最佳实践

1. **使用 Token 认证**
   - 更安全
   - 便于轮换

2. **配置多集群**
   - 可以管理不同集群中的 ArgoCD

3. **定期检查状态**
   - 关注 OutOfSync 应用
   - 及时处理 Degraded 状态

## 故障排查

### 连接失败

1. 检查 ArgoCD 地址
2. 检查网络连通性
3. 验证凭据正确性

### Token 过期

重新生成 Token 并更新配置。

### 权限不足

确保账号有足够的权限查看和操作 Applications。

