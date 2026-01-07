import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Tabs,
  Row,
  Col,
  Statistic,
  Space,
  Tag,
  Button,
  Select,
  Switch,
  message,
  Empty,
  Badge,
  Tooltip,
  Input,
  DatePicker,
  Table,
  Typography,
  Modal,
  Checkbox,
  Spin,
  Alert,
} from 'antd';
import {
  FileTextOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClearOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { List as VirtualList } from 'react-window';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { logService } from '../../services/logService';
import type {
  LogEntry,
  EventLogEntry,
  LogStats,
  LogStreamTarget,
  LogPodInfo,
  LogSearchParams,
} from '../../services/logService';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Text } = Typography;

// 日志级别颜色
const levelColors: Record<string, string> = {
  error: '#ff4d4f',
  warn: '#faad14',
  info: '#1890ff',
  debug: '#8c8c8c',
};

// 日志级别Tag颜色
const levelTagColors: Record<string, string> = {
  error: 'red',
  warn: 'orange',
  info: 'blue',
  debug: 'default',
};

const LogCenter: React.FC = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const [activeTab, setActiveTab] = useState('stream');
  const [stats, setStats] = useState<LogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ===== 实时日志流状态 =====
  const [streaming, setStreaming] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [targets, setTargets] = useState<LogStreamTarget[]>([]);
  const [maxLines] = useState(1000);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showSource, setShowSource] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string[]>([]);
  const [logSearchKeyword, setLogSearchKeyword] = useState(''); // 实时日志搜索关键字
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Pod选择器状态
  const [podSelectorVisible, setPodSelectorVisible] = useState(false);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [pods, setPods] = useState<LogPodInfo[]>([]);
  const [podsLoading, setPodsLoading] = useState(false);
  const [selectedPods, setSelectedPods] = useState<LogStreamTarget[]>([]);
  const [podSearchKeyword, setPodSearchKeyword] = useState(''); // Pod搜索关键字

  // ===== 性能优化：使用 useMemo =====
  // 已选 Pod 的 Set，用于 O(1) 查找
  const selectedPodsSet = useMemo(() => {
    return new Set(selectedPods.map((p) => `${p.namespace}/${p.pod}`));
  }, [selectedPods]);

  // 过滤后的实时日志（日志级别 + 关键字搜索）
  const filteredLogs = useMemo(() => {
    let result = logs;
    
    // 1. 日志级别过滤
    if (levelFilter.length > 0) {
      result = result.filter((log) => levelFilter.includes(log.level));
    }
    
    // 2. 关键字搜索过滤
    if (logSearchKeyword.trim()) {
      const keyword = logSearchKeyword.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(keyword) ||
          log.pod_name?.toLowerCase().includes(keyword) ||
          log.namespace?.toLowerCase().includes(keyword) ||
          log.container?.toLowerCase().includes(keyword)
      );
    }
    
    return result;
  }, [logs, levelFilter, logSearchKeyword]);

  // 高亮关键字的函数
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword.trim() || !text) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} style={{ backgroundColor: '#ffe58f', color: '#000', padding: '0 2px', borderRadius: 2 }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // 过滤后的 Pod 列表
  const filteredPods = useMemo(() => {
    if (!podSearchKeyword.trim()) return pods;
    const keyword = podSearchKeyword.toLowerCase();
    return pods.filter(
      (pod) =>
        pod.name.toLowerCase().includes(keyword) ||
        pod.containers.some((c) => c.toLowerCase().includes(keyword))
    );
  }, [pods, podSearchKeyword]);

  // ===== 事件日志状态 =====
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventNamespace, setEventNamespace] = useState<string>('');
  const [eventType, setEventType] = useState<'Normal' | 'Warning' | undefined>();

  // ===== 日志搜索状态 =====
  const [searchResults, setSearchResults] = useState<LogEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchNamespaces, setSearchNamespaces] = useState<string[]>([]);
  const [searchLevels, setSearchLevels] = useState<string[]>([]);
  const [searchDateRange, setSearchDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    if (!clusterId) return;
    setStatsLoading(true);
    try {
      const res = await logService.getLogStats(clusterId, { timeRange: '1h' });
      if (res.code === 200) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('获取日志统计失败', error);
    } finally {
      setStatsLoading(false);
    }
  }, [clusterId]);

  // 获取命名空间列表
  const fetchNamespaces = useCallback(async () => {
    if (!clusterId) return;
    try {
      const res = await logService.getNamespaces(clusterId);
      if (res.code === 200) {
        setNamespaces(res.data || []);
      }
    } catch (error) {
      console.error('获取命名空间失败', error);
    }
  }, [clusterId]);

  // 获取Pod列表
  const fetchPods = useCallback(async (namespace?: string) => {
    if (!clusterId) return;
    setPodsLoading(true);
    try {
      const res = await logService.getPods(clusterId, namespace);
      if (res.code === 200) {
        setPods(res.data || []);
      }
    } catch (error) {
      console.error('获取Pod列表失败', error);
    } finally {
      setPodsLoading(false);
    }
  }, [clusterId]);

  // 获取事件日志
  const fetchEvents = useCallback(async () => {
    if (!clusterId) return;
    setEventsLoading(true);
    try {
      const res = await logService.getEventLogs(clusterId, {
        namespace: eventNamespace || undefined,
        type: eventType,
        limit: 200,
      });
      if (res.code === 200) {
        setEvents(res.data?.items || []);
      }
    } catch (error) {
      console.error('获取事件日志失败', error);
      message.error('获取事件日志失败');
    } finally {
      setEventsLoading(false);
    }
  }, [clusterId, eventNamespace, eventType]);

  // 日志搜索
  const handleSearch = useCallback(async () => {
    if (!clusterId) return;
    setSearchLoading(true);
    try {
      const params: LogSearchParams = {
        keyword: searchKeyword || undefined,
        namespaces: searchNamespaces.length > 0 ? searchNamespaces : undefined,
        levels: searchLevels.length > 0 ? searchLevels : undefined,
        limit: 500,
      };
      if (searchDateRange) {
        params.startTime = searchDateRange[0].toISOString();
        params.endTime = searchDateRange[1].toISOString();
      }

      const res = await logService.searchLogs(clusterId, params);
      if (res.code === 200) {
        setSearchResults(res.data?.items || []);
      }
    } catch (error) {
      console.error('日志搜索失败', error);
      message.error('日志搜索失败');
    } finally {
      setSearchLoading(false);
    }
  }, [clusterId, searchKeyword, searchNamespaces, searchLevels, searchDateRange]);

  useEffect(() => {
    fetchStats();
    fetchNamespaces();
  }, [fetchStats, fetchNamespaces]);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab, fetchEvents]);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // 开始/停止日志流
  const toggleStream = useCallback(() => {
    if (!clusterId) return;

    if (streaming) {
      wsRef.current?.close();
      wsRef.current = null;
      setStreaming(false);
    } else {
      if (targets.length === 0) {
        message.warning('请先选择要监控的Pod');
        return;
      }

      const streamConfig = {
        targets,
        tail_lines: 100,
        show_timestamp: showTimestamp,
        show_source: showSource,
      };
      
      const { ws, config } = logService.createAggregateLogStream(clusterId, streamConfig);

      ws.onopen = () => {
        // 连接成功后发送配置
        ws.send(JSON.stringify(config));
        setStreaming(true);
        message.success(`已连接到 ${targets.length} 个日志源`);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'log') {
            setLogs((prev) => {
              const newLogs = [...prev, msg as LogEntry];
              if (newLogs.length > maxLines) {
                return newLogs.slice(-maxLines);
              }
              return newLogs;
            });
          } else if (msg.type === 'error') {
            message.error(msg.message);
          }
        } catch (e) {
          console.error('解析消息失败', e);
        }
      };

      ws.onerror = () => {
        message.error('连接错误');
        setStreaming(false);
      };

      ws.onclose = () => {
        setStreaming(false);
      };

      wsRef.current = ws;
    }
  }, [streaming, targets, clusterId, maxLines, showTimestamp, showSource]);

  // 清空日志
  const clearLogs = () => setLogs([]);

  // 下载日志
  const downloadLogs = () => {
    const content = logs
      .map((log) => {
        const parts = [];
        if (showTimestamp) parts.push(log.timestamp);
        if (showSource) parts.push(`[${log.namespace}/${log.pod_name}]`);
        parts.push(log.message);
        return parts.join(' ');
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('日志下载成功');
  };

  // 移除目标
  const removeTarget = (index: number) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  // 打开Pod选择器
  const openPodSelector = () => {
    setPodSelectorVisible(true);
    setSelectedPods([]);
  };

  // 确认选择Pod
  const confirmPodSelection = () => {
    setTargets([...targets, ...selectedPods]);
    setPodSelectorVisible(false);
    setSelectedPods([]);
  };

  // 事件表格列
  const eventColumns: ColumnsType<EventLogEntry> = [
    {
      title: '时间',
      dataIndex: 'last_timestamp',
      width: 170,
      render: (time: string) => (
        <Text type="secondary">
          {dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'Warning' ? 'orange' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      width: 120,
    },
    {
      title: '资源',
      key: 'resource',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tag color="cyan">{record.involved_kind}</Tag>
          <Text ellipsis style={{ maxWidth: 120 }}>
            {record.involved_name}
          </Text>
        </Space>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      ellipsis: true,
    },
    {
      title: '次数',
      dataIndex: 'count',
      width: 60,
      align: 'center',
    },
  ];

  // 搜索结果表格列
  const searchColumns: ColumnsType<LogEntry> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      width: 180,
      render: (time: string) => (
        <Text type="secondary">
          {dayjs(time).format('YYYY-MM-DD HH:mm:ss.SSS')}
        </Text>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 80,
      render: (level: string) => (
        <Tag color={levelTagColors[level] || 'default'}>
          {level.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '来源',
      key: 'source',
      width: 250,
      render: (_, record) => (
        <Tooltip title={`${record.namespace}/${record.pod_name}:${record.container}`}>
          <Text ellipsis style={{ maxWidth: 230 }}>
            <Tag color="cyan">{record.namespace}</Tag>
            {record.pod_name}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '日志内容',
      dataIndex: 'message',
      render: (message: string) => (
        <Text
          style={{
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {message}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 统计概览 */}
      <Spin spinning={statsLoading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small" bordered={false}>
              <Statistic
                title="事件总数 (1h)"
                value={stats?.total_count || 0}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bordered={false}>
              <Statistic
                title="错误事件"
                value={stats?.error_count || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" bordered={false}>
              <Statistic
                title="警告事件"
                value={stats?.warn_count || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" bordered={false}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 500 }}>命名空间分布</span>
                <Space wrap size="small">
                  {stats?.namespace_stats?.slice(0, 5).map((ns) => (
                    <Tag key={ns.namespace} color="blue">
                      {ns.namespace}: {ns.count}
                    </Tag>
                  ))}
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 主内容区 */}
      <Card bordered={false}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <Button icon={<SyncOutlined />} onClick={fetchStats}>
                刷新统计
              </Button>
            </Space>
          }
        >
          {/* 实时日志流 Tab */}
          <TabPane
            tab={
              <span>
                <ThunderboltOutlined />
                实时日志
              </span>
            }
            key="stream"
          >
            {/* 工具栏 */}
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Space>
                <Button
                  type={streaming ? 'default' : 'primary'}
                  icon={streaming ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={toggleStream}
                  danger={streaming}
                >
                  {streaming ? '停止' : '开始监控'}
                </Button>
                <Button icon={<ClearOutlined />} onClick={clearLogs}>
                  清空
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadLogs}
                  disabled={logs.length === 0}
                >
                  下载
                </Button>
              </Space>

              <Space>
                <Select
                  mode="multiple"
                  placeholder="日志级别过滤"
                  style={{ width: 200 }}
                  value={levelFilter}
                  onChange={setLevelFilter}
                  options={[
                    { label: '错误', value: 'error' },
                    { label: '警告', value: 'warn' },
                    { label: '信息', value: 'info' },
                    { label: '调试', value: 'debug' },
                  ]}
                />
                <Tooltip title="显示时间戳">
                  <Switch
                    checked={showTimestamp}
                    onChange={setShowTimestamp}
                    checkedChildren="时间"
                    unCheckedChildren="时间"
                  />
                </Tooltip>
                <Tooltip title="显示来源">
                  <Switch
                    checked={showSource}
                    onChange={setShowSource}
                    checkedChildren="来源"
                    unCheckedChildren="来源"
                  />
                </Tooltip>
                <Tooltip title="自动滚动">
                  <Switch
                    checked={autoScroll}
                    onChange={setAutoScroll}
                    checkedChildren="滚动"
                    unCheckedChildren="滚动"
                  />
                </Tooltip>
              </Space>
            </div>

            {/* Pod选择器 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 500 }}>监控目标：</span>
                {targets.map((t, i) => (
                  <Tag
                    key={i}
                    closable
                    onClose={() => removeTarget(i)}
                    color="blue"
                  >
                    {t.namespace}/{t.pod}
                    {t.container && `:${t.container}`}
                  </Tag>
                ))}
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={openPodSelector}
                >
                  添加Pod
                </Button>
                {streaming && (
                  <Badge
                    status="processing"
                    text="实时监控中"
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </div>
            </Card>

            {/* 日志搜索框 */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input
                placeholder="搜索日志内容、Pod名称、命名空间..."
                prefix={<SearchOutlined />}
                allowClear
                value={logSearchKeyword}
                onChange={(e) => setLogSearchKeyword(e.target.value)}
                style={{ width: 350 }}
              />
              {logSearchKeyword && (
                <Text type="secondary">
                  匹配 {filteredLogs.length} / {logs.length} 条日志
                </Text>
              )}
            </div>

            {/* 日志显示区 */}
            <div
              style={{
                height: 'calc(100vh - 540px)',
                minHeight: 400,
                backgroundColor: '#1e1e1e',
                borderRadius: 8,
                overflow: 'auto',
                fontFamily: "'Fira Code', 'Monaco', 'Menlo', monospace",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {filteredLogs.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#666',
                  }}
                >
                  <Empty
                    description={
                      streaming ? '等待日志...' : '选择Pod后点击开始监控'
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ) : (
                <div style={{ padding: 16 }}>
                  {filteredLogs.map((log, index) => (
                    <div
                      key={log.id || index}
                      style={{
                        display: 'flex',
                        gap: 8,
                        marginBottom: 2,
                        color: '#d4d4d4',
                      }}
                    >
                      {showTimestamp && (
                        <span style={{ color: '#6a9955', whiteSpace: 'nowrap' }}>
                          {dayjs(log.timestamp).format('HH:mm:ss.SSS')}
                        </span>
                      )}
                      {showSource && (
                        <span style={{ color: '#569cd6', whiteSpace: 'nowrap' }}>
                          [{logSearchKeyword ? highlightKeyword(`${log.namespace}/${log.pod_name}`, logSearchKeyword) : `${log.namespace}/${log.pod_name}`}]
                        </span>
                      )}
                      <span
                        style={{
                          color: levelColors[log.level] || '#d4d4d4',
                          fontWeight: log.level === 'error' ? 600 : 400,
                          wordBreak: 'break-all',
                        }}
                      >
                        {logSearchKeyword ? highlightKeyword(log.message, logSearchKeyword) : log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>

            {/* 状态栏 */}
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                justifyContent: 'space-between',
                color: '#8c8c8c',
                fontSize: 12,
              }}
            >
              <span>共 {filteredLogs.length} 条日志</span>
              <span>最大保留 {maxLines} 条</span>
            </div>
          </TabPane>

          {/* K8s事件 Tab */}
          <TabPane
            tab={
              <span>
                <WarningOutlined />
                K8s事件
              </span>
            }
            key="events"
          >
            {/* 筛选 */}
            <Space wrap style={{ marginBottom: 16 }}>
              <Select
                placeholder="命名空间"
                allowClear
                style={{ width: 180 }}
                value={eventNamespace || undefined}
                onChange={(v) => setEventNamespace(v || '')}
                showSearch
                options={namespaces.map((ns) => ({ label: ns, value: ns }))}
              />
              <Select
                placeholder="事件类型"
                allowClear
                style={{ width: 120 }}
                value={eventType}
                onChange={setEventType}
                options={[
                  { label: 'Normal', value: 'Normal' },
                  { label: 'Warning', value: 'Warning' },
                ]}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={fetchEvents}
                loading={eventsLoading}
              >
                查询
              </Button>
            </Space>

            <Table
              columns={eventColumns}
              dataSource={events}
              rowKey="id"
              loading={eventsLoading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条`,
              }}
              size="small"
              scroll={{ y: 'calc(100vh - 500px)' }}
            />
          </TabPane>

          {/* 日志搜索 Tab */}
          <TabPane
            tab={
              <span>
                <SearchOutlined />
                日志搜索
              </span>
            }
            key="search"
          >
            {/* 搜索栏 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space wrap style={{ width: '100%' }}>
                <Input.Search
                  placeholder="输入搜索关键词..."
                  style={{ width: 300 }}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onSearch={handleSearch}
                  enterButton={<SearchOutlined />}
                />

                <Select
                  mode="multiple"
                  placeholder="命名空间"
                  style={{ width: 200 }}
                  value={searchNamespaces}
                  onChange={setSearchNamespaces}
                  options={namespaces.map((ns) => ({ label: ns, value: ns }))}
                />

                <Select
                  mode="multiple"
                  placeholder="日志级别"
                  style={{ width: 150 }}
                  value={searchLevels}
                  onChange={setSearchLevels}
                  options={[
                    { label: 'ERROR', value: 'error' },
                    { label: 'WARN', value: 'warn' },
                    { label: 'INFO', value: 'info' },
                    { label: 'DEBUG', value: 'debug' },
                  ]}
                />

                <RangePicker
                  showTime
                  value={searchDateRange}
                  onChange={(dates) =>
                    setSearchDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
                  }
                  placeholder={['开始时间', '结束时间']}
                />

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={searchLoading}
                >
                  搜索
                </Button>
              </Space>
            </Card>

            {/* 搜索结果 */}
            <Card
              size="small"
              title={`搜索结果 (${searchResults.length} 条)`}
            >
              <Table
                columns={searchColumns}
                dataSource={searchResults}
                rowKey="id"
                loading={searchLoading}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showTotal: (t) => `共 ${t} 条`,
                }}
                size="small"
                scroll={{ y: 'calc(100vh - 550px)' }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* Pod选择器弹窗 */}
      <Modal
        title="选择Pod"
        open={podSelectorVisible}
        onOk={confirmPodSelection}
        onCancel={() => {
          setPodSelectorVisible(false);
          setPodSearchKeyword(''); // 关闭时清空搜索
        }}
        width={700}
        okText="确认添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            placeholder="选择命名空间"
            style={{ width: '100%' }}
            value={selectedNamespace || undefined}
            onChange={(v) => {
              setSelectedNamespace(v);
              setPodSearchKeyword(''); // 切换命名空间时清空搜索
              fetchPods(v);
            }}
            showSearch
            options={namespaces.map((ns) => ({ label: ns, value: ns }))}
          />

          {/* Pod 搜索框 */}
          {pods.length > 0 && (
            <Input
              placeholder="搜索 Pod 名称或容器名..."
              prefix={<SearchOutlined />}
              allowClear
              value={podSearchKeyword}
              onChange={(e) => setPodSearchKeyword(e.target.value)}
              style={{ marginBottom: 8 }}
            />
          )}

          <Spin spinning={podsLoading}>
            {pods.length === 0 ? (
              <Empty description="请先选择命名空间" />
            ) : filteredPods.length === 0 ? (
              <Empty description="没有匹配的 Pod" />
            ) : (
              <>
                {/* 显示过滤结果统计和全选按钮 */}
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#888' }}>
                    共 {pods.length} 个 Pod
                    {podSearchKeyword && `, 匹配 ${filteredPods.length} 个`}
                    ，已选 {selectedPods.length} 个
                  </span>
                  <Checkbox
                    indeterminate={
                      filteredPods.some((p) => selectedPodsSet.has(`${p.namespace}/${p.name}`)) &&
                      !filteredPods.every((p) => selectedPodsSet.has(`${p.namespace}/${p.name}`))
                    }
                    checked={
                      filteredPods.length > 0 &&
                      filteredPods.every((p) => selectedPodsSet.has(`${p.namespace}/${p.name}`))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        // 全选：添加所有过滤后的 Pod（去重）
                        const newTargets = filteredPods
                          .filter((p) => !selectedPodsSet.has(`${p.namespace}/${p.name}`))
                          .map((p) => ({
                            namespace: p.namespace,
                            pod: p.name,
                            container: p.containers[0],
                          }));
                        setSelectedPods([...selectedPods, ...newTargets]);
                      } else {
                        // 取消全选：移除所有过滤后的 Pod
                        const filteredSet = new Set(filteredPods.map((p) => `${p.namespace}/${p.name}`));
                        setSelectedPods(selectedPods.filter((p) => !filteredSet.has(`${p.namespace}/${p.pod}`)));
                      }
                    }}
                  >
                    全选{podSearchKeyword ? '匹配项' : ''}
                  </Checkbox>
                </div>
                
                {/* 虚拟滚动列表 - 使用 react-window */}
                <div
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <VirtualList<{ pods: LogPodInfo[]; selectedPodsSet: Set<string>; onToggle: (pod: LogPodInfo) => void }>
                    style={{ height: 360 }}
                    rowCount={filteredPods.length}
                    rowHeight={60}
                    rowProps={{
                      pods: filteredPods,
                      selectedPodsSet,
                      onToggle: (pod: LogPodInfo) => {
                        const isSelected = selectedPodsSet.has(`${pod.namespace}/${pod.name}`);
                        if (isSelected) {
                          setSelectedPods(
                            selectedPods.filter(
                              (p) => !(p.namespace === pod.namespace && p.pod === pod.name)
                            )
                          );
                        } else {
                          setSelectedPods([
                            ...selectedPods,
                            {
                              namespace: pod.namespace,
                              pod: pod.name,
                              container: pod.containers[0],
                            },
                          ]);
                        }
                      },
                    }}
                    rowComponent={({ index, style, pods, selectedPodsSet: selSet, onToggle }) => {
                      const pod = pods[index];
                      if (!pod) return <div style={style} />;
                      const isSelected = selSet.has(`${pod.namespace}/${pod.name}`);
                      return (
                        <div
                          style={{
                            ...style,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#e6f7ff' : '#fff',
                            boxSizing: 'border-box',
                          }}
                          onClick={() => onToggle(pod)}
                        >
                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {pod.name}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              容器: {pod.containers.join(', ')}
                            </Text>
                          </div>
                          <Space style={{ flexShrink: 0 }}>
                            <Tag color={pod.status === 'Running' ? 'green' : 'orange'}>
                              {pod.status}
                            </Tag>
                            <Checkbox checked={isSelected} />
                          </Space>
                        </div>
                      );
                    }}
                  />
                </div>
              </>
            )}
          </Spin>

          {selectedPods.length > 0 && (
            <Alert
              message={`已选择 ${selectedPods.length} 个Pod`}
              type="info"
              showIcon
            />
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default LogCenter;

