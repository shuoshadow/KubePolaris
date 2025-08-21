import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Steps,
  Radio,
  message,
  Alert,
  Divider,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { clusterService } from '../../services/clusterService';

const { Step } = Steps;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface ImportFormData {
  name: string;
  description?: string;
  connectionType: 'kubeconfig' | 'token';
  apiServer?: string;
  kubeconfig?: string;
  token?: string;
  caCert?: string;
}

const ClusterImport: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [connectionType, setConnectionType] = useState<'kubeconfig' | 'token'>('kubeconfig');
  const [testResult, setTestResult] = useState<any>(null);

  // 测试连接
  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      setTestLoading(true);
      
      const testData = {
        apiServer: values.apiServer,
        kubeconfig: connectionType === 'kubeconfig' ? values.kubeconfig : undefined,
        token: connectionType === 'token' ? values.token : undefined,
        caCert: connectionType === 'token' ? values.caCert : undefined,
      };

      const response = await clusterService.testConnection(testData);
      setTestResult(response.data);
      message.success('连接测试成功！');
      setCurrentStep(2);
    } catch (error: any) {
      message.error(`连接测试失败: ${error.response?.data?.message || error.message}`);
      setTestResult(null);
    } finally {
      setTestLoading(false);
    }
  };

  // 导入集群
  const handleImport = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const importData = {
        name: values.name,
        description: values.description,
        apiServer: values.apiServer,
        kubeconfig: connectionType === 'kubeconfig' ? values.kubeconfig : undefined,
        token: connectionType === 'token' ? values.token : undefined,
        caCert: connectionType === 'token' ? values.caCert : undefined,
      };

      await clusterService.importCluster(importData);
      message.success('集群导入成功！');
      navigate('/clusters');
    } catch (error: any) {
      message.error(`集群导入失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: '基本信息',
      description: '填写集群基本信息',
    },
    {
      title: '连接配置',
      description: '配置集群连接方式',
    },
    {
      title: '测试连接',
      description: '验证连接配置',
    },
    {
      title: '完成导入',
      description: '确认并导入集群',
    },
  ];

  return (
    <div>
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/clusters')}
            style={{ marginRight: 16 }}
          >
            返回
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <CloudServerOutlined style={{ marginRight: 8 }} />
              导入集群
            </Title>
            <Text type="secondary">将现有的Kubernetes集群导入到管理平台</Text>
          </div>
        </div>
      </div>

      <Card>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={
                index < currentStep ? (
                  <CheckCircleOutlined />
                ) : index === currentStep && (testLoading || loading) ? (
                  <LoadingOutlined />
                ) : undefined
              }
            />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            connectionType: 'kubeconfig',
          }}
        >
          {/* 步骤1: 基本信息 */}
          {currentStep === 0 && (
            <div>
              <Title level={4}>集群基本信息</Title>
              <Form.Item
                name="name"
                label="集群名称"
                rules={[
                  { required: true, message: '请输入集群名称' },
                  { min: 2, max: 50, message: '集群名称长度为2-50个字符' },
                ]}
              >
                <Input placeholder="请输入集群名称，如：production-cluster" />
              </Form.Item>

              <Form.Item name="description" label="集群描述">
                <TextArea
                  rows={3}
                  placeholder="请输入集群描述信息（可选）"
                  maxLength={200}
                />
              </Form.Item>

              <div style={{ textAlign: 'right' }}>
                <Button type="primary" onClick={() => setCurrentStep(1)}>
                  下一步
                </Button>
              </div>
            </div>
          )}

          {/* 步骤2: 连接配置 */}
          {currentStep === 1 && (
            <div>
              <Title level={4}>连接配置</Title>
              <Form.Item name="connectionType" label="连接方式">
                <Radio.Group
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value)}
                >
                  <Radio.Button value="kubeconfig">Kubeconfig文件</Radio.Button>
                  <Radio.Button value="token">Token认证</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {connectionType === 'kubeconfig' && (
                <Form.Item
                  name="kubeconfig"
                  label="Kubeconfig内容"
                  rules={[{ required: true, message: '请输入kubeconfig内容' }]}
                >
                  <TextArea
                    rows={12}
                    placeholder="请粘贴完整的kubeconfig文件内容..."
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              )}

              {connectionType === 'token' && (
                <>
                  <Form.Item
                    name="apiServer"
                    label="API Server地址"
                    rules={[
                      { required: true, message: '请输入API Server地址' },
                      { type: 'url', message: '请输入有效的URL地址' },
                    ]}
                  >
                    <Input placeholder="https://your-cluster-api-server:6443" />
                  </Form.Item>

                  <Form.Item
                    name="token"
                    label="访问令牌"
                    rules={[{ required: true, message: '请输入访问令牌' }]}
                  >
                    <TextArea
                      rows={4}
                      placeholder="请输入ServiceAccount Token或其他访问令牌..."
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>

                  <Form.Item name="caCert" label="CA证书（可选）">
                    <TextArea
                      rows={6}
                      placeholder="请输入CA证书内容（PEM格式），如果集群使用自签名证书则必填..."
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </>
              )}

              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                  <Button type="primary" onClick={handleTestConnection} loading={testLoading}>
                    测试连接
                  </Button>
                </Space>
              </div>
            </div>
          )}

          {/* 步骤3: 测试连接 */}
          {currentStep === 2 && (
            <div>
              <Title level={4}>连接测试结果</Title>
              {testResult && (
                <Alert
                  message="连接测试成功"
                  description={
                    <div>
                      <p><strong>集群版本:</strong> {testResult.version}</p>
                      <p><strong>节点数量:</strong> {testResult.readyNodes}/{testResult.nodeCount}</p>
                      <p><strong>集群状态:</strong> {testResult.status}</p>
                    </div>
                  }
                  type="success"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
              )}

              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setCurrentStep(1)}>重新配置</Button>
                  <Button type="primary" onClick={() => setCurrentStep(3)}>
                    确认导入
                  </Button>
                </Space>
              </div>
            </div>
          )}

          {/* 步骤4: 完成导入 */}
          {currentStep === 3 && (
            <div>
              <Title level={4}>确认导入</Title>
              <Alert
                message="请确认以下信息无误后点击导入"
                type="info"
                style={{ marginBottom: 24 }}
              />

              <div style={{ background: '#fafafa', padding: 16, borderRadius: 6, marginBottom: 24 }}>
                <p><strong>集群名称:</strong> {form.getFieldValue('name')}</p>
                <p><strong>连接方式:</strong> {connectionType === 'kubeconfig' ? 'Kubeconfig文件' : 'Token认证'}</p>
                {connectionType === 'token' && (
                  <p><strong>API Server:</strong> {form.getFieldValue('apiServer')}</p>
                )}
                {testResult && (
                  <>
                    <p><strong>集群版本:</strong> {testResult.version}</p>
                    <p><strong>节点状态:</strong> {testResult.readyNodes}/{testResult.nodeCount} 就绪</p>
                  </>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setCurrentStep(2)}>上一步</Button>
                  <Button type="primary" onClick={handleImport} loading={loading}>
                    导入集群
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default ClusterImport;