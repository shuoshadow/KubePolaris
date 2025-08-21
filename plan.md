# K8s 管理平台 一期详细方案（Ant Design + Go Gin + MySQL）

本文档针对一期目标进行落地规划，覆盖范围边界、页面与交互、接口设计、数据模型、关键技术实现、权限与安全、里程碑与验收标准。

## 0. 技术选型

- 前端：React 19.1 + TypeScript + Vite + Ant Design（表格/表单/布局/弹窗/Drawer/Descriptions/Monaco Editor 集成）
- 后端：Go 1.24.6 + + Gin + client-go（K8s）+ WebSocket（终端/日志）+ k8s.io/klog/v2（日志）+ Viper（配置）
- 数据库：MySQL 8.x（平台用户/RBAC、集群接入信息、审计与终端会话）

监控侧优先对接已有 Prometheus（kube-prometheus-stack）。如无，则最小化使用 metrics-server + node-exporter + kube-state-metrics，前端做降级展示。

---

## 1. 一期范围与边界

- 集群层
  - 集群导入（主）/ 创建（以脚本引导为主）
  - 集群概览与监控（CPU/内存/网络/磁盘；时间范围选择）
  - Web Kubectl 终端（命名空间切换、快捷命令、审计）
  - 整体负载：节点就绪率、Pod 健康统计、TopN 资源使用
- 节点层
  - 节点列表与详情
  - Cordon/Uncordon、Drain（带选项）
  - Node 终端（推荐用 kubectl debug / ephemeral container + nsenter）
  - 节点监控
- 应用层（工作负载/Pod）
  - Deployments/StatefulSets/DaemonSets/Jobs/CronJobs 列表与详情
  - 扩缩容、删除
  - YAML 在线编辑（支持 dryRun + server-side apply）
  - Pod 监控、Pod 日志实时查看（follow/tail/筛选/下载）
  - Pod 终端（exec）
- 全局能力
  - 全局搜索（Node/Workload/Pod/Namespace 等）
  - 所有终端会话操作审计（输入流留痕、会话与命令记录）

不在一期范围：
- 企业 SSO/LDAP 对接（后续）
- 完整应用商店/CI/CD（后续）
- 审计 TTY 动画回放（一期先文本回放）

---

## 2. 系统架构

- 前端（Ant Design）
  - 路由：/clusters、/clusters/:id、/clusters/:id/nodes、/clusters/:id/workloads、/search、/audit
  - 组件：Layout、Table、Form、Modal/Drawer、Tabs、Descriptions、Statistic、Progress、Tag、Monaco、Graph（AntV/echarts）
  - 实时：WebSocket（终端与日志）
- 后端（Gin）
  - 模块：Auth/RBAC、ClusterRegistry、KubeAdapter（多集群 client 缓存）、Terminal、Workload、Node、Logs、Search、Audit
  - 对 K8s：client-go，按集群维度维护 RestConfig；Exec/Attach（SPDY）桥接；PromQL/metrics 汇聚
- 数据存储（MySQL）
  - 持久化平台侧数据（用户/角色、集群接入、审计、会话）
  - K8s 资源不落库，实时拉取，必要做内存缓存（TTL）

---

## 3. 前端信息架构与 Ant Design 映射

- 顶层布局：Layout.Header（全局搜索、用户）、Layout.Sider（导航）、Layout.Content
- 列表：Table + Toolbar（Select + Input + Button）+ 分页
- 详情：Tabs + Card + Descriptions + Statistic/Progress/Tag
- 编辑/操作：Drawer/Modal + Form + Popconfirm
- YAML：Monaco Editor（校验、高亮、Diff）
- 终端/日志：xterm 容器 + 控制栏（容器选择、follow、tail、暂停）
- 图表：AntV G2Plot（折线/面积/柱状/饼图）

---

## 4. 功能模块设计

### 4.1 集群层

- 页面
  - 集群列表：名称/版本/节点数/就绪率/CPU/内存/状态/最后心跳/操作
  - 集群接入向导：导入 kubeconfig 或 SA token + APIServer + CA；连接探测与权限自检
  - 集群概览：总体资源（折线/饼图）、节点就绪率、Pod 健康、事件、命名空间分布
  - Web Kubectl：xterm，命名空间切换，快捷命令（kubectl get pods -A 等），会话审计
  - 监控页：CPU/内存/网络/磁盘（1h/6h/24h/7d）
- 关键交互
  - 终端开启需二次确认；支持只读/读写模式（后端强校验）
  - 连接探测失败时给出清晰诊断（证书、权限、网络）
- 后端接口（示例）
  - POST /api/clusters/import
  - GET /api/clusters
  - GET /api/clusters/:id/overview
  - GET /api/clusters/:id/metrics?range=1h
  - WS  /api/clusters/:id/terminal

### 4.2 节点层

- 页面
  - 节点列表：名称/角色/污点/容量-已分配/状态/版本/压力状况/操作
  - 节点详情：基础信息、运行中的 Pod、事件、监控
- 操作
  - Cordon/Uncordon、Drain（选项：忽略 DaemonSet、宽限期、强制）
  - Node 终端：kubectl debug node/<name> + ephemeral container + nsenter
- 接口（示例）
  - GET /api/clusters/:id/nodes
  - POST /api/clusters/:id/nodes/:name/cordon|uncordon|drain
  - WS  /api/clusters/:id/nodes/:name/terminal

### 4.3 应用层（工作负载/Pod）

- 页面
  - 工作负载分组：Deployments/StatefulSets/DaemonSets/Jobs/CronJobs
  - 工作负载列表：名称/命名空间/副本/就绪/镜像/更新时间/操作（扩缩容、YAML、删除）
  - 工作负载详情：基础信息、关联 RS/Pod、事件、滚动升级历史、监控
  - Pod 列表/详情：状态/节点/重启次数/IP/镜像/容器列表/事件/监控
  - Pod 日志：容器选择、follow、tailLines、关键词过滤、下载
  - Pod 终端：进入容器交互（xterm）
- YAML 在线编辑
  - Monaco Editor；保存前支持 dryRun，应用使用 server-side apply
- 接口（示例）
  - GET /api/clusters/:id/workloads?kind=Deployment&ns=xxx
  - POST /api/clusters/:id/workloads/scale
  - GET /api/clusters/:id/pods?ns=xxx&labelSelector=...
  - GET /api/clusters/:id/pods/:pod/logs?container=xx&follow=1&tail=1000
  - WS  /api/clusters/:id/pods/:pod/terminal?container=xx
  - PUT /api/clusters/:id/yaml/apply?dryRun=1

### 4.4 全局搜索与审计

- 全局搜索
  - 顶部搜索可输入关键词，支持类型/集群/命名空间过滤
  - 后端聚合查询 K8s API，内存缓存（TTL）提速
  - GET /api/search?q=&types=&clusterId=&namespace=
- 终端审计
  - 记录：会话ID、用户、目标（pod/node/cluster）、时间、输入流（时间戳）
  - 存储：MySQL（session/commands），大输入可后续迁移对象存储
  - 回放：一期文本回放；提供查询与导出
  - 接口：
    - GET /api/audit/terminal/sessions
    - GET /api/audit/terminal/sessions/:id
    - GET /api/audit/terminal/sessions/:id/commands

---

## 5. 数据模型（MySQL 概览）

- users(id, username, password_hash, salt, status, created_at, updated_at)
- roles(id, name, desc)
- user_roles(user_id, role_id)
- permissions(id, code, name, desc) 
  - 例：cluster.read、cluster.terminal、node.drain、workload.edit、pod.exec
- role_permissions(role_id, permission_id)
- clusters(
  id, name, api_server, kubeconfig_enc, ca_enc, sa_token_enc,
  version, status, labels_json, cert_expire_at, created_by, created_at, updated_at
)
- terminal_sessions(
  id, user_id, cluster_id, target_type enum(pod|node|cluster),
  target_ref_json, namespace, pod, container, node,
  start_at, end_at, input_size, status
)
- terminal_commands(id, session_id, ts, raw_input text, parsed_cmd varchar(1024), exit_code int null)
- audit_logs(id, user_id, action, resource_type, resource_ref_json, ts, result, ip, ua)

注意：
- kubeconfig/token/CA 需加密存储（AES-256-GCM），主密钥走环境变量或 KMS
- terminal 输入流过大时可截断或转外部存储并记录索引

---

## 6. 监控接入方案

- 优先接 Prometheus：PromQL 拉取 cluster/node/pod 指标并汇聚为前端友好格式
- 无 Prometheus：降级为 metrics-server（CPU/内存），弱化磁盘/网络，并提供一键安装指南（Helm 文档）

---

## 7. 权限与安全

- 平台 RBAC：JWT 登录，角色-权限细粒度控制；前端按钮显隐，后端强校验
- 访问 K8s：为每个集群配置最小权限 ServiceAccount；必要时使用 impersonate 头传递平台用户（集群需允许）
- 终端安全：可配置只读/命名空间限制；会话审计必开；超时断开；防大流量滥用（限流）
- 机密与通信：凭据加密、全链路 HTTPS、敏感操作二次确认

---

## 8. 关键技术实现要点

- Web 终端（Pod/Cluster）
  - 前端：xterm.js + fit + WebSocket；窗口 resize 同步
  - 后端：Gin 协程桥接 remotecommand（SPDY）；拦截 stdin 进行审计；会话心跳与清理
- Node 终端
  - kubectl debug + ephemeral container + nsenter 进入宿主；退出后清理资源
- YAML 编辑
  - Monaco + server-side apply + dryRun；变更写审计（前后摘要与关键字段）
- 日志实时查看
  - 后端代理 kubelet 日志流（follow）；前端 SSE/WS 行级渲染、关键字高亮

---

## 9. 接口规范（精选）

```http
POST /api/auth/login
GET  /api/auth/me

POST /api/clusters/import
GET  /api/clusters
GET  /api/clusters/:id/overview
GET  /api/clusters/:id/metrics?range=1h
WS   /api/clusters/:id/terminal

GET  /api/clusters/:id/nodes
POST /api/clusters/:id/nodes/:name/cordon|uncordon|drain
WS   /api/clusters/:id/nodes/:name/terminal

GET  /api/clusters/:id/workloads?kind=&ns=
POST /api/clusters/:id/workloads/scale
GET  /api/clusters/:id/pods?ns=&labelSelector=
GET  /api/clusters/:id/pods/:pod/logs?container=&follow=&tail=
WS   /api/clusters/:id/pods/:pod/terminal?container=
PUT  /api/clusters/:id/yaml/apply?dryRun=1

GET  /api/search?q=&types=&clusterId=&namespace=
GET  /api/audit/terminal/sessions
GET  /api/audit/terminal/sessions/:id
GET  /api/audit/terminal/sessions/:id/commands
```

---

## 10. 任务拆解与里程碑（5–7 周）

- 第0.5周：原型图设计
  - UI/UX 设计师产出核心页面原型图
  - 集群管理页面原型（列表、详情、导入向导）
  - 节点管理页面原型（列表、详情、操作面板）
  - 工作负载管理页面原型（列表、详情、YAML编辑器）
  - Pod管理页面原型（列表、详情、日志查看、终端）
  - 全局搜索与审计页面原型
  - 整体布局与导航结构设计
  - 交互流程与状态设计（加载、错误、空状态等）
  - 交付：完整的原型图文档，前端开发可直接参考

- 第1周：项目基建
  - 前端：基于原型图搭建 Vite + React + Antd、路由、鉴权守卫、基础布局
  - 后端：Gin 脚手架、配置/日志/错误码、中间件（鉴权/审计/限流）、MySQL/迁移、RBAC 表、Cluster Registry
  - 交付：登录可用、集群导入 API 雏形

- 第2周：集群与监控
  - 前端：按原型图实现集群列表/详情、导入向导界面
  - 后端：集群连接探测与权限自检、基础监控（Prometheus 或降级）
  - Web 终端（集群 kubectl）MVP，审计接入
  - 交付：导入/浏览/终端可用，概览图表展示

- 第3周：节点管理
  - 前端：按原型图实现节点列表/详情/监控界面
  - 后端：Cordon/Uncordon/Drain 功能实现
  - Node 终端（debug/ephemeral）MVP
  - 交付：节点运维闭环

- 第4周：工作负载与 Pod
  - 前端：按原型图实现工作负载列表/详情、Pod管理界面
  - 后端：工作负载扩缩容、Pod 列表、日志 follow、Pod 终端
  - YAML 在线编辑（dryRun + apply）
  - 交付：应用层日常运维闭环

- 第5–6周：全局搜索与完善
  - 前端：按原型图实现全局搜索与审计界面
  - 后端：全局搜索（后端聚合 + 缓存）、审计详情/会话文本回放
  - 错误体验与权限细化、异常边界覆盖
  - 交付：一期对外可验收版本

- 第7周：UI优化与用户体验完善
  - 基于原型图进行界面细节优化
  - 响应式适配与交互体验优化
  - 用户反馈收集与界面调整
  - 交付：用户体验优化版本

---

## 11. 验收标准

- 集群导入成功率 ≥ 95%，失败原因可视化
- 集群/节点/Pod 指标展示正常；Web 终端可用率 ≥ 99%（断线可重连）
- 节点操作（cordon/drain）可靠，有回滚/提示
- 工作负载扩缩容/YAML 变更成功率 ≥ 95%，变更可追溯
- Pod 日志 follow 稳定；搜索平均响应 ≤ 1.5s（1w+对象）
- 审计：每次终端会话均有 session 与输入流记录，可检索导出

---

## 12. 风险与应对

- K8s 版本/权限差异：能力探测+降级策略；最小权限 SA；缺失能力显式提示
- 终端命令精准审计：一期保存输入流与时间戳；二期再做命令提取或 TTY 回放
- 无 Prometheus：降级监控并提供安装指南
- 多集群规模带来的性能压力：内存缓存与批并发限速；后续引入 Redis/ES

---

## 13. 下一步

1) 确认“一期以导入为主，创建采用脚本向导”的策略  
2) 确认目标集群是否具备 Prometheus（没有则按降级方案执行）  
3) 确认 Node 终端采用 debug/ephemeral container 方案  

确认后可继续输出：
- Swagger/OpenAPI 草案
- MySQL DDL 初始化脚本
- 前端路由与页面骨架、终端/日志组件
- 后端 K8s 适配与终端 POC