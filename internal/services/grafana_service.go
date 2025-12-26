package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"kubepolaris/pkg/logger"
)

// GrafanaService Grafana API 服务
type GrafanaService struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// GrafanaConfig Grafana 配置
type GrafanaConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	URL     string `mapstructure:"url"`
	APIKey  string `mapstructure:"api_key"`
}

// DataSourceRequest Grafana 数据源请求
type DataSourceRequest struct {
	Name      string                 `json:"name"`
	UID       string                 `json:"uid,omitempty"`
	Type      string                 `json:"type"`
	URL       string                 `json:"url"`
	Access    string                 `json:"access"`
	IsDefault bool                   `json:"isDefault"`
	JSONData  map[string]interface{} `json:"jsonData,omitempty"`
}

// GenerateDataSourceUID 根据集群名生成数据源 UID
func GenerateDataSourceUID(clusterName string) string {
	// 转为小写，替换特殊字符为连字符
	uid := strings.ToLower(clusterName)
	uid = strings.ReplaceAll(uid, " ", "-")
	uid = strings.ReplaceAll(uid, "_", "-")
	return fmt.Sprintf("prometheus-%s", uid)
}

// DataSourceResponse Grafana 数据源响应
type DataSourceResponse struct {
	ID        int    `json:"id"`
	UID       string `json:"uid"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	URL       string `json:"url"`
	IsDefault bool   `json:"isDefault"`
}

// NewGrafanaService 创建 Grafana 服务
func NewGrafanaService(baseURL, apiKey string) *GrafanaService {
	return &GrafanaService{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// IsEnabled 检查 Grafana 服务是否启用
func (s *GrafanaService) IsEnabled() bool {
	return s.baseURL != "" && s.apiKey != ""
}

// SyncDataSource 同步数据源（创建或更新）
func (s *GrafanaService) SyncDataSource(clusterName, prometheusURL string) error {
	if !s.IsEnabled() {
		logger.Info("Grafana 服务未启用，跳过数据源同步")
		return nil
	}

	if prometheusURL == "" {
		logger.Info("Prometheus URL 为空，跳过数据源同步", "cluster", clusterName)
		return nil
	}

	dataSourceName := fmt.Sprintf("Prometheus-%s", clusterName)

	// 先检查数据源是否存在
	exists, err := s.dataSourceExists(dataSourceName)
	if err != nil {
		logger.Error("检查数据源是否存在失败", "error", err)
		// 继续尝试创建
	}

	if exists {
		// 更新现有数据源
		return s.updateDataSource(dataSourceName, clusterName, prometheusURL)
	}

	// 创建新数据源
	return s.createDataSource(dataSourceName, clusterName, prometheusURL)
}

// DeleteDataSource 删除数据源
func (s *GrafanaService) DeleteDataSource(clusterName string) error {
	if !s.IsEnabled() {
		logger.Info("Grafana 服务未启用，跳过数据源删除")
		return nil
	}

	dataSourceName := fmt.Sprintf("Prometheus-%s", clusterName)

	url := fmt.Sprintf("%s/api/datasources/name/%s", s.baseURL, dataSourceName)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("创建删除请求失败: %w", err)
	}

	s.setHeaders(req)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("删除数据源请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		logger.Info("数据源不存在，无需删除", "name", dataSourceName)
		return nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("删除数据源失败: status=%d, body=%s", resp.StatusCode, string(body))
	}

	logger.Info("Grafana 数据源删除成功", "name", dataSourceName)
	return nil
}

// dataSourceExists 检查数据源是否存在
func (s *GrafanaService) dataSourceExists(name string) (bool, error) {
	url := fmt.Sprintf("%s/api/datasources/name/%s", s.baseURL, name)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, err
	}

	s.setHeaders(req)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}

// createDataSource 创建数据源
func (s *GrafanaService) createDataSource(name, clusterName, prometheusURL string) error {
	dsReq := DataSourceRequest{
		Name:      name,
		UID:       GenerateDataSourceUID(clusterName),
		Type:      "prometheus",
		URL:       prometheusURL,
		Access:    "proxy",
		IsDefault: false,
		JSONData: map[string]interface{}{
			"httpMethod":   "POST",
			"timeInterval": "15s",
		},
	}

	body, err := json.Marshal(dsReq)
	if err != nil {
		return fmt.Errorf("序列化数据源请求失败: %w", err)
	}

	url := fmt.Sprintf("%s/api/datasources", s.baseURL)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("创建请求失败: %w", err)
	}

	s.setHeaders(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("创建数据源请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("创建数据源失败: status=%d, body=%s", resp.StatusCode, string(respBody))
	}

	logger.Info("Grafana 数据源创建成功", "name", name, "url", prometheusURL)
	return nil
}

// updateDataSource 更新数据源
func (s *GrafanaService) updateDataSource(name, clusterName, prometheusURL string) error {
	// 先获取数据源 ID
	url := fmt.Sprintf("%s/api/datasources/name/%s", s.baseURL, name)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("创建获取请求失败: %w", err)
	}

	s.setHeaders(req)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("获取数据源失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("数据源不存在: %s", name)
	}

	var ds DataSourceResponse
	if err := json.NewDecoder(resp.Body).Decode(&ds); err != nil {
		return fmt.Errorf("解析数据源响应失败: %w", err)
	}

	// 更新数据源
	dsReq := DataSourceRequest{
		Name:      name,
		UID:       GenerateDataSourceUID(clusterName),
		Type:      "prometheus",
		URL:       prometheusURL,
		Access:    "proxy",
		IsDefault: ds.IsDefault,
		JSONData: map[string]interface{}{
			"httpMethod":   "POST",
			"timeInterval": "15s",
		},
	}

	body, err := json.Marshal(dsReq)
	if err != nil {
		return fmt.Errorf("序列化数据源请求失败: %w", err)
	}

	updateURL := fmt.Sprintf("%s/api/datasources/%d", s.baseURL, ds.ID)
	updateReq, err := http.NewRequest("PUT", updateURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("创建更新请求失败: %w", err)
	}

	s.setHeaders(updateReq)
	updateReq.Header.Set("Content-Type", "application/json")

	updateResp, err := s.httpClient.Do(updateReq)
	if err != nil {
		return fmt.Errorf("更新数据源请求失败: %w", err)
	}
	defer updateResp.Body.Close()

	if updateResp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(updateResp.Body)
		return fmt.Errorf("更新数据源失败: status=%d, body=%s", updateResp.StatusCode, string(respBody))
	}

	logger.Info("Grafana 数据源更新成功", "name", name, "url", prometheusURL)
	return nil
}

// setHeaders 设置请求头
func (s *GrafanaService) setHeaders(req *http.Request) {
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))
	req.Header.Set("Accept", "application/json")
}

// TestConnection 测试 Grafana 连接
func (s *GrafanaService) TestConnection() error {
	if !s.IsEnabled() {
		return fmt.Errorf("Grafana 服务未配置")
	}

	url := fmt.Sprintf("%s/api/health", s.baseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("创建请求失败: %w", err)
	}

	s.setHeaders(req)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("连接 Grafana 失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Grafana 健康检查失败: status=%d", resp.StatusCode)
	}

	return nil
}

// ListDataSources 列出所有数据源
func (s *GrafanaService) ListDataSources() ([]DataSourceResponse, error) {
	if !s.IsEnabled() {
		return nil, fmt.Errorf("Grafana 服务未配置")
	}

	url := fmt.Sprintf("%s/api/datasources", s.baseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	s.setHeaders(req)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("获取数据源列表失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取数据源列表失败: status=%d", resp.StatusCode)
	}

	var dataSources []DataSourceResponse
	if err := json.NewDecoder(resp.Body).Decode(&dataSources); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return dataSources, nil
}
