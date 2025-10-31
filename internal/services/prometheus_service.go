package services

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"kubepolaris/internal/models"
	"kubepolaris/pkg/logger"
)

// PrometheusService Prometheus 查询服务
type PrometheusService struct {
	httpClient *http.Client
}

// NewPrometheusService 创建 Prometheus 服务
func NewPrometheusService() *PrometheusService {
	return &PrometheusService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true, // 可根据需要调整
				},
			},
		},
	}
}

// QueryPrometheus 查询 Prometheus
func (s *PrometheusService) QueryPrometheus(ctx context.Context, config *models.MonitoringConfig, query *models.MetricsQuery) (*models.MetricsResponse, error) {
	if config.Type == "disabled" {
		return nil, fmt.Errorf("监控功能已禁用")
	}

	// 构建查询 URL
	queryURL, err := s.buildQueryURL(config.Endpoint, query)
	if err != nil {
		return nil, fmt.Errorf("构建查询URL失败: %w", err)
	}

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", queryURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	// 设置认证
	if err := s.setAuth(req, config.Auth); err != nil {
		return nil, fmt.Errorf("设置认证失败: %w", err)
	}

	// 执行请求
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("执行请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	// 检查状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("查询失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	// 解析响应
	var result models.MetricsResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return &result, nil
}

// QueryClusterMetrics 查询集群监控指标
func (s *PrometheusService) QueryClusterMetrics(ctx context.Context, config *models.MonitoringConfig, clusterName string, timeRange string, step string) (*models.ClusterMetricsData, error) {
	// 解析时间范围
	start, end, err := s.parseTimeRange(timeRange)
	if err != nil {
		return nil, fmt.Errorf("解析时间范围失败: %w", err)
	}

	metrics := &models.ClusterMetricsData{}

	// 构建集群标签选择器
	clusterSelector := s.buildClusterSelector(config.Labels, clusterName)

	// 如果是 prometheus ，标签不用过来
	clusterSelector = ""

	// 查询 CPU 使用率
	// todo prometheus 不加集群标签，victoriametrics 需要加集群标签
	if cpuSeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("(1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[1m]))) * 100"), start, end, step); err == nil {
		metrics.CPU = cpuSeries
	}

	// 查询内存使用率
	if memorySeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("(1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)) * 100"), start, end, step); err == nil {
		metrics.Memory = memorySeries
	}

	// 查询网络指标
	if networkMetrics, err := s.queryNetworkMetrics(ctx, config, clusterSelector, start, end, step); err == nil {
		metrics.Network = networkMetrics
	}

	// // 查询存储指标
	// if storageSeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(node_filesystem_size_bytes{%s}) - sum(node_filesystem_avail_bytes{%s})", clusterSelector, clusterSelector), start, end, step); err == nil {
	// 	metrics.Storage = storageSeries
	// }

	// 查询 Pod 指标
	if podMetrics, err := s.queryPodMetrics(ctx, config, clusterSelector); err == nil {
		metrics.Pods = podMetrics
	}

	return metrics, nil
}

// QueryNodeMetrics 查询节点监控指标
func (s *PrometheusService) QueryNodeMetrics(ctx context.Context, config *models.MonitoringConfig, clusterName, nodeName string, timeRange string, step string) (*models.ClusterMetricsData, error) {
	// 解析时间范围
	start, end, err := s.parseTimeRange(timeRange)
	if err != nil {
		return nil, fmt.Errorf("解析时间范围失败: %w", err)
	}

	metrics := &models.ClusterMetricsData{}

	// 构建节点标签选择器
	nodeSelector := s.buildNodeSelector(config.Labels, clusterName, nodeName)

	// 查询节点 CPU 使用率
	if cpuSeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("rate(node_cpu_seconds_total{mode!=\"idle\",%s}[5m])", nodeSelector), start, end, step); err == nil {
		metrics.CPU = cpuSeries
	}

	// 查询节点内存使用率
	if memorySeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("(1 - (node_memory_MemAvailable_bytes{%s} / node_memory_MemTotal_bytes{%s}))", nodeSelector, nodeSelector), start, end, step); err == nil {
		metrics.Memory = memorySeries
	}

	// 查询节点网络指标
	if networkMetrics, err := s.queryNodeNetworkMetrics(ctx, config, nodeSelector, start, end, step); err == nil {
		metrics.Network = networkMetrics
	}

	// 查询节点存储指标
	if storageSeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("(1 - (node_filesystem_avail_bytes{%s} / node_filesystem_size_bytes{%s}))", nodeSelector, nodeSelector), start, end, step); err == nil {
		metrics.Storage = storageSeries
	}

	return metrics, nil
}

// QueryPodMetrics 查询 Pod 监控指标
func (s *PrometheusService) QueryPodMetrics(ctx context.Context, config *models.MonitoringConfig, clusterName, namespace, podName string, timeRange string, step string) (*models.ClusterMetricsData, error) {
	// 解析时间范围
	start, end, err := s.parseTimeRange(timeRange)
	if err != nil {
		return nil, fmt.Errorf("解析时间范围失败: %w", err)
	}

	metrics := &models.ClusterMetricsData{}

	// 构建 Pod 标签选择器
	podSelector := s.buildPodSelector(config.Labels, clusterName, namespace, podName)

	// 查询 Pod CPU 使用率
	if cpuSeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum (rate(container_cpu_usage_seconds_total{container!=\"\",%s}[1m])) by(pod) /( sum (kube_pod_container_resource_limits{container!=\"\",resource=\"cpu\",%s}) by(pod) ) * 100", podSelector, podSelector), start, end, step); err == nil {
		metrics.CPU = cpuSeries
	}

	// 查询 Pod 内存使用率
	if memorySeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(container_memory_working_set_bytes{container!=\"\",container!=\"POD\",%s}) by(pod)/sum(kube_pod_container_resource_limits{container!=\"\",container!=\"POD\",resource=\"memory\",%s}) by (pod) * 100", podSelector, podSelector), start, end, step); err == nil {
		// if memorySeries, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("container_memory_working_set_bytes{%s}", podSelector), start, end, step); err == nil {
		metrics.Memory = memorySeries
	}

	// 查询 Pod 网络指标
	if networkMetrics, err := s.queryPodNetworkMetrics(ctx, config, podSelector, start, end, step); err == nil {
		metrics.Network = networkMetrics
	}

	/** genAI_main_start */
	// 查询 CPU Request（固定值）
	if cpuRequest, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(kube_pod_container_resource_requests{resource=\"cpu\",%s}) by (pod)", podSelector), start, end, step); err == nil {
		metrics.CPURequest = cpuRequest
	}

	// 查询 CPU Limit（固定值）
	if cpuLimit, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(kube_pod_container_resource_limits{resource=\"cpu\",%s}) by (pod)", podSelector), start, end, step); err == nil {
		metrics.CPULimit = cpuLimit
	}

	// 查询 Memory Request（固定值）
	if memoryRequest, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(kube_pod_container_resource_requests{resource=\"memory\",%s}) by (pod)", podSelector), start, end, step); err == nil {
		metrics.MemoryRequest = memoryRequest
	}

	// 查询 Memory Limit（固定值）
	if memoryLimit, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(kube_pod_container_resource_limits{resource=\"memory\",%s}) by (pod)", podSelector), start, end, step); err == nil {
		metrics.MemoryLimit = memoryLimit
	}

	// 查询健康检查失败次数
	if probeFailures, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("increase(prober_probe_total{result='failed',%s}[1m])", podSelector), start, end, step); err == nil {
		metrics.ProbeFailures = probeFailures
	}

	// 查询容器重启次数
	if restarts, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("kube_pod_container_status_restarts_total{%s}", podSelector), start, end, step); err == nil {
		metrics.ContainerRestarts = restarts
	}

	// 查询网络PPS
	if networkPPS, err := s.queryPodNetworkPPS(ctx, config, podSelector, start, end, step); err == nil {
		metrics.NetworkPPS = networkPPS
	}

	// 查询线程数
	if threads, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(container_threads{container!=\"\",container!=\"POD\",%s})", podSelector), start, end, step); err == nil {
		metrics.Threads = threads
	}

	// 查询网卡丢包情况
	if networkDrops, err := s.queryPodNetworkDrops(ctx, config, podSelector, start, end, step); err == nil {
		metrics.NetworkDrops = networkDrops
	}

	// 查询 CPU 限流比例
	if cpuThrottling, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(rate(container_cpu_cfs_throttled_periods_total{%s}[1m])) / sum(rate(container_cpu_cfs_periods_total{%s}[5m])) * 100", podSelector, podSelector), start, end, step); err == nil {
		metrics.CPUThrottling = cpuThrottling
	}

	// 查询 CPU 限流时间
	if cpuThrottlingTime, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(rate(container_cpu_cfs_throttled_seconds_total{%s}[1m]))", podSelector), start, end, step); err == nil {
		metrics.CPUThrottlingTime = cpuThrottlingTime
	}

	// 查询磁盘 IOPS
	if diskIOPS, err := s.queryPodDiskIOPS(ctx, config, podSelector, start, end, step); err == nil {
		metrics.DiskIOPS = diskIOPS
	}

	// 查询磁盘吞吐量
	if diskThroughput, err := s.queryPodDiskThroughput(ctx, config, podSelector, start, end, step); err == nil {
		metrics.DiskThroughput = diskThroughput
	}

	// 查询 CPU 实际使用量（cores）
	if cpuAbsolute, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(rate(container_cpu_usage_seconds_total{container!=\"\",container!=\"POD\",%s}[1m]))", podSelector), start, end, step); err == nil {
		metrics.CPUUsageAbsolute = cpuAbsolute
	}

	// 查询内存实际使用量（bytes）
	if memoryBytes, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(container_memory_working_set_bytes{container!=\"\",container!=\"POD\",%s})", podSelector), start, end, step); err == nil {
		metrics.MemoryUsageBytes = memoryBytes
	}

	// 查询 OOM Kill 次数
	if oomKills, err := s.queryMetricSeries(ctx, config, fmt.Sprintf("sum(container_oom_events_total{container!=\"\",container!=\"POD\",%s})", podSelector), start, end, step); err == nil {
		metrics.OOMKills = oomKills
	}
	/** genAI_main_end */

	return metrics, nil
}

// buildQueryURL 构建查询 URL
func (s *PrometheusService) buildQueryURL(endpoint string, query *models.MetricsQuery) (*url.URL, error) {
	baseURL, err := url.Parse(endpoint)
	if err != nil {
		return nil, err
	}

	// 设置查询路径
	baseURL.Path = "/api/v1/query_range"

	// 设置查询参数
	params := url.Values{}
	params.Set("query", query.Query)
	params.Set("start", strconv.FormatInt(query.Start, 10))
	params.Set("end", strconv.FormatInt(query.End, 10))
	params.Set("step", query.Step)

	if query.Timeout != "" {
		params.Set("timeout", query.Timeout)
	}

	baseURL.RawQuery = params.Encode()
	return baseURL, nil
}

// setAuth 设置认证
func (s *PrometheusService) setAuth(req *http.Request, auth *models.MonitoringAuth) error {
	if auth == nil {
		return nil
	}

	switch auth.Type {
	case "none":
		// 无需认证，直接返回
		return nil
	case "basic":
		req.SetBasicAuth(auth.Username, auth.Password)
	case "bearer":
		req.Header.Set("Authorization", "Bearer "+auth.Token)
	case "mtls":
		// mTLS 认证需要在创建 HTTP 客户端时配置
		// 这里可以添加证书配置逻辑
		return fmt.Errorf("mTLS 认证暂未实现")
	default:
		return fmt.Errorf("不支持的认证类型: %s", auth.Type)
	}

	return nil
}

// parseTimeRange 解析时间范围
func (s *PrometheusService) parseTimeRange(timeRange string) (int64, int64, error) {
	now := time.Now()
	var duration time.Duration
	var err error

	switch timeRange {
	case "1h":
		duration = time.Hour
	case "6h":
		duration = 6 * time.Hour
	case "24h", "1d":
		duration = 24 * time.Hour
	case "7d":
		duration = 7 * 24 * time.Hour
	case "30d":
		duration = 30 * 24 * time.Hour
	default:
		duration, err = time.ParseDuration(timeRange)
		if err != nil {
			return 0, 0, fmt.Errorf("无效的时间范围: %s", timeRange)
		}
	}

	end := now.Unix()
	start := now.Add(-duration).Unix()
	return start, end, nil
}

// buildClusterSelector 构建集群标签选择器
func (s *PrometheusService) buildClusterSelector(labels map[string]string, clusterName string) string {
	selectors := []string{}

	// 添加集群标签
	if clusterName != "" {
		selectors = append(selectors, fmt.Sprintf("cluster=\"%s\"", clusterName))
	}

	// 添加自定义标签
	for key, value := range labels {
		selectors = append(selectors, fmt.Sprintf("%s=\"%s\"", key, value))
	}

	return strings.Join(selectors, ",")
}

// buildNodeSelector 构建节点标签选择器
func (s *PrometheusService) buildNodeSelector(labels map[string]string, clusterName, nodeName string) string {
	selectors := []string{}

	// 添加集群标签
	if clusterName != "" {
		selectors = append(selectors, fmt.Sprintf("cluster=\"%s\"", clusterName))
	}

	// 添加节点标签
	if nodeName != "" {
		selectors = append(selectors, fmt.Sprintf("instance=~\".*%s.*\"", nodeName))
	}

	// 添加自定义标签
	for key, value := range labels {
		selectors = append(selectors, fmt.Sprintf("%s=\"%s\"", key, value))
	}

	return strings.Join(selectors, ",")
}

// buildPodSelector 构建 Pod 标签选择器
func (s *PrometheusService) buildPodSelector(labels map[string]string, clusterName, namespace, podName string) string {
	selectors := []string{}

	// 添加集群标签
	if clusterName != "" {
		selectors = append(selectors, fmt.Sprintf("cluster=\"%s\"", clusterName))
	}

	// 添加命名空间标签
	if namespace != "" {
		selectors = append(selectors, fmt.Sprintf("namespace=\"%s\"", namespace))
	}

	// 添加 Pod 标签
	if podName != "" {
		selectors = append(selectors, fmt.Sprintf("pod=\"%s\"", podName))
	}

	// 添加自定义标签
	for key, value := range labels {
		selectors = append(selectors, fmt.Sprintf("%s=\"%s\"", key, value))
	}

	return strings.Join(selectors, ",")
}

// queryMetricSeries 查询指标时间序列
func (s *PrometheusService) queryMetricSeries(ctx context.Context, config *models.MonitoringConfig, query string, start, end int64, step string) (*models.MetricSeries, error) {
	fmt.Println("query", query)
	metricsQuery := &models.MetricsQuery{
		Query: query,
		Start: start,
		End:   end,
		Step:  step,
	}

	resp, err := s.QueryPrometheus(ctx, config, metricsQuery)
	if err != nil {
		return nil, err
	}

	if len(resp.Data.Result) == 0 {
		return &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}, nil
	}

	// 处理第一个结果
	result := resp.Data.Result[0]
	var series []models.DataPoint
	var current float64

	if len(result.Values) > 0 {
		// 时间序列数据
		for _, value := range result.Values {
			if len(value) >= 2 {
				timestamp, _ := strconv.ParseInt(fmt.Sprintf("%.0f", value[0]), 10, 64)
				val, _ := strconv.ParseFloat(fmt.Sprintf("%v", value[1]), 64)
				series = append(series, models.DataPoint{
					Timestamp: timestamp,
					Value:     val,
				})
			}
		}
		// 当前值取最后一个
		if len(series) > 0 {
			current = series[len(series)-1].Value
		}
	} else if len(result.Value) >= 2 {
		// 即时查询数据
		timestamp, _ := strconv.ParseInt(fmt.Sprintf("%.0f", result.Value[0]), 10, 64)
		val, _ := strconv.ParseFloat(fmt.Sprintf("%v", result.Value[1]), 64)
		series = append(series, models.DataPoint{
			Timestamp: timestamp,
			Value:     val,
		})
		current = val
	}

	return &models.MetricSeries{
		Current: current,
		Series:  series,
	}, nil
}

// queryNetworkMetrics 查询网络指标
func (s *PrometheusService) queryNetworkMetrics(ctx context.Context, config *models.MonitoringConfig, selector string, start, end int64, step string) (*models.NetworkMetrics, error) {
	// 查询入站流量
	inQuery := fmt.Sprintf("sum(rate(container_network_receive_bytes_total{%s}[5m]))", selector)
	inSeries, err := s.queryMetricSeries(ctx, config, inQuery, start, end, step)
	if err != nil {
		logger.Error("查询入站网络指标失败", "error", err)
		inSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	// 查询出站流量
	outQuery := fmt.Sprintf("sum(rate(container_network_transmit_bytes_total{%s}[5m]))", selector)
	outSeries, err := s.queryMetricSeries(ctx, config, outQuery, start, end, step)
	if err != nil {
		logger.Error("查询出站网络指标失败", "error", err)
		outSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	return &models.NetworkMetrics{
		In:  inSeries,
		Out: outSeries,
	}, nil
}

// queryNodeNetworkMetrics 查询节点网络指标
func (s *PrometheusService) queryNodeNetworkMetrics(ctx context.Context, config *models.MonitoringConfig, selector string, start, end int64, step string) (*models.NetworkMetrics, error) {
	// 查询入站流量
	inQuery := fmt.Sprintf("rate(node_network_receive_bytes_total{%s}[5m])", selector)
	inSeries, err := s.queryMetricSeries(ctx, config, inQuery, start, end, step)
	if err != nil {
		logger.Error("查询节点入站网络指标失败", "error", err)
		inSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	// 查询出站流量
	outQuery := fmt.Sprintf("rate(node_network_transmit_bytes_total{%s}[5m])", selector)
	outSeries, err := s.queryMetricSeries(ctx, config, outQuery, start, end, step)
	if err != nil {
		logger.Error("查询节点出站网络指标失败", "error", err)
		outSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	return &models.NetworkMetrics{
		In:  inSeries,
		Out: outSeries,
	}, nil
}

// queryPodNetworkMetrics 查询 Pod 网络指标
func (s *PrometheusService) queryPodNetworkMetrics(ctx context.Context, config *models.MonitoringConfig, selector string, start, end int64, step string) (*models.NetworkMetrics, error) {
	// 查询入站流量
	inQuery := fmt.Sprintf("rate(container_network_receive_bytes_total{%s}[5m])", selector)
	inSeries, err := s.queryMetricSeries(ctx, config, inQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod入站网络指标失败", "error", err)
		inSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	// 查询出站流量
	outQuery := fmt.Sprintf("rate(container_network_transmit_bytes_total{%s}[5m])", selector)
	outSeries, err := s.queryMetricSeries(ctx, config, outQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod出站网络指标失败", "error", err)
		outSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	return &models.NetworkMetrics{
		In:  inSeries,
		Out: outSeries,
	}, nil
}

// queryPodMetrics 查询 Pod 统计指标
func (s *PrometheusService) queryPodMetrics(ctx context.Context, config *models.MonitoringConfig, selector string) (*models.PodMetrics, error) {
	// 查询总 Pod 数
	totalQuery := fmt.Sprintf("sum(kube_pod_info{%s})", selector)
	totalResp, err := s.QueryPrometheus(ctx, config, &models.MetricsQuery{
		Query: totalQuery,
		Start: time.Now().Unix(),
		End:   time.Now().Unix(),
		Step:  "1m",
	})
	if err != nil {
		logger.Error("查询Pod总数失败", "error", err)
		return &models.PodMetrics{}, nil
	}
	total := 0
	if len(totalResp.Data.Result) > 0 {
		if val, err := strconv.ParseFloat(fmt.Sprintf("%v", totalResp.Data.Result[0].Values[0][1]), 64); err == nil {
			total = int(val)
		}
	}

	// 查询运行中 Pod 数
	runningQuery := fmt.Sprintf("sum(kube_pod_status_phase{phase=\"Running\",%s})", selector)
	runningResp, err := s.QueryPrometheus(ctx, config, &models.MetricsQuery{
		Query: runningQuery,
		Start: time.Now().Unix(),
		End:   time.Now().Unix(),
		Step:  "1m",
	})
	if err != nil {
		logger.Error("查询运行中Pod数失败", "error", err)
		return &models.PodMetrics{Total: total}, nil
	}

	running := 0
	if len(runningResp.Data.Result) > 0 {
		if val, err := strconv.ParseFloat(fmt.Sprintf("%v", runningResp.Data.Result[0].Values[0][1]), 64); err == nil {
			running = int(val)
		}
	}

	// 查询 Pending Pod 数
	pendingQuery := fmt.Sprintf("sum(kube_pod_status_phase{phase=\"Pending\",%s})", selector)
	pendingResp, err := s.QueryPrometheus(ctx, config, &models.MetricsQuery{
		Query: pendingQuery,
		Start: time.Now().Unix(),
		End:   time.Now().Unix(),
		Step:  "1m",
	})
	if err != nil {
		logger.Error("查询Pending Pod数失败", "error", err)
		return &models.PodMetrics{Total: total, Running: running}, nil
	}

	pending := 0
	if len(pendingResp.Data.Result) > 0 {
		if val, err := strconv.ParseFloat(fmt.Sprintf("%v", pendingResp.Data.Result[0].Values[0][1]), 64); err == nil {
			pending = int(val)
		}
	}

	// 查询失败 Pod 数
	failedQuery := fmt.Sprintf("sum(kube_pod_status_phase{phase=\"Failed\",%s})", selector)
	failedResp, err := s.QueryPrometheus(ctx, config, &models.MetricsQuery{
		Query: failedQuery,
		Start: time.Now().Unix(),
		End:   time.Now().Unix(),
		Step:  "1m",
	})
	if err != nil {
		logger.Error("查询失败Pod数失败", "error", err)
		return &models.PodMetrics{Total: total, Running: running, Pending: pending}, nil
	}

	failed := 0
	if len(failedResp.Data.Result) > 0 {
		if val, err := strconv.ParseFloat(fmt.Sprintf("%v", failedResp.Data.Result[0].Values[0][1]), 64); err == nil {
			failed = int(val)
		}
	}

	return &models.PodMetrics{
		Total:   total,
		Running: running,
		Pending: pending,
		Failed:  failed,
	}, nil
}

// QueryContainerSubnetIPs 查询容器子网IP信息
func (s *PrometheusService) QueryContainerSubnetIPs(ctx context.Context, config *models.MonitoringConfig) (*models.ContainerSubnetIPs, error) {
	if config.Type == "disabled" {
		return nil, fmt.Errorf("监控功能已禁用")
	}

	// 查询总IP数
	totalIPsQuery := "sum(ipam_ippool_size)"
	totalResp, err := s.QueryPrometheus(ctx, config, &models.MetricsQuery{
		Query: totalIPsQuery,
		Start: time.Now().Unix(),
		End:   time.Now().Unix(),
		Step:  "1m",
	})
	if err != nil {
		logger.Error("查询总IP数失败", "error", err)
		return &models.ContainerSubnetIPs{}, nil
	}

	totalIPs := 0
	if len(totalResp.Data.Result) > 0 && len(totalResp.Data.Result[0].Values) > 0 {
		if val, err := strconv.ParseFloat(fmt.Sprintf("%v", totalResp.Data.Result[0].Values[0][1]), 64); err == nil {
			totalIPs = int(val)
		}
	}

	// 查询已使用IP数
	usedIPsQuery := "sum(ipam_allocations_in_use)"
	usedResp, err := s.QueryPrometheus(ctx, config, &models.MetricsQuery{
		Query: usedIPsQuery,
		Start: time.Now().Unix(),
		End:   time.Now().Unix(),
		Step:  "1m",
	})
	if err != nil {
		logger.Error("查询已使用IP数失败", "error", err)
		return &models.ContainerSubnetIPs{TotalIPs: totalIPs}, nil
	}

	usedIPs := 0
	if len(usedResp.Data.Result) > 0 && len(usedResp.Data.Result[0].Values) > 0 {
		if val, err := strconv.ParseFloat(fmt.Sprintf("%v", usedResp.Data.Result[0].Values[0][1]), 64); err == nil {
			usedIPs = int(val)
		}
	}

	// 计算可用IP数
	availableIPs := totalIPs - usedIPs
	if availableIPs < 0 {
		availableIPs = 0
	}

	return &models.ContainerSubnetIPs{
		TotalIPs:     totalIPs,
		UsedIPs:      usedIPs,
		AvailableIPs: availableIPs,
	}, nil
}

// TestConnection 测试监控数据源连接
func (s *PrometheusService) TestConnection(ctx context.Context, config *models.MonitoringConfig) error {
	if config.Type == "disabled" {
		return fmt.Errorf("监控功能已禁用")
	}

	// 构建测试查询 URL
	testURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return fmt.Errorf("无效的监控端点: %w", err)
	}
	testURL.Path = "/api/v1/query"
	testURL.RawQuery = "query=up"

	// 创建测试请求
	req, err := http.NewRequestWithContext(ctx, "GET", testURL.String(), nil)
	if err != nil {
		return fmt.Errorf("创建测试请求失败: %w", err)
	}

	// 设置认证
	if err := s.setAuth(req, config.Auth); err != nil {
		return fmt.Errorf("设置认证失败: %w", err)
	}

	// 执行测试请求
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("连接测试失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("监控数据源响应异常: %s", string(body))
	}

	return nil
}

/** genAI_main_start */
// queryPodNetworkPPS 查询 Pod 网络PPS指标
func (s *PrometheusService) queryPodNetworkPPS(ctx context.Context, config *models.MonitoringConfig, selector string, start, end int64, step string) (*models.NetworkPPS, error) {
	// 查询入站PPS
	inQuery := fmt.Sprintf("sum(rate(container_network_receive_packets_total{%s}[1m]))", selector)
	inSeries, err := s.queryMetricSeries(ctx, config, inQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod入站PPS失败", "error", err)
		inSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	// 查询出站PPS
	outQuery := fmt.Sprintf("sum(rate(container_network_transmit_packets_total{%s}[1m]))", selector)
	outSeries, err := s.queryMetricSeries(ctx, config, outQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod出站PPS失败", "error", err)
		outSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	return &models.NetworkPPS{
		In:  inSeries,
		Out: outSeries,
	}, nil
}

// queryPodNetworkDrops 查询 Pod 网卡丢包情况
func (s *PrometheusService) queryPodNetworkDrops(ctx context.Context, config *models.MonitoringConfig, selector string, start, end int64, step string) (*models.NetworkDrops, error) {
	// 查询接收丢包
	receiveQuery := fmt.Sprintf("sum(rate(container_network_receive_packets_dropped_total{%s}[1m]))", selector)
	receiveSeries, err := s.queryMetricSeries(ctx, config, receiveQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod接收丢包失败", "error", err)
		receiveSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	// 查询发送丢包
	transmitQuery := fmt.Sprintf("sum(rate(container_network_transmit_packets_dropped_total{%s}[1m]))", selector)
	transmitSeries, err := s.queryMetricSeries(ctx, config, transmitQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod发送丢包失败", "error", err)
		transmitSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	return &models.NetworkDrops{
		Receive:  receiveSeries,
		Transmit: transmitSeries,
	}, nil
}

// queryPodDiskIOPS 查询 Pod 磁盘IOPS
func (s *PrometheusService) queryPodDiskIOPS(ctx context.Context, config *models.MonitoringConfig, selector string, start, end int64, step string) (*models.DiskIOPS, error) {
	// 查询读IOPS
	readQuery := fmt.Sprintf("sum(rate(container_fs_reads_total{%s}[1m]))", selector)
	readSeries, err := s.queryMetricSeries(ctx, config, readQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod磁盘读IOPS失败", "error", err)
		readSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	// 查询写IOPS
	writeQuery := fmt.Sprintf("sum(rate(container_fs_writes_total{%s}[1m]))", selector)
	writeSeries, err := s.queryMetricSeries(ctx, config, writeQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod磁盘写IOPS失败", "error", err)
		writeSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	return &models.DiskIOPS{
		Read:  readSeries,
		Write: writeSeries,
	}, nil
}

// queryPodDiskThroughput 查询 Pod 磁盘吞吐量
func (s *PrometheusService) queryPodDiskThroughput(ctx context.Context, config *models.MonitoringConfig, selector string, start, end int64, step string) (*models.DiskThroughput, error) {
	// 查询读吞吐量
	readQuery := fmt.Sprintf("sum(rate(container_fs_reads_bytes_total{container!=\"\",container!=\"POD\",%s}[1m]))", selector)
	readSeries, err := s.queryMetricSeries(ctx, config, readQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod磁盘读吞吐量失败", "error", err)
		readSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	// 查询写吞吐量
	writeQuery := fmt.Sprintf("sum(rate(container_fs_writes_bytes_total{container!=\"\",container!=\"POD\",%s}[1m]))", selector)
	writeSeries, err := s.queryMetricSeries(ctx, config, writeQuery, start, end, step)
	if err != nil {
		logger.Error("查询Pod磁盘写吞吐量失败", "error", err)
		writeSeries = &models.MetricSeries{Current: 0, Series: []models.DataPoint{}}
	}

	return &models.DiskThroughput{
		Read:  readSeries,
		Write: writeSeries,
	}, nil
}

/** genAI_main_end */
