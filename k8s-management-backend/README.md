# K8s管理平台 - 后端项目

一个基于 Go + Gin + MySQL 的现代化 Kubernetes 集群管理平台后端服务。

## 🚀 技术选型

### 核心技术栈
- **Go 1.21** - 高性能的编程语言
- **Gin 1.9** - 轻量级的Web框架
- **GORM** - 强大的ORM库
- **MySQL 8.x** - 关系型数据库
- **JWT** - 身份认证
- **WebSocket** - 实时通信

### Kubernetes集成
- **client-go** - Kubernetes官方Go客户端
- **k8s.io/api** - Kubernetes API定义
- **k8s.io/apimachinery** - Kubernetes通用工具
- **k8s.io/klog** - Kubernetes日志库

### 其他依赖
- **Viper** - 配置管理
- **bcrypt** - 密码加密
- **Gorilla WebSocket** - WebSocket支持

## 📁 项目结构

```
k8s-management-backend/
├── main.go                     # 应用入口
├── go.mod                      # Go模块定义
├── configs/                    # 配置文件
│   └── config.yaml            # 主配置文件
├── internal/                   # 内部包
│   ├── config/                # 配置管理
│   │   └── config.go          # 配置结构定义
│   ├── database/              # 数据库
│   │   └── database.go        # 数据库连接和迁移
│   ├── handlers/              # HTTP处理器
│   │   ├── auth.go           # 认证处理器
│   │   ├── cluster.go        # 集群管理处理器
│   │   ├── node.go           # 节点管理处理器
│   │   ├── pod.go            # Pod管理处理器
│   │   ├── workload.go       # 工作负载处理器
│   │   ├── search.go         # 搜索处理器
│   │   ├── audit.go          # 审计处理器
│   │   └── terminal.go       # 终端处理器
│   ├── middleware/            # 中间件
│   │   ├── auth.go           # 认证中间件
│   │   ├── cors.go           # 跨域中间件
│   │   ├── audit.go          # 审计中间件
│   │   └── ratelimit.go      # 限流中间件
│   ├── models/                # 数据模型
│   │   ├── user.go           # 用户相关模型
│   │   ├── cluster.go        # 集群相关模型
│   │   └── audit.go          # 审计相关模型
│   ├── router/                # 路由配置
│   │   └── router.go         # 路由设置
│   └── services/              # 业务服务
│       ├── k8s/              # Kubernetes服务
│       ├── auth/             # 认证服务
│       └── audit/            # 审计服务
└── pkg/                       # 公共包
    ├── logger/               # 日志工具
    │   └── logger.go         # 日志实现
    ├── crypto/               # 加密工具
    └── utils/                # 通用工具
```

## 🎯 核心功能

### 1. 认证与授权
- **JWT认证** - 基于JWT的无状态认证
- **RBAC权限控制** - 角色基础的访问控制
- **用户管理** - 用户注册、登录、权限管理

### 2. 集群管理
- **集群导入** - 支持kubeconfig和手动配置
- **集群监控** - 实时监控集群状态和资源使用
- **多集群支持** - 统一管理多个Kubernetes集群

### 3. 资源管理
- **节点管理** - 节点列表、详情、操作(Cordon/Drain)
- **Pod管理** - Pod列表、详情、日志查看
- **工作负载管理** - Deployment、StatefulSet等管理
- **YAML编辑** - 在线YAML编辑和应用

### 4. 终端功能
- **Web终端** - 浏览器中的kubectl终端
- **Pod终端** - 直接进入Pod容器
- **节点终端** - 通过debug容器访问节点

### 5. 审计与监控
- **操作审计** - 记录所有用户操作
- **终端审计** - 记录终端会话和命令
- **监控集成** - 支持Prometheus监控数据

## 🛠️ 开发指南

### 环境要求
- Go >= 1.21
- MySQL >= 8.0
- 可访问的Kubernetes集群

### 安装依赖
```bash
go mod download
```

### 配置文件
复制并修改配置文件：
```bash
cp configs/config.yaml.example configs/config.yaml
```

配置示例：
```yaml
server:
  port: 8080
  mode: debug

database:
  host: localhost
  port: 3306
  username: root
  password: your_password
  database: k8s_management
  charset: utf8mb4

jwt:
  secret: your-secret-key
  expire_time: 24

log:
  level: info

k8s:
  default_namespace: default
```

### 数据库初始化
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE k8s_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行应用，自动创建表结构
go run main.go
```

### 启动开发服务器
```bash
go run main.go
```

服务器将在 http://localhost:8080 启动

### 构建生产版本
```bash
go build -o k8s-management-backend main.go
```

## 📋 API文档

### 认证相关
```http
POST /api/auth/login          # 用户登录
POST /api/auth/logout         # 用户登出
GET  /api/auth/me            # 获取用户信息
```

### 集群管理
```http
GET    /api/clusters                    # 获取集群列表
POST   /api/clusters/import            # 导入集群
GET    /api/clusters/:id               # 获取集群详情
DELETE /api/clusters/:id               # 删除集群
GET    /api/clusters/stats             # 获取集群统计
GET    /api/clusters/:id/overview      # 获取集群概览
GET    /api/clusters/:id/metrics       # 获取集群监控数据
POST   /api/clusters/test-connection   # 测试集群连接
```

### 节点管理
```http
GET  /api/clusters/:id/nodes              # 获取节点列表
GET  /api/clusters/:id/nodes/:name        # 获取节点详情
POST /api/clusters/:id/nodes/:name/cordon # 封锁节点
POST /api/clusters/:id/nodes/:name/uncordon # 解封节点
POST /api/clusters/:id/nodes/:name/drain  # 驱逐节点
```

### Pod管理
```http
GET /api/clusters/:id/pods                      # 获取Pod列表
GET /api/clusters/:id/pods/:namespace/:name     # 获取Pod详情
GET /api/clusters/:id/pods/:namespace/:name/logs # 获取Pod日志
```

### WebSocket终端
```http
WS /ws/clusters/:id/terminal                           # 集群终端
WS /ws/clusters/:id/nodes/:name/terminal              # 节点终端
WS /ws/clusters/:id/pods/:namespace/:name/terminal    # Pod终端
```

## 🔧 开发规范

### 代码结构
- **handlers/** - HTTP请求处理逻辑
- **services/** - 业务逻辑实现
- **models/** - 数据模型定义
- **middleware/** - 中间件实现

### 错误处理
统一的错误响应格式：
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

### 日志规范
使用结构化日志：
```go
logger.Info("用户登录成功: %s", username)
logger.Error("数据库连接失败: %v", err)
```

### 数据库操作
使用GORM进行数据库操作：
```go
// 查询
var user models.User
db.Where("username = ?", username).First(&user)

// 创建
db.Create(&user)

// 更新
db.Save(&user)
```

## 🚀 部署指南

### Docker部署
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/configs ./configs
CMD ["./main"]
```

### 环境变量
```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_USERNAME=root
export DB_PASSWORD=password
export JWT_SECRET=your-secret-key
```

## 📊 监控与日志

### 健康检查
```http
GET /health
```

### 日志级别
- **DEBUG** - 调试信息
- **INFO** - 一般信息
- **WARN** - 警告信息
- **ERROR** - 错误信息

### 性能监控
- 请求响应时间
- 数据库连接池状态
- 内存使用情况
- Goroutine数量

## 🔒 安全考虑

### 数据加密
- 密码使用bcrypt加密
- 敏感配置信息加密存储
- JWT token安全传输

### 访问控制
- 基于角色的权限控制
- API接口权限验证
- 操作审计日志

### 网络安全
- HTTPS强制使用
- CORS跨域控制
- 请求频率限制

## 🧪 测试

### 单元测试
```bash
go test ./...
```

### 集成测试
```bash
go test -tags=integration ./...
```

### API测试
使用Postman或curl进行API测试

## 📝 开发进度

### 已完成功能 ✅
- [x] 项目基础架构搭建
- [x] 配置管理系统
- [x] 数据库连接和模型
- [x] JWT认证系统
- [x] 基础中间件
- [x] 路由系统设计

### 正在开发 🚧
- [ ] 集群管理API实现
- [ ] Kubernetes客户端集成
- [ ] WebSocket终端功能

### 待开发功能 📋
- [ ] 节点管理功能
- [ ] Pod管理功能
- [ ] 工作负载管理
- [ ] 监控数据集成
- [ ] 审计功能完善

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请联系开发团队。

---

**注意：** 本项目正在积极开发中，API可能会发生变化。请关注更新日志。