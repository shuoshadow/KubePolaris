/** genAI_main_start */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Row, Col, Statistic, Select, Button, Space, Spin, Alert, Switch } from 'antd';
import { Line, Area } from '@ant-design/plots';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../utils/api';
/** genAI_main_end */

const { Option } = Select;

interface DataPoint {
  timestamp: number;
  value: number;
}

interface MetricSeries {
  current: number;
  series: DataPoint[];
}

interface NetworkMetrics {
  in: MetricSeries;
  out: MetricSeries;
}

interface PodMetrics {
  total: number;
  running: number;
  pending: number;
  failed: number;
}

/* genAI_main_start */
interface NetworkPPS {
  in: MetricSeries;
  out: MetricSeries;
}

interface NetworkDrops {
  receive: MetricSeries;
  transmit: MetricSeries;
}

interface DiskIOPS {
  read: MetricSeries;
  write: MetricSeries;
}

interface DiskThroughput {
  read: MetricSeries;
  write: MetricSeries;
}

interface ClusterMetricsData {
  cpu?: MetricSeries;
  memory?: MetricSeries;
  network?: NetworkMetrics;
  storage?: MetricSeries;
  pods?: PodMetrics;
  // Pod 级别的扩展指标
  cpu_request?: MetricSeries;
  cpu_limit?: MetricSeries;
  memory_request?: MetricSeries;
  memory_limit?: MetricSeries;
  probe_failures?: MetricSeries;
  container_restarts?: MetricSeries;
  network_pps?: NetworkPPS;
  threads?: MetricSeries;
  network_drops?: NetworkDrops;
  cpu_throttling?: MetricSeries;
  cpu_throttling_time?: MetricSeries;
  disk_iops?: DiskIOPS;
  disk_throughput?: DiskThroughput;
  cpu_usage_absolute?: MetricSeries;
  memory_usage_bytes?: MetricSeries;
  oom_kills?: MetricSeries;
}
/* genAI_main_end */

interface MonitoringChartsProps {
  clusterId: string;
  clusterName?: string;
  nodeName?: string;
  namespace?: string;
  podName?: string;
  type: 'cluster' | 'node' | 'pod';
}

const MonitoringCharts: React.FC<MonitoringChartsProps> = ({
  clusterId,
  clusterName,
  nodeName,
  namespace,
  podName,
  type,
}) => {
  const [metrics, setMetrics] = useState<ClusterMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [step, setStep] = useState('15s');
  /* genAI_main_start */
  const [autoRefresh, setAutoRefresh] = useState(false); // 默认关闭自动刷新
  /* genAI_main_end */
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      let url = '';
      const params = new URLSearchParams({
        range: timeRange,
        step: step,
      });

      if (clusterName) {
        params.append('clusterName', clusterName);
      }

      switch (type) {
        case 'cluster':
          url = `/clusters/${clusterId}/monitoring/metrics`;
          break;
        case 'node':
          url = `/clusters/${clusterId}/nodes/${nodeName}/metrics`;
          break;
        case 'pod':
          url = `/clusters/${clusterId}/pods/${namespace}/${podName}/metrics`;
          break;
      }

      const response = await api.get(`${url}?${params.toString()}`);
      setMetrics(response.data.data);
    } catch (error) {
      console.error('获取监控数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [clusterId, timeRange, step, clusterName, nodeName, namespace, podName, type]);

  /* genAI_main_start */
  useEffect(() => {
    fetchMetrics();
    
    // 只在开启自动刷新时设置定时器
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchMetrics, 30000); // 30秒刷新一次
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [clusterId, timeRange, step, clusterName, nodeName, namespace, podName, fetchMetrics, autoRefresh]);
  /* genAI_main_end */

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const formatValue = (value: number, unit: string = '') => {
    if (unit === '%') {
      return `${value.toFixed(2)}%`;
    }
    if (unit === 'bytes') {
      if (value >= 1024 * 1024 * 1024) {
        return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      } else if (value >= 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(2)} MB`;
      } else if (value >= 1024) {
        return `${(value / 1024).toFixed(2)} KB`;
      }
      return `${value.toFixed(2)} B`;
    }
    return value.toFixed(2);
  };

  const renderChart = (data: DataPoint[], color: string, unit: string = '') => {
    const chartData = data.map(point => ({
      time: formatTimestamp(point.timestamp),
      value: point.value,
      timestamp: point.timestamp,
    }));

    const config = {
      data: chartData,
      xField: 'time',
      yField: 'value',
      height: 200,
      smooth: true,
      color: color,
      point: {
        size: 0,
      },
      tooltip: {
        formatter: (datum: { value: number; time: string }) => {
          return {
            name: '数值',
            value: formatValue(datum.value, unit),
          };
        },
        title: (datum: { time: string }) => `时间: ${datum.time}`,
      },
      yAxis: {
        label: {
          formatter: (value: number) => formatValue(value, unit),
        },
      },
    };

    return <Line {...config} />;
  };

  // Helper function to convert bytes to appropriate unit
  const convertBytesToUnit = (bytes: number): { value: number; unit: string } => {
    if (bytes >= 1024 * 1024 * 1024) {
      return { value: bytes / (1024 * 1024 * 1024), unit: 'GB' };
    } else if (bytes >= 1024 * 1024) {
      return { value: bytes / (1024 * 1024), unit: 'MB' };
    } else if (bytes >= 1024) {
      return { value: bytes / 1024, unit: 'KB' };
    }
    return { value: bytes, unit: 'B' };
  };

  const renderNetworkChart = (inData: DataPoint[], outData: DataPoint[], unit: string = '', inLabel: string = '入站', outLabel: string = '出站') => {
    let chartData;
    let yAxisSuffix = '';

    if (unit === 'bytes') {
      // Find max value to determine the best unit
      const maxValue = Math.max(
        ...inData.map(p => p.value),
        ...outData.map(p => p.value)
      );
      const { unit: bestUnit } = convertBytesToUnit(maxValue);
      yAxisSuffix = bestUnit;

      // Convert all data to the best unit
      const divisor = 
        bestUnit === 'GB' ? (1024 * 1024 * 1024) :
        bestUnit === 'MB' ? (1024 * 1024) :
        bestUnit === 'KB' ? 1024 : 1;

      chartData = inData.map((point, index) => ({
        time: formatTimestamp(point.timestamp),
        in: point.value / divisor,
        out: (outData[index]?.value || 0) / divisor,
        inRaw: point.value,
        outRaw: outData[index]?.value || 0,
        timestamp: point.timestamp,
      }));
    } else {
      chartData = inData.map((point, index) => ({
        time: formatTimestamp(point.timestamp),
        in: point.value,
        out: outData[index]?.value || 0,
        timestamp: point.timestamp,
      }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      data: chartData,
      xField: 'time',
      yField: ['in', 'out'],
      height: 200,
      smooth: true,
      color: ['#1890ff', '#52c41a'],
      areaStyle: {
        fillOpacity: 0.6,
      },
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (datum: any) => {
          if (unit === 'bytes') {
            return [
              {
                name: inLabel,
                value: formatValue(datum.inRaw, 'bytes'),
              },
              {
                name: outLabel,
                value: formatValue(datum.outRaw, 'bytes'),
              },
            ];
          } else {
            return [
              {
                name: inLabel,
                value: datum.in.toFixed(2),
              },
              {
                name: outLabel,
                value: datum.out.toFixed(2),
              },
            ];
          }
        },
        title: (datum: { time: string }) => `时间: ${datum.time}`,
      },
      yAxis: {
        label: {
          formatter: (value: string) => {
            const numValue = parseFloat(value);
            return yAxisSuffix ? `${numValue.toFixed(2)} ${yAxisSuffix}` : numValue.toFixed(2);
          },
        },
      },
    };

    return <Area {...config} />;
  };

  if (loading && !metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载监控数据中...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert
        message="监控数据不可用"
        description="请检查监控配置是否正确，或监控数据源是否可用。"
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div>
      <Card
        title="监控图表"
        extra={
          <Space>
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 100 }}
            >
              <Option value="1h">1小时</Option>
              <Option value="6h">6小时</Option>
              <Option value="24h">24小时</Option>
              <Option value="7d">7天</Option>
            </Select>
            <Select
              value={step}
              onChange={setStep}
              style={{ width: 100 }}
            >
              <Option value="15s">15秒</Option>
              <Option value="1m">1分钟</Option>
              <Option value="5m">5分钟</Option>
              <Option value="15m">15分钟</Option>
              <Option value="1h">1小时</Option>
            </Select>
            {/* genAI_main_start */}
            <Space>
              <span>自动刷新</span>
              <Switch
                checked={autoRefresh}
                onChange={setAutoRefresh}
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </Space>
            {/* genAI_main_end */}
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchMetrics}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        
        <Row gutter={[16, 16]}>
                    {/* genAI_main_start */}
          {/* Pod 资源规格（仅在 Pod 类型时显示） */}
          {type === 'pod' && (metrics.cpu_request || metrics.cpu_limit || metrics.memory_request || metrics.memory_limit) && (
            <Col span={24}>
              <Card size="small" title="资源规格">
                <Row gutter={16}>
                  {metrics.cpu_request && (
                    <Col span={6}>
                      <Statistic
                        title="CPU Request"
                        value={metrics.cpu_request.current.toFixed(2)}
                        suffix="cores"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                  )}
                  {metrics.cpu_limit && (
                    <Col span={6}>
                      <Statistic
                        title="CPU Limit"
                        value={metrics.cpu_limit.current.toFixed(2)}
                        suffix="cores"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                  )}
                  {metrics.memory_request && (
                    <Col span={6}>
                      <Statistic
                        title="Memory Request"
                        value={formatValue(metrics.memory_request.current, 'bytes')}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  )}
                  {metrics.memory_limit && (
                    <Col span={6}>
                      <Statistic
                        title="Memory Limit"
                        value={formatValue(metrics.memory_limit.current, 'bytes')}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  )}
                </Row>
              </Card>
            </Col>
          )}


          {/* CPU 使用率 */}
          {metrics.cpu && (
            <Col span={12}>
              <Card size="small" title="CPU 使用">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="使用率"
                      value={metrics.cpu.current}
                      suffix="%"
                      precision={2}
                      valueStyle={{ color: metrics.cpu.current > 80 ? '#cf1322' : '#3f8600' }}
                    />
                  </Col>
                  {type === 'pod' && metrics.cpu_usage_absolute && (
                    <Col span={12}>
                      <Statistic
                        title="实际使用"
                        value={metrics.cpu_usage_absolute.current.toFixed(3)}
                        suffix="cores"
                        precision={3}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                  )}
                </Row>
                {renderChart(metrics.cpu.series, '#1890ff', '%')}
              </Card>
            </Col>
          )}

          {/* 内存使用率 */}
          {metrics.memory && (
            <Col span={12}>
              <Card size="small" title="内存使用">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="使用率"
                      value={metrics.memory.current}
                      suffix="%"
                      precision={2}
                      valueStyle={{ color: metrics.memory.current > 80 ? '#cf1322' : '#3f8600' }}
                    />
                  </Col>
                  {type === 'pod' && metrics.memory_usage_bytes && (
                    <Col span={12}>
                      <Statistic
                        title="实际使用"
                        value={formatValue(metrics.memory_usage_bytes.current, 'bytes')}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  )}
                </Row>
                {renderChart(metrics.memory.series, '#52c41a', '%')}
              </Card>
            </Col>
          )}

          {/* 容器重启次数 */}
          {type === 'pod' && metrics.container_restarts && (
            <Col span={12}>
              <Card size="small" title="容器重启次数">
                <Statistic
                  value={metrics.container_restarts.current}
                  precision={0}
                  suffix="次"
                  valueStyle={{ color: metrics.container_restarts.current > 0 ? '#cf1322' : '#3f8600' }}
                />
                {renderChart(metrics.container_restarts.series, '#ff4d4f', '')}
              </Card>
            </Col>
          )}

          {/* OOM Kill 次数 */}
          {type === 'pod' && metrics.oom_kills && (
            <Col span={12}>
              <Card size="small" title="OOM Kill 次数">
                <Statistic
                  value={metrics.oom_kills.current}
                  precision={0}
                  suffix="次"
                  valueStyle={{ color: metrics.oom_kills.current > 0 ? '#cf1322' : '#3f8600' }}
                />
                {renderChart(metrics.oom_kills.series, '#ff4d4f', '')}
              </Card>
            </Col>
          )}

          {/* 健康检查失败次数 */}
          {type === 'pod' && metrics.probe_failures && (
            <Col span={12}>
              <Card size="small" title="健康检查失败次数">
                <Statistic
                  value={metrics.probe_failures.current}
                  precision={2}
                  suffix="次/分钟"
                  valueStyle={{ color: metrics.probe_failures.current > 0 ? '#cf1322' : '#3f8600' }}
                />
                {renderChart(metrics.probe_failures.series, '#faad14', '')}
              </Card>
            </Col>
          )}

          {/* 网络流量 */}
          {metrics.network && (
            <Col span={24}>
              <Card size="small" title="网络流量">
                <Row gutter={16}>
                  <Col span={12}>
                    {/* genAI_main_start */}
                    <Statistic
                      title="入站流量"
                      value={formatValue(metrics.network.in.current, 'bytes')}
                      suffix="/s"
                      precision={2}
                    />
                    {/* genAI_main_end */}
                  </Col>
                  <Col span={12}>
                    {/* genAI_main_start */}
                    <Statistic
                      title="出站流量"
                      value={formatValue(metrics.network.out.current, 'bytes')}
                      suffix="/s"
                      precision={2}
                    />
                    {/* genAI_main_end */}
                  </Col>
                </Row>
                {renderNetworkChart(metrics.network.in.series, metrics.network.out.series, 'bytes', '入站', '出站')}
              </Card>
            </Col>
          )}

          {/* 存储使用率 */}
          {metrics.storage && (
            <Col span={12}>
              <Card size="small" title="存储使用率">
                <Statistic
                  value={metrics.storage.current}
                  suffix="%"
                  precision={2}
                  valueStyle={{ color: metrics.storage.current > 80 ? '#cf1322' : '#3f8600' }}
                />
                {renderChart(metrics.storage.series, '#fa8c16', '%')}
              </Card>
            </Col>
          )}

          {/* Pod 统计 */}
          {metrics.pods && (
            <Col span={12}>
              <Card size="small" title="Pod 状态">
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="总数"
                      value={metrics.pods.total}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="运行中"
                      value={metrics.pods.running}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="等待中"
                      value={metrics.pods.pending}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="失败"
                      value={metrics.pods.failed}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          )}

          {/* 网络 PPS */}
          {type === 'pod' && metrics.network_pps && (
            <Col span={24}>
              <Card size="small" title="网络 PPS（包/秒）">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="入站 PPS"
                      value={metrics.network_pps.in.current.toFixed(2)}
                      suffix="pps"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="出站 PPS"
                      value={metrics.network_pps.out.current.toFixed(2)}
                      suffix="pps"
                    />
                  </Col>
                </Row>
                {renderNetworkChart(metrics.network_pps.in.series, metrics.network_pps.out.series, '', '入站', '出站')}
              </Card>
            </Col>
          )}

          {/* 磁盘 IOPS */}
          {type === 'pod' && metrics.disk_iops && (
            <Col span={24}>
              <Card size="small" title="磁盘 IOPS">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="读 IOPS"
                      value={metrics.disk_iops.read.current.toFixed(2)}
                      suffix="ops/s"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="写 IOPS"
                      value={metrics.disk_iops.write.current.toFixed(2)}
                      suffix="ops/s"
                    />
                  </Col>
                </Row>
                {renderNetworkChart(metrics.disk_iops.read.series, metrics.disk_iops.write.series, '', '读', '写')}
              </Card>
            </Col>
          )}

          {/* 磁盘吞吐量 */}
          {type === 'pod' && metrics.disk_throughput && (
            <Col span={24}>
              <Card size="small" title="磁盘吞吐量">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="读吞吐量"
                      value={formatValue(metrics.disk_throughput.read.current, 'bytes')}
                      suffix="/s"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="写吞吐量"
                      value={formatValue(metrics.disk_throughput.write.current, 'bytes')}
                      suffix="/s"
                    />
                  </Col>
                </Row>
                {renderNetworkChart(metrics.disk_throughput.read.series, metrics.disk_throughput.write.series, 'bytes', '读', '写')}
              </Card>
            </Col>
          )}

          {/* 线程数 */}
          {type === 'pod' && metrics.threads && (
            <Col span={12}>
              <Card size="small" title="线程数">
                <Statistic
                  value={metrics.threads.current}
                  precision={0}
                  valueStyle={{ color: '#722ed1' }}
                />
                {renderChart(metrics.threads.series, '#722ed1', '')}
              </Card>
            </Col>
          )}

          {/* CPU 限流情况 */}
          {type === 'pod' && (metrics.cpu_throttling || metrics.cpu_throttling_time) && (
            <Col span={24}>
              <Card size="small" title="CPU 限流情况">
                <Row gutter={16}>
                  {metrics.cpu_throttling && (
                    <Col span={12}>
                      <Card size="small" title="CPU 限流比例">
                        <Statistic
                          value={metrics.cpu_throttling.current}
                          suffix="%"
                          precision={2}
                          valueStyle={{ color: metrics.cpu_throttling.current > 10 ? '#cf1322' : '#3f8600' }}
                        />
                        {renderChart(metrics.cpu_throttling.series, '#ff7a45', '%')}
                      </Card>
                    </Col>
                  )}
                  {metrics.cpu_throttling_time && (
                    <Col span={12}>
                      <Card size="small" title="CPU 限流时间">
                        <Statistic
                          value={metrics.cpu_throttling_time.current}
                          suffix="秒"
                          precision={2}
                          valueStyle={{ color: metrics.cpu_throttling_time.current > 1 ? '#cf1322' : '#3f8600' }}
                        />
                        {renderChart(metrics.cpu_throttling_time.series, '#ff4d4f', '')}
                      </Card>
                    </Col>
                  )}
                </Row>
              </Card>
            </Col>
          )}

          {/* 网卡丢包情况 */}
          {type === 'pod' && metrics.network_drops && (
            <Col span={24}>
              <Card size="small" title="网卡丢包情况">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="接收丢包"
                      value={metrics.network_drops.receive.current.toFixed(2)}
                      suffix="包/秒"
                      valueStyle={{ color: metrics.network_drops.receive.current > 0 ? '#cf1322' : '#3f8600' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="发送丢包"
                      value={metrics.network_drops.transmit.current.toFixed(2)}
                      suffix="包/秒"
                      valueStyle={{ color: metrics.network_drops.transmit.current > 0 ? '#cf1322' : '#3f8600' }}
                    />
                  </Col>
                </Row>
                {renderNetworkChart(metrics.network_drops.receive.series, metrics.network_drops.transmit.series, '', '接收', '发送')}
              </Card>
            </Col>
          )}

          {/* genAI_main_end */}
        </Row>
      </Card>
    </div>
  );
};

export default MonitoringCharts;