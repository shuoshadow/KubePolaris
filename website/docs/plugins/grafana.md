---
sidebar_position: 3
---

# Grafana 集成

KubePolaris 支持嵌入 Grafana 面板，在统一界面中查看监控。

## 功能

- 嵌入 Grafana Dashboard
- 无需切换系统查看监控
- 统一访问控制

## 配置

### 前置要求

- Grafana 已部署
- 拥有 API Key

### 创建 API Key

1. 登录 Grafana
2. 进入 **Configuration** → **API Keys**
3. 点击 **Add API key**
4. 设置名称和角色（Viewer 即可）
5. 复制生成的 Key

### 配置步骤

1. 进入 **系统设置** → **监控配置**
2. 填写 Grafana 配置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 地址 | Grafana 服务地址 | `http://grafana:3000` |
| API Key | Grafana API 密钥 | `eyJr...` |
| Org ID | 组织 ID | `1` |

3. 测试连接并保存

### 允许嵌入

需要配置 Grafana 允许嵌入：

```ini
# grafana.ini
[security]
allow_embedding = true

[auth.anonymous]
enabled = true
org_name = Main Org.
org_role = Viewer
```

## 使用

### 配置 Dashboard

1. 进入 **系统设置** → **Dashboard 配置**
2. 添加 Dashboard：
   - 名称
   - Dashboard UID（从 Grafana URL 获取）
   - 显示位置（集群/节点/Pod）

### 查看面板

配置后，在对应资源详情页查看嵌入的 Grafana 面板。

### 预置 Dashboard

KubePolaris 提供预置的 Dashboard JSON：

- Cluster Overview
- Node Details
- Pod Details

导入步骤：
1. 在 Grafana 中导入 JSON
2. 记录 Dashboard UID
3. 在 KubePolaris 中配置

## 故障排查

### 面板不显示

1. 检查 Grafana 允许嵌入配置
2. 检查 API Key 权限
3. 检查跨域配置

### 需要登录

确保启用了匿名访问或配置了正确的认证。

