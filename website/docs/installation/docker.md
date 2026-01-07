---
sidebar_position: 1
---

# Docker 部署

使用 Docker 和 Docker Compose 部署 KubePolaris，适合快速体验和开发测试环境。

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 20GB 可用磁盘空间

## 快速部署

### 1. 获取代码

```bash
git clone https://github.com/kubepolaris/kubepolaris.git
cd kubepolaris
```

### 2. 启动服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看启动日志
docker-compose logs -f
```

### 3. 验证部署

```bash
# 查看服务状态
docker-compose ps

# 健康检查
curl http://localhost:8080/api/health
```

访问 http://localhost:8080 开始使用。

## Docker Compose 配置

### 默认配置

```yaml title="docker-compose.yml"
version: '3.8'

services:
  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: kubepolaris-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-kubepolaris123}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-kubepolaris}
      MYSQL_CHARACTER_SET: utf8mb4
      MYSQL_COLLATION: utf8mb4_unicode_ci
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # KubePolaris 后端
  backend:
    image: kubepolaris/kubepolaris-backend:latest
    container_name: kubepolaris-backend
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      - KUBEPOLARIS_DATABASE_HOST=mysql
      - KUBEPOLARIS_DATABASE_PORT=3306
      - KUBEPOLARIS_DATABASE_USER=root
      - KUBEPOLARIS_DATABASE_PASSWORD=${MYSQL_ROOT_PASSWORD:-kubepolaris123}
      - KUBEPOLARIS_DATABASE_NAME=${MYSQL_DATABASE:-kubepolaris}
      - KUBEPOLARIS_JWT_SECRET=${JWT_SECRET:-please-change-this-secret}
    volumes:
      - ./configs:/app/configs:ro
      - kubeconfig_data:/root/.kube:ro
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # KubePolaris 前端
  frontend:
    image: kubepolaris/kubepolaris-frontend:latest
    container_name: kubepolaris-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  mysql_data:
  kubeconfig_data:
```

### 生产环境配置

对于生产环境，建议使用 `docker-compose.prod.yml`：

```yaml title="docker-compose.prod.yml"
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: kubepolaris-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
      MYSQL_DATABASE: kubepolaris
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/conf.d:/etc/mysql/conf.d:ro
    secrets:
      - mysql_root_password
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  backend:
    image: kubepolaris/kubepolaris-backend:${VERSION:-latest}
    container_name: kubepolaris-backend
    restart: always
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      - KUBEPOLARIS_SERVER_MODE=release
      - KUBEPOLARIS_DATABASE_HOST=mysql
      - KUBEPOLARIS_DATABASE_PORT=3306
      - KUBEPOLARIS_DATABASE_USER=root
      - KUBEPOLARIS_DATABASE_NAME=kubepolaris
      - KUBEPOLARIS_LOG_LEVEL=info
      - KUBEPOLARIS_LOG_FORMAT=json
    env_file:
      - .env.prod
    secrets:
      - mysql_root_password
      - jwt_secret
    volumes:
      - ./configs:/app/configs:ro
      - logs:/app/logs
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

  frontend:
    image: kubepolaris/kubepolaris-frontend:${VERSION:-latest}
    container_name: kubepolaris-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    deploy:
      resources:
        limits:
          memory: 256M

secrets:
  mysql_root_password:
    file: ./secrets/mysql_root_password
  jwt_secret:
    file: ./secrets/jwt_secret

volumes:
  mysql_data:
  logs:
```

## 自定义配置

### 使用环境变量

创建 `.env` 文件：

```bash title=".env"
# 数据库
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=kubepolaris

# JWT
JWT_SECRET=your-random-secret-key-at-least-32-chars

# 服务端口
BACKEND_PORT=8080
FRONTEND_PORT=80

# 版本
VERSION=v1.0.0
```

### 挂载 kubeconfig

如果需要管理本地 Kubernetes 集群，可以挂载 kubeconfig：

```yaml
backend:
  volumes:
    - ~/.kube:/root/.kube:ro
```

### 启用 HTTPS

使用 Let's Encrypt 自动获取证书：

```yaml
frontend:
  image: kubepolaris/kubepolaris-frontend:latest
  volumes:
    - ./nginx/nginx-ssl.conf:/etc/nginx/nginx.conf:ro
    - ./certbot/conf:/etc/letsencrypt:ro
    - ./certbot/www:/var/www/certbot:ro
  ports:
    - "80:80"
    - "443:443"

certbot:
  image: certbot/certbot
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

## 数据备份

### 备份数据库

```bash
# 备份
docker exec kubepolaris-mysql mysqldump -u root -p kubepolaris > backup_$(date +%Y%m%d).sql

# 恢复
cat backup_20260107.sql | docker exec -i kubepolaris-mysql mysql -u root -p kubepolaris
```

### 备份数据卷

```bash
# 备份
docker run --rm -v kubepolaris_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_data.tar.gz /data

# 恢复
docker run --rm -v kubepolaris_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql_data.tar.gz -C /
```

## 升级

### 升级到新版本

```bash
# 拉取新镜像
docker-compose pull

# 重启服务
docker-compose up -d

# 查看日志确认升级成功
docker-compose logs -f backend
```

### 回滚

```bash
# 使用指定版本
export VERSION=v1.0.0
docker-compose up -d
```

## 常见问题

### 端口被占用

```bash
# 查看端口占用
lsof -i :8080

# 修改端口映射
# 在 docker-compose.yml 中修改 ports 配置
ports:
  - "9090:8080"  # 使用 9090 端口
```

### 容器无法访问网络

```bash
# 检查 Docker 网络
docker network ls
docker network inspect kubepolaris_default

# 重建网络
docker-compose down
docker network prune
docker-compose up -d
```

### 数据库连接失败

```bash
# 检查 MySQL 容器状态
docker logs kubepolaris-mysql

# 测试连接
docker exec -it kubepolaris-mysql mysql -u root -p

# 检查环境变量
docker exec kubepolaris-backend env | grep DATABASE
```

## 下一步

- [Kubernetes 部署](./kubernetes) - 生产环境推荐
- [配置说明](../getting-started/configuration) - 详细配置项

