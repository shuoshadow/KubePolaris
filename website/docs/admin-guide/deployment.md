---
sidebar_position: 1
---

# 部署指南

本文档提供 KubePolaris 生产环境部署的详细指南和最佳实践。

## 部署架构

### 单节点部署

适合开发测试和小规模环境：

```
┌─────────────────────────────────────┐
│            Single Node              │
│  ┌─────────┐  ┌─────────┐          │
│  │ Frontend│  │ Backend │          │
│  └────┬────┘  └────┬────┘          │
│       │            │               │
│       └─────┬──────┘               │
│             │                       │
│       ┌─────▼─────┐                │
│       │   MySQL   │                │
│       └───────────┘                │
└─────────────────────────────────────┘
```

### 高可用部署

适合生产环境：

```
                    ┌─────────────┐
                    │ Load        │
                    │ Balancer    │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ Node 1  │       │ Node 2  │       │ Node 3  │
    │ Backend │       │ Backend │       │ Backend │
    │ Frontend│       │ Frontend│       │ Frontend│
    └────┬────┘       └────┬────┘       └────┬────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │ MySQL (HA)  │
                    │ Master-Slave│
                    └─────────────┘
```

## 系统要求

### 硬件配置

| 规模 | 管理集群数 | CPU | 内存 | 存储 |
|------|-----------|-----|------|------|
| 小型 | 1-5 | 4 核 | 8 GB | 50 GB |
| 中型 | 5-20 | 8 核 | 16 GB | 100 GB |
| 大型 | 20+ | 16 核 | 32 GB | 200 GB |

### 网络要求

- KubePolaris 服务器需要能访问所有被管理的 Kubernetes API Server
- 用户需要能访问 KubePolaris Web 界面
- 建议独立网络分区，限制对 API Server 的直接访问

### 数据库

- MySQL 8.0+
- 推荐使用云数据库服务（RDS）或主从复制架构
- 生产环境建议使用 SSD 存储

## 部署步骤

### 1. 准备环境

```bash
# 创建部署目录
mkdir -p /opt/kubepolaris
cd /opt/kubepolaris

# 克隆仓库或下载发布包
git clone https://github.com/kubepolaris/kubepolaris.git
# 或
wget https://github.com/kubepolaris/kubepolaris/releases/download/v1.0.0/kubepolaris-v1.0.0.tar.gz
tar -xzf kubepolaris-v1.0.0.tar.gz
```

### 2. 准备数据库

```sql
-- 创建数据库
CREATE DATABASE kubepolaris CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'kubepolaris'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON kubepolaris.* TO 'kubepolaris'@'%';
FLUSH PRIVILEGES;
```

### 3. 配置应用

```yaml title="configs/config.yaml"
server:
  port: 8080
  mode: release

database:
  host: your-mysql-host
  port: 3306
  user: kubepolaris
  password: your_secure_password
  name: kubepolaris
  max_idle_conns: 20
  max_open_conns: 200

jwt:
  secret: your-very-secure-jwt-secret-key-at-least-32-chars
  expire: 24h

log:
  level: info
  format: json
  file:
    enabled: true
    path: /var/log/kubepolaris/app.log
    max_size: 100
    max_backups: 10
    max_age: 30
    compress: true

security:
  login:
    max_attempts: 5
    lockout_duration: 900

audit:
  enabled: true
  retention_days: 365
```

### 4. 部署应用

#### Docker Compose

```bash
# 配置环境变量
cp .env.example .env
vim .env

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

#### Kubernetes

```bash
# 创建命名空间
kubectl create namespace kubepolaris

# 创建 Secret
kubectl create secret generic kubepolaris-secrets \
  --from-literal=mysql-password=your_password \
  --from-literal=jwt-secret=your_jwt_secret \
  -n kubepolaris

# 安装 Helm Chart
helm install kubepolaris kubepolaris/kubepolaris \
  -f values-production.yaml \
  -n kubepolaris
```

### 5. 配置反向代理

#### Nginx 配置

```nginx title="/etc/nginx/conf.d/kubepolaris.conf"
upstream kubepolaris_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name kubepolaris.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kubepolaris.example.com;

    ssl_certificate /etc/nginx/ssl/kubepolaris.crt;
    ssl_certificate_key /etc/nginx/ssl/kubepolaris.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 请求大小限制
    client_max_body_size 100M;

    # 静态文件
    location / {
        root /opt/kubepolaris/ui/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
    }

    # API 代理
    location /api/ {
        proxy_pass http://kubepolaris_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket 代理
    location /ws/ {
        proxy_pass http://kubepolaris_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### 6. 验证部署

```bash
# 检查服务状态
curl https://kubepolaris.example.com/api/health

# 检查日志
tail -f /var/log/kubepolaris/app.log
```

## 初始化配置

### 1. 首次登录

使用默认管理员账号登录：
- 用户名: `admin`
- 密码: `admin123`

### 2. 修改密码

**立即修改默认密码！**

### 3. 配置监控

1. 进入 **系统设置** → **监控配置**
2. 配置 Prometheus 地址
3. 配置 Grafana 地址和 API Key

### 4. 配置通知

1. 进入 **系统设置** → **通知配置**
2. 配置邮件/钉钉/企业微信等通知渠道

### 5. 导入集群

1. 进入 **集群管理** → **添加集群**
2. 配置集群认证信息
3. 测试并保存

## 运维任务

### 日志管理

```bash
# 查看日志
tail -f /var/log/kubepolaris/app.log

# 日志轮转（已配置自动轮转）
logrotate -f /etc/logrotate.d/kubepolaris
```

### 备份

```bash
# 数据库备份
mysqldump -u kubepolaris -p kubepolaris > backup_$(date +%Y%m%d).sql

# 配置备份
tar -czf config_backup_$(date +%Y%m%d).tar.gz /opt/kubepolaris/configs
```

### 监控

- 检查服务健康状态
- 检查数据库连接
- 检查 WebSocket 连接数
- 检查 API 响应时间

### 更新

参考 [升级指南](../installation/upgrade)。

## 故障排查

### 服务无法启动

1. 检查配置文件语法
2. 检查数据库连接
3. 检查端口占用
4. 查看启动日志

### 数据库连接失败

1. 检查数据库地址和端口
2. 检查用户名密码
3. 检查网络连通性
4. 检查数据库权限

### WebSocket 连接失败

1. 检查 Nginx 配置
2. 确认支持 WebSocket
3. 检查超时配置
4. 检查防火墙规则

## 下一步

- [高可用部署](./high-availability) - HA 配置
- [安全加固](./security) - 安全配置

