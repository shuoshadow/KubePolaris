---
sidebar_position: 4
---

# AlertManager 集成

KubePolaris 集成 AlertManager 提供告警管理功能。

## 功能

- 查看活跃告警
- 告警静默管理
- 告警历史记录
- 告警通知配置

## 配置

### 配置步骤

1. 进入 **系统设置** → **告警配置**
2. 填写 AlertManager 配置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 地址 | AlertManager 服务地址 | `http://alertmanager:9093` |

3. 测试连接并保存

## 使用

### 查看告警

1. 进入 **告警中心**
2. 查看所有活跃告警
3. 按严重程度/标签筛选

### 告警详情

点击告警查看：
- 告警名称和描述
- 触发时间
- 标签和注解
- 相关资源

### 静默告警

临时屏蔽告警：

1. 点击告警的 **静默** 按钮
2. 设置静默时长
3. 填写原因
4. 确认

### 配置通知

在 KubePolaris 中配置告警接收方：

1. 进入 **系统设置** → **通知配置**
2. 添加接收方：
   - 邮件
   - 钉钉
   - 企业微信
   - Slack
   - Webhook

## 告警规则

### 内置规则

KubePolaris 提供常用告警规则：

| 规则 | 条件 |
|------|------|
| 节点 Down | NotReady > 5 分钟 |
| CPU 过高 | > 80% 持续 15 分钟 |
| 内存过高 | > 85% 持续 15 分钟 |
| Pod 崩溃 | CrashLoopBackOff |
| 证书过期 | < 30 天 |

### 自定义规则

在 Prometheus 中添加告警规则：

```yaml
groups:
- name: kubepolaris
  rules:
  - alert: HighCPU
    expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage"
```

## 故障排查

### 告警不显示

1. 检查 AlertManager 连接
2. 确认有活跃告警
3. 检查筛选条件

### 通知不发送

1. 检查通知配置
2. 检查 AlertManager 路由规则
3. 查看 AlertManager 日志

