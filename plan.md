# KubePolaris（北辰）开发计划

## 📋 项目概述

本文档包含 KubePolaris（北辰）的完整开发计划，包括技术方案、任务拆解、开发进度和验收标准。

---

## 🎯 技术选型

- **前端**: React 19.1 + TypeScript + Vite + Ant Design（表格/表单/布局/弹窗/Drawer/Descriptions/Monaco Editor 集成）
- **后端**: Go 1.24.6 + Gin + client-go（K8s）+ WebSocket（终端/日志）+ k8s.io/klog/v2（日志）+ Viper（配置）
- **数据库**: MySQL 8.x（平台用户/RBAC、集群接入信息、审计与终端会话）

监控侧优先对接已有 Prometheus（kube-prometheus-stack）。如无，则最小化使用 metrics-server + node-exporter + kube-state-metrics，前端做降级展示。

---

## 🎯 一期范围与边界

### 核心功能
- **集群层**
  - 集群导入（主）/ 创建（以脚本引导为主）
  - 集群概览与监控（CPU/内存/网络/磁盘；时间范围选择）
  - Web Kubectl 终端（命名空间切换、快捷命令、审计）
  - 整体负载：节点就绪率、Pod 健康统计、TopN 资源使用

- **节点层**
  - 节点列表与详情
  - Cordon/Uncordon、Drain（带选项）
  - Node 终端（推荐用 kubectl debug / ephemeral container + nsenter）
  - 节点监控

- **应用层（工作负载/Pod）**
  - Deployments/StatefulSets/DaemonSets/Jobs/CronJobs 列表与详情
  - 扩缩容、删除
  - YAML 在线编辑（支持 dryRun + server-side apply）
  - Pod 监控、Pod 日志实时查看（follow/tail/筛选/下载）
  - Pod 终端（exec）

- **全局能力**
  - 全局搜索（Node/Workload/Pod/Namespace 等）
  - 所有终端会话操作审计（输入流留痕、会话与命令记录）

### 不在一期范围
- 企业 SSO/LDAP 对接（后续）
- 完整应用商店/CI/CD（后续）
- 审计 TTY 动画回放（一期先文本回放）

---

## 🏗️ 系统架构

### 前端（Ant Design）
- **路由**: /clusters、/clusters/:id、/clusters/:id/nodes、/clusters/:id/workloads、/search、/audit
- **组件**: Layout、Table、Form、Modal/Drawer、Tabs、Descriptions、Statistic、Progress、Tag、Monaco、Graph（AntV/echarts）
- **实时**: WebSocket（终端与日志）

### 后端（Gin）
- **模块**: Auth/RBAC、ClusterRegistry、KubeAdapter（多集群 client 缓存）、Terminal、Workload、Node、Logs、Search、Audit
- **对 K8s**: client-go，按集群维度维护 RestConfig；Exec/Attach（SPDY）桥接；PromQL/metrics 汇聚

### 数据存储（MySQL）
- **持久化**: 平台侧数据（用户/角色、集群接入、审计、会话）
- **K8s 资源**: 不落库，实时拉取，必要做内存缓存（TTL）

---

## 🚀 功能模块设计

### 集群管理
**页面功能**:
- 集群列表：名称/版本/节点数/就绪率/CPU/内存/状态/最后心跳/操作
- 集群接入向导：导入 kubeconfig 或 SA token + APIServer + CA；连接探测与权限自检
- 集群概览：总体资源（折线/饼图）、节点就绪率、Pod 健康、事件、命名空间分布
- Web Kubectl：xterm，命名空间切换，快捷命令（kubectl get pods -A 等），会话审计
- 监控页：CPU/内存/网络/磁盘（1h/6h/24h/7d）

**关键交互**:
- 终端开启需二次确认；支持只读/读写模式（后端强校验）
- 连接探测失败时给出清晰诊断（证书、权限、网络）

**API 接口**:
```http
POST /api/clusters/import
GET  /api/clusters
GET  /api/clusters/:id/overview
GET  /api/clusters/:id/metrics?range=1h
WS   /api/clusters/:id/terminal
```

### 节点管理
**页面功能**:
- 节点列表：名称/角色/污点/容量-已分配/状态/版本/压力状况/操作
- 节点详情：基础信息、运行中的 Pod、事件、监控

**操作功能**:
- Cordon/Uncordon、Drain（选项：忽略 DaemonSet、宽限期、强制）
- Node 终端：kubectl debug node/<name> + ephemeral container + nsenter

**API 接口**:
```http
GET  /api/clusters/:id/nodes
POST /api/clusters/:id/nodes/:name/cordon|uncordon|drain
WS   /api/clusters/:id/nodes/:name/terminal
```

### 应用层（工作负载/Pod）
**页面功能**:
- 工作负载分组：Deployments/StatefulSets/DaemonSets/Jobs/CronJobs
- 工作负载列表：名称/命名空间/副本/就绪/镜像/更新时间/操作（扩缩容、YAML、删除）
- 工作负载详情：基础信息、关联 RS/Pod、事件、滚动升级历史、监控
- Pod 列表/详情：状态/节点/重启次数/IP/镜像/容器列表/事件/监控
- Pod 日志：容器选择、follow、tailLines、关键词过滤、下载
- Pod 终端：进入容器交互（xterm）

**YAML 在线编辑**:
- Monaco Editor；保存前支持 dryRun，应用使用 server-side apply

**API 接口**:
```http
GET  /api/clusters/:id/workloads?kind=Deployment&ns=xxx
POST /api/clusters/:id/workloads/scale
GET  /api/clusters/:id/pods?ns=xxx&labelSelector=...
GET  /api/clusters/:id/pods/:pod/logs?container=xx&follow=1&tail=1000
WS   /api/clusters/:id/pods/:pod/terminal?container=xx
PUT  /api/clusters/:id/yaml/apply?dryRun=1
```

### 全局搜索与审计
**全局搜索**:
- 顶部搜索可输入关键词，支持类型/集群/命名空间过滤
- 后端聚合查询 K8s API，内存缓存（TTL）提速
- `GET /api/search?q=&types=&clusterId=&namespace=`

**终端审计**:
- 记录：会话ID、用户、目标（pod/node/cluster）、时间、输入流（时间戳）
- 存储：MySQL（session/commands），大输入可后续迁移对象存储
- 回放：一期文本回放；提供查询与导出

**审计接口**:
```http
GET /api/audit/terminal/sessions
GET /api/audit/terminal/sessions/:id
GET /api/audit/terminal/sessions/:id/commands
```

---

## 🗄️ 数据模型（MySQL）

```sql
-- 用户和权限
users(id, username, password_hash, salt, status, created_at, updated_at)
roles(id, name, desc)
user_roles(user_id, role_id)
permissions(id, code, name, desc) 
-- 例：cluster.read、cluster.terminal、node.drain、workload.edit、pod.exec
role_permissions(role_id, permission_id)

-- 集群管理
clusters(
  id, name, api_server, kubeconfig_enc, ca_enc, sa_token_enc,
  version, status, labels_json, cert_expire_at, created_by, created_at, updated_at
)

-- 审计日志
terminal_sessions(
  id, user_id, cluster_id, target_type enum(pod|node|cluster),
  target_ref_json, namespace, pod, container, node,
  start_at, end_at, input_size, status
)
terminal_commands(id, session_id, ts, raw_input text, parsed_cmd varchar(1024), exit_code int null)
audit_logs(id, user_id, action, resource_type, resource_ref_json, ts, result, ip, ua)
```

**注意**:
- kubeconfig/token/CA 需加密存储（AES-256-GCM），主密钥走环境变量或 KMS
- terminal 输入流过大时可截断或转外部存储并记录索引

---

## 📊 开发任务清单

### 第0.5周：原型图设计阶段 ✅ 已完成
- [✓] 集群管理页面原型设计
- [✓] 节点管理页面原型设计
- [✓] 工作负载管理页面原型设计
- [✓] Pod管理页面原型设计
- [✓] 全局功能页面原型设计
- [✓] 整体设计规范

### 第1周：项目基建阶段 ✅ 已完成
**前端基建任务**:
- [✓] 项目初始化（Vite + React + TypeScript + Ant Design）
- [✓] 基础架构搭建（路由、布局、页面组件）
- [✓] 开发环境配置

**后端基建任务**:
- [✓] 项目初始化（Go Gin 脚手架）
- [✓] 基础中间件开发（配置、日志、鉴权）
- [✓] 数据库设置（MySQL + GORM + RBAC表）
- [✓] 集群注册模块

### 第2周：集群与监控阶段 ✅ 已完成
**前端开发**:
- [✓] 集群管理界面（列表、详情、导入向导）
- [✓] 监控图表组件（AntV G2Plot 集成）

**后端开发**:
- [✓] 集群管理 API（导入、列表、详情）
- [✓] 集群连接与监控（探测、权限自检、Prometheus 接入）
- [✓] Web 终端功能（WebSocket + kubectl + 审计）

### 第3周：节点管理阶段 ✅ 已完成
**前端开发**:
- [✓] 节点管理界面（列表、详情、监控）
- [✓] 节点操作组件（Cordon/Uncordon/Drain）

**后端开发**:
- [✓] 节点管理 API（列表、详情、监控数据）
- [✓] 节点操作功能（Cordon/Uncordon/Drain）
- [✓] 节点终端功能（kubectl debug + SSH终端）

### 第4周：工作负载与 Pod 阶段 ✅ 已完成
**工作负载功能**:
- [✓] 后端工作负载API开发（列表、详情、扩缩容）
- [✓] 前端工作负载界面（列表、详情、操作）

**Pod功能**:
- [✓] 后端Pod API开发（列表、详情、筛选）
- [✓] 前端Pod界面（列表、详情）

**YAML编辑器**:
- [✓] YAML编辑器集成（Monaco Editor + 校验 + Diff）
- [✓] 后端YAML操作（server-side apply + dryRun）

**Pod日志和终端**:
- [✓] Pod日志功能（follow/tail 支持 + 实时流）
- [✓] Pod终端功能（WebSocket 接口 + 多容器支持）

### 第5-6周：全局搜索与完善阶段 ✅ 已完成
**前端开发任务**:
- [✓] 全局搜索界面（搜索页面、结果展示、过滤器）
- [✓] 审计功能界面（审计页面、会话列表、回放）
- [✓] 用户体验优化（错误边界、加载状态、空状态）

**后端开发任务**:
- [✓] 全局搜索功能（搜索API、K8s聚合查询、缓存机制）
- [✓] 审计功能完善（会话查询、详情接口、导出功能）
- [✓] 系统完善（权限细化、异常覆盖、性能优化）

### 第7周：监控指标集成与完善阶段 🚧 进行中
**Prometheus监控集成**:
- [ ] Prometheus API集成（查询接口、认证配置、连接管理）
- [ ] 监控数据服务层（指标查询、数据聚合、缓存机制）
- [ ] 监控指标标准化（CPU/内存/网络/磁盘/存储指标）

**集群监控完善**:
- [ ] 集群总览大盘（资源使用率、节点状态、Pod分布）
- [ ] 集群历史监控数据（时间序列图表、趋势分析）
- [ ] 集群告警指标（资源阈值、异常检测）

**节点监控完善**:
- [ ] 节点详细监控（CPU/内存/磁盘/网络使用率）
- [ ] 节点性能指标（负载、IO、网络流量）
- [ ] 节点历史数据展示（时间范围选择、图表展示）

**工作负载监控完善**:
- [ ] 工作负载资源使用监控（CPU/内存请求与限制）
- [ ] 工作负载扩缩容历史（副本数变化、资源变化）
- [ ] 工作负载性能指标（QPS、延迟、错误率）

**Pod监控完善**:
- [ ] Pod资源使用监控（CPU/内存实际使用量）
- [ ] Pod生命周期监控（启动时间、重启次数、健康状态）
- [ ] Pod网络监控（入站/出站流量、连接数）

**监控降级方案**:
- [ ] 无Prometheus环境下的基础监控（metrics-server数据）
- [ ] 监控数据模拟和估算（基于K8s API的统计信息）
- [ ] 监控功能开关和配置（支持禁用监控功能）

### 第8周：UI优化与用户体验完善阶段 📋 计划中
**前端优化**:
- [ ] 界面细节优化（基于原型图调整、样式优化、交互动效）
- [ ] 响应式适配（移动端、平板端、不同分辨率）
- [ ] 用户体验优化（操作反馈、错误提示、快捷键）
- [ ] 性能优化（组件懒加载、图片优化、打包优化）

**后端优化**:
- [ ] 性能优化（API响应时间、数据库查询、缓存策略）
- [ ] 稳定性优化（错误处理、日志记录、监控告警）
- [ ] 安全优化（漏洞扫描、权限控制、数据加密）

---

## 🎯 里程碑与验收标准

### 项目里程碑
- [✓] **里程碑1（第0.5周末）**: 原型图设计完成 ✅ 2024-08-15
- [✓] **里程碑2（第1周末）**: 项目基建完成，登录可用 ✅ 2024-08-18
- [✓] **里程碑3（第2周末）**: 集群管理功能完成 ✅ 2024-08-20
- [✓] **里程碑4（第3周末）**: 节点管理功能完成 ✅ 2024-08-22
- [✓] **里程碑5（第4周末）**: 工作负载与Pod管理功能完成 ✅ 2024-08-22
- [✓] **里程碑6（第6周末）**: 全局搜索与审计功能完成 ✅ 2024-08-26
- [ ] **里程碑7（第7周末）**: 监控指标集成与完善完成
- [ ] **里程碑8（第8周末）**: 项目完整交付

### 验收标准
**功能验收**:
- [ ] 集群导入成功率 ≥ 95%，失败原因可视化
- [ ] 集群/节点/Pod 指标展示正常；Web 终端可用率 ≥ 99%（断线可重连）
- [ ] 节点操作（cordon/drain）可靠，有回滚/提示
- [ ] 工作负载扩缩容/YAML 变更成功率 ≥ 95%，变更可追溯
- [ ] Pod 日志 follow 稳定；搜索平均响应 ≤ 1.5s（1w+对象）
- [ ] 审计：每次终端会话均有 session 与输入流记录，可检索导出

**技术验收**:
- [ ] 代码质量检查通过
- [ ] 安全扫描通过
- [ ] 性能测试通过
- [ ] 兼容性测试通过
- [ ] 文档完整性检查通过


**优化验收**:
- [ ] 代码结构清晰，可维护性高 
- [ ] 代码注释完整，可读性好
- [ ] 数据库名称修改
- [ ] 表名/字段名规范化
- [ ] 表结构优化
- [ ] 代码风格优化
- [ ] 加上 Pod 总数/用量， calico 可以从 Prometheus获取，云上要再看
---

## 🔒 权限与安全

### 平台 RBAC
- JWT 登录，角色-权限细粒度控制
- 前端按钮显隐，后端强校验

### 访问 K8s
- 为每个集群配置最小权限 ServiceAccount
- 必要时使用 impersonate 头传递平台用户（集群需允许）

### 终端安全
- 可配置只读/命名空间限制
- 会话审计必开；超时断开
- 防大流量滥用（限流）

### 机密与通信
- 凭据加密、全链路 HTTPS
- 敏感操作二次确认

---

## 🔧 关键技术实现要点

### Web 终端（Pod/Cluster）
- **前端**: xterm.js + fit + WebSocket；窗口 resize 同步
- **后端**: Gin 协程桥接 remotecommand（SPDY）；拦截 stdin 进行审计；会话心跳与清理

### Node 终端
- kubectl debug + ephemeral container + nsenter 进入宿主；退出后清理资源

### YAML 编辑
- Monaco + server-side apply + dryRun；变更写审计（前后摘要与关键字段）

### 日志实时查看
- 后端代理 kubelet 日志流（follow）；前端 SSE/WS 行级渲染、关键字高亮

---

## 📈 监控接入方案

### 优先方案：Prometheus 集成
**技术架构**:
- **Prometheus API**: 通过 HTTP API 查询 PromQL 获取监控数据
- **认证方式**: Basic Auth / Bearer Token / mTLS（根据集群配置）
- **数据缓存**: Redis 缓存查询结果，减少 Prometheus 压力
- **降级策略**: 无 Prometheus 时使用 metrics-server + 估算数据

**核心指标**:
```promql
# 集群级别指标
cluster:cpu_usage_ratio = sum(rate(container_cpu_usage_seconds_total[5m])) / sum(machine_cpu_cores)
cluster:memory_usage_ratio = sum(container_memory_working_set_bytes) / sum(machine_memory_bytes)
cluster:pod_running_ratio = sum(kube_pod_status_phase{phase="Running"}) / sum(kube_pod_status_phase)

# 节点级别指标  
node:cpu_usage_ratio = rate(node_cpu_seconds_total{mode!="idle"}[5m])
node:memory_usage_ratio = (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))
node:disk_usage_ratio = (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes))

# Pod级别指标
pod:cpu_usage_ratio = rate(container_cpu_usage_seconds_total[5m])
pod:memory_usage_ratio = container_memory_working_set_bytes / container_spec_memory_limit_bytes
pod:network_receive_rate = rate(container_network_receive_bytes_total[5m])
pod:network_transmit_rate = rate(container_network_transmit_bytes_total[5m])
```

**API 接口设计**:
```http
# 集群监控
GET /api/clusters/:id/metrics?range=1h&step=1m&metrics=cpu,memory,network,disk
GET /api/clusters/:id/metrics/overview?time=now

# 节点监控  
GET /api/clusters/:id/nodes/:name/metrics?range=6h&step=5m
GET /api/clusters/:id/nodes/metrics/summary

# 工作负载监控
GET /api/clusters/:id/workloads/:namespace/:name/metrics?range=1d&step=10m

# Pod监控
GET /api/clusters/:id/pods/:namespace/:name/metrics?range=1h&step=1m
```

**数据格式**:
```json
{
  "code": 200,
  "message": "success", 
  "data": {
    "cpu": {
      "current": 65.2,
      "series": [
        {"timestamp": 1693123200, "value": 62.1},
        {"timestamp": 1693123260, "value": 65.2}
      ]
    },
    "memory": {
      "current": 78.5,
      "series": [...]
    },
    "network": {
      "in": {"current": 1.2, "series": [...]},
      "out": {"current": 0.8, "series": [...]}
    },
    "timeRange": {
      "start": 1693123200,
      "end": 1693126800, 
      "step": "1m"
    }
  }
}
```

### 降级方案：metrics-server + 估算
**适用场景**: 集群未部署 Prometheus 或 Prometheus 不可用
**数据来源**: 
- metrics-server API (`/apis/metrics.k8s.io/v1beta1/`)
- Kubernetes API 资源统计
- 基于 Pod 资源请求的估算

**实现策略**:
- 优先尝试 Prometheus 查询
- 失败时自动降级到 metrics-server
- 提供配置开关控制监控功能启用/禁用

---

## ⚠️ 风险与应对

### 主要风险
- **K8s 版本/权限差异**: 能力探测+降级策略；最小权限 SA；缺失能力显式提示
- **终端命令精准审计**: 一期保存输入流与时间戳；二期再做命令提取或 TTY 回放
- **无 Prometheus**: 降级监控并提供安装指南
- **多集群规模性能压力**: 内存缓存与批并发限速；后续引入 Redis/ES

### 风险控制检查清单
- [ ] K8s 版本兼容性测试
- [ ] 权限差异处理验证
- [ ] 终端命令审计功能验证
- [ ] Prometheus 监控接入测试
- [ ] 降级方案验证
- [ ] 性能压力测试
- [ ] 安全漏洞扫描

---

## 🚀 下一步行动

### 当前重点任务
1. **Prometheus API 集成** - 实现真实的监控数据获取
2. **监控数据服务层** - 统一监控数据查询和缓存机制  
3. **集群总览大盘** - 实现多维度监控数据展示
4. **监控降级方案** - 确保无 Prometheus 环境下的可用性

### 确认事项
1. 确认目标集群是否具备 Prometheus（没有则按降级方案执行）
2. 确认 Prometheus 认证方式（Basic Auth / Token / mTLS）
3. 确认监控数据缓存策略（Redis / 内存缓存）
4. 确认监控功能开关配置需求

---

**文档版本**: v1.1  
**最后更新**: 2024-08-26  
**项目状态**: 核心功能完成，监控指标集成开发中