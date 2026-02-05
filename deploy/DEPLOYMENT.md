# KubePolaris 部署指南

## 📦 部署方式

KubePolaris 支持多种部署方式：

1. **Docker Compose 部署**（推荐用于开发/测试）
2. **Kubernetes Helm 部署**（推荐用于生产环境）
3. **二进制部署**（适用于特殊场景）

---

## ☸️ Kubernetes Helm 部署（推荐生产环境）

### 方式一：通过 Helm 仓库安装（推荐）

```bash
# 1. 添加 Helm 仓库
helm repo add kubepolaris https://clay-wangzhi.github.io/KubePolaris
helm repo update

# 2. 搜索可用版本
helm search repo kubepolaris

# 3. 安装（使用默认配置）
helm install kubepolaris kubepolaris/kubepolaris \
  -n kubepolaris --create-namespace

# 4. 或者自定义配置安装
helm install kubepolaris kubepolaris/kubepolaris \
  -n kubepolaris --create-namespace \
  --set mysql.auth.rootPassword=your-root-password \
  --set mysql.auth.password=your-password \
  --set backend.config.jwt.secret=your-jwt-secret

# 5. 查看安装状态
helm status kubepolaris -n kubepolaris
kubectl get pods -n kubepolaris
```

### 方式二：下载 Chart 本地安装

```bash
# 1. 下载 Chart
helm pull kubepolaris/kubepolaris --untar

# 2. 修改配置
vim kubepolaris/values.yaml

# 3. 安装
helm install kubepolaris ./kubepolaris -n kubepolaris --create-namespace
```

### 方式三：从源码安装

```bash
# 1. 克隆项目
git clone https://github.com/clay-wangzhi/KubePolaris.git
cd KubePolaris

# 2. 安装
helm install kubepolaris ./deploy/helm/kubepolaris \
  -n kubepolaris --create-namespace \
  -f ./deploy/helm/kubepolaris/values.yaml
```

### Helm 配置说明

详细配置请参考 [Helm Chart README](./helm/kubepolaris/README.md)

常用配置项：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `mysql.auth.rootPassword` | MySQL root 密码 | `kubepolaris-root` |
| `mysql.auth.password` | 应用数据库密码 | `kubepolaris123` |
| `backend.config.jwt.secret` | JWT 密钥 | 随机生成 |
| `ingress.enabled` | 是否启用 Ingress | `true` |
| `ingress.hosts[0].host` | 域名 | `kubepolaris.local` |
| `grafana.enabled` | 是否启用内置 Grafana | `true` |

### 升级和卸载

```bash
# 升级
helm repo update
helm upgrade kubepolaris kubepolaris/kubepolaris -n kubepolaris

# 卸载
helm uninstall kubepolaris -n kubepolaris
```

---

## 🐳 Docker Compose 部署（开发/测试）

以下介绍 Docker Compose 部署方式。

---

## 🚀 快速开始（一键安装）

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 一键安装

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/KubePolaris.git
cd KubePolaris

# 2. 运行安装脚本
cd deploy/scripts
chmod +x install.sh
./install.sh
```

安装脚本会自动完成：
- ✅ 检查 Docker 环境
- ✅ 创建必要目录
- ✅ 生成随机密码
- ✅ 创建配置文件（`.env` 和 `config.yaml`）
- ✅ 启动所有服务
- ✅ 等待服务就绪
- ✅ 显示访问信息

### 访问应用

安装完成后，访问：

- **KubePolaris**: http://localhost:80
  - 默认账号: `admin`
  - 默认密码: `KubePolaris@2026`

- **Grafana**: http://localhost:3000
  - 默认账号: `admin`
  - 默认密码: 查看 `.env` 文件中的 `GRAFANA_ADMIN_PASSWORD`

---

## 🔧 手动部署

如果你想更精细地控制部署过程，可以手动执行以下步骤：

### 1. 准备配置文件

#### 创建环境变量文件

```bash
cd deploy/docker-compose
cp .env.example .env
vim .env
```

修改以下关键配置：
```bash
MYSQL_ROOT_PASSWORD=your-strong-root-password
MYSQL_PASSWORD=your-strong-password
JWT_SECRET=your-jwt-secret-key
GRAFANA_ADMIN_PASSWORD=your-grafana-password
```

#### 创建应用配置文件

```bash
cd ../../configs
cp config.yaml.example config.yaml
vim config.yaml
```

修改以下关键配置：
```yaml
database:
  password: your-strong-password  # 与 .env 中的 MYSQL_PASSWORD 一致

jwt:
  secret: your-jwt-secret-key  # 与 .env 中的 JWT_SECRET 一致
```

**重要**: 确保 `.env` 和 `config.yaml` 中的密码一致！

#### 设置文件权限

```bash
chmod 600 deploy/docker-compose/.env
chmod 600 configs/config.yaml
```

### 2. 创建必要目录

```bash
mkdir -p deploy/docker/grafana/secrets
```

### 3. 启动服务

```bash
cd deploy/docker-compose
docker-compose up -d
```

### 4. 查看服务状态

```bash
docker-compose ps
docker-compose logs -f
```

### 5. 等待服务就绪

等待所有服务健康检查通过（约 2-3 分钟）：

```bash
# 检查 MySQL
docker-compose exec mysql mysqladmin ping -h localhost

# 检查后端
curl http://localhost:8080/healthz

# 检查前端
curl http://localhost:80/health

# 检查 Grafana
curl http://localhost:3000/api/health
```

---

## 📋 配置说明

### 环境变量配置 (.env)

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | - | ✅ |
| `MYSQL_PASSWORD` | 应用数据库密码 | - | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | - | ✅ |
| `GRAFANA_ADMIN_PASSWORD` | Grafana 管理员密码 | - | ✅ |
| `MYSQL_PORT` | MySQL 端口 | `3306` | ❌ |
| `BACKEND_PORT` | 后端服务端口 | `8080` | ❌ |
| `FRONTEND_PORT` | 前端服务端口 | `80` | ❌ |
| `GRAFANA_PORT` | Grafana 端口 | `3000` | ❌ |

### 应用配置文件 (config.yaml)

详细配置说明请参考 [configs/README.md](../configs/README.md)

---

## 🔒 安全最佳实践

### 1. 密码安全

**生成强随机密码**:
```bash
# MySQL 密码（16 字符）
openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16

# JWT Secret（32 字符）
openssl rand -base64 32

# Grafana 密码（12 字符）
openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12
```

### 2. 文件权限

```bash
# 配置文件只允许所有者读写
chmod 600 deploy/docker-compose/.env
chmod 600 configs/config.yaml

# secrets 目录权限
chmod 700 deploy/docker/grafana/secrets
```

### 3. 生产环境建议

- ✅ 使用强随机密码（16+ 字符）
- ✅ 定期轮换密码和密钥
- ✅ 启用 HTTPS/TLS
- ✅ 配置防火墙规则
- ✅ 启用审计日志
- ✅ 定期备份数据
- ✅ 使用 Secrets 管理工具（如 Vault）

---

## 🛠️ 常用操作

### 查看日志

```bash
cd deploy/docker-compose

# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
docker-compose logs -f grafana
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止服务

```bash
# 停止服务（保留数据）
docker-compose stop

# 停止并删除容器（保留数据卷）
docker-compose down

# 停止并删除所有内容（包括数据）
docker-compose down -v
```

### 更新服务

```bash
# 拉取最新镜像
docker-compose pull

# 重新构建并启动
docker-compose up -d --build

# 查看更新状态
docker-compose ps
```

### 数据备份

```bash
# 备份 MySQL 数据
docker-compose exec mysql mysqldump -u root -p kubepolaris > backup.sql

# 备份 Grafana 数据
docker-compose exec grafana tar czf - /var/lib/grafana > grafana-backup.tar.gz
```

### 数据恢复

```bash
# 恢复 MySQL 数据
docker-compose exec -T mysql mysql -u root -p kubepolaris < backup.sql

# 恢复 Grafana 数据
docker-compose exec -T grafana tar xzf - -C / < grafana-backup.tar.gz
docker-compose restart grafana
```

---

## 🐛 故障排查

### 服务无法启动

**检查 Docker 状态**:
```bash
docker info
docker-compose ps
```

**查看错误日志**:
```bash
docker-compose logs backend
docker-compose logs mysql
```

**常见问题**:
1. **端口冲突**: 修改 `.env` 中的端口配置
2. **内存不足**: 确保至少 4GB 可用内存
3. **磁盘空间不足**: 清理 Docker 缓存 `docker system prune -a`

### MySQL 连接失败

**检查 MySQL 状态**:
```bash
docker-compose exec mysql mysqladmin ping -h localhost
```

**检查密码配置**:
- 确保 `.env` 和 `config.yaml` 中的密码一致
- 检查 `MYSQL_PASSWORD` 环境变量

**重置 MySQL**:
```bash
docker-compose down
docker volume rm kubepolaris-mysql-data
docker-compose up -d mysql
```

### Grafana API Key 问题

**检查 API Key 文件**:
```bash
ls -la deploy/docker/grafana/secrets/grafana_api_key
cat deploy/docker/grafana/secrets/grafana_api_key
```

**重新生成 API Key**:
```bash
docker-compose up -d grafana-init
docker-compose logs grafana-init
```

**权限问题**:
```bash
# 检查 grafana-init 容器配置
docker-compose config | grep -A 10 grafana-init

# 应该看到: user: "0:0"
```

### 后端服务启动失败

**检查配置文件**:
```bash
# 确保 config.yaml 存在
ls -la configs/config.yaml

# 检查配置语法
docker-compose exec backend cat /app/configs/config.yaml
```

**检查数据库连接**:
```bash
# 测试数据库连接
docker-compose exec backend nc -zv mysql 3306
```

**查看详细日志**:
```bash
docker-compose logs -f backend
```

### 前端无法访问后端

**检查网络连接**:
```bash
docker-compose exec frontend ping backend
docker-compose exec frontend curl http://backend:8080/healthz
```

**检查 Nginx 配置**:
```bash
docker-compose exec frontend nginx -t
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

---

## 📊 监控和维护

### 健康检查

```bash
# 检查所有服务健康状态
docker-compose ps

# 手动测试健康检查
curl http://localhost:8080/healthz  # 后端
curl http://localhost:80/health     # 前端
curl http://localhost:3000/api/health  # Grafana
```

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 查看数据卷使用
docker volume ls
du -sh /var/lib/docker/volumes/kubepolaris-*
```

### 日志管理

```bash
# 限制日志大小（在 docker-compose.yml 中配置）
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

# 清理旧日志
docker-compose down
docker system prune -a --volumes
```

---

## 🔄 升级指南

### 升级到新版本

```bash
# 1. 备份数据
./backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 拉取最新镜像
cd deploy/docker-compose
docker-compose pull

# 4. 停止服务
docker-compose down

# 5. 启动新版本
docker-compose up -d

# 6. 查看日志
docker-compose logs -f

# 7. 验证服务
curl http://localhost:8080/healthz
```

### 回滚到旧版本

```bash
# 1. 停止服务
docker-compose down

# 2. 切换到旧版本
git checkout v1.0.0

# 3. 启动服务
docker-compose up -d

# 4. 恢复数据（如需要）
./restore.sh
```

---

## 📚 相关文档

- [配置文件说明](../configs/README.md)
- [开发者指南](../AI-DEV-GUIDE.md)
- [API 文档](../docs/API.md)
- [故障排查手册](../docs/TROUBLESHOOTING.md)

---

## 🆘 获取帮助

如果遇到问题：

1. 查看 [故障排查](#故障排查) 章节
2. 搜索 [GitHub Issues](https://github.com/yourusername/KubePolaris/issues)
3. 提交新的 Issue
4. 加入社区讨论

---

**最后更新**: 2026-01-13  
**文档版本**: v1.0.0

