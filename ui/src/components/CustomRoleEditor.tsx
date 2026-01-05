import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Select,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Tabs,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CodeOutlined, FormOutlined } from '@ant-design/icons';
import type { PolicyRule } from '../services/rbacService';
import rbacService from '../services/rbacService';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 常用 API Groups
const commonApiGroups = [
  { value: '', label: 'core (空字符串)' },
  { value: 'apps', label: 'apps' },
  { value: 'batch', label: 'batch' },
  { value: 'networking.k8s.io', label: 'networking.k8s.io' },
  { value: 'autoscaling', label: 'autoscaling' },
  { value: 'policy', label: 'policy' },
  { value: 'rbac.authorization.k8s.io', label: 'rbac.authorization.k8s.io' },
  { value: 'argoproj.io', label: 'argoproj.io' },
  { value: '*', label: '* (全部)' },
];

// 常用资源
const commonResources = [
  'pods', 'pods/log', 'pods/exec', 'pods/portforward',
  'deployments', 'deployments/scale',
  'statefulsets', 'statefulsets/scale',
  'daemonsets',
  'replicasets',
  'services',
  'ingresses',
  'configmaps',
  'secrets',
  'jobs',
  'cronjobs',
  'namespaces',
  'nodes',
  'persistentvolumeclaims',
  'persistentvolumes',
  'events',
  '*',
];

// 常用动作
const allVerbs = [
  { value: 'get', label: '查看 (get)' },
  { value: 'list', label: '列表 (list)' },
  { value: 'watch', label: '监听 (watch)' },
  { value: 'create', label: '创建 (create)' },
  { value: 'update', label: '更新 (update)' },
  { value: 'patch', label: '补丁 (patch)' },
  { value: 'delete', label: '删除 (delete)' },
  { value: 'deletecollection', label: '批量删除 (deletecollection)' },
  { value: '*', label: '* (全部)' },
];

interface CustomRoleEditorProps {
  visible: boolean;
  clusterId: number | string;
  clusterName: string;
  onCancel: () => void;
  onSuccess: (roleName: string) => void;
}

const CustomRoleEditor: React.FC<CustomRoleEditorProps> = ({
  visible,
  clusterId,
  clusterName,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<PolicyRule[]>([
    { apiGroups: [''], resources: [], verbs: [] },
  ]);
  const [activeTab, setActiveTab] = useState<'form' | 'yaml'>('form');
  const [yamlContent, setYamlContent] = useState('');

  // 添加规则
  const addRule = () => {
    setRules([...rules, { apiGroups: [''], resources: [], verbs: [] }]);
  };

  // 删除规则
  const removeRule = (index: number) => {
    if (rules.length <= 1) {
      message.warning('至少需要一条规则');
      return;
    }
    setRules(rules.filter((_, i) => i !== index));
  };

  // 更新规则
  const updateRule = (index: number, field: keyof PolicyRule, value: string[]) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  // 生成 YAML
  const generateYaml = () => {
    const name = form.getFieldValue('name') || 'custom-role';
    const yaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ${name}
  labels:
    app.kubernetes.io/managed-by: kubepolaris
rules:
${rules.map(rule => `  - apiGroups: [${rule.apiGroups.map(g => `"${g}"`).join(', ')}]
    resources: [${rule.resources.map(r => `"${r}"`).join(', ')}]
    verbs: [${rule.verbs.map(v => `"${v}"`).join(', ')}]`).join('\n')}`;
    setYamlContent(yaml);
    setActiveTab('yaml');
  };

  // 提交
  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const name = form.getFieldValue('name');

      // 验证规则
      for (const rule of rules) {
        if (rule.resources.length === 0) {
          message.error('每条规则必须指定至少一个资源');
          return;
        }
        if (rule.verbs.length === 0) {
          message.error('每条规则必须指定至少一个动作');
          return;
        }
      }

      setLoading(true);
      const res = await rbacService.createCustomClusterRole(Number(clusterId), name, rules);
      if (res.code === 200) {
        message.success('创建成功');
        onSuccess(name);
        handleClose();
      } else {
        message.error(res.message || '创建失败');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 关闭
  const handleClose = () => {
    form.resetFields();
    setRules([{ apiGroups: [''], resources: [], verbs: [] }]);
    setYamlContent('');
    setActiveTab('form');
    onCancel();
  };

  return (
    <Modal
      title={`创建自定义 ClusterRole - ${clusterName}`}
      open={visible}
      onCancel={handleClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button key="yaml" icon={<CodeOutlined />} onClick={generateYaml}>
          预览 YAML
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          创建
        </Button>,
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'form' | 'yaml')}
        items={[
          {
            key: 'form',
            label: (
              <span>
                <FormOutlined /> 表单编辑
              </span>
            ),
            children: (
              <div>
                <Form form={form} layout="vertical">
                  <Form.Item
                    name="name"
                    label="ClusterRole 名称"
                    rules={[
                      { required: true, message: '请输入名称' },
                      { pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/, message: '名称只能包含小写字母、数字和连字符' },
                    ]}
                  >
                    <Input placeholder="例如: custom-developer-role" />
                  </Form.Item>
                </Form>

                <Divider orientation="left">权限规则</Divider>
                <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  定义此 ClusterRole 可以访问的资源和操作。每条规则指定一组 API Groups、Resources 和允许的 Verbs。
                </Paragraph>

                {rules.map((rule, index) => (
                  <Card
                    key={index}
                    size="small"
                    style={{ marginBottom: 16 }}
                    title={`规则 ${index + 1}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeRule(index)}
                        disabled={rules.length <= 1}
                      />
                    }
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Text strong>API Groups</Text>
                        <Select
                          mode="tags"
                          style={{ width: '100%', marginTop: 8 }}
                          placeholder="选择或输入 API Group"
                          value={rule.apiGroups}
                          onChange={(value) => updateRule(index, 'apiGroups', value)}
                        >
                          {commonApiGroups.map((g) => (
                            <Option key={g.value} value={g.value}>
                              {g.label}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                      <Col span={8}>
                        <Text strong>Resources</Text>
                        <Select
                          mode="tags"
                          style={{ width: '100%', marginTop: 8 }}
                          placeholder="选择或输入资源"
                          value={rule.resources}
                          onChange={(value) => updateRule(index, 'resources', value)}
                        >
                          {commonResources.map((r) => (
                            <Option key={r} value={r}>
                              {r}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                      <Col span={8}>
                        <Text strong>Verbs (操作)</Text>
                        <Select
                          mode="multiple"
                          style={{ width: '100%', marginTop: 8 }}
                          placeholder="选择操作"
                          value={rule.verbs}
                          onChange={(value) => updateRule(index, 'verbs', value)}
                        >
                          {allVerbs.map((v) => (
                            <Option key={v.value} value={v.value}>
                              {v.label}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={addRule}
                >
                  添加规则
                </Button>
              </div>
            ),
          },
          {
            key: 'yaml',
            label: (
              <span>
                <CodeOutlined /> YAML 预览
              </span>
            ),
            children: (
              <TextArea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                rows={20}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                placeholder="点击 '预览 YAML' 按钮生成"
              />
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default CustomRoleEditor;

