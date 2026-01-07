---
sidebar_position: 5
---

# 故障排查

本文档提供 KubePolaris 常见问题的诊断和解决方法。

## 诊断工具

### 健康检查

```bash
# API 健康检查
curl http://localhost:8080/api/health

# 预期响应
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0",
  "uptime": "10h30m"
}
```

### 日志查看

```bash
# Docker
docker logs kubepolaris-backend -f --tail 100

# Kubernetes
kubectl logs -f deployment/kubepolaris-backend -n kubepolaris

# 查看错误日志
kubectl logs deployment/kubepolaris-backend -n kubepolaris | grep -i error
```

### 资源检查

```bash
# Pod 状态
kubectl get pods -n kubepolaris

# 事件
kubectl get events -n kubepolaris --sort-by='.lastTimestamp'

# 资源使用
kubectl top pods -n kubepolaris
```

## 常见问题

### 服务无法启动

#### 症状
- Pod 状态 CrashLoopBackOff
- 日志显示启动错误

#### 诊断
```bash
# 查看 Pod 状态
kubectl describe pod -l app=kubepolaris -n kubepolaris

# 查看日志
kubectl logs -f deployment/kubepolaris-backend -n kubepolaris --previous
```

#### 常见原因

**1. 配置文件错误**
```bash
# 验证配置
kubectl get configmap kubepolaris-config -n kubepolaris -o yaml
```

**2. 数据库连接失败**
```bash
# 测试数据库连接
kubectl run -it --rm mysql-client --image=mysql:8.0 -- \
  mysql -h kubepolaris-mysql -u root -p
```

**3. 端口被占用**
```bash
# 检查端口
netstat -tlnp | grep 8080
```

#### 解决方案
- 修正配置文件语法
- 确认数据库地址和凭据
- 更换或释放端口

---

### 登录失败

#### 症状
- 无法登录
- 提示用户名或密码错误

#### 诊断
```bash
# 查看认证日志
kubectl logs deployment/kubepolaris-backend -n kubepolaris | grep -i auth
```

#### 常见原因

**1. 密码错误**
```bash
# 重置管理员密码
kubectl exec -it deployment/kubepolaris-backend -n kubepolaris -- \
  ./kubepolaris-backend reset-password --user admin --password newpass
```

**2. 账号锁定**
- 多次错误登录导致锁定
- 等待锁定时间过期或手动解锁

**3. JWT 配置问题**
```bash
# 检查 JWT 配置
kubectl get secret kubepolaris-secrets -n kubepolaris -o yaml
```

---

### 无法连接集群

#### 症状
- 添加集群失败
- 集群状态显示异常

#### 诊断
```bash
# 从 KubePolaris Pod 测试连接
kubectl exec -it deployment/kubepolaris-backend -n kubepolaris -- \
  curl -k https://api-server:6443/healthz
```

#### 常见原因

**1. 网络不通**
```bash
# 检查网络
kubectl exec -it deployment/kubepolaris-backend -n kubepolaris -- \
  ping api-server-ip
```

**2. 认证配置错误**
- kubeconfig 格式错误
- Token 过期
- 证书不匹配

**3. 防火墙阻止**
- 确保 6443 端口开放

#### 解决方案
```bash
# 验证 kubeconfig
kubectl --kubeconfig=your-config.yaml get nodes

# 测试 Token
curl -H "Authorization: Bearer $TOKEN" -k https://api-server:6443/api/v1/nodes
```

---

### 终端连接失败

#### 症状
- Pod 终端无法打开
- WebSocket 连接失败

#### 诊断
```bash
# 检查 WebSocket 服务
kubectl logs deployment/kubepolaris-backend -n kubepolaris | grep -i websocket

# 浏览器控制台检查
# 打开开发者工具 → Network → WS
```

#### 常见原因

**1. Nginx/Ingress 不支持 WebSocket**
```nginx
# 确保 Nginx 配置
location /ws/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

**2. 超时配置**
```nginx
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

**3. Pod 不支持 exec**
```bash
# 检查 RBAC
kubectl auth can-i create pods/exec -n default
```

---

### 页面加载慢

#### 症状
- 页面响应缓慢
- API 请求超时

#### 诊断
```bash
# 检查 API 响应时间
time curl http://localhost:8080/api/clusters

# 检查资源使用
kubectl top pods -n kubepolaris
```

#### 常见原因

**1. 资源不足**
```yaml
# 增加资源限制
resources:
  limits:
    cpu: 4000m
    memory: 4Gi
```

**2. 数据库慢查询**
```sql
-- 检查慢查询
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Slow_queries';
```

**3. 网络延迟**
- 检查到 API Server 的网络延迟
- 考虑就近部署

---

### 监控数据缺失

#### 症状
- 监控图表不显示
- Prometheus/Grafana 连接失败

#### 诊断
```bash
# 测试 Prometheus 连接
curl http://prometheus:9090/api/v1/query?query=up

# 测试 Grafana 连接
curl -H "Authorization: Bearer $API_KEY" http://grafana:3000/api/org
```

#### 常见原因

**1. 地址配置错误**
- 检查系统设置中的地址配置

**2. 认证失败**
- Grafana API Key 过期
- 权限不足

**3. 网络问题**
- 从 KubePolaris Pod 无法访问监控服务

---

### 数据库问题

#### 症状
- 数据库连接错误
- 数据不一致

#### 诊断
```bash
# 检查数据库状态
mysql -h mysql-host -u kubepolaris -p -e "SHOW STATUS"

# 检查连接数
mysql -h mysql-host -u kubepolaris -p -e "SHOW PROCESSLIST"
```

#### 常见原因

**1. 连接池耗尽**
```yaml
# 增加连接池
database:
  max_idle_conns: 20
  max_open_conns: 200
```

**2. 锁等待超时**
```sql
-- 检查锁
SHOW ENGINE INNODB STATUS;
```

**3. 磁盘空间不足**
```bash
# 检查磁盘
df -h
```

## 日志分析

### 常见错误日志

```
# 数据库连接错误
dial tcp mysql:3306: connect: connection refused

# 认证错误
invalid token: signature is invalid

# Kubernetes 连接错误
unable to load root certificates

# 权限错误
forbidden: User "system:serviceaccount:..." cannot get resource
```

### 日志级别调整

```yaml
# 临时开启 debug 日志
log:
  level: debug
```

## 性能优化

### 数据库优化

```sql
-- 分析慢查询
SET profiling = 1;
SELECT * FROM clusters;
SHOW PROFILES;

-- 添加索引
CREATE INDEX idx_cluster_status ON clusters(status);
```

### 应用优化

```yaml
# 调整连接池
database:
  max_idle_conns: 50
  max_open_conns: 200
  conn_max_lifetime: 3600

# 调整 K8s 客户端
kubernetes:
  qps: 100
  burst: 200
```

## 获取帮助

### 收集信息

```bash
# 收集诊断信息
kubectl get pods -n kubepolaris -o wide
kubectl get events -n kubepolaris
kubectl logs deployment/kubepolaris-backend -n kubepolaris --tail=1000 > backend.log
kubectl describe pod -l app=kubepolaris -n kubepolaris > pod-describe.txt
```

### 提交 Issue

访问 [GitHub Issues](https://github.com/kubepolaris/kubepolaris/issues) 并提供：

1. KubePolaris 版本
2. 部署方式
3. 问题描述
4. 复现步骤
5. 错误日志
6. 环境信息

## 下一步

- [部署指南](./deployment) - 正确部署
- [安全加固](./security) - 安全配置

