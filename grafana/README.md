# Grafana 集成指南

## 快速启动

### 1. 启动 Grafana

```bash
# 在项目根目录执行
docker-compose -f docker-compose-grafana.yml up -d

# 查看日志
docker-compose -f docker-compose-grafana.yml logs -f grafana
```

### 2. 访问 Grafana

- URL: http://localhost:3000
- 用户名: `admin`
- 密码: `admin123`

### 3. 配置 Prometheus 数据源

⚠️ **重要**: 修改 `grafana/provisioning/datasources/prometheus.yaml` 中的 Prometheus URL

常见配置：
- Kubernetes 集群内: `http://prometheus-server:9090`
- Docker 本地: `http://host.docker.internal:9090`
- 远程地址: `http://your-prometheus-ip:9090`

修改后重启 Grafana：
```bash
docker-compose -f docker-compose-grafana.yml restart
```

### 4. 验证数据源

1. 登录 Grafana
2. 左侧菜单 → ⚙️ Configuration → Data sources
3. 点击 Prometheus
4. 点击 **Test** 按钮
5. 应该显示 ✅ "Data source is working"

## 导入 Dashboard

### 方式一：从 Grafana 官方导入（推荐）

#### Pod 监控 Dashboard
1. 点击左侧 **➕** → **Import**
2. 输入 Dashboard ID: `6417`
3. 点击 **Load**
4. 配置：
   - Name: `KubePolaris - Pod Monitoring`
   - Folder: `KubePolaris`
   - Prometheus: 选择你的数据源
5. 点击 **Import**

#### 推荐的 Dashboard

| Dashboard ID | 名称 | 用途 |
|--------------|------|------|
| **315** | Kubernetes Cluster Monitoring | 集群概览 |
| **6417** | Kubernetes Pod Monitoring | Pod 监控 |
| **13770** | Node Exporter Full | 节点监控 |
| **12740** | Kubernetes Pod Memory | 内存详细监控 |

### 方式二：使用自定义 Dashboard

将 Dashboard JSON 文件放入 `grafana/dashboards/` 目录，Grafana 会自动加载。

## 配置 Dashboard 变量

导入 Dashboard 后，需要配置变量以支持动态传参：

1. 打开 Dashboard
2. 点击右上角 **⚙️ Dashboard settings**
3. 点击左侧 **Variables**
4. 添加以下变量：

### cluster 变量
- Name: `cluster`
- Type: `Custom`
- Hide: `Variable`（隐藏选择器）
- Custom options: 留空

### namespace 变量
- Name: `namespace`
- Type: `Custom`
- Hide: `Variable`
- Custom options: 留空

### pod 变量
- Name: `pod`
- Type: `Custom`
- Hide: `Variable`
- Custom options: 留空

5. 点击 **Save dashboard**

## 获取 Dashboard UID 和 Panel ID

### Dashboard UID
在 Dashboard 页面查看 URL：
```
http://localhost:3000/d/k8s-pod-overview/kubernetes-pod-monitoring
                        ^^^^^^^^^^^^^^^^ 这就是 UID
```

### Panel ID
1. 鼠标悬停在图表上
2. 点击图表标题 → **Edit**
3. 在 URL 中查看：
```
http://localhost:3000/d/k8s-pod-overview/...?editPanel=2
                                                     ^ Panel ID
```

## 测试嵌入 URL

在浏览器访问以下格式的 URL：

```
http://localhost:3000/d-solo/{DASHBOARD_UID}/?orgId=1&panelId={PANEL_ID}&var-cluster={CLUSTER}&var-namespace={NAMESPACE}&var-pod={POD}&from=now-1h&to=now&theme=light
```

示例：
```
http://localhost:3000/d-solo/k8s-pod-overview/?orgId=1&panelId=2&var-cluster=prod&var-namespace=default&var-pod=nginx-deployment-abc&from=now-1h&to=now&theme=light
```

如果看到单个图表正常显示，说明配置成功！✅

## 停止 Grafana

```bash
docker-compose -f docker-compose-grafana.yml down
```

## 常见问题

### 1. Grafana 无法连接 Prometheus

**解决方案**：
- 检查 Prometheus 是否运行
- 修改 `grafana/provisioning/datasources/prometheus.yaml` 中的 URL
- 如果 Prometheus 在 Docker 中，使用 `host.docker.internal`
- 重启 Grafana

### 2. iframe 无法显示图表

**可能原因**：
- 未设置 `GF_SECURITY_ALLOW_EMBEDDING=true`
- Dashboard UID 或 Panel ID 不正确
- 变量名不匹配

### 3. 数据源测试失败

检查：
- Prometheus 地址是否正确
- 网络是否可达
- Prometheus 是否需要认证

## 下一步

完成 Grafana 配置后，继续前端集成：
1. 创建 GrafanaPanel 组件
2. 创建 GrafanaMonitoringCharts 组件
3. 替换现有的 MonitoringCharts

参考：`ui/src/components/` 目录中的示例代码。
