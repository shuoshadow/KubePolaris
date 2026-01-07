---
sidebar_position: 100
---

# 常见问题

本页面汇总 KubePolaris 使用过程中的常见问题及解答。

## 基础问题

### KubePolaris 是什么？

KubePolaris（北辰）是一个开源的企业级 Kubernetes 多集群管理平台，提供可视化的集群管理、工作负载管理、监控告警、Web 终端等功能。

### KubePolaris 是否完全免费？

是的，KubePolaris 采用 Apache License 2.0 开源协议，完全免费使用，包括商业用途。

### 支持哪些 Kubernetes 版本？

KubePolaris 支持 Kubernetes 1.20 及以上版本。

### 可以管理多少个集群？

理论上没有限制。实际取决于部署资源，单个 KubePolaris 实例可以管理数十到数百个集群。

## 安装部署

### 最低硬件要求是什么？

- CPU: 2 核
- 内存: 4 GB
- 存储: 20 GB

推荐配置：4 核 8GB 内存。

### 支持哪些数据库？

目前仅支持 MySQL 8.0+。未来计划支持 PostgreSQL。

### 可以使用 SQLite 吗？

目前不支持。生产环境建议使用 MySQL。

### 如何升级到新版本？

参考 [升级指南](./installation/upgrade)。使用 Helm 部署时：

```bash
helm repo update
helm upgrade kubepolaris kubepolaris/kubepolaris -n kubepolaris
```

## 集群管理

### 如何添加集群？

1. 进入「集群管理」→「添加集群」
2. 填写集群名称和 API Server 地址
3. 上传 kubeconfig 或填写 Token
4. 测试连接后保存

详见 [集群管理](./user-guide/cluster-management)。

### 支持哪些认证方式？

- kubeconfig 文件
- ServiceAccount Token
- 客户端证书

### 集群连接失败怎么办？

1. 确认 API Server 地址正确
2. 检查网络连通性
3. 验证认证信息有效
4. 检查防火墙规则

详见 [故障排查](./admin-guide/troubleshooting)。

### 删除集群会影响实际集群吗？

不会。删除只是从 KubePolaris 移除管理记录，不会对实际 Kubernetes 集群产生任何影响。

## 权限管理

### 如何重置管理员密码？

```bash
# Docker
docker exec -it kubepolaris-backend ./kubepolaris-backend reset-password --user admin --password newpass

# Kubernetes
kubectl exec -it deployment/kubepolaris-backend -n kubepolaris -- \
  ./kubepolaris-backend reset-password --user admin --password newpass
```

### 如何配置 LDAP 登录？

在「系统设置」→「LDAP 配置」中配置。详见 [权限管理](./user-guide/rbac-permissions)。

### 支持 SSO 登录吗？

支持。可以配置 OIDC/OAuth2 集成，支持 Keycloak、Dex 等。

## 监控告警

### 如何配置 Prometheus？

在「系统设置」→「监控配置」中填写 Prometheus 地址，如 `http://prometheus:9090`。

### 如何在 KubePolaris 中嵌入 Grafana 面板？

1. 配置 Grafana 地址和 API Key
2. 导入 Dashboard
3. 在资源详情页查看面板

### 不配置 Prometheus 可以使用吗？

可以。KubePolaris 提供基础的资源使用统计，但配置 Prometheus 后可获得更丰富的监控数据。

## 终端功能

### Web 终端无法连接？

1. 检查 Nginx/Ingress 是否支持 WebSocket
2. 确认超时配置足够长
3. 检查用户是否有 exec 权限

详见 [终端访问](./user-guide/terminal-access)。

### 终端会话超时时间是多少？

默认 30 分钟。可在配置中调整：

```yaml
terminal:
  session_timeout: 3600  # 秒
```

### 可以在终端中上传/下载文件吗？

目前不支持。可以使用 kubectl cp 命令。

## 性能问题

### 页面加载很慢怎么办？

1. 检查服务器资源使用
2. 增加 Backend 副本数
3. 检查数据库性能
4. 优化网络延迟

### 如何提升大规模集群的性能？

1. 增加 Backend 资源和副本
2. 使用数据库读写分离
3. 配置 K8s 客户端缓存
4. 合理设置列表分页

## 安全问题

### 集群凭据如何存储？

集群 kubeconfig 和 Token 加密存储在数据库中。

### 支持审计日志吗？

支持。所有操作都会记录审计日志，可在「审计日志」页面查看。

### 如何配置 HTTPS？

参考 [部署指南](./admin-guide/deployment) 中的 Nginx HTTPS 配置。

## 其他问题

### 如何参与贡献？

参考 [CONTRIBUTING.md](https://github.com/kubepolaris/kubepolaris/blob/main/CONTRIBUTING.md)。

### 如何报告 Bug？

在 [GitHub Issues](https://github.com/kubepolaris/kubepolaris/issues) 提交，请提供详细的复现步骤和环境信息。

### 如何获取商业支持？

请联系 kubepolaris@example.com。

### 有官方交流群吗？

- GitHub Discussions: https://github.com/kubepolaris/kubepolaris/discussions
- Slack: https://kubepolaris.slack.com

## 还有其他问题？

如果以上没有解答您的问题，请：

1. 查阅 [用户指南](./user-guide/cluster-management)
2. 查阅 [故障排查](./admin-guide/troubleshooting)
3. 在 [GitHub Discussions](https://github.com/kubepolaris/kubepolaris/discussions) 提问
4. 提交 [GitHub Issue](https://github.com/kubepolaris/kubepolaris/issues)

