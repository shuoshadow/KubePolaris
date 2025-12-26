import React, { useMemo, useState } from 'react';
import { Card, Button, Space, Spin, Alert } from 'antd';
import { FullscreenOutlined, ReloadOutlined } from '@ant-design/icons';

interface GrafanaPanelProps {
  // Grafana 配置
  grafanaUrl?: string;           // Grafana 地址，默认从环境变量
  dashboardUid: string;          // Dashboard UID
  panelId: number;               // Panel ID
  
  // 变量参数
  variables?: Record<string, string>;  // 如 { cluster: 'prod', namespace: 'default', pod: 'nginx-xxx' }
  
  // 时间范围
  from?: string;                 // 开始时间，如 'now-1h'
  to?: string;                   // 结束时间，如 'now'
  refresh?: string;              // 刷新间隔，如 '30s'
  
  // 样式
  height?: number;               // 高度
  title?: string;                // 标题
  showToolbar?: boolean;         // 是否显示工具栏
  theme?: 'light' | 'dark';      // 主题
}

const GrafanaPanel: React.FC<GrafanaPanelProps> = ({
  grafanaUrl = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000',
  dashboardUid,
  panelId,
  variables = {},
  from = 'now-1h',
  to = 'now',
  refresh,
  height = 300,
  title,
  showToolbar = true,
  theme = 'light',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // 构建嵌入 URL
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      orgId: '1',
      from,
      to,
      theme,
      panelId: String(panelId),
    });

    // 添加变量参数
    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        params.append(`var-${key}`, value);
      }
    });

    // 添加刷新间隔
    if (refresh) {
      params.append('refresh', refresh);
    }

    // Grafana 嵌入 URL 格式：/d-solo/{uid}/{slug}?{params}
    return `${grafanaUrl}/d-solo/${dashboardUid}/?${params.toString()}`;
  }, [grafanaUrl, dashboardUid, panelId, variables, from, to, refresh, theme]);

  // 完整 Dashboard URL（用于"在 Grafana 中打开"）
  const fullDashboardUrl = useMemo(() => {
    const params = new URLSearchParams({
      orgId: '1',
      from,
      to,
    });
    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        params.append(`var-${key}`, value);
      }
    });
    return `${grafanaUrl}/d/${dashboardUid}/?${params.toString()}`;
  }, [grafanaUrl, dashboardUid, variables, from, to]);

  const handleRefresh = () => {
    setLoading(true);
    setError(false);
    setIframeKey(prev => prev + 1);
  };

  const handleOpenInGrafana = () => {
    window.open(fullDashboardUrl, '_blank');
  };

  return (
    <Card
      title={title}
      size="small"
      extra={
        showToolbar && (
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              size="small" 
              onClick={handleRefresh}
              title="刷新"
            />
            <Button 
              icon={<FullscreenOutlined />} 
              size="small" 
              onClick={handleOpenInGrafana}
              title="在 Grafana 中打开"
            />
          </Space>
        )
      }
      styles={{ body: { padding: 0, position: 'relative' } }}
    >
      {loading && !error && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 10
        }}>
          <Spin tip="加载图表中..." />
        </div>
      )}
      
      {error && (
        <Alert
          message="图表加载失败"
          description="请检查 Grafana 服务是否正常运行，或刷新重试"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleRefresh}>
              重试
            </Button>
          }
          style={{ margin: 16 }}
        />
      )}
      
      <iframe
        key={iframeKey}
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        style={{ border: 'none', display: error ? 'none' : 'block' }}
        title={title || `Grafana Panel ${panelId}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </Card>
  );
};

export default GrafanaPanel;
