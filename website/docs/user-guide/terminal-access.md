---
sidebar_position: 5
---

# 终端访问

KubePolaris 提供强大的 Web 终端功能，无需本地工具即可在浏览器中直接操作容器和节点。

## 终端类型

| 类型 | 用途 | 入口 |
|------|------|------|
| **Pod 终端** | 进入 Pod 容器 | Pod 详情页 |
| **Kubectl 终端** | 执行 kubectl 命令 | 集群详情页 |
| **SSH 终端** | SSH 到节点 | 节点详情页 |

## Pod 终端

### 进入容器

1. 进入 Pod 详情页
2. 点击 **终端** 按钮
3. 选择容器（多容器 Pod）
4. 终端窗口打开

### 默认 Shell

系统会按以下顺序尝试启动 Shell：

1. `/bin/bash`
2. `/bin/sh`
3. `/bin/ash`（Alpine）

### 常用操作

```bash
# 查看环境变量
env

# 查看进程
ps aux

# 查看网络
ip addr
netstat -tlnp

# 查看文件系统
df -h
ls -la /

# 查看日志
tail -f /var/log/app.log

# 测试网络连接
curl http://service-name:port/health
wget -qO- http://service-name:port/
```

### 多终端

可以同时打开多个终端：

1. 点击 **新建终端** 按钮
2. 每个终端独立运行
3. 使用标签页切换

## Kubectl 终端

### 功能特点

- 无需本地安装 kubectl
- 自动连接当前集群
- 支持所有 kubectl 命令
- 命令历史记录

### 使用方法

1. 进入集群详情页
2. 点击 **Kubectl 终端**
3. 执行 kubectl 命令

```bash
# 查看节点
kubectl get nodes

# 查看 Pod
kubectl get pods -A

# 查看 Deployment
kubectl get deploy -n default

# 执行命令
kubectl exec -it <pod-name> -- /bin/sh

# 查看日志
kubectl logs -f <pod-name>

# 应用配置
kubectl apply -f manifest.yaml
```

### 权限说明

Kubectl 终端使用登录用户的权限，具体操作受 RBAC 控制。

## SSH 终端

### 配置 SSH

在使用 SSH 终端前，需要配置节点的 SSH 认证：

1. 进入 **系统设置** → **SSH 配置**
2. 添加 SSH 配置：

| 配置项 | 说明 |
|--------|------|
| 主机匹配模式 | IP 或主机名模式 |
| 端口 | SSH 端口，默认 22 |
| 用户名 | SSH 登录用户 |
| 认证方式 | 密码或密钥 |
| 密码/密钥 | 认证凭据 |

### 使用 SSH 终端

1. 进入节点详情页
2. 点击 **SSH** 按钮
3. 系统自动使用配置的凭据连接
4. 在 Web 终端中操作

### 常用操作

```bash
# 查看系统信息
uname -a
cat /etc/os-release

# 查看资源使用
top
htop
free -h
df -h

# 查看容器
docker ps
crictl ps

# 查看 kubelet 状态
systemctl status kubelet
journalctl -u kubelet -f

# 网络诊断
ip addr
ss -tlnp
iptables -L -n
```

## 终端功能

### 全屏模式

点击全屏按钮进入全屏模式，获得更好的操作体验。

### 复制粘贴

- **复制**: 选中文本后 `Ctrl+Shift+C` 或右键菜单
- **粘贴**: `Ctrl+Shift+V` 或右键菜单

:::tip 浏览器兼容性
部分浏览器可能需要允许剪贴板访问权限。
:::

### 字体大小

使用 `Ctrl++` 和 `Ctrl+-` 调整字体大小。

### 命令历史

使用上下箭头键浏览命令历史。

### 自动重连

终端断开后会自动尝试重连，无需手动刷新。

### 会话超时

默认 30 分钟无操作后终端会话自动关闭。可在系统设置中调整超时时间。

## 安全考虑

### 审计日志

所有终端操作都会记录审计日志：

- 用户信息
- 操作时间
- 目标资源
- 执行命令

在 **审计日志** 页面可查看完整记录。

### 权限控制

终端访问受 RBAC 控制：

```yaml
# 允许 Pod 终端
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]

# 允许查看日志
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
```

### 最小权限

建议：
- 生产环境限制终端访问权限
- 使用只读账号进行日常查看
- 需要操作时使用特权账号

## 故障排查

### 终端无法连接

1. 检查网络连接
2. 检查 WebSocket 代理配置
3. 查看浏览器控制台错误

```bash
# 检查 WebSocket
# 确保 Nginx/Ingress 配置支持 WebSocket
```

### 终端闪退

1. 检查容器是否还在运行
2. 检查 Shell 是否可用
3. 查看 Pod 事件

### SSH 连接失败

1. 检查 SSH 配置
2. 验证凭据正确性
3. 检查网络连通性
4. 确认 SSH 服务运行

```bash
# 测试 SSH 连接
ssh -v user@node-ip
```

### 命令执行超时

1. 检查命令是否需要交互
2. 使用非交互模式
3. 检查网络延迟

## 最佳实践

### 安全操作

```bash
# 执行危险命令前确认
echo "Will delete files in /app/logs"
rm -rf /app/logs/*

# 使用 dry-run
kubectl delete pod xxx --dry-run=client
```

### 调试技巧

```bash
# 安装调试工具（临时）
apt-get update && apt-get install -y curl wget vim

# 使用 nsenter 进入节点命名空间
nsenter -t 1 -m -u -i -n

# 使用 debug 容器
kubectl debug -it <pod-name> --image=busybox
```

### 脚本执行

```bash
# 使用 heredoc 执行多行命令
cat << 'EOF' | sh
echo "Line 1"
echo "Line 2"
EOF
```

## 下一步

- [监控告警](./monitoring-alerting) - 查看监控数据
- [日志中心](./log-center) - 集中查看日志

