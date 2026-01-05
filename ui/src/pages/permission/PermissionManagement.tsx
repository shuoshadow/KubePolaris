import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Tooltip,
  Popconfirm,
  Typography,
  Row,
  Col,
  Checkbox,
  Divider,
  Badge,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ReloadOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  ClusterPermission,
  PermissionTypeInfo,
  User,
  UserGroup,
  Cluster,
  PermissionType,
} from '../../types';
import permissionService, {
  getPermissionTypeName,
  getPermissionTypeColor,
  formatNamespaces,
  requiresAllNamespaces,
  allowsPartialNamespaces,
} from '../../services/permissionService';
import { clusterService } from '../../services/clusterService';
import rbacService from '../../services/rbacService';
import type { SyncStatusResult } from '../../services/rbacService';
import CustomRoleEditor from '../../components/CustomRoleEditor';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 默认权限类型定义（API未返回时使用）
const defaultPermissionTypes: PermissionTypeInfo[] = [
  {
    type: 'admin',
    name: '管理员权限',
    description: '对全部命名空间下所有资源的读写权限（必须选择全部命名空间）。',
    resources: ['*'],
    actions: ['*'],
    allowPartialNamespaces: false,
    requireAllNamespaces: true,
  },
  {
    type: 'ops',
    name: '运维权限',
    description: '对全部命名空间下大多数资源的读写权限（必须选择全部命名空间）。',
    resources: ['pods', 'deployments', 'services'],
    actions: ['get', 'list', 'watch', 'create', 'update', 'delete'],
    allowPartialNamespaces: false,
    requireAllNamespaces: true,
  },
  {
    type: 'dev',
    name: '开发权限',
    description: '对所选命名空间下大多数资源的读写权限（可选择部分命名空间）。',
    resources: ['pods', 'deployments', 'services'],
    actions: ['get', 'list', 'watch', 'create', 'update', 'delete'],
    allowPartialNamespaces: true,
    requireAllNamespaces: false,
  },
  {
    type: 'readonly',
    name: '只读权限',
    description: '对所选命名空间下大多数资源的只读权限（可选择部分命名空间）。',
    resources: ['*'],
    actions: ['get', 'list', 'watch'],
    allowPartialNamespaces: true,
    requireAllNamespaces: false,
  },
  {
    type: 'custom',
    name: '自定义权限',
    description: '权限由您所选择的ClusterRole或Role决定。',
    resources: [],
    actions: [],
    allowPartialNamespaces: true,
    requireAllNamespaces: false,
  },
];

// 权限类型卡片组件
const PermissionTypeCard: React.FC<{
  type: PermissionTypeInfo;
  selected: boolean;
  onClick: () => void;
}> = ({ type, selected, onClick }) => {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderColor: selected ? '#1890ff' : undefined,
        backgroundColor: selected ? '#e6f7ff' : undefined,
        height: '100%',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Title level={5} style={{ marginBottom: 8 }}>
        {type.name}
      </Title>
      <Paragraph
        type="secondary"
        style={{ marginBottom: 0, fontSize: 12, minHeight: 40 }}
        ellipsis={{ rows: 2, tooltip: type.description }}
      >
        {type.description}
      </Paragraph>
    </Card>
  );
};

const PermissionManagement: React.FC = () => {
  // 状态
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<ClusterPermission[]>([]);
  const [permissionTypes, setPermissionTypes] = useState<PermissionTypeInfo[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 筛选状态
  const [filterCluster, setFilterCluster] = useState<string>('');
  const [filterNamespace, setFilterNamespace] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<ClusterPermission | null>(null);
  const [form] = Form.useForm();

  // 表单状态
  const [selectedPermissionType, setSelectedPermissionType] = useState<PermissionType>('admin');
  const [assignType, setAssignType] = useState<'user' | 'group'>('user');
  const [allNamespaces, setAllNamespaces] = useState(true);

  // 同步权限状态
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatusResult>>({});
  const [selectedClusterForSync, setSelectedClusterForSync] = useState<string | null>(null);

  // 自定义角色编辑器状态
  const [customRoleEditorVisible, setCustomRoleEditorVisible] = useState(false);
  const [customRoleClusterId, setCustomRoleClusterId] = useState<string>('0');
  const [customRoleClusterName, setCustomRoleClusterName] = useState<string>('');

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [permissionsRes, typesRes, clustersRes, usersRes, groupsRes] = await Promise.all([
        permissionService.getAllClusterPermissions(),
        permissionService.getPermissionTypes(),
        clusterService.getClusters(),
        permissionService.getUsers(),
        permissionService.getUserGroups(),
      ]);

      setPermissions(permissionsRes.data || []);
      setPermissionTypes(typesRes.data || []);
      setClusters(clustersRes.data?.items || []);
      setUsers(usersRes.data || []);
      setUserGroups(groupsRes.data || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 过滤后的数据
  const filteredPermissions = permissions.filter((p) => {
    if (filterCluster && p.cluster_id.toString() !== filterCluster) return false;
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const username = p.username?.toLowerCase() || '';
      const groupName = p.user_group_name?.toLowerCase() || '';
      if (!username.includes(keyword) && !groupName.includes(keyword)) return false;
    }
    return true;
  });

  // 打开添加权限弹窗
  const handleAdd = () => {
    setEditingPermission(null);
    setSelectedPermissionType('admin');
    setAssignType('user');
    setAllNamespaces(true);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开同步权限弹窗
  const handleOpenSyncModal = () => {
    setSyncModalVisible(true);
    // 加载所有集群的同步状态
    loadAllSyncStatus();
  };

  // 加载所有集群的同步状态
  const loadAllSyncStatus = async () => {
    const statusMap: Record<string, SyncStatusResult> = {};
    for (const cluster of clusters) {
      try {
        const res = await rbacService.getSyncStatus(Number(cluster.id));
        if (res.code === 200 && res.data) {
          statusMap[cluster.id] = res.data;
        }
      } catch (err) {
        console.error(`获取集群 ${cluster.name} 同步状态失败:`, err);
      }
    }
    setSyncStatus(statusMap);
  };

  // 同步权限到集群
  const handleSyncPermissions = async (clusterId: string) => {
    setSelectedClusterForSync(clusterId);
    setSyncLoading(true);
    try {
      const res = await rbacService.syncPermissions(Number(clusterId));
      if (res.code === 200) {
        message.success(res.data?.message || '同步成功');
        // 刷新该集群的同步状态
        const statusRes = await rbacService.getSyncStatus(Number(clusterId));
        if (statusRes.code === 200 && statusRes.data) {
          setSyncStatus(prev => ({ ...prev, [clusterId]: statusRes.data! }));
        }
      } else {
        message.error(res.message || '同步失败');
      }
    } catch (err) {
      message.error('同步失败');
    } finally {
      setSyncLoading(false);
      setSelectedClusterForSync(null);
    }
  };

  // 打开编辑权限弹窗
  const handleEdit = (record: ClusterPermission) => {
    setEditingPermission(record);
    setSelectedPermissionType(record.permission_type);
    setAssignType(record.user_id ? 'user' : 'group');
    setAllNamespaces(record.namespaces.includes('*'));
    form.setFieldsValue({
      cluster_id: record.cluster_id,
      user_id: record.user_id,
      user_group_id: record.user_group_id,
      permission_type: record.permission_type,
      namespaces: record.namespaces.filter((n) => n !== '*'),
      custom_role_ref: record.custom_role_ref,
    });
    setModalVisible(true);
  };

  // 删除权限
  const handleDelete = async (id: number) => {
    try {
      await permissionService.deleteClusterPermission(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的权限');
      return;
    }
    try {
      await permissionService.batchDeleteClusterPermissions(selectedRowKeys as number[]);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      loadData();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const data = {
        cluster_id: values.cluster_id,
        permission_type: selectedPermissionType,
        namespaces: allNamespaces ? ['*'] : (values.namespaces || []),
        custom_role_ref: selectedPermissionType === 'custom' ? values.custom_role_ref : undefined,
        user_id: assignType === 'user' ? values.user_id : undefined,
        user_group_id: assignType === 'group' ? values.user_group_id : undefined,
      };

      if (editingPermission) {
        await permissionService.updateClusterPermission(editingPermission.id, {
          permission_type: data.permission_type,
          namespaces: data.namespaces,
          custom_role_ref: data.custom_role_ref,
        });
        message.success('更新成功');
      } else {
        await permissionService.createClusterPermission(data);
        message.success('添加成功');
      }

      setModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<ClusterPermission> = [
    {
      title: '用户/用户组',
      key: 'subject',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.user_id ? (
            <>
              <Tag color="blue" icon={<UserOutlined />}>用户</Tag>
              <Text>{record.username}</Text>
            </>
          ) : (
            <>
              <Tag color="green" icon={<TeamOutlined />}>用户组</Tag>
              <Text>{record.user_group_name}</Text>
            </>
          )}
        </Space>
      ),
    },
    {
      title: '集群名称',
      dataIndex: 'cluster_name',
      key: 'cluster_name',
      width: 150,
      render: (clusterName: string, record) => {
        // 如果没有cluster_name，尝试从clusters列表中查找
        const name = clusterName || clusters.find(c => parseInt(c.id) === record.cluster_id)?.name || '-';
        return <Text>{name}</Text>;
      },
    },
    {
      title: '权限类型',
      dataIndex: 'permission_type',
      key: 'permission_type',
      width: 150,
      render: (type: string) => (
        <Tag color={getPermissionTypeColor(type)}>
          {getPermissionTypeName(type)}
        </Tag>
      ),
    },
    {
      title: '命名空间',
      dataIndex: 'namespaces',
      key: 'namespaces',
      width: 200,
      render: (namespaces: string[]) => (
        <Text type={namespaces.includes('*') ? 'success' : undefined}>
          {formatNamespaces(namespaces)}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑权限">
            <Button
              type="link"
              size="small"
              onClick={() => handleEdit(record)}
            >
              编辑权限
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除该权限配置吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>权限管理</Title>
          <Tooltip title="配置用户/用户组在集群中的访问权限">
            <QuestionCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
        <Space>
          <Button icon={<SyncOutlined />} onClick={handleOpenSyncModal}>
            同步权限
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加权限
          </Button>
        </Space>
      </div>

      {/* 权限类型说明卡片 - CCE风格 */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: '20px 24px' }}>
        <Row gutter={24}>
          {(permissionTypes.length > 0 ? permissionTypes : defaultPermissionTypes).map((type, index, arr) => (
            <Col 
              flex="1"
              key={type.type}
              style={{
                borderRight: index < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
                paddingRight: index < arr.length - 1 ? 16 : 0,
                paddingLeft: index > 0 ? 16 : 0,
              }}
            >
              <Title level={5} style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                {type.name}
              </Title>
              <Paragraph
                type="secondary"
                style={{ marginBottom: 0, fontSize: 12, lineHeight: 1.8, color: '#6b7280' }}
              >
                {type.description}
              </Paragraph>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space size="large" wrap>
          <Space>
            <Popconfirm
              title="确定批量删除选中的权限吗？"
              onConfirm={handleBatchDelete}
              disabled={selectedRowKeys.length === 0}
            >
              <Button
                disabled={selectedRowKeys.length === 0}
              >
                批量删除
              </Button>
            </Popconfirm>
          </Space>
          <Divider type="vertical" style={{ height: 24 }} />
          <Space>
            <Select
              placeholder="选择集群"
              allowClear
              style={{ width: 200 }}
              value={filterCluster || undefined}
              onChange={(v) => setFilterCluster(v || '')}
            >
              {clusters.map((c) => (
                <Option key={c.id} value={c.id.toString()}>
                  {c.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="命名空间"
              allowClear
              style={{ width: 120 }}
              value={filterNamespace || undefined}
              onChange={(v) => setFilterNamespace(v || '')}
            >
              <Option value="*">全部</Option>
            </Select>
            <Input.Search
              placeholder="请输入关键词"
              allowClear
              style={{ width: 200 }}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              enterButton={<SearchOutlined />}
            />
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 权限列表表格 */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredPermissions}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 添加/编辑权限弹窗 */}
      <Modal
        title={editingPermission ? '编辑权限' : '添加权限'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={720}
        destroyOnClose
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              permission_type: 'admin',
            }}
          >
            {/* 选择集群 */}
            <Form.Item
              name="cluster_id"
              label="选择集群"
              rules={[{ required: true, message: '请选择集群' }]}
            >
              <Select
                placeholder="请选择集群"
                disabled={!!editingPermission}
                showSearch
                optionFilterProp="children"
              >
                {clusters.map((c) => (
                  <Option key={c.id} value={parseInt(c.id)}>
                    <Space>
                      {c.name}
                      {c.status === 'healthy' ? (
                        <Badge status="success" />
                      ) : (
                        <Badge status="error" />
                      )}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* 权限类型选择 */}
            <Form.Item label="权限类型" required>
              <Row gutter={12}>
                {permissionTypes.map((type) => (
                  <Col span={Math.floor(24 / Math.max(permissionTypes.length, 1))} key={type.type}>
                    <PermissionTypeCard
                      type={type}
                      selected={selectedPermissionType === type.type}
                      onClick={() => {
                        setSelectedPermissionType(type.type as PermissionType);
                        // 如果权限类型要求全部命名空间，自动设置
                        if (requiresAllNamespaces(type.type)) {
                          setAllNamespaces(true);
                        }
                      }}
                    />
                  </Col>
                ))}
              </Row>
            </Form.Item>

            {/* 自定义权限时显示角色选择 */}
            {selectedPermissionType === 'custom' && (
              <Form.Item
                name="custom_role_ref"
                label="ClusterRole/Role 名称"
                rules={[{ required: true, message: '请输入角色名称' }]}
                extra={
                  <Space style={{ marginTop: 8 }}>
                    <Text type="secondary">没有合适的角色？</Text>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() => {
                        const clusterId = form.getFieldValue('cluster_id');
                        if (!clusterId) {
                          message.warning('请先选择集群');
                          return;
                        }
                        const cluster = clusters.find(c => c.id === clusterId);
                        setCustomRoleClusterId(clusterId);
                        setCustomRoleClusterName(cluster?.name || '');
                        setCustomRoleEditorVisible(true);
                      }}
                    >
                      立即创建新的 ClusterRole
                    </Button>
                  </Space>
                }
              >
                <Input placeholder="例如: view, edit, cluster-admin 或自定义创建的角色名" />
              </Form.Item>
            )}

            {/* 分配对象 */}
            {!editingPermission && (
              <>
                <Form.Item label="分配给">
                  <Space>
                    <Button
                      type={assignType === 'user' ? 'primary' : 'default'}
                      icon={<UserOutlined />}
                      onClick={() => setAssignType('user')}
                    >
                      用户
                    </Button>
                    <Button
                      type={assignType === 'group' ? 'primary' : 'default'}
                      icon={<TeamOutlined />}
                      onClick={() => setAssignType('group')}
                    >
                      用户组
                    </Button>
                  </Space>
                </Form.Item>

                {assignType === 'user' ? (
                  <Form.Item
                    name="user_id"
                    label="选择用户"
                    rules={[{ required: true, message: '请选择用户' }]}
                  >
                    <Select
                      placeholder="请选择用户"
                      showSearch
                      optionFilterProp="children"
                    >
                      {users.map((u) => (
                        <Option key={u.id} value={u.id}>
                          <Space>
                            <UserOutlined />
                            {u.display_name || u.username}
                            <Text type="secondary">({u.username})</Text>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="user_group_id"
                    label="选择用户组"
                    rules={[{ required: true, message: '请选择用户组' }]}
                  >
                    <Select
                      placeholder="请选择用户组"
                      showSearch
                      optionFilterProp="children"
                    >
                      {userGroups.map((g) => (
                        <Option key={g.id} value={g.id}>
                          <Space>
                            <TeamOutlined />
                            {g.name}
                            <Text type="secondary">({g.users?.length || 0} 人)</Text>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </>
            )}

            {/* 命名空间范围 */}
            <Form.Item 
              label="命名空间范围"
              extra={requiresAllNamespaces(selectedPermissionType) 
                ? <Text type="warning">此权限类型必须选择全部命名空间</Text> 
                : null}
            >
              <Checkbox
                checked={allNamespaces}
                onChange={(e) => setAllNamespaces(e.target.checked)}
                disabled={requiresAllNamespaces(selectedPermissionType)}
              >
                全部命名空间
              </Checkbox>
            </Form.Item>

            {!allNamespaces && allowsPartialNamespaces(selectedPermissionType) && (
              <Form.Item
                name="namespaces"
                label="选择命名空间"
                rules={[{ required: true, message: '请选择命名空间' }]}
              >
                <Select
                  mode="tags"
                  placeholder="输入命名空间名称（支持通配符，如 app-*）"
                  tokenSeparators={[',']}
                >
                  <Option value="default">default</Option>
                  <Option value="kube-system">kube-system</Option>
                  <Option value="kube-public">kube-public</Option>
                </Select>
              </Form.Item>
            )}
          </Form>
        </Spin>
      </Modal>

      {/* 同步权限弹窗 */}
      <Modal
        title="同步 KubePolaris 权限资源"
        open={syncModalVisible}
        onCancel={() => setSyncModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Paragraph type="secondary">
            同步将在目标集群中创建 KubePolaris 所需的 RBAC 资源（ClusterRole、ServiceAccount、ClusterRoleBinding），
            以支持不同权限类型的 kubectl 终端访问。
          </Paragraph>
        </div>
        <Table
          rowKey="id"
          dataSource={clusters}
          pagination={false}
          columns={[
            {
              title: '集群名称',
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: 'API Server',
              dataIndex: 'api_server',
              key: 'api_server',
              ellipsis: true,
            },
            {
              title: '同步状态',
              key: 'status',
              width: 120,
              render: (_, record) => {
                const status = syncStatus[record.id];
                if (!status) {
                  return <Tag>未检查</Tag>;
                }
                return status.synced ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">已同步</Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="warning">未同步</Tag>
                );
              },
            },
            {
              title: '操作',
              key: 'action',
              width: 120,
              render: (_, record) => (
                <Button
                  type="primary"
                  size="small"
                  icon={<SyncOutlined spin={syncLoading && selectedClusterForSync === record.id} />}
                  loading={syncLoading && selectedClusterForSync === record.id}
                  onClick={() => handleSyncPermissions(record.id)}
                >
                  {syncStatus[record.id]?.synced ? '重新同步' : '同步'}
                </Button>
              ),
            },
          ]}
        />
        <div style={{ marginTop: 16 }}>
          <Title level={5}>将创建的资源：</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small" title="ClusterRole" bodyStyle={{ padding: 12 }}>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>kubepolaris-cluster-admin</li>
                  <li>kubepolaris-ops</li>
                  <li>kubepolaris-dev</li>
                  <li>kubepolaris-readonly</li>
                </ul>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="ServiceAccount" bodyStyle={{ padding: 12 }}>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>kubepolaris-admin-sa</li>
                  <li>kubepolaris-ops-sa</li>
                  <li>kubepolaris-dev-sa</li>
                  <li>kubepolaris-readonly-sa</li>
                </ul>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="ClusterRoleBinding" bodyStyle={{ padding: 12 }}>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>kubepolaris-admin-binding</li>
                  <li>kubepolaris-ops-binding</li>
                </ul>
              </Card>
            </Col>
          </Row>
        </div>
      </Modal>

      {/* 自定义角色编辑器 */}
      <CustomRoleEditor
        visible={customRoleEditorVisible}
        clusterId={customRoleClusterId}
        clusterName={customRoleClusterName}
        onCancel={() => setCustomRoleEditorVisible(false)}
        onSuccess={(roleName) => {
          form.setFieldValue('custom_role_ref', roleName);
          setCustomRoleEditorVisible(false);
        }}
      />
    </div>
  );
};

export default PermissionManagement;

