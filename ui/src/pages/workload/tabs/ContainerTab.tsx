/** genAI_main_start */
import React, { useState, useEffect } from 'react';
import { 
  Descriptions, 
  Spin, 
  message, 
  Menu, 
  Row, 
  Col, 
  Card,
  Tag,
  Divider,
  Empty
} from 'antd';
import { WorkloadService } from '../../../services/workloadService';

interface ContainerInfo {
  name: string;
  image: string;
  imagePullPolicy: string;
  command?: string[];
  args?: string[];
  workingDir?: string;
  ports?: Array<{
    name?: string;
    containerPort: number;
    protocol: string;
  }>;
  env?: Array<{
    name: string;
    value?: string;
    valueFrom?: any;
  }>;
  resources?: {
    limits?: {
      cpu?: string;
      memory?: string;
    };
    requests?: {
      cpu?: string;
      memory?: string;
    };
  };
  volumeMounts?: Array<{
    name: string;
    mountPath: string;
    readOnly?: boolean;
    subPath?: string;
  }>;
  livenessProbe?: any;
  readinessProbe?: any;
  startupProbe?: any;
}

interface DeploymentSpec {
  replicas?: number;
  selector?: any;
  template?: {
    metadata?: {
      labels?: Record<string, string>;
      annotations?: Record<string, string>;
    };
    spec?: {
      containers?: ContainerInfo[];
      initContainers?: ContainerInfo[];
      volumes?: Array<{
        name: string;
        configMap?: any;
        secret?: any;
        emptyDir?: any;
        persistentVolumeClaim?: any;
      }>;
    };
  };
}

interface ContainerTabProps {
  clusterId: string;
  namespace: string;
  deploymentName?: string;
  rolloutName?: string;
  statefulSetName?: string;
  daemonSetName?: string;
  jobName?: string;
  cronJobName?: string;
}

const ContainerTab: React.FC<ContainerTabProps> = ({ 
  clusterId, 
  namespace, 
  deploymentName,
  rolloutName,
  statefulSetName,
  daemonSetName,
  jobName,
  cronJobName
}) => {
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState<DeploymentSpec | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('basic');

  // 获取工作负载名称和类型
  const workloadName = deploymentName || rolloutName || statefulSetName || daemonSetName || jobName || cronJobName;
  const workloadType = deploymentName ? 'Deployment' 
    : rolloutName ? 'Rollout'
    : statefulSetName ? 'StatefulSet'
    : daemonSetName ? 'DaemonSet'
    : jobName ? 'Job'
    : cronJobName ? 'CronJob'
    : '';

  // 加载Deployment Spec
  const loadSpec = async () => {
    if (!clusterId || !namespace || !workloadName || !workloadType) return;
    
    setLoading(true);
    try {
      const response = await WorkloadService.getWorkloadDetail(
        clusterId,
        workloadType,
        namespace,
        workloadName
      );
      
      if (response.code === 200 && response.data) {
        // 使用 raw 字段获取完整的 Deployment 对象
        const deployment = response.data.raw || response.data.workload;
        setSpec(deployment.spec || null);
        
        // 默认选择第一个容器
        if (deployment.spec?.template?.spec?.containers && deployment.spec.template.spec.containers.length > 0) {
          setSelectedContainer(deployment.spec.template.spec.containers[0].name);
        }
      } else {
        message.error(response.message || '获取容器信息失败');
      }
    } catch (error) {
      console.error('获取容器信息失败:', error);
      message.error('获取容器信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId, namespace, workloadName, workloadType]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  if (!spec || !spec.template?.spec?.containers || spec.template.spec.containers.length === 0) {
    return <Empty description="暂无容器信息" />;
  }

  const containers = spec.template.spec.containers;
  const currentContainer = containers.find(c => c.name === selectedContainer);

  // 左侧菜单项
  const menuItems = [
    { key: 'basic', label: '基本信息' },
    { key: 'lifecycle', label: '生命周期' },
    { key: 'health', label: '健康检查' },
    { key: 'env', label: '环境变量' },
    { key: 'volume', label: '数据存储' },
  ];

  // 渲染基本信息
  const renderBasicInfo = () => {
    if (!currentContainer) return null;

    return (
      <Descriptions title="基本信息" column={1} bordered size="small">
        <Descriptions.Item label="容器名称">{currentContainer.name}</Descriptions.Item>
        <Descriptions.Item label="镜像名称">{currentContainer.image}</Descriptions.Item>
        <Descriptions.Item label="更新策略">{currentContainer.imagePullPolicy || '总是拉取镜像'}</Descriptions.Item>
        <Descriptions.Item label="CPU配额">
          <div>
            <div>申请值: {currentContainer.resources?.requests?.cpu || '-'}</div>
            <div>限制值: {currentContainer.resources?.limits?.cpu || '-'}</div>
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="内存配额">
          <div>
            <div>申请值: {currentContainer.resources?.requests?.memory || '-'}</div>
            <div>限制值: {currentContainer.resources?.limits?.memory || '-'}</div>
          </div>
        </Descriptions.Item>
        {currentContainer.ports && currentContainer.ports.length > 0 && (
          <Descriptions.Item label="端口">
            {currentContainer.ports.map((port, index) => (
              <Tag key={index}>
                {port.name && `${port.name}: `}{port.containerPort}/{port.protocol}
              </Tag>
            ))}
          </Descriptions.Item>
        )}
        {currentContainer.command && currentContainer.command.length > 0 && (
          <Descriptions.Item label="启动命令">
            <code>{currentContainer.command.join(' ')}</code>
          </Descriptions.Item>
        )}
        {currentContainer.args && currentContainer.args.length > 0 && (
          <Descriptions.Item label="启动参数">
            <code>{currentContainer.args.join(' ')}</code>
          </Descriptions.Item>
        )}
      </Descriptions>
    );
  };

  // 渲染生命周期
  const renderLifecycle = () => {
    return (
      <Card title="生命周期" size="small">
        <Empty description="暂无生命周期配置" />
      </Card>
    );
  };

  // 渲染健康检查
  const renderHealthCheck = () => {
    if (!currentContainer) return null;

    return (
      <div>
        <Card title="就绪检查 (Readiness Probe)" size="small" style={{ marginBottom: 16 }}>
          {currentContainer.readinessProbe ? (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="检查类型">
                {currentContainer.readinessProbe.httpGet && 'HTTP GET'}
                {currentContainer.readinessProbe.tcpSocket && 'TCP Socket'}
                {currentContainer.readinessProbe.exec && 'Exec Command'}
              </Descriptions.Item>
              {currentContainer.readinessProbe.httpGet && (
                <>
                  <Descriptions.Item label="路径">{currentContainer.readinessProbe.httpGet.path}</Descriptions.Item>
                  <Descriptions.Item label="端口">{currentContainer.readinessProbe.httpGet.port}</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="初始延迟">{currentContainer.readinessProbe.initialDelaySeconds || 0}秒</Descriptions.Item>
              <Descriptions.Item label="检查间隔">{currentContainer.readinessProbe.periodSeconds || 10}秒</Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="未配置就绪检查" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        <Card title="存活检查 (Liveness Probe)" size="small">
          {currentContainer.livenessProbe ? (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="检查类型">
                {currentContainer.livenessProbe.httpGet && 'HTTP GET'}
                {currentContainer.livenessProbe.tcpSocket && 'TCP Socket'}
                {currentContainer.livenessProbe.exec && 'Exec Command'}
              </Descriptions.Item>
              {currentContainer.livenessProbe.httpGet && (
                <>
                  <Descriptions.Item label="路径">{currentContainer.livenessProbe.httpGet.path}</Descriptions.Item>
                  <Descriptions.Item label="端口">{currentContainer.livenessProbe.httpGet.port}</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="初始延迟">{currentContainer.livenessProbe.initialDelaySeconds || 0}秒</Descriptions.Item>
              <Descriptions.Item label="检查间隔">{currentContainer.livenessProbe.periodSeconds || 10}秒</Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="未配置存活检查" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </div>
    );
  };

  // 渲染环境变量
  const renderEnvVars = () => {
    if (!currentContainer || !currentContainer.env || currentContainer.env.length === 0) {
      return <Empty description="暂无环境变量" />;
    }

    return (
      <Card title="环境变量" size="small">
        <Descriptions column={1} size="small" bordered>
          {currentContainer.env.map((env, index) => (
            <Descriptions.Item key={index} label={env.name}>
              {env.value || (env.valueFrom ? JSON.stringify(env.valueFrom) : '-')}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
    );
  };

  // 渲染数据存储
  const renderVolumeMounts = () => {
    if (!currentContainer || !currentContainer.volumeMounts || currentContainer.volumeMounts.length === 0) {
      return <Empty description="暂无数据卷挂载" />;
    }

    return (
      <Card title="数据卷挂载" size="small">
        <Descriptions column={1} size="small" bordered>
          {currentContainer.volumeMounts.map((mount, index) => (
            <Descriptions.Item key={index} label={mount.name}>
              <div>挂载路径: {mount.mountPath}</div>
              {mount.subPath && <div>子路径: {mount.subPath}</div>}
              <div>只读: {mount.readOnly ? '是' : '否'}</div>
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
    );
  };

  // 渲染内容
  const renderContent = () => {
    switch (selectedSection) {
      case 'basic':
        return renderBasicInfo();
      case 'lifecycle':
        return renderLifecycle();
      case 'health':
        return renderHealthCheck();
      case 'env':
        return renderEnvVars();
      case 'volume':
        return renderVolumeMounts();
      default:
        return null;
    }
  };

  return (
    <div>
      {/* 容器选择 */}
      {containers.length > 1 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <span style={{ marginRight: 8 }}>容器列表：</span>
            {containers.map(container => (
              <Tag
                key={container.name}
                color={container.name === selectedContainer ? 'blue' : 'default'}
                style={{ cursor: 'pointer', marginBottom: 8 }}
                onClick={() => setSelectedContainer(container.name)}
              >
                {container.name}
              </Tag>
            ))}
          </div>
          <Divider />
        </>
      )}

      {/* 左侧菜单和右侧内容 */}
      <Row gutter={16}>
        <Col span={4}>
          <Menu
            mode="inline"
            selectedKeys={[selectedSection]}
            items={menuItems}
            onClick={({ key }) => setSelectedSection(key)}
          />
        </Col>
        <Col span={20}>
          {renderContent()}
        </Col>
      </Row>
    </div>
  );
};

export default ContainerTab;
/** genAI_main_end */

