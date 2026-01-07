---
sidebar_position: 3
---

# 配置说明

本文档详细说明 KubePolaris 的所有配置项。

## 配置文件

KubePolaris 支持以下方式加载配置（优先级从高到低）：

1. 命令行参数
2. 环境变量
3. 配置文件 (`configs/config.yaml`)
4. 默认值

## 配置项详解

### 服务器配置

```yaml
server:
  # 服务监听端口
  port: 8080
  
  # 运行模式: debug, release, test
  mode: release
  
  # 读取超时（秒）
  read_timeout: 60
  
  # 写入超时（秒）
  write_timeout: 60
  
  # 最大请求体大小（MB）
  max_request_size: 100
  
  # 静态文件目录
  static_path: ./ui/dist
```

### 数据库配置

```yaml
database:
  # MySQL 主机地址
  host: localhost
  
  # MySQL 端口
  port: 3306
  
  # 数据库用户名
  user: root
  
  # 数据库密码
  password: your_password
  
  # 数据库名称
  name: kubepolaris
  
  # 字符集
  charset: utf8mb4
  
  # 连接池配置
  max_idle_conns: 10
  max_open_conns: 100
  conn_max_lifetime: 3600  # 秒
  
  # 是否启用 SQL 日志
  log_mode: false
```

### JWT 认证配置

```yaml
jwt:
  # JWT 签名密钥（请使用随机字符串）
  secret: your-jwt-secret-key-please-change-it
  
  # Token 过期时间
  expire: 24h
  
  # Token 刷新时间
  refresh_expire: 168h  # 7 天
  
  # Token 签发者
  issuer: kubepolaris
```

### 日志配置

```yaml
log:
  # 日志级别: debug, info, warn, error
  level: info
  
  # 日志格式: json, text
  format: json
  
  # 是否输出到文件
  file:
    enabled: false
    path: ./logs/kubepolaris.log
    max_size: 100      # MB
    max_backups: 10
    max_age: 30        # 天
    compress: true
```

### CORS 配置

```yaml
cors:
  # 是否启用 CORS
  enabled: true
  
  # 允许的来源
  allow_origins:
    - "*"  # 生产环境请指定具体域名
  
  # 允许的方法
  allow_methods:
    - GET
    - POST
    - PUT
    - DELETE
    - PATCH
    - OPTIONS
  
  # 允许的请求头
  allow_headers:
    - Authorization
    - Content-Type
    - X-Requested-With
  
  # 是否允许携带凭证
  allow_credentials: true
  
  # 预检请求缓存时间（秒）
  max_age: 86400
```

### Kubernetes 客户端配置

```yaml
kubernetes:
  # 默认请求超时（秒）
  timeout: 30
  
  # QPS 限制
  qps: 100
  
  # Burst 限制
  burst: 200
  
  # 是否缓存客户端
  cache_enabled: true
  
  # 缓存过期时间（秒）
  cache_ttl: 300
```

### 监控配置

```yaml
monitoring:
  # Prometheus 配置
  prometheus:
    enabled: false
    url: http://prometheus:9090
    timeout: 30s
  
  # Grafana 配置
  grafana:
    enabled: false
    url: http://grafana:3000
    api_key: your-grafana-api-key
    org_id: 1
```

### 告警配置

```yaml
alerting:
  # AlertManager 配置
  alertmanager:
    enabled: false
    url: http://alertmanager:9093
```

### 审计日志配置

```yaml
audit:
  # 是否启用审计日志
  enabled: true
  
  # 审计日志保留天数
  retention_days: 90
  
  # 敏感操作需要二次确认
  require_confirm:
    - delete_cluster
    - delete_namespace
    - scale_to_zero
```

### 终端配置

```yaml
terminal:
  # 终端会话超时（秒）
  session_timeout: 1800  # 30 分钟
  
  # 最大并发连接数
  max_connections: 100
  
  # 心跳间隔（秒）
  heartbeat_interval: 30
  
  # 是否记录终端操作
  record_enabled: true
```

### 安全配置

```yaml
security:
  # 密码策略
  password:
    min_length: 8
    require_uppercase: true
    require_lowercase: true
    require_number: true
    require_special: false
  
  # 登录安全
  login:
    max_attempts: 5
    lockout_duration: 900  # 秒
    captcha_after_attempts: 3
  
  # 会话安全
  session:
    single_login: false  # 是否限制单点登录
    idle_timeout: 3600   # 空闲超时（秒）
```

### LDAP 配置（可选）

```yaml
ldap:
  enabled: false
  host: ldap.example.com
  port: 389
  use_ssl: false
  base_dn: dc=example,dc=com
  bind_dn: cn=admin,dc=example,dc=com
  bind_password: admin_password
  user_filter: (uid=%s)
  group_filter: (memberUid=%s)
  attributes:
    username: uid
    email: mail
    display_name: cn
```

### OIDC 配置（可选）

```yaml
oidc:
  enabled: false
  issuer: https://auth.example.com
  client_id: kubepolaris
  client_secret: your-client-secret
  redirect_url: https://kubepolaris.example.com/callback
  scopes:
    - openid
    - profile
    - email
```

## 环境变量

所有配置项都可以通过环境变量覆盖，命名规则：

- 全部大写
- 层级使用 `_` 分隔
- 前缀 `KUBEPOLARIS_`

示例：

| 配置项 | 环境变量 |
|--------|----------|
| `server.port` | `KUBEPOLARIS_SERVER_PORT` |
| `database.host` | `KUBEPOLARIS_DATABASE_HOST` |
| `database.password` | `KUBEPOLARIS_DATABASE_PASSWORD` |
| `jwt.secret` | `KUBEPOLARIS_JWT_SECRET` |

```bash
# 示例
export KUBEPOLARIS_SERVER_PORT=9090
export KUBEPOLARIS_DATABASE_PASSWORD=secure_password
export KUBEPOLARIS_JWT_SECRET=my-secret-key
```

## 命令行参数

```bash
./kubepolaris-backend \
  --config /path/to/config.yaml \
  --port 8080 \
  --mode release \
  --log-level info
```

可用参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--config, -c` | 配置文件路径 | `configs/config.yaml` |
| `--port, -p` | 服务端口 | `8080` |
| `--mode` | 运行模式 | `release` |
| `--log-level` | 日志级别 | `info` |
| `--help, -h` | 显示帮助 | - |
| `--version, -v` | 显示版本 | - |

## 配置示例

### 开发环境

```yaml title="configs/config.dev.yaml"
server:
  port: 8080
  mode: debug

database:
  host: localhost
  port: 3306
  user: root
  password: root
  name: kubepolaris_dev
  log_mode: true

jwt:
  secret: dev-secret-key
  expire: 72h

log:
  level: debug
  format: text
```

### 生产环境

```yaml title="configs/config.prod.yaml"
server:
  port: 8080
  mode: release
  read_timeout: 30
  write_timeout: 30

database:
  host: mysql.kubepolaris.svc.cluster.local
  port: 3306
  user: kubepolaris
  password: ${MYSQL_PASSWORD}  # 从环境变量读取
  name: kubepolaris
  max_idle_conns: 20
  max_open_conns: 200
  log_mode: false

jwt:
  secret: ${JWT_SECRET}  # 从环境变量读取
  expire: 24h

log:
  level: info
  format: json
  file:
    enabled: true
    path: /var/log/kubepolaris/app.log

security:
  login:
    max_attempts: 5
    lockout_duration: 900

audit:
  enabled: true
  retention_days: 365
```

## 下一步

- [安装指南](./installation) - 选择合适的部署方式
- [用户指南](../user-guide/cluster-management) - 开始使用 KubePolaris

