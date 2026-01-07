---
sidebar_position: 3
---

# 源码编译

从源码编译和运行 KubePolaris，适合开发者和有定制需求的用户。

## 开发环境要求

| 工具 | 版本要求 | 用途 |
|------|---------|------|
| Go | 1.22+ | 后端编译 |
| Node.js | 18+ | 前端编译 |
| pnpm / npm | 8+ / 9+ | 包管理 |
| MySQL | 8.0+ | 数据库 |
| Git | 2.0+ | 代码管理 |
| Make | 3.8+ | 构建工具（可选） |

## 获取源码

```bash
# 克隆仓库
git clone https://github.com/kubepolaris/kubepolaris.git
cd kubepolaris

# 查看目录结构
ls -la
```

## 后端编译

### 1. 安装依赖

```bash
# 进入项目根目录（Go 模块根目录）
cd kubepolaris

# 下载依赖
go mod download

# 验证依赖
go mod verify
```

### 2. 编译

```bash
# 编译后端
go build -o bin/kubepolaris-backend ./cmd/main.go

# 或使用 Makefile
make build-backend

# 交叉编译（Linux）
GOOS=linux GOARCH=amd64 go build -o bin/kubepolaris-backend-linux ./cmd/main.go

# 交叉编译（Windows）
GOOS=windows GOARCH=amd64 go build -o bin/kubepolaris-backend.exe ./cmd/main.go
```

### 3. 运行

```bash
# 复制配置文件
cp configs/config.example.yaml configs/config.yaml

# 编辑配置
vim configs/config.yaml

# 运行
./bin/kubepolaris-backend

# 或开发模式（热重载）
go run ./cmd/main.go
```

## 前端编译

### 1. 安装依赖

```bash
# 进入前端目录
cd ui

# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 2. 开发模式

```bash
# 启动开发服务器
pnpm dev
# 或
npm run dev

# 默认访问 http://localhost:5173
```

### 3. 生产构建

```bash
# 构建生产版本
pnpm build
# 或
npm run build

# 构建产物在 dist/ 目录
ls -la dist/
```

### 4. 预览构建

```bash
# 预览生产构建
pnpm preview
```

## 数据库准备

### 1. 安装 MySQL

```bash
# macOS
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt-get install mysql-server
sudo systemctl start mysql

# Docker
docker run -d \
  --name kubepolaris-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=kubepolaris \
  -p 3306:3306 \
  mysql:8.0
```

### 2. 创建数据库

```bash
# 连接 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE kubepolaris CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选）
CREATE USER 'kubepolaris'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON kubepolaris.* TO 'kubepolaris'@'%';
FLUSH PRIVILEGES;
```

### 3. 表结构

应用会在启动时自动迁移表结构（使用 GORM AutoMigrate）。

## 配置文件

```yaml title="configs/config.yaml"
server:
  port: 8080
  mode: debug  # 开发环境使用 debug

database:
  host: localhost
  port: 3306
  user: root
  password: your_password
  name: kubepolaris

jwt:
  secret: dev-jwt-secret-key-for-development
  expire: 72h

log:
  level: debug
  format: text  # 开发环境使用 text 格式

cors:
  enabled: true
  allow_origins:
    - "http://localhost:5173"  # 前端开发服务器
    - "http://localhost:8080"
```

## 完整开发流程

### 1. 启动数据库

```bash
# 使用 Docker 启动 MySQL
docker-compose up -d mysql
```

### 2. 启动后端

```bash
# 终端 1
cd kubepolaris
go run ./cmd/main.go
```

### 3. 启动前端

```bash
# 终端 2
cd kubepolaris/ui
pnpm dev
```

### 4. 访问应用

- 前端开发服务器: http://localhost:5173
- 后端 API: http://localhost:8080

## 使用 Makefile

项目提供了 Makefile 简化常用操作：

```bash
# 查看所有命令
make help

# 开发环境启动
make dev

# 构建
make build

# 运行测试
make test

# 代码检查
make lint

# 生成 Swagger 文档
make swagger

# 构建 Docker 镜像
make docker-build

# 清理
make clean
```

## 代码结构

```
kubepolaris/
├── cmd/
│   └── main.go              # 主入口
├── internal/
│   ├── config/              # 配置管理
│   ├── database/            # 数据库连接
│   ├── handlers/            # HTTP 处理器
│   ├── middleware/          # 中间件
│   ├── models/              # 数据模型
│   ├── router/              # 路由定义
│   └── services/            # 业务逻辑
├── pkg/
│   └── logger/              # 日志工具
├── configs/
│   └── config.yaml          # 配置文件
├── ui/                      # 前端代码
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # API 服务
│   │   ├── types/           # TypeScript 类型
│   │   └── utils/           # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── go.mod
├── go.sum
└── Makefile
```

## 调试技巧

### 后端调试

使用 VS Code 或 GoLand 的调试功能：

```json title=".vscode/launch.json"
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Backend",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/cmd/main.go",
      "env": {
        "KUBEPOLARIS_SERVER_MODE": "debug"
      }
    }
  ]
}
```

### 前端调试

1. 使用浏览器开发者工具
2. 安装 React Developer Tools 扩展
3. 使用 VS Code 的 JavaScript 调试

## 运行测试

### 后端测试

```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./internal/handlers/...

# 显示详细输出
go test -v ./...

# 生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### 前端测试

```bash
cd ui

# 运行测试
pnpm test

# 运行测试并生成覆盖率
pnpm test:coverage
```

## 常见问题

### Go 模块下载慢

```bash
# 设置代理
go env -w GOPROXY=https://goproxy.cn,direct
```

### npm 安装慢

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 或使用 pnpm
pnpm config set registry https://registry.npmmirror.com
```

### 端口被占用

```bash
# 查看端口占用
lsof -i :8080
lsof -i :5173

# 杀死进程
kill -9 <PID>
```

## 下一步

- [贡献指南](https://github.com/kubepolaris/kubepolaris/blob/main/CONTRIBUTING.md) - 参与贡献
- [API 文档](../api/overview) - API 参考

