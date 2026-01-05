/**
 * Pod 监控 Tab - 使用整个 Grafana Dashboard 嵌入
 * 相比多 Panel 分别嵌入，整体嵌入加载更快
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Card, Space, Button, Switch, Spin, DatePicker, Popover, Divider, Typography, Empty } from 'antd';
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { generateDataSourceUID } from '../../../config/grafana.config';

const { Text } = Typography;

const GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000';
const DASHBOARD_UID = 'kubepolaris-pod-detail';

// Grafana 风格的时间范围选项
const TIME_RANGE_OPTIONS = [
  {
    label: '快速选择',
    options: [
      { value: '5m', label: 'Last 5 minutes' },
      { value: '15m', label: 'Last 15 minutes' },
      { value: '30m', label: 'Last 30 minutes' },
      { value: '1h', label: 'Last 1 hour' },
      { value: '3h', label: 'Last 3 hours' },
      { value: '6h', label: 'Last 6 hours' },
      { value: '12h', label: 'Last 12 hours' },
      { value: '24h', label: 'Last 24 hours' },
    ],
  },
  {
    label: '更长时间',
    options: [
      { value: '2d', label: 'Last 2 days' },
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
    ],
  },
];

interface PodMonitoringTabProps {
  clusterId: string;
  clusterName?: string;
  namespace: string;
  podName: string;
}

const PodMonitoringTab: React.FC<PodMonitoringTabProps> = ({
  clusterId,
  clusterName,
  namespace,
  podName,
}) => {
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 自定义时间范围状态
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customFromTime, setCustomFromTime] = useState<Dayjs | null>(null);
  const [customToTime, setCustomToTime] = useState<Dayjs | null>(null);

  // 根据集群名生成数据源 UID
  const dataSourceUid = clusterName ? generateDataSourceUID(clusterName) : '';

  // 获取时间范围参数
  const getFromTime = useCallback(() => {
    if (isCustomRange && customFromTime) {
      return customFromTime.valueOf().toString();
    }
    return `now-${timeRange}`;
  }, [isCustomRange, customFromTime, timeRange]);

  const getToTime = useCallback(() => {
    if (isCustomRange && customToTime) {
      return customToTime.valueOf().toString();
    }
    return 'now';
  }, [isCustomRange, customToTime]);

  // 获取显示的时间范围文本
  const getTimeRangeDisplay = () => {
    if (isCustomRange && customFromTime && customToTime) {
      return `${customFromTime.format('MM-DD HH:mm')} to ${customToTime.format('MM-DD HH:mm')}`;
    }
    const option = TIME_RANGE_OPTIONS.flatMap(g => g.options).find(o => o.value === timeRange);
    return option?.label || 'Last 1 hour';
  };

  // 构建完整 Dashboard 嵌入 URL
  const dashboardUrl = useMemo(() => {
    const params = new URLSearchParams({
      orgId: '1',
      from: getFromTime(),
      to: getToTime(),
      theme: 'light',
    });

    // 添加数据源变量
    if (dataSourceUid) {
      params.append('var-DS_PROMETHEUS', dataSourceUid);
    }
    
    // 添加 Pod 相关变量
    params.append('var-namespace', namespace);
    params.append('var-podname', podName);
    params.append('var-Interface', 'eth0');
    params.append('var-Intervals', '2m');

    // 添加自动刷新
    if (autoRefresh) {
      params.append('refresh', '30s');
    }

    // 完全 kiosk 模式：隐藏侧边栏和顶部导航栏
    return `${GRAFANA_URL}/d/${DASHBOARD_UID}/?${params.toString()}&kiosk`;
  }, [getFromTime, getToTime, dataSourceUid, namespace, podName, refreshKey, autoRefresh]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey(prev => prev + 1);
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  // 应用自定义时间范围
  const applyCustomRange = () => {
    if (customFromTime && customToTime) {
      setIsCustomRange(true);
      setTimePickerOpen(false);
      handleRefresh();
    }
  };

  // 选择快速时间范围
  const handleQuickRangeSelect = (value: string) => {
    setTimeRange(value);
    setIsCustomRange(false);
    setTimePickerOpen(false);
    handleRefresh();
  };

  // 检查必要的参数
  if (!clusterName) {
    return (
      <Empty
        description="无法获取集群信息，请刷新页面重试"
        style={{ padding: '60px 0' }}
      />
    );
  }

  // 时间选择器 Popover 内容
  const timePickerContent = (
    <div style={{ display: 'flex', gap: 16, padding: 8 }}>
      <div style={{ width: 240 }}>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>Absolute time range</Text>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>From</Text>
          <DatePicker
            showTime
            value={customFromTime}
            onChange={setCustomFromTime}
            style={{ width: '100%', marginTop: 4 }}
            placeholder="开始时间"
            format="YYYY-MM-DD HH:mm:ss"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>To</Text>
          <DatePicker
            showTime
            value={customToTime}
            onChange={setCustomToTime}
            style={{ width: '100%', marginTop: 4 }}
            placeholder="结束时间"
            format="YYYY-MM-DD HH:mm:ss"
          />
        </div>
        <Button
          type="primary"
          block
          onClick={applyCustomRange}
          disabled={!customFromTime || !customToTime}
        >
          Apply time range
        </Button>
      </div>

      <Divider type="vertical" style={{ height: 'auto' }} />

      <div style={{ width: 160 }}>
        {TIME_RANGE_OPTIONS.map(group => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{group.label}</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
              {group.options.map(opt => (
                <Button
                  key={opt.value}
                  type={!isCustomRange && timeRange === opt.value ? 'primary' : 'text'}
                  size="small"
                  style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => handleQuickRangeSelect(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card
      title="监控图表"
      extra={
        <Space>
          <Popover
            content={timePickerContent}
            trigger="click"
            open={timePickerOpen}
            onOpenChange={setTimePickerOpen}
            placement="bottomRight"
          >
            <Button icon={<ClockCircleOutlined />} style={{ minWidth: 180 }}>
              {getTimeRangeDisplay()}
            </Button>
          </Popover>
          <Space>
            <span>自动刷新</span>
            <Switch
              checked={autoRefresh}
              onChange={(checked) => {
                setAutoRefresh(checked);
                handleRefresh();
              }}
              checkedChildren="开"
              unCheckedChildren="关"
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      }
      styles={{ body: { padding: 0, position: 'relative', minHeight: 800 } }}
    >
      {/* 加载状态 */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          textAlign: 'center',
        }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#666' }}>监控数据加载中...</div>
        </div>
      )}
      
      {/* 整个 Dashboard iframe */}
      <iframe
        key={`${refreshKey}-${clusterId}-${namespace}-${podName}`}
        src={dashboardUrl}
        width="100%"
        height="800"
        frameBorder="0"
        style={{ border: 'none', display: 'block' }}
        title="Grafana Pod Monitoring Dashboard"
        onLoad={handleIframeLoad}
      />
    </Card>
  );
};

export default PodMonitoringTab;
