/** genAI_main_start */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Segmented,
  Spin,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  FormOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { WorkloadService } from '../../services/workloadService';
import WorkloadForm, { type WorkloadFormData } from '../../components/WorkloadForm';
import MonacoEditor from '@monaco-editor/react';
import * as YAML from 'yaml';
import { Form } from 'antd';

const DeploymentCreate: React.FC = () => {
  const navigate = useNavigate();
  const { clusterId } = useParams<{ clusterId: string }>();
  const [searchParams] = useSearchParams();
  const { message: messageApi } = App.useApp();
  
  const workloadType = (searchParams.get('type') || 'Deployment') as 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Rollout' | 'Job' | 'CronJob';
  const editNamespace = searchParams.get('namespace');
  const editName = searchParams.get('name');
  const isEdit = !!(editNamespace && editName);
  
  const [editMode, setEditMode] = useState<'form' | 'yaml'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 表单实例
  const [form] = Form.useForm();
  
  // 表单数据
  const [formData, setFormData] = useState<WorkloadFormData | null>(null);
  
  // YAML 数据
  const [yamlContent, setYamlContent] = useState(getDefaultYaml());
  
  // 命名空间列表
  const [namespaces, setNamespaces] = useState<string[]>(['default']);
  
  // 获取默认YAML
  function getDefaultYaml(): string {
    const defaultData: WorkloadFormData = {
      name: 'example-' + workloadType.toLowerCase(),
      namespace: 'default',
      replicas: workloadType === 'DaemonSet' ? undefined : 1,
      image: 'nginx:latest',
      containerName: 'main',
    };
    return WorkloadService.formDataToYAML(workloadType, defaultData);
  }

  // 加载命名空间列表
  useEffect(() => {
    const loadNamespaces = async () => {
      if (!clusterId) return;
      try {
        const response = await WorkloadService.getWorkloadNamespaces(clusterId, workloadType);
        if (response.code === 200 && response.data) {
          const nsList = response.data.map(ns => ns.name);
          setNamespaces(nsList.length > 0 ? nsList : ['default']);
        }
      } catch (error) {
        console.error('获取命名空间列表失败:', error);
      }
    };
    loadNamespaces();
  }, [clusterId, workloadType]);

  // 如果是编辑模式，加载现有数据
  useEffect(() => {
    const loadWorkload = async () => {
      if (!isEdit || !clusterId || !editNamespace || !editName) return;
      
      setLoading(true);
      try {
        const response = await WorkloadService.getWorkloadDetail(
          clusterId,
          workloadType,
          editNamespace,
          editName
        );
        
        if (response.code === 200 && response.data) {
          const workload = response.data.workload;
          
          // 设置表单数据
          setFormData({
            name: workload.name,
            namespace: workload.namespace,
            replicas: workload.replicas,
            image: workload.images?.[0] || '',
            containerName: 'main',
            labels: workload.labels,
            annotations: workload.annotations,
          });
          
          // 设置YAML数据
          if (response.data.raw) {
            setYamlContent(YAML.stringify(response.data.raw));
          }
        }
      } catch (error) {
        console.error('加载工作负载失败:', error);
        messageApi.error('加载工作负载失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkload();
  }, [isEdit, clusterId, editNamespace, editName, workloadType, messageApi]);

  // 表单转YAML
  const formToYaml = (): string => {
    try {
      const values = form.getFieldsValue();
      
      // 处理labels和annotations
      const labelsObj: Record<string, string> = {};
      if (values.labels && Array.isArray(values.labels)) {
        values.labels.forEach((item: { key: string; value: string }) => {
          if (item.key && item.value) {
            labelsObj[item.key] = item.value;
          }
        });
      }
      
      const annotationsObj: Record<string, string> = {};
      if (values.annotations && Array.isArray(values.annotations)) {
        values.annotations.forEach((item: { key: string; value: string }) => {
          if (item.key && item.value) {
            annotationsObj[item.key] = item.value;
          }
        });
      }
      
      const formData: WorkloadFormData = {
        ...values,
        labels: labelsObj,
        annotations: annotationsObj,
      };
      
      return WorkloadService.formDataToYAML(workloadType, formData);
    } catch (error) {
      console.error('表单数据转换失败:', error);
      messageApi.error('表单数据转换失败');
      return yamlContent;
    }
  };

  // YAML转表单
  const yamlToForm = (yaml: string): boolean => {
    try {
      const obj = YAML.parse(yaml);
      
      // 转换labels为数组格式
      const labels = Object.entries(obj.metadata?.labels || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      
      // 转换annotations为数组格式
      const annotations = Object.entries(obj.metadata?.annotations || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      
      // 转换env为数组格式
      const env = obj.spec?.template?.spec?.containers?.[0]?.env?.map((e: any) => ({
        name: e.name,
        value: e.value,
      })) || [];
      
      const formValues = {
        name: obj.metadata?.name || '',
        namespace: obj.metadata?.namespace || 'default',
        replicas: obj.spec?.replicas,
        image: obj.spec?.template?.spec?.containers?.[0]?.image || '',
        containerName: obj.spec?.template?.spec?.containers?.[0]?.name || 'main',
        containerPort: obj.spec?.template?.spec?.containers?.[0]?.ports?.[0]?.containerPort,
        env,
        resources: obj.spec?.template?.spec?.containers?.[0]?.resources,
        labels,
        annotations,
        // Job/CronJob specific
        schedule: obj.spec?.schedule,
        suspend: obj.spec?.suspend,
        completions: obj.spec?.completions,
        parallelism: obj.spec?.parallelism,
        backoffLimit: obj.spec?.backoffLimit,
        // StatefulSet specific
        serviceName: obj.spec?.serviceName,
      };
      
      form.setFieldsValue(formValues);
      return true;
    } catch (error) {
      messageApi.error('YAML 格式错误: ' + (error instanceof Error ? error.message : '未知错误'));
      return false;
    }
  };

  // 切换编辑模式
  const handleModeChange = (mode: 'form' | 'yaml') => {
    if (mode === editMode) return;

    if (mode === 'yaml') {
      // 表单 -> YAML
      const yaml = formToYaml();
      setYamlContent(yaml);
      setEditMode('yaml');
    } else {
      // YAML -> 表单
      if (yamlToForm(yamlContent)) {
        setEditMode('form');
      }
    }
  };

  // 提交YAML
  const submitYaml = async (yaml: string) => {
    if (!clusterId) return;
    
    setSubmitting(true);
    try {
      const response = await WorkloadService.applyYAML(clusterId, yaml, false);
      
      if (response.code === 200) {
        messageApi.success(isEdit ? '更新成功' : '创建成功');
        navigate(`/clusters/${clusterId}/workloads`);
      } else {
        messageApi.error(response.message || '操作失败');
      }
    } catch (error: any) {
      console.error('提交失败:', error);
      messageApi.error(error.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 提交处理
  const handleSubmit = async () => {
    if (editMode === 'yaml') {
      // YAML模式：直接提交YAML
      await submitYaml(yamlContent);
    } else {
      // 表单模式：验证表单并提交
      try {
        await form.validateFields();
        const yaml = formToYaml();
        await submitYaml(yaml);
      } catch (error) {
        messageApi.error('请检查表单填写是否完整');
      }
    }
  };

  const getTitle = () => {
    const action = isEdit ? '编辑' : '创建';
    const typeMap: Record<string, string> = {
      Deployment: 'Deployment',
      StatefulSet: 'StatefulSet',
      DaemonSet: 'DaemonSet',
      Rollout: 'Argo Rollout',
      Job: 'Job',
      CronJob: 'CronJob',
    };
    return `${action} ${typeMap[workloadType] || workloadType}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 头部 */}
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/clusters/${clusterId}/workloads`)}
              >
                返回
              </Button>
              <h2 style={{ margin: 0 }}>{getTitle()}</h2>
              <Segmented
                value={editMode}
                onChange={(value) => handleModeChange(value as 'form' | 'yaml')}
                options={[
                  {
                    label: '表单模式',
                    value: 'form',
                    icon: <FormOutlined />,
                  },
                  {
                    label: 'YAML模式',
                    value: 'yaml',
                    icon: <CodeOutlined />,
                  },
                ]}
              />
            </Space>
            <Space>
              <Button onClick={() => navigate(`/clusters/${clusterId}/workloads`)}>
                取消
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={submitting}
                onClick={handleSubmit}
              >
                {isEdit ? '更新' : '创建'}
              </Button>
            </Space>
          </Space>
        </Card>

        {/* YAML 编辑模式 */}
        {editMode === 'yaml' ? (
          <Card title="YAML 编辑">
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px' }}>
              <MonacoEditor
                height="600px"
                language="yaml"
                value={yamlContent}
                onChange={(value) => setYamlContent(value || '')}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: 'on',
                  folding: true,
                  bracketPairColorization: { enabled: true },
                }}
                theme="vs-light"
              />
            </div>
          </Card>
        ) : (
          /* 表单编辑模式 */
          <WorkloadForm
            workloadType={workloadType}
            initialData={formData || undefined}
            namespaces={namespaces}
            form={form}
          />
        )}
      </Space>
    </div>
  );
};

export default DeploymentCreate;
/** genAI_main_end */

