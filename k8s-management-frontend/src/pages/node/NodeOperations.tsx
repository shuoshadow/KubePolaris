import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Steps,
  Radio,
  Button,
  Form,
  Input,
  Checkbox,
  InputNumber,
  Progress,
  List,
  Space,
  Row,
  Col,
  Alert,
  Modal,
  message,
  Tag,
  Badge,
  Statistic,
} from 'antd';
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { nodeService } from '../../services/nodeService';
import type { Node } from '../../types';

const { Title, Text } = Typography;
const { Step } = Steps;

interface NodeOperationProps {
  clusterId: string;
  selectedNodes: Node[];
  onClose: () => void;
  onSuccess: () => void;
}

interface OperationResults {
  success: number;
  failed: number;
  skipped: number;
  details: Array<{
    nodeName: string;
    status: string;
    message: string;
  }>;
  startTime: string;
  endTime: string;
  duration: string;
}

const NodeOperations: React.FC<NodeOperationProps> = ({
  clusterId,
  selectedNodes,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [operationType, setOperationType] = useState<'cordon' | 'uncordon' | 'drain'>('cordon');
  const [operationReason, setOperationReason] = useState('');
  const [drainOptions, setDrainOptions] = useState({
    ignoreDaemonSets: true,
    deleteLocalData: false,
    force: false,
    gracePeriodSeconds: 30,
    timeoutSeconds: 300,
  });
  const [confirmChecks, setConfirmChecks] = useState({
    serviceInterruption: false,
    replicaConfirmed: false,
    teamNotified: false,
  });
  const [operationProgress, setOperationProgress] = useState(0);
  const [nodeOperationStatus, setNodeOperationStatus] = useState<any[]>([]);
  const [operationResults, setOperationResults] = useState<OperationResults>({
    success: 0,
    failed: 0,
    skipped: 0,
    details: [],
    startTime: '',
    endTime: '',
    duration: '',
  });
  const [executionStrategy, setExecutionStrategy] = useState('serial');
  const [failureHandling, setFailureHandling] = useState('stop');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 初始化节点操作状态
  useEffect(() => {
    if (selectedNodes.length > 0) {
      const initialStatus = selectedNodes.map(node => ({
        nodeName: node.name,
        status: 'pending',
        description: '等待操作',
        progress: 0,
      }));
      setNodeOperationStatus(initialStatus);
    }
  }, [selectedNodes]);

  // 处理操作类型变更
  const handleOperationTypeChange = (e: any) => {
    setOperationType(e.target.value);
  };

  // 处理下一步
  const handleNext = () => {
    if (currentStep === 0) {
      // 验证操作类型选择
      if (!operationType) {
        message.error('请选择操作类型');
        return;
      }
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 1) {
      // 验证操作配置
      if (operationType === 'drain') {
        // 验证Drain操作的确认项
        if (!confirmChecks.serviceInterruption || !confirmChecks.replicaConfirmed || !confirmChecks.teamNotified) {
          message.error('请确认所有风险提示项');
          return;
        }
      }
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 2) {
      // 开始执行操作
      executeOperation();
    }
  };

  // 处理上一步
  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  // 处理取消
  const handleCancel = () => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消当前操作吗？所有已配置的参数将丢失。',
      onOk: () => {
        onClose();
      },
    });
  };

  // 处理确认项变更
  const handleConfirmChecksChange = (checkedValues: string[]) => {
    setConfirmChecks({
      serviceInterruption: checkedValues.includes('service-interruption'),
      replicaConfirmed: checkedValues.includes('replica-confirmed'),
      teamNotified: checkedValues.includes('team-notified'),
    });
  };

  // 处理Drain选项变更
  const handleDrainOptionsChange = (checkedValues: string[]) => {
    setDrainOptions({
      ...drainOptions,
      ignoreDaemonSets: checkedValues.includes('ignore-daemonsets'),
      deleteLocalData: checkedValues.includes('delete-emptydir-data'),
      force: checkedValues.includes('force'),
    });
  };

  // 执行节点操作
  const executeOperation = async () => {
    setLoading(true);
    const startTime = new Date();
    setOperationResults({
      ...operationResults,
      startTime: startTime.toLocaleString(),
    });

    try {
      // 更新所有节点状态为等待中
      const updatedStatus = nodeOperationStatus.map(node => ({
        ...node,
        status: 'waiting',
        description: '等待操作',
      }));
      setNodeOperationStatus(updatedStatus);

      // 根据执行策略处理节点
      if (executionStrategy === 'parallel') {
        // 并行执行
        await executeParallel();
      } else {
        // 串行执行
        await executeSerial();
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;

      setOperationResults({
        ...operationResults,
        endTime: endTime.toLocaleString(),
        duration: `${minutes}分${seconds}秒`,
      });

      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('执行节点操作失败:', error);
      message.error('执行节点操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 并行执行操作
  const executeParallel = async () => {
    const operations = selectedNodes.map(async (node, index) => {
      try {
        // 更新当前节点状态为执行中
        updateNodeStatus(index, 'running', '正在执行操作', 10);

        // 根据操作类型执行不同的操作
        await executeNodeOperation(node.name, index);

        // 更新成功结果
        updateNodeStatus(index, 'success', '操作成功', 100);
        setOperationResults((prev: OperationResults) => ({
          ...prev,
          success: prev.success + 1,
          details: [...prev.details, {
            nodeName: node.name,
            status: 'success',
            message: `${operationType}操作成功`,
          }],
        }));
      } catch (error) {
        // 更新失败结果
        updateNodeStatus(index, 'failed', `操作失败: ${error}`, 100);
        setOperationResults((prev: OperationResults) => ({
          ...prev,
          failed: prev.failed + 1,
          details: [...prev.details, {
            nodeName: node.name,
            status: 'failed',
            message: `${operationType}操作失败: ${error}`,
          }],
        }));

        // 如果设置了失败停止，则抛出异常中断后续操作
        if (failureHandling === 'stop') {
          throw error;
        }
      }
    });

    await Promise.all(operations);
    
    // 更新总体进度
    setOperationProgress(100);
  };

  // 串行执行操作
  const executeSerial = async () => {
    for (let i = 0; i < selectedNodes.length; i++) {
      const node = selectedNodes[i];
      try {
        // 更新当前节点状态为执行中
        updateNodeStatus(i, 'running', '正在执行操作', 10);

        // 根据操作类型执行不同的操作
        await executeNodeOperation(node.name, i);

        // 更新成功结果
        updateNodeStatus(i, 'success', '操作成功', 100);
        setOperationResults((prev: OperationResults) => ({
          ...prev,
          success: prev.success + 1,
          details: [...prev.details, {
            nodeName: node.name,
            status: 'success',
            message: `${operationType}操作成功`,
          }],
        }));

        // 更新总体进度
        setOperationProgress(Math.round(((i + 1) / selectedNodes.length) * 100));

        // 如果不是最后一个节点，等待一段时间再执行下一个
        if (i < selectedNodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        // 更新失败结果
        updateNodeStatus(i, 'failed', `操作失败: ${error}`, 100);
        setOperationResults((prev: OperationResults) => ({
          ...prev,
          failed: prev.failed + 1,
          details: [...prev.details, {
            nodeName: node.name,
            status: 'failed',
            message: `${operationType}操作失败: ${error}`,
          }],
        }));

        // 如果设置了失败停止，则中断后续操作
        if (failureHandling === 'stop') {
          break;
        }
      }
    }
  };

  // 执行单个节点操作
  const executeNodeOperation = async (nodeName: string, index: number) => {
    switch (operationType) {
      case 'cordon':
        updateNodeStatus(index, 'running', '正在封锁节点', 30);
        await nodeService.cordonNode(clusterId, nodeName);
        updateNodeStatus(index, 'running', '节点封锁成功', 90);
        break;
      case 'uncordon':
        updateNodeStatus(index, 'running', '正在解封节点', 30);
        await nodeService.uncordonNode(clusterId, nodeName);
        updateNodeStatus(index, 'running', '节点解封成功', 90);
        break;
      case 'drain':
        updateNodeStatus(index, 'running', '正在驱逐节点上的Pod', 30);
        await nodeService.drainNode(clusterId, nodeName, {
          ignoreDaemonSets: drainOptions.ignoreDaemonSets,
          deleteLocalData: drainOptions.deleteLocalData,
          force: drainOptions.force,
          gracePeriodSeconds: drainOptions.gracePeriodSeconds,
        });
        updateNodeStatus(index, 'running', '节点驱逐成功', 90);
        break;
      default:
        throw new Error('不支持的操作类型');
    }

    // 模拟操作完成
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  // 更新节点状态
  const updateNodeStatus = (index: number, status: string, description: string, progress: number) => {
    setNodeOperationStatus(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        status,
        description,
        progress,
      };
      return updated;
    });
  };

  // 处理完成
  const handleFinish = () => {
    message.success('节点操作已完成');
    onSuccess();
    onClose();
  };

  // 获取节点状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'waiting':
        return <InfoCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  // 获取操作类型标题
  const getOperationTitle = () => {
    switch (operationType) {
      case 'cordon':
        return '封锁节点 (Cordon)';
      case 'uncordon':
        return '解封节点 (Uncordon)';
      case 'drain':
        return '驱逐节点 (Drain)';
      default:
        return '节点操作';
    }
  };

  // 获取操作类型描述
  const getOperationDescription = () => {
    switch (operationType) {
      case 'cordon':
        return '封锁节点将使节点不再接受新的Pod调度，但不会影响已经在节点上运行的Pod。';
      case 'uncordon':
        return '解封节点将恢复节点接受新的Pod调度的能力。';
      case 'drain':
        return '驱逐节点将首先封锁节点，然后安全地驱逐节点上的所有Pod，使节点可以安全地进行维护操作。';
      default:
        return '';
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderSelectOperationType();
      case 1:
        return renderConfigureOperation();
      case 2:
        return renderConfirmOperation();
      case 3:
        return renderOperationResult();
      default:
        return null;
    }
  };

  // 渲染选择操作类型
  const renderSelectOperationType = () => {
    return (
      <Card title="选择操作类型">
        <Radio.Group
          value={operationType}
          onChange={handleOperationTypeChange}
          buttonStyle="solid"
          size="large"
          style={{ marginBottom: 24 }}
        >
          <Radio.Button value="cordon">
            <PauseCircleOutlined /> 封锁节点 (Cordon)
          </Radio.Button>
          <Radio.Button value="uncordon">
            <PlayCircleOutlined /> 解封节点 (Uncordon)
          </Radio.Button>
          <Radio.Button value="drain">
            <ExportOutlined /> 驱逐节点 (Drain)
          </Radio.Button>
        </Radio.Group>

        <Alert
          message={getOperationTitle()}
          description={getOperationDescription()}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div>
          <Title level={5}>已选择 {selectedNodes.length} 个节点:</Title>
          <List
            size="small"
            bordered
            dataSource={selectedNodes}
            renderItem={(node: Node) => (
              <List.Item>
                <Space>
                  {node.status === 'Ready' ? (
                    <Badge status="success" />
                  ) : (
                    <Badge status="error" />
                  )}
                  <Text>{node.name}</Text>
                  <Tag color="blue">{node.roles.join(', ')}</Tag>
                  {node.taints?.some(t => t.effect === 'NoSchedule') && (
                    <Tag color="orange">已禁用调度</Tag>
                  )}
                </Space>
              </List.Item>
            )}
            style={{ marginBottom: 24 }}
          />
        </div>

        <Form layout="vertical">
          <Form.Item label="执行策略">
            <Radio.Group value={executionStrategy} onChange={e => setExecutionStrategy(e.target.value)}>
              <Radio value="parallel">并行执行 (同时操作所有节点)</Radio>
              <Radio value="serial">串行执行 (逐个操作，间隔1秒)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="失败处理">
            <Radio.Group value={failureHandling} onChange={e => setFailureHandling(e.target.value)}>
              <Radio value="stop">遇到错误时停止后续操作</Radio>
              <Radio value="continue">忽略错误继续执行</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="操作原因 (可选)">
            <Input.TextArea
              rows={3}
              placeholder="请输入操作原因，例如：计划维护、系统升级等"
              value={operationReason}
              onChange={e => setOperationReason(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Card>
    );
  };

  // 渲染配置操作
  const renderConfigureOperation = () => {
    switch (operationType) {
      case 'cordon':
        return renderCordonConfig();
      case 'uncordon':
        return renderUncordonConfig();
      case 'drain':
        return renderDrainConfig();
      default:
        return null;
    }
  };

  // 渲染Cordon配置
  const renderCordonConfig = () => {
    return (
      <Card title="封锁节点 (Cordon) 配置">
        <Alert
          message="操作说明"
          description={
            <ul>
              <li>节点将被标记为 "SchedulingDisabled"</li>
              <li>现有Pod继续正常运行</li>
              <li>新Pod不会调度到这些节点</li>
              <li>不影响DaemonSet Pod</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 24 }}>
          <Title level={5}>目标节点:</Title>
          <List
            size="small"
            bordered
            dataSource={selectedNodes}
            renderItem={(node: Node) => (
              <List.Item>
                <Space>
                  {node.taints?.some(t => t.effect === 'NoSchedule') ? (
                    <Badge status="warning" text={`${node.name} (已禁用调度)`} />
                  ) : (
                    <Badge status="success" text={`${node.name} (可调度)`} />
                  )}
                </Space>
              </List.Item>
            )}
          />
        </div>

        <Form layout="vertical">
          <Form.Item label="操作原因 (可选)">
            <Input.TextArea
              rows={3}
              placeholder="请输入操作原因，例如：计划维护、系统升级等"
              value={operationReason}
              onChange={e => setOperationReason(e.target.value)}
            />
          </Form.Item>

          <Form.Item>
            <Checkbox.Group>
              <Checkbox value="send-notification">发送通知给相关团队</Checkbox>
              <Checkbox value="record-log" defaultChecked disabled>记录操作日志</Checkbox>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Card>
    );
  };

  // 渲染Uncordon配置
  const renderUncordonConfig = () => {
    return (
      <Card title="解封节点 (Uncordon) 配置">
        <Alert
          message="操作说明"
          description={
            <ul>
              <li>移除节点的 "SchedulingDisabled" 标记</li>
              <li>节点恢复接受新Pod调度</li>
              <li>立即生效，无需重启</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 24 }}>
          <Title level={5}>目标节点:</Title>
          <List
            size="small"
            bordered
            dataSource={selectedNodes}
            renderItem={(node: Node) => (
              <List.Item>
                <Space>
                  {node.taints?.some(t => t.effect === 'NoSchedule') ? (
                    <Badge status="warning" text={`${node.name} (已禁用调度)`} />
                  ) : (
                    <Badge status="success" text={`${node.name} (可调度)`} />
                  )}
                </Space>
              </List.Item>
            )}
          />
        </div>

        <Form layout="vertical">
          <Form.Item label="操作原因 (可选)">
            <Input.TextArea
              rows={3}
              placeholder="请输入操作原因，例如：维护完成、恢复正常等"
              value={operationReason}
              onChange={e => setOperationReason(e.target.value)}
            />
          </Form.Item>

          <Form.Item>
            <Checkbox.Group>
              <Checkbox value="check-status">启用后立即检查节点状态</Checkbox>
              <Checkbox value="send-notification">发送恢复通知</Checkbox>
              <Checkbox value="record-log" defaultChecked disabled>记录操作日志</Checkbox>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Card>
    );
  };

  // 渲染Drain配置
  const renderDrainConfig = () => {
    return (
      <Card title="驱逐节点 (Drain) 配置">
        <Alert
          message="警告"
          description="驱逐节点是一个潜在的破坏性操作，它将驱逐节点上的所有Pod，可能导致服务中断。请确保您了解此操作的影响。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 24 }}>
          <Title level={5}>目标节点:</Title>
          <List
            size="small"
            bordered
            dataSource={selectedNodes}
            renderItem={(node: Node) => (
              <List.Item>
                <Space>
                  <Badge status="success" />
                  <Text>{node.name}</Text>
                  <Tag color="blue">{node.roles.join(', ')}</Tag>
                  <Tag color="green">{node.podCount}个Pod</Tag>
                </Space>
              </List.Item>
            )}
          />
        </div>

        <Form layout="vertical">
          <Form.Item label="高级选项">
            <Checkbox.Group onChange={handleDrainOptionsChange} defaultValue={['ignore-daemonsets']}>
              <Checkbox value="ignore-daemonsets">忽略DaemonSet Pod</Checkbox>
              <Checkbox value="delete-emptydir-data">删除本地存储的Pod</Checkbox>
              <Checkbox value="force">强制删除 (--force) ⚠️ 危险操作</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="宽限期 (秒)">
                <InputNumber
                  min={0}
                  max={300}
                  value={drainOptions.gracePeriodSeconds}
                  onChange={value => setDrainOptions({ ...drainOptions, gracePeriodSeconds: value as number })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="超时时间 (秒)">
                <InputNumber
                  min={60}
                  max={1800}
                  value={drainOptions.timeoutSeconds}
                  onChange={value => setDrainOptions({ ...drainOptions, timeoutSeconds: value as number })}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="确认风险">
            <Checkbox.Group onChange={handleConfirmChecksChange}>
              <div style={{ marginBottom: 8 }}>
                <Checkbox value="service-interruption">我了解此操作可能导致服务中断</Checkbox>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Checkbox value="replica-confirmed">我已确认有足够的副本在其他节点运行</Checkbox>
              </div>
              <div>
                <Checkbox value="team-notified">我已通知相关团队此次维护操作</Checkbox>
              </div>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item label="操作原因 (可选)">
            <Input.TextArea
              rows={3}
              placeholder="请输入操作原因，例如：节点维护、系统升级等"
              value={operationReason}
              onChange={e => setOperationReason(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Card>
    );
  };

  // 渲染确认操作
  const renderConfirmOperation = () => {
    return (
      <Card title={`正在执行: ${getOperationTitle()}`}>
        <div style={{ marginBottom: 16 }}>
          <Text>总体进度:</Text>
          <Progress percent={operationProgress} status="active" />
        </div>

        <List
          itemLayout="horizontal"
          dataSource={nodeOperationStatus}
          renderItem={(item: any, index: number) => (
            <List.Item>
              <List.Item.Meta
                avatar={getStatusIcon(item.status)}
                title={item.nodeName}
                description={item.description}
              />
              <Progress percent={item.progress} size="small" status={
                item.status === 'failed' ? 'exception' :
                item.status === 'success' ? 'success' : 'active'
              } />
            </List.Item>
          )}
          style={{ marginBottom: 24 }}
        />

        <div>
          <Title level={5}>实时日志:</Title>
          <div
            style={{
              height: 150,
              overflow: 'auto',
              padding: 16,
              backgroundColor: '#f5f5f5',
              borderRadius: 4,
            }}
          >
            {nodeOperationStatus.map((item, index) => (
              <div key={index}>
                <Text code>[{new Date().toLocaleTimeString()}] {item.description} - {item.nodeName}</Text>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  // 渲染操作结果
  const renderOperationResult = () => {
    return (
      <Card title="操作完成">
        <Alert
          message="操作已完成"
          description={`操作类型: ${getOperationTitle()}`}
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="执行时间"
                value={operationResults.startTime}
                formatter={value => <span>{value}</span>}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="完成时间"
                value={operationResults.endTime}
                formatter={value => <span>{value}</span>}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="总耗时"
                value={operationResults.duration}
              />
            </Col>
          </Row>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="成功"
                value={operationResults.success}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="失败"
                value={operationResults.failed}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="跳过"
                value={operationResults.skipped}
                valueStyle={{ color: '#faad14' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
          </Row>
        </div>

        <div>
          <Title level={5}>详细结果:</Title>
          <List
            size="small"
            bordered
            dataSource={operationResults.details}
            renderItem={(item: { nodeName: string; status: string; message: string }) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    item.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                    item.status === 'failed' ? <CloseCircleOutlined style={{ color: '#f5222d' }} /> :
                    <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                  }
                  title={item.nodeName}
                  description={item.message}
                />
              </List.Item>
            )}
            style={{ marginBottom: 24 }}
          />
        </div>

        {operationResults.failed > 0 && (
          <Alert
            message="后续建议"
            description="部分节点操作失败，请检查失败原因并考虑重试或手动处理。"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Button type="primary" onClick={handleFinish}>
            完成
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="node-operations">
      <Card
        title={<Title level={4}>节点操作</Title>}
        extra={
          <Button onClick={handleCancel}>
            取消
          </Button>
        }
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="选择操作" />
          <Step title="配置参数" />
          <Step title="执行操作" />
          <Step title="完成" />
        </Steps>

        {renderStepContent()}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          {currentStep > 0 && currentStep < 3 && (
            <Button style={{ marginRight: 8 }} onClick={handlePrevious}>
              上一步
            </Button>
          )}
          {currentStep < 2 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {currentStep === 2 && (
            <Button type="primary" onClick={handleNext} loading={loading}>
              开始执行
            </Button>
          )}
          {currentStep === 3 && (
            <Button type="primary" onClick={handleFinish}>
              完成
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NodeOperations;
