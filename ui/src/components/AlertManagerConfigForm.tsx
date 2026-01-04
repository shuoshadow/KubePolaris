import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Space,
  Divider,
  Row,
  Col,
  Modal,
  Alert,
  Typography,
  Switch,
  Descriptions,
  Tag,
  Spin,
} from 'antd';
import {
  SaveOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { alertService } from '../services/alertService';
import type { AlertManagerConfig, AlertManagerStatus } from '../services/alertService';

const { Option } = Select;
const { Text } = Typography;

interface AlertManagerConfigFormProps {
  clusterId: string;
  onConfigChange?: () => void;
}

const AlertManagerConfigForm: React.FC<AlertManagerConfigFormProps> = ({
  clusterId,
  onConfigChange,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [status, setStatus] = useState<AlertManagerStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadCurrentConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await alertService.getConfig(clusterId);
      const config = response.data;
      setEnabled(config.enabled);
      form.setFieldsValue({
        enabled: config.enabled,
        endpoint: config.endpoint,
        auth: config.auth || { type: 'none' },
      });
    } catch (error: unknown) {
      console.error('加载 Alertmanager 配置失败:', error);
      message.error('加载 Alertmanager 配置失败');
    } finally {
      setLoading(false);
    }
  }, [clusterId, form]);

  const loadStatus = useCallback(async () => {
    if (!enabled) return;
    try {
      setStatusLoading(true);
      const response = await alertService.getStatus(clusterId);
      setStatus(response.data);
    } catch (error: unknown) {
      console.error('获取 Alertmanager 状态失败:', error);
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [clusterId, enabled]);

  useEffect(() => {
    loadCurrentConfig();
  }, [loadCurrentConfig]);

  useEffect(() => {
    if (enabled) {
      loadStatus();
    }
  }, [enabled, loadStatus]);

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    form.setFieldValue('enabled', checked);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setSaveResult(null);

      const values = await form.validateFields();
      const config: AlertManagerConfig = {
        enabled: values.enabled,
        endpoint: values.endpoint || '',
        auth: values.auth,
      };

      await alertService.updateConfig(clusterId, config);

      const successMsg = 'Alertmanager 配置保存成功';
      message.success(successMsg);
      setSaveResult({ success: true, message: successMsg });
      onConfigChange?.();
      
      // 如果启用了，重新加载状态
      if (values.enabled) {
        loadStatus();
      }
    } catch (error: unknown) {
      console.error('保存 Alertmanager 配置失败:', error);

      if (error && typeof error === 'object' && 'errorFields' in error) {
        const errorMsg = '请检查表单填写是否正确';
        message.error(errorMsg);
        setSaveResult({ success: false, message: errorMsg });
        return;
      }

      let errorMsg = '保存 Alertmanager 配置失败';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMsg = axiosError.response?.data?.message || errorMsg;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      message.error(errorMsg);
      setSaveResult({ success: false, message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const values = await form.validateFields();

      if (!values.enabled) {
        message.warning('请先启用 Alertmanager');
        setTestResult({ success: false, message: 'Alertmanager 未启用，无法测试连接' });
        return;
      }

      const config: AlertManagerConfig = {
        enabled: values.enabled,
        endpoint: values.endpoint,
        auth: values.auth,
      };

      await alertService.testConnection(clusterId, config);

      const successMsg = '连接测试成功';
      message.success(successMsg);
      setTestResult({ success: true, message: successMsg });
    } catch (error: unknown) {
      console.error('连接测试失败:', error);

      if (error && typeof error === 'object' && 'errorFields' in error) {
        const errorMsg = '请检查表单填写是否正确';
        message.error(errorMsg);
        setTestResult({ success: false, message: errorMsg });
        return;
      }

      let errorMsg = '连接测试失败';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMsg = axiosError.response?.data?.message || errorMsg;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      message.error(errorMsg);
      setTestResult({ success: false, message: errorMsg });
    } finally {
      setTesting(false);
    }
  };

  const renderAuthConfig = () => {
    const authType = form.getFieldValue(['auth', 'type']);

    return (
      <Card title="认证配置" size="small">
        <Form.Item
          name={['auth', 'type']}
          label="认证类型"
          rules={[{ required: enabled, message: '请选择认证类型' }]}
          initialValue="none"
        >
          <Select placeholder="选择认证类型">
            <Option value="none">无需认证</Option>
            <Option value="basic">Basic Auth</Option>
            <Option value="bearer">Bearer Token</Option>
          </Select>
        </Form.Item>

        {authType === 'none' && (
          <Alert
            message="无需认证"
            description="将直接访问 Alertmanager 端点，不进行任何身份验证。"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {authType === 'basic' && (
          <>
            <Form.Item
              name={['auth', 'username']}
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              name={['auth', 'password']}
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          </>
        )}

        {authType === 'bearer' && (
          <Form.Item
            name={['auth', 'token']}
            label="Token"
            rules={[{ required: true, message: '请输入Token' }]}
          >
            <Input.Password placeholder="请输入 Bearer Token" />
          </Form.Item>
        )}
      </Card>
    );
  };

  const renderStatusCard = () => {
    if (!enabled) return null;

    return (
      <Card
        title="Alertmanager 状态"
        size="small"
        style={{ marginTop: 16 }}
        extra={
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={loadStatus}
            loading={statusLoading}
          >
            刷新
          </Button>
        }
      >
        {statusLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : status ? (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="版本">
              {status.versionInfo?.version || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="集群状态">
              <Tag color={status.cluster?.status === 'ready' ? 'green' : 'orange'}>
                {status.cluster?.status || '未知'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="集群名称">
              {status.cluster?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="节点数">
              {status.cluster?.peers?.length || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Go 版本">
              {status.versionInfo?.goVersion || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="构建时间">
              {status.versionInfo?.buildDate || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert
            message="无法获取状态"
            description="请确保 Alertmanager 配置正确且服务可访问。"
            type="warning"
            showIcon
          />
        )}
      </Card>
    );
  };

  return (
    <div>
      <Spin spinning={loading}>
        <Card
          title="Alertmanager 配置"
          extra={
            <Space>
              <Button
                icon={<ExperimentOutlined />}
                onClick={handleTest}
                loading={testing}
                disabled={!enabled}
              >
                测试连接
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
              >
                保存配置
              </Button>
            </Space>
          }
        >
          {/* 测试结果弹窗 */}
          <Modal
            open={testResult !== null}
            title={
              <Space>
                {testResult?.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                )}
                <span>{testResult?.success ? '连接测试成功' : '连接测试失败'}</span>
              </Space>
            }
            onCancel={() => setTestResult(null)}
            footer={[
              <Button key="ok" type="primary" onClick={() => setTestResult(null)}>
                确定
              </Button>,
            ]}
          >
            <p>{testResult?.message}</p>
          </Modal>

          {/* 保存结果弹窗 */}
          <Modal
            open={saveResult !== null}
            title={
              <Space>
                {saveResult?.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                )}
                <span>{saveResult?.success ? '配置保存成功' : '配置保存失败'}</span>
              </Space>
            }
            onCancel={() => setSaveResult(null)}
            footer={[
              <Button key="ok" type="primary" onClick={() => setSaveResult(null)}>
                确定
              </Button>,
            ]}
          >
            <p>{saveResult?.message}</p>
          </Modal>

          <Form form={form} layout="vertical" initialValues={{ enabled: false }}>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="enabled" label="启用 Alertmanager" valuePropName="checked">
                  <Switch
                    checked={enabled}
                    onChange={handleEnabledChange}
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                  />
                </Form.Item>
              </Col>
            </Row>

            {enabled && (
              <>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="endpoint"
                      label="Alertmanager 地址"
                      rules={[
                        { required: enabled, message: '请输入 Alertmanager 地址' },
                        { type: 'url', message: '请输入有效的 URL' },
                      ]}
                    >
                      <Input placeholder="http://alertmanager:9093" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider />
                {renderAuthConfig()}
              </>
            )}
          </Form>
        </Card>

        {renderStatusCard()}

        <Card title="配置说明" style={{ marginTop: 16 }}>
          <Alert
            message="Alertmanager 配置说明"
            description={
              <div>
                <Text strong>端点地址：</Text>
                <ul style={{ marginTop: 8 }}>
                  <li>
                    集群内访问：<Text code>http://alertmanager.monitoring:9093</Text>
                  </li>
                  <li>
                    集群外访问：<Text code>http://alertmanager.example.com:9093</Text>
                  </li>
                </ul>
                <Text strong>认证配置：</Text>
                <ul style={{ marginTop: 8 }}>
                  <li>无需认证：直接访问 Alertmanager</li>
                  <li>Basic Auth：使用用户名和密码认证</li>
                  <li>Bearer Token：使用 Token 认证</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
          />
        </Card>
      </Spin>
    </div>
  );
};

export default AlertManagerConfigForm;

