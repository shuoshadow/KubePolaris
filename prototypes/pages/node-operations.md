# 节点操作面板原型设计

## 操作面板布局

```
┌─────────────────────────────────────────────────────────────────┐
│ 节点操作面板                                                     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 选择操作类型                                                 │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │ │
│ │ │ ⏸️ Cordon    │ │ ▶️ Uncordon  │ │ 💧 Drain     │            │ │
│ │ │ 禁用调度     │ │ 启用调度     │ │ 驱逐Pod     │            │ │
│ │ │ [选中]       │ │             │ │             │            │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Cordon 操作配置                                              │ │
│ │                                                             │ │
│ │ 目标节点: worker-1, worker-2 (2个节点)                       │ │
│ │                                                             │ │
│ │ ⚠️ 注意事项:                                                  │ │
│ │ • 节点将被标记为不可调度                                     │ │
│ │ • 现有Pod不会受到影响                                        │ │
│ │ • 新的Pod将不会调度到此节点                                  │ │
│ │ • 可以随时使用Uncordon恢复调度                               │ │
│ │                                                             │ │
│ │ 操作原因 (可选):                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ 计划维护，暂时禁用调度                                   │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ ┌──────────┐ ┌──────────┐                                  │ │
│ │ │ 取消      │ │ 执行操作  │                                  │ │
│ │ └──────────┘ └──────────┘                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 操作类型详细设计

### 1. Cordon 操作面板
```
┌─────────────────────────────────────────────────────────────┐
│ ⏸️ Cordon 节点 (禁用调度)                                     │
│                                                             │
│ 目标节点:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ worker-1 (Ready, 可调度)                              │ │
│ │ ✅ worker-2 (Ready, 可调度)                              │ │
│ │ ❌ worker-3 (Ready, 已禁用调度)                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 操作说明:                                                    │
│ • 节点将被标记为 "SchedulingDisabled"                        │
│ • 现有Pod继续正常运行                                        │
│ • 新Pod不会调度到这些节点                                    │
│ • 不影响DaemonSet Pod                                       │
│                                                             │
│ 操作原因:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 计划维护升级，临时禁用调度                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☑️ 发送通知给相关团队                                        │
│ ☑️ 记录操作日志                                              │
│                                                             │
│ ┌──────────┐ ┌──────────┐                                  │
│ │ 取消      │ │ 执行Cordon│                                  │
│ └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Uncordon 操作面板
```
┌─────────────────────────────────────────────────────────────┐
│ ▶️ Uncordon 节点 (启用调度)                                   │
│                                                             │
│ 目标节点:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ worker-1 (Ready, 调度已禁用)                          │ │
│ │ ✅ worker-2 (Ready, 调度已禁用)                          │ │
│ │ ❌ worker-3 (Ready, 可调度) - 已启用                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 操作说明:                                                    │
│ • 移除节点的 "SchedulingDisabled" 标记                       │
│ • 节点恢复接受新Pod调度                                      │
│ • 立即生效，无需重启                                         │
│                                                             │
│ 预检查结果:                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ 节点状态健康                                          │ │
│ │ ✅ 资源充足 (CPU: 30%, 内存: 40%)                        │ │
│ │ ✅ 网络连接正常                                          │ │
│ │ ⚠️  磁盘使用率较高 (85%) - 建议监控                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☑️ 启用后立即检查节点状态                                    │
│ ☑️ 发送恢复通知                                              │
│                                                             │
│ ┌──────────┐ ┌──────────┐                                  │
│ │ 取消      │ │执行Uncordon│                                 │
│ └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3. Drain 操作面板
```
┌─────────────────────────────────────────────────────────────┐
│ 💧 Drain 节点 (驱逐Pod)                                      │
│                                                             │
│ 目标节点:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ worker-1 (15个Pod需要驱逐)                            │ │
│ │ ❌ master-1 (系统节点，不建议Drain)                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Pod分析:                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 可驱逐Pod: 12个                                          │ │
│ │ DaemonSet Pod: 3个 (需要特殊处理)                        │ │
│ │ 本地存储Pod: 2个 (需要确认)                              │ │
│ │ 无副本Pod: 1个 (⚠️ 可能导致服务中断)                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 高级选项:                                                    │
│ ☑️ 忽略DaemonSet Pod (--ignore-daemonsets)                  │
│ ☑️ 删除本地存储的Pod (--delete-emptydir-data)               │
│ ☐ 强制删除 (--force) ⚠️ 危险操作                            │
│ ☑️ 禁用调度 (自动执行Cordon)                                 │
│                                                             │
│ 超时设置:                                                    │
│ 宽限期: [30] 秒  超时时间: [300] 秒                          │
│                                                             │
│ 确认风险:                                                    │
│ ☑️ 我了解此操作可能导致服务中断                              │
│ ☑️ 我已确认有足够的副本在其他节点运行                        │
│ ☑️ 我已通知相关团队此次维护操作                              │
│                                                             │
│ ┌──────────┐ ┌──────────┐                                  │
│ │ 取消      │ │ 执行Drain │                                  │
│ └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

## 批量操作面板

### 批量节点操作
```
┌─────────────────────────────────────────────────────────────┐
│ 批量节点操作                                                 │
│                                                             │
│ 已选择 3 个节点:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ • worker-1 (Ready, 15个Pod)                             │ │
│ │ • worker-2 (Ready, 12个Pod)                             │ │
│ │ • worker-3 (Ready, 8个Pod)                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 选择批量操作:                                                │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 批量Cordon   │ │ 批量Uncordon │ │ 批量Drain    │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ 执行策略:                                                    │
│ ○ 并行执行 (同时操作所有节点)                                │
│ ● 串行执行 (逐个操作，间隔30秒)                              │
│ ○ 自定义策略                                                │
│                                                             │
│ 失败处理:                                                    │
│ ● 遇到错误时停止后续操作                                     │
│ ○ 忽略错误继续执行                                          │
│ ○ 记录错误但继续执行                                        │
│                                                             │
│ ☑️ 操作前进行预检查                                          │
│ ☑️ 发送批量操作通知                                          │
│ ☑️ 生成操作报告                                              │
│                                                             │
│ ┌──────────┐ ┌──────────┐                                  │
│ │ 取消      │ │ 开始执行  │                                  │
│ └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

## 操作进度和结果

### 操作进度面板
```
┌─────────────────────────────────────────────────────────────┐
│ 正在执行: Drain 操作                                         │
│                                                             │
│ 总体进度: ████████░░ 80% (4/5 完成)                         │
│                                                             │
│ 节点操作状态:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ worker-1: Drain完成 (12个Pod已驱逐)                   │ │
│ │ ✅ worker-2: Drain完成 (8个Pod已驱逐)                    │ │
│ │ ✅ worker-3: Drain完成 (15个Pod已驱逐)                   │ │
│ │ ⏳ worker-4: 正在驱逐Pod (3/10 完成)                     │ │
│ │ ⏸️ worker-5: 等待中...                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 当前操作详情:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 正在驱逐: nginx-deployment-xxx (default)                │ │
│ │ 状态: 等待Pod优雅关闭 (剩余20秒)                         │ │
│ │ 进度: ████████░░ 80%                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 实时日志:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [17:25:30] 开始驱逐 worker-4 上的Pod                     │ │
│ │ [17:25:31] 驱逐 nginx-xxx (default/nginx-deployment)    │ │
│ │ [17:25:32] 等待Pod优雅关闭...                           │ │
│ │ [17:25:45] Pod nginx-xxx 已成功驱逐                     │ │
│ │ [17:25:46] 驱逐 redis-xxx (prod/redis-cluster)         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌──────────┐ ┌──────────┐                                  │
│ │ 暂停操作  │ │ 取消操作  │                                  │
│ └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 操作结果面板
```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 操作完成                                                  │
│                                                             │
│ 操作类型: Drain 节点                                         │
│ 执行时间: 2024-08-15 17:25:30 - 17:28:45                   │
│ 总耗时: 3分15秒                                              │
│                                                             │
│ 操作结果:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ 成功: 4个节点                                         │ │
│ │ ❌ 失败: 1个节点                                         │ │
│ │ ⏭️ 跳过: 0个节点                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 详细结果:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ worker-1: 成功驱逐12个Pod                             │ │
│ │ ✅ worker-2: 成功驱逐8个Pod                              │ │
│ │ ✅ worker-3: 成功驱逐15个Pod                             │ │
│ │ ✅ worker-4: 成功驱逐10个Pod                             │ │
│ │ ❌ worker-5: 失败 - 超时 (Pod mysql-xxx 拒绝驱逐)        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 影响统计:                                                    │
│ • 总共驱逐Pod: 45个                                         │
│ • 成功驱逐: 44个                                            │
│ • 驱逐失败: 1个                                             │
│ • 平均驱逐时间: 4.3秒/Pod                                   │
│                                                             │
│ 后续建议:                                                    │
│ • 检查失败的Pod mysql-xxx 状态                              │
│ • 考虑手动处理或强制删除                                     │
│ • 监控其他节点的资源使用情况                                 │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│ │ 下载报告  │ │ 查看日志  │ │ 关闭     │                     │
│ └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Ant Design 组件映射

```jsx
// 操作面板主组件
<Modal
  title="节点操作"
  visible={operationModalVisible}
  width={800}
  footer={null}
  onCancel={handleCancel}
>
  <Steps current={currentStep} style={{ marginBottom: 24 }}>
    <Step title="选择操作" />
    <Step title="配置参数" />
    <Step title="确认执行" />
    <Step title="查看结果" />
  </Steps>

  {currentStep === 0 && (
    <Card title="选择操作类型">
      <Radio.Group value={operationType} onChange={setOperationType}>
        <Radio.Button value="cordon">
          <PauseOutlined /> Cordon
        </Radio.Button>
        <Radio.Button value="uncordon">
          <PlayCircleOutlined /> Uncordon
        </Radio.Button>
        <Radio.Button value="drain">
          <ExportOutlined /> Drain
        </Radio.Button>
      </Radio.Group>
    </Card>
  )}

  {currentStep === 1 && operationType === 'drain' && (
    <Card title="Drain 配置">
      <Form form={drainForm} layout="vertical">
        <Form.Item label="高级选项">
          <Checkbox.Group>
            <Checkbox value="ignore-daemonsets">忽略DaemonSet Pod</Checkbox>
            <Checkbox value="delete-emptydir-data">删除本地存储Pod</Checkbox>
            <Checkbox value="force">强制删除 (危险)</Checkbox>
          </Checkbox.Group>
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="宽限期 (秒)" name="gracePeriod">
              <InputNumber min={0} max={300} defaultValue={30} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="超时时间 (秒)" name="timeout">
              <InputNumber min={60} max={1800} defaultValue={300} />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item label="风险确认">
          <Checkbox.Group>
            <Checkbox value="service-interruption">我了解可能导致服务中断</Checkbox>
            <Checkbox value="replica-confirmed">我已确认其他节点有足够副本</Checkbox>
            <Checkbox value="team-notified">我已通知相关团队</Checkbox>
          </Checkbox.Group>
        </Form.Item>
      </Form>
    </Card>
  )}

  {currentStep === 2 && (
    <Card title="操作进度">
      <Progress percent={operationProgress} status="active" />
      <List
        dataSource={nodeOperationStatus}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              avatar={<Icon type={item.status} />}
              title={item.nodeName}
              description={item.description}
            />
            <div>{item.progress}%</div>
          </List.Item>
        )}
      />
    </Card>
  )}
</Modal>

// 批量操作组件
<Card title="批量操作" style={{ position: 'fixed', bottom: 20 }}>
  <Row justify="space-between" align="middle">
    <Col>
      已选择 {selectedNodes.length} 个节点
    </Col>
    <Col>
      <Space>
        <Button onClick={handleBatchCordon}>批量Cordon</Button>
        <Button onClick={handleBatchUncordon}>批量Uncordon</Button>
        <Button onClick={handleBatchDrain} type="primary">批量Drain</Button>
      </Space>
    </Col>
  </Row>
</Card>
```

## 数据结构

```typescript
interface NodeOperation {
  id: string;
  type: 'cordon' | 'uncordon' | 'drain';
  targetNodes: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  
  // Drain特有配置
  drainOptions?: {
    ignoreDaemonSets: boolean;
    deleteEmptyDirData: boolean;
    force: boolean;
    gracePeriodSeconds: number;
    timeoutSeconds: number;
  };
  
  // 执行结果
  results: NodeOperationResult[];
  
  // 操作日志
  logs: OperationLog[];
}

interface NodeOperationResult {
  nodeName: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  podsEvicted?: number;
  duration?: number;
  error?: string;
}

interface OperationLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  nodeName?: string;
  podName?: string;
}
```

## 安全和权限控制

### 权限检查
- Cordon/Uncordon: 需要 `nodes/update` 权限
- Drain: 需要 `nodes/update` 和 `pods/eviction` 权限
- 批量操作: 需要额外的批量操作权限

### 安全措施
- 危险操作需要二次确认
- 操作前进行预检查
- 提供操作回滚机制
- 完整的操作审计日志

### 操作限制
- 系统节点保护机制
- 单点故障检测
- 资源使用率检查
- 服务可用性验证