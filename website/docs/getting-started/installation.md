---
sidebar_position: 2
---

# 安装指南

本文档提供 KubePolaris 的详细安装说明，支持多种部署方式。

## 部署方式概览

| 方式 | 适用场景 | 复杂度 |
|------|---------|--------|
| [Docker Compose](#docker-compose) | 快速体验、开发测试 | ⭐ |
| [Kubernetes (Helm)](#kubernetes-helm) | 生产环境推荐 | ⭐⭐ |
| [源码编译](#源码编译) | 开发者、定制需求 | ⭐⭐⭐ |

## 系统要求

### 硬件要求

| 环境 | CPU | 内存 | 存储 |
|------|-----|------|------|
| 最低配置 | 2 核 | 4 GB | 20 GB |
| 推荐配置 | 4 核 | 8 GB | 50 GB |
| 生产配置 | 8 核 | 16 GB | 100 GB |

### 软件要求

- **操作系统**: Linux (推荐)、macOS、Windows
- **Docker**: 20.10+（Docker Compose 部署）
- **Kubernetes**: 1.20+（K8s 部署）
- **Helm**: 3.0+（Helm 部署）
- **浏览器**: Chrome、Firefox、Safari、Edge（现代版本）

## Docker Compose

最简单的部署方式，适合快速体验和开发测试。

### 1. 获取代码

```bash
git clone https://github.com/kubepolaris/kubepolaris.git
cd kubepolaris
```

### 2. 配置环境变量（可选）

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置
vim .env
```

主要配置项：

```bash title=".env"
# 数据库配置
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=kubepolaris

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=your-secret-key-please-change-it

# 服务端口
BACKEND_PORT=8080
FRONTEND_PORT=80
```

### 3. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 4. 验证部署

```bash
# 检查后端健康状态
curl http://localhost:8080/api/health

# 访问 Web 界面
open http://localhost:8080
```

### 5. 停止和清理

```bash
# 停止服务
docker-compose down

# 停止并删除数据卷（注意：会删除所有数据）
docker-compose down -v
```

## Kubernetes (Helm)

生产环境推荐的部署方式，支持高可用和自动伸缩。

### 1. 添加 Helm 仓库

```bash
helm repo add kubepolaris https://kubepolaris.github.io/charts
helm repo update
```

### 2. 创建命名空间

```bash
kubectl create namespace kubepolaris
```

### 3. 准备配置

创建 `values.yaml` 自定义配置：

```yaml title="values.yaml"
# 副本数
replicaCount: 2

# 镜像配置
image:
  repository: kubepolaris/kubepolaris
  tag: latest
  pullPolicy: IfNotPresent

# 资源限制
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 512Mi

# 数据库配置
mysql:
  # 使用外部数据库
  external:
    enabled: true
    host: mysql.example.com
    port: 3306
    database: kubepolaris
    username: kubepolaris
    # 使用 Secret 存储密码
    existingSecret: kubepolaris-mysql-secret
    secretKey: password
  
  # 或使用内置数据库
  internal:
    enabled: false
    persistence:
      enabled: true
      size: 20Gi
      storageClass: standard

# Ingress 配置
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: kubepolaris.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubepolaris-tls
      hosts:
        - kubepolaris.example.com

# 持久化存储
persistence:
  enabled: true
  size: 10Gi
  storageClass: standard

# 监控配置（可选）
monitoring:
  prometheus:
    enabled: true
    url: http://prometheus.monitoring:9090
  grafana:
    enabled: true
    url: http://grafana.monitoring:3000
```

### 4. 创建数据库密钥

```bash
kubectl create secret generic kubepolaris-mysql-secret \
  --from-literal=password=your_database_password \
  -n kubepolaris
```

### 5. 安装 Chart

```bash
helm install kubepolaris kubepolaris/kubepolaris \
  -f values.yaml \
  -n kubepolaris
```

### 6. 验证部署

```bash
# 查看 Pod 状态
kubectl get pods -n kubepolaris

# 查看服务
kubectl get svc -n kubepolaris

# 查看 Ingress
kubectl get ingress -n kubepolaris

# 查看日志
kubectl logs -f deployment/kubepolaris -n kubepolaris
```

### 7. 升级

```bash
# 更新仓库
helm repo update

# 升级
helm upgrade kubepolaris kubepolaris/kubepolaris \
  -f values.yaml \
  -n kubepolaris
```

### 8. 卸载

```bash
helm uninstall kubepolaris -n kubepolaris
```

## 源码编译

适合开发者或有定制需求的用户。

### 1. 环境准备

```bash
# Go 1.22+
go version

# Node.js 18+
node --version

# pnpm 或 npm
pnpm --version
```

### 2. 获取代码

```bash
git clone https://github.com/kubepolaris/kubepolaris.git
cd kubepolaris
```

### 3. 编译后端

```bash
# 进入后端目录
cd cmd

# 下载依赖
go mod download

# 编译
go build -o kubepolaris-backend main.go

# 或使用 Makefile
make build-backend
```

### 4. 编译前端

```bash
# 进入前端目录
cd ui

# 安装依赖
pnpm install
# 或 npm install

# 构建生产版本
pnpm build
# 或 npm run build
```

### 5. 配置

```bash
# 复制配置模板
cp configs/config.example.yaml configs/config.yaml

# 编辑配置
vim configs/config.yaml
```

```yaml title="configs/config.yaml"
server:
  port: 8080
  mode: release  # debug, release, test

database:
  host: localhost
  port: 3306
  user: root
  password: your_password
  name: kubepolaris

jwt:
  secret: your-jwt-secret-key
  expire: 24h

log:
  level: info
  format: json
```

### 6. 初始化数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE kubepolaris CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 应用会自动迁移表结构
```

### 7. 运行

```bash
# 运行后端
./kubepolaris-backend

# 或开发模式
go run main.go

# 前端开发服务器
cd ui && pnpm dev
```

## 验证安装

无论使用哪种安装方式，完成后可以通过以下方式验证：

### 健康检查

```bash
# API 健康检查
curl http://your-host:8080/api/health

# 预期响应
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected"
}
```

### 登录测试

1. 访问 Web 界面
2. 使用默认账号登录：
   - 用户名: `admin`
   - 密码: `admin123`
3. 成功登录后修改密码

### 功能验证

1. ✅ 能正常登录
2. ✅ 能添加集群
3. ✅ 能查看节点列表
4. ✅ 能查看工作负载
5. ✅ 能打开 Pod 终端

## 下一步

- [配置说明](./configuration) - 了解所有配置项
- [用户指南](../user-guide/cluster-management) - 学习使用功能
- [高可用部署](../admin-guide/high-availability) - 生产环境最佳实践

