---
sidebar_position: 3
---

# 安全加固

本文档介绍 KubePolaris 的安全加固配置和最佳实践。

## 认证安全

### 密码策略

配置强密码策略：

```yaml
security:
  password:
    min_length: 12
    require_uppercase: true
    require_lowercase: true
    require_number: true
    require_special: true
    max_age: 90  # 天
    history: 5   # 禁止重复使用最近 5 个密码
```

### 登录安全

```yaml
security:
  login:
    max_attempts: 5           # 最大尝试次数
    lockout_duration: 900     # 锁定时间（秒）
    captcha_after_attempts: 3 # 验证码触发次数
```

### 会话管理

```yaml
security:
  session:
    single_login: false      # 单点登录（禁止多处登录）
    idle_timeout: 1800       # 空闲超时（秒）
    max_concurrent: 5        # 最大并发会话
```

### JWT 配置

```yaml
jwt:
  # 使用强随机密钥
  secret: $(openssl rand -base64 32)
  
  # 合理的过期时间
  expire: 8h
  
  # 刷新 Token 过期时间
  refresh_expire: 24h
```

## 网络安全

### HTTPS

强制使用 HTTPS：

```nginx
server {
    listen 80;
    server_name kubepolaris.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    
    # TLS 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

### 安全头

```nginx
# 防止点击劫持
add_header X-Frame-Options "SAMEORIGIN" always;

# 防止 MIME 类型嗅探
add_header X-Content-Type-Options "nosniff" always;

# XSS 防护
add_header X-XSS-Protection "1; mode=block" always;

# CSP 策略
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

# Referrer 策略
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### CORS 配置

```yaml
cors:
  enabled: true
  allow_origins:
    - "https://kubepolaris.example.com"  # 指定具体域名
  allow_methods:
    - GET
    - POST
    - PUT
    - DELETE
  allow_headers:
    - Authorization
    - Content-Type
  allow_credentials: true
  max_age: 3600
```

### 请求限制

```yaml
rate_limit:
  enabled: true
  requests_per_minute: 100
  burst: 50
```

## 访问控制

### RBAC 最佳实践

1. **最小权限原则**
   - 仅授予必要权限
   - 定期审查权限

2. **职责分离**
   - 管理员和普通用户分开
   - 读写权限分离

3. **审计跟踪**
   - 所有操作记录审计日志
   - 权限变更记录

### Kubernetes 认证

为 KubePolaris 创建专用 ServiceAccount：

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubepolaris
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubepolaris
rules:
  # 只读权限
  - apiGroups: [""]
    resources: ["pods", "services", "nodes", "namespaces", "events", "configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["get", "list", "watch"]
  # 操作权限（按需添加）
  - apiGroups: ["apps"]
    resources: ["deployments/scale"]
    verbs: ["update", "patch"]
  - apiGroups: [""]
    resources: ["pods/exec", "pods/log"]
    verbs: ["create", "get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubepolaris
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kubepolaris
subjects:
  - kind: ServiceAccount
    name: kubepolaris
    namespace: kube-system
```

## 数据安全

### 敏感数据加密

1. **数据库加密**
   - 启用 TLS 连接
   - 敏感字段加密存储

2. **配置加密**
   - kubeconfig 加密存储
   - Token 加密存储

```yaml
encryption:
  enabled: true
  key: ${ENCRYPTION_KEY}  # 从环境变量读取
```

### 数据备份安全

```bash
# 加密备份
mysqldump -u root -p kubepolaris | gpg --encrypt -r admin@example.com > backup.sql.gpg

# 解密恢复
gpg --decrypt backup.sql.gpg | mysql -u root -p kubepolaris
```

### 日志脱敏

```yaml
log:
  sensitive_fields:
    - password
    - token
    - secret
    - kubeconfig
  masking: "***"
```

## 容器安全

### 安全上下文

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

### 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kubepolaris
  namespace: kubepolaris
spec:
  podSelector:
    matchLabels:
      app: kubepolaris
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: kubepolaris
      ports:
        - port: 3306  # MySQL
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0  # API Server
      ports:
        - port: 6443
```

### 镜像安全

```yaml
# 使用官方镜像
image:
  repository: kubepolaris/kubepolaris
  tag: v1.0.0  # 使用固定版本
  pullPolicy: IfNotPresent

# 镜像拉取密钥
imagePullSecrets:
  - name: regcred
```

## 审计日志

### 配置审计

```yaml
audit:
  enabled: true
  retention_days: 365
  
  # 记录的事件
  events:
    - login
    - logout
    - create
    - update
    - delete
    - exec
    
  # 敏感操作二次确认
  require_confirm:
    - delete_cluster
    - delete_namespace
    - scale_to_zero
```

### 审计日志内容

```json
{
  "timestamp": "2026-01-07T10:00:00Z",
  "user": "admin",
  "ip": "192.168.1.100",
  "action": "delete",
  "resource_type": "deployment",
  "resource_name": "nginx",
  "namespace": "default",
  "cluster": "production",
  "result": "success",
  "details": {}
}
```

### 日志保护

- 禁止删除审计日志
- 日志存储加密
- 定期归档

## 安全扫描

### 定期扫描

1. **容器镜像扫描**
   ```bash
   trivy image kubepolaris/kubepolaris:latest
   ```

2. **依赖扫描**
   ```bash
   # Go
   govulncheck ./...
   
   # Node.js
   npm audit
   ```

3. **代码扫描**
   ```bash
   # Go
   gosec ./...
   
   # 静态分析
   staticcheck ./...
   ```

### CI/CD 集成

```yaml
# GitHub Actions
- name: Security Scan
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    security-checks: 'vuln,config,secret'
```

## 安全清单

### 部署前

- [ ] 修改默认密码
- [ ] 配置 HTTPS
- [ ] 配置安全头
- [ ] 最小权限配置
- [ ] 网络策略配置

### 运行时

- [ ] 定期密码轮换
- [ ] 审计日志审查
- [ ] 安全扫描
- [ ] 证书更新
- [ ] 依赖更新

### 事件响应

- [ ] 异常登录监控
- [ ] 权限变更监控
- [ ] 告警通知配置
- [ ] 应急响应流程

## 下一步

- [备份恢复](./backup-restore) - 数据保护
- [故障排查](./troubleshooting) - 问题诊断

