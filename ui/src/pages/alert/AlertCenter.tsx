import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Tabs,
  Modal,
  Form,
  DatePicker,
  message,
  Tooltip,
  Badge,
  Typography,
  Empty,
  Spin,
  Alert as AntAlert,
  Descriptions,
  Popconfirm,
} from 'antd';
import {
  AlertOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  FireOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { alertService } from '../../services/alertService';
import type {
  Alert,
  Silence,
  AlertStats,
  CreateSilenceRequest,
  Matcher,
} from '../../services/alertService';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const AlertCenter: React.FC = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();

  // 状态
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [silences, setSilences] = useState<Silence[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [searchText, setSearchText] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [silenceModalVisible, setSilenceModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [silenceForm] = Form.useForm();
  const [configEnabled, setConfigEnabled] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  // 加载配置状态
  const loadConfig = useCallback(async () => {
    if (!clusterId) return;
    try {
      setConfigLoading(true);
      const response = await alertService.getConfig(clusterId);
      setConfigEnabled(response.data?.enabled || false);
    } catch (error) {
      console.error('加载配置失败:', error);
      setConfigEnabled(false);
    } finally {
      setConfigLoading(false);
    }
  }, [clusterId]);

  // 加载告警数据
  const loadAlerts = useCallback(async () => {
    if (!clusterId || !configEnabled) return;
    try {
      setLoading(true);
      const [alertsRes, statsRes] = await Promise.all([
        alertService.getAlerts(clusterId, {
          severity: severityFilter || undefined,
        }),
        alertService.getAlertStats(clusterId),
      ]);
      setAlerts(alertsRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('加载告警失败:', error);
      message.error('加载告警失败');
    } finally {
      setLoading(false);
    }
  }, [clusterId, configEnabled, severityFilter]);

  // 加载静默规则
  const loadSilences = useCallback(async () => {
    if (!clusterId || !configEnabled) return;
    try {
      const response = await alertService.getSilences(clusterId);
      setSilences(response.data || []);
    } catch (error) {
      console.error('加载静默规则失败:', error);
    }
  }, [clusterId, configEnabled]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (configEnabled) {
      loadAlerts();
      loadSilences();
    }
  }, [configEnabled, loadAlerts, loadSilences]);

  // 刷新数据
  const handleRefresh = () => {
    loadAlerts();
    loadSilences();
  };

  // 打开静默弹窗
  const handleOpenSilenceModal = (alert?: Alert) => {
    setSelectedAlert(alert || null);
    if (alert) {
      // 预填充告警的标签作为匹配器
      const matchers: Matcher[] = Object.entries(alert.labels).map(([name, value]) => ({
        name,
        value,
        isRegex: false,
        isEqual: true,
      }));
      silenceForm.setFieldsValue({
        matchers,
        timeRange: [dayjs(), dayjs().add(2, 'hour')],
        comment: `静默告警: ${alert.labels.alertname || '未知'}`,
      });
    } else {
      silenceForm.resetFields();
      silenceForm.setFieldsValue({
        timeRange: [dayjs(), dayjs().add(2, 'hour')],
      });
    }
    setSilenceModalVisible(true);
  };

  // 创建静默规则
  const handleCreateSilence = async () => {
    try {
      const values = await silenceForm.validateFields();
      const [startsAt, endsAt] = values.timeRange;

      const silenceReq: CreateSilenceRequest = {
        matchers: values.matchers || [],
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        createdBy: 'KubePolaris',
        comment: values.comment || '',
      };

      await alertService.createSilence(clusterId!, silenceReq);
      message.success('静默规则创建成功');
      setSilenceModalVisible(false);
      loadSilences();
      loadAlerts();
    } catch (error: unknown) {
      console.error('创建静默规则失败:', error);
      let errorMsg = '创建静默规则失败';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMsg = axiosError.response?.data?.message || errorMsg;
      }
      message.error(errorMsg);
    }
  };

  // 删除静默规则
  const handleDeleteSilence = async (silenceId: string) => {
    try {
      await alertService.deleteSilence(clusterId!, silenceId);
      message.success('静默规则删除成功');
      loadSilences();
      loadAlerts();
    } catch (error: unknown) {
      console.error('删除静默规则失败:', error);
      message.error('删除静默规则失败');
    }
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'blue';
      default:
        return 'default';
    }
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <FireOutlined />;
      case 'warning':
        return <WarningOutlined />;
      case 'info':
        return <InfoCircleOutlined />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'active':
        return 'red';
      case 'suppressed':
        return 'orange';
      case 'resolved':
        return 'green';
      default:
        return 'default';
    }
  };

  // 过滤告警
  const filteredAlerts = alerts.filter((alert) => {
    const matchSearch =
      !searchText ||
      alert.labels.alertname?.toLowerCase().includes(searchText.toLowerCase()) ||
      alert.annotations?.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      alert.annotations?.summary?.toLowerCase().includes(searchText.toLowerCase());

    const matchStatus = !statusFilter || alert.status.state === statusFilter;

    return matchSearch && matchStatus;
  });

  // 告警表格列
  const alertColumns: ColumnsType<Alert> = [
    {
      title: '告警名称',
      key: 'alertname',
      width: 200,
      render: (_, record) => (
        <Space>
          {getSeverityIcon(record.labels.severity)}
          <Text strong>{record.labels.alertname || '未知告警'}</Text>
        </Space>
      ),
    },
    {
      title: '严重程度',
      key: 'severity',
      width: 100,
      render: (_, record) => (
        <Tag color={getSeverityColor(record.labels.severity)}>
          {record.labels.severity?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Badge
          status={record.status.state === 'active' ? 'error' : 'warning'}
          text={
            <Tag color={getStatusColor(record.status.state)}>
              {record.status.state === 'active'
                ? '触发中'
                : record.status.state === 'suppressed'
                ? '已静默'
                : '已恢复'}
            </Tag>
          }
        />
      ),
    },
    {
      title: '描述',
      key: 'description',
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.annotations?.description || record.annotations?.summary}>
          <Text ellipsis style={{ maxWidth: 300 }}>
            {record.annotations?.summary || record.annotations?.description || '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '触发时间',
      key: 'startsAt',
      width: 180,
      render: (_, record) => (
        <Tooltip title={dayjs(record.startsAt).format('YYYY-MM-DD HH:mm:ss')}>
          <Space>
            <ClockCircleOutlined />
            <Text>{dayjs(record.startsAt).fromNow()}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="创建静默">
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleOpenSilenceModal(record)}
              disabled={record.status.state === 'suppressed'}
            />
          </Tooltip>
          {record.generatorURL && (
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                icon={<SearchOutlined />}
                onClick={() => window.open(record.generatorURL, '_blank')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // 静默规则表格列
  const silenceColumns: ColumnsType<Silence> = [
    {
      title: '匹配规则',
      key: 'matchers',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.matchers.map((matcher, index) => (
            <Tag key={index}>
              {matcher.name}
              {matcher.isEqual ? '=' : '!='}
              {matcher.isRegex ? '~' : ''}
              {matcher.value}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag
          color={
            record.status.state === 'active'
              ? 'green'
              : record.status.state === 'pending'
              ? 'orange'
              : 'default'
          }
        >
          {record.status.state === 'active'
            ? '生效中'
            : record.status.state === 'pending'
            ? '等待中'
            : '已过期'}
        </Tag>
      ),
    },
    {
      title: '生效时间',
      key: 'startsAt',
      width: 180,
      render: (_, record) => dayjs(record.startsAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结束时间',
      key: 'endsAt',
      width: 180,
      render: (_, record) => dayjs(record.endsAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '创建者',
      key: 'createdBy',
      width: 120,
      render: (_, record) => record.createdBy || '-',
    },
    {
      title: '备注',
      key: 'comment',
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.comment}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {record.comment || '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确定要删除此静默规则吗？"
          onConfirm={() => handleDeleteSilence(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // 统计卡片
  const renderStatsCards = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={6}>
        <Card hoverable>
          <Statistic
            title="总告警数"
            value={stats?.total || 0}
            prefix={<AlertOutlined style={{ color: '#1890ff' }} />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card hoverable>
          <Statistic
            title="触发中"
            value={stats?.firing || 0}
            prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card hoverable>
          <Statistic
            title="已静默"
            value={stats?.suppressed || 0}
            prefix={<StopOutlined style={{ color: '#faad14' }} />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card hoverable>
          <Statistic
            title="严重告警"
            value={stats?.bySeverity?.critical || 0}
            prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
    </Row>
  );

  // 告警列表 Tab
  const AlertsTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space>
            <Search
              placeholder="搜索告警名称或描述"
              allowClear
              style={{ width: 300 }}
              onSearch={(value) => setSearchText(value)}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              placeholder="严重程度"
              allowClear
              style={{ width: 120 }}
              value={severityFilter || undefined}
              onChange={(value) => setSeverityFilter(value || '')}
            >
              <Option value="critical">Critical</Option>
              <Option value="warning">Warning</Option>
              <Option value="info">Info</Option>
            </Select>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              value={statusFilter || undefined}
              onChange={(value) => setStatusFilter(value || '')}
            >
              <Option value="active">触发中</Option>
              <Option value="suppressed">已静默</Option>
            </Select>
          </Space>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Col>
      </Row>

      <Table
        columns={alertColumns}
        dataSource={filteredAlerts}
        rowKey="fingerprint"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条告警`,
        }}
        expandable={{
          expandedRowRender: (record) => (
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="实例">
                {record.labels.instance || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Job">
                {record.labels.job || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="命名空间">
                {record.labels.namespace || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Pod">
                {record.labels.pod || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="详细描述" span={2}>
                {record.annotations?.description || '-'}
              </Descriptions.Item>
              {record.status.silencedBy?.length > 0 && (
                <Descriptions.Item label="静默规则" span={2}>
                  {record.status.silencedBy.join(', ')}
                </Descriptions.Item>
              )}
            </Descriptions>
          ),
        }}
      />
    </div>
  );

  // 静默规则 Tab
  const SilencesTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Text type="secondary">
            静默规则用于临时抑制特定告警的通知。
          </Text>
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenSilenceModal()}
            >
              创建静默规则
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadSilences}>
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        columns={silenceColumns}
        dataSource={silences.filter((s) => s.status.state !== 'expired')}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条规则`,
        }}
      />
    </div>
  );

  // Tab 配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'alerts',
      label: (
        <span>
          <AlertOutlined />
          告警列表
          {stats && stats.firing > 0 && (
            <Badge count={stats.firing} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: <AlertsTab />,
    },
    {
      key: 'silences',
      label: (
        <span>
          <StopOutlined />
          静默规则
          {silences.filter((s) => s.status.state === 'active').length > 0 && (
            <Badge
              count={silences.filter((s) => s.status.state === 'active').length}
              style={{ marginLeft: 8, backgroundColor: '#faad14' }}
            />
          )}
        </span>
      ),
      children: <SilencesTab />,
    },
  ];

  // 未配置 Alertmanager
  if (configLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!configEnabled) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text>Alertmanager 未配置</Text>
                <Text type="secondary">请先在配置中心配置 Alertmanager 地址</Text>
              </Space>
            }
          >
            <Space>
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => navigate(`/clusters/${clusterId}/config-center?tab=alertmanager`)}
              >
                前往配置
              </Button>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                返回
              </Button>
            </Space>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <AlertOutlined />
            <Title level={4} style={{ margin: 0 }}>
              告警中心
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate(`/clusters/${clusterId}/config-center?tab=alertmanager`)}
            >
              配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        }
      >
        {renderStatsCards()}

        <Tabs defaultActiveKey="alerts" items={tabItems} />
      </Card>

      {/* 创建静默规则弹窗 */}
      <Modal
        title="创建静默规则"
        open={silenceModalVisible}
        onOk={handleCreateSilence}
        onCancel={() => setSilenceModalVisible(false)}
        width={600}
        okText="创建"
        cancelText="取消"
      >
        <Form form={silenceForm} layout="vertical">
          <Form.Item
            label="生效时间"
            name="timeRange"
            rules={[{ required: true, message: '请选择生效时间' }]}
          >
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="匹配规则" required>
            <AntAlert
              message="匹配规则说明"
              description="静默规则会匹配所有满足以下条件的告警。至少需要一条匹配规则。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form.List name="matchers">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: 'flex', marginBottom: 8 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '请输入标签名' }]}
                      >
                        <Input placeholder="标签名" style={{ width: 120 }} />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'isEqual']} initialValue={true}>
                        <Select style={{ width: 80 }}>
                          <Option value={true}>=</Option>
                          <Option value={false}>!=</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入值' }]}
                      >
                        <Input placeholder="值" style={{ width: 150 }} />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'isRegex']} valuePropName="checked">
                        <Select style={{ width: 80 }} defaultValue={false}>
                          <Option value={false}>精确</Option>
                          <Option value={true}>正则</Option>
                        </Select>
                      </Form.Item>
                      <Button
                        type="link"
                        danger
                        onClick={() => remove(name)}
                        icon={<DeleteOutlined />}
                      />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加匹配规则
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item
            label="备注"
            name="comment"
            rules={[{ required: true, message: '请输入备注' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入静默原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AlertCenter;

