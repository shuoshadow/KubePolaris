package services

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"kubepolaris/internal/models"
	"kubepolaris/pkg/logger"
)

// AlertManagerService Alertmanager 服务
type AlertManagerService struct {
	httpClient *http.Client
}

// NewAlertManagerService 创建 Alertmanager 服务
func NewAlertManagerService() *AlertManagerService {
	return &AlertManagerService{
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

// TestConnection 测试 Alertmanager 连接
func (s *AlertManagerService) TestConnection(ctx context.Context, config *models.AlertManagerConfig) error {
	if !config.Enabled {
		return fmt.Errorf("Alertmanager 未启用")
	}

	// 构建测试 URL
	testURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	testURL.Path = "/api/v2/status"

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
		return fmt.Errorf("Alertmanager 响应异常: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	return nil
}

// GetAlerts 获取告警列表
func (s *AlertManagerService) GetAlerts(ctx context.Context, config *models.AlertManagerConfig, filter map[string]string) ([]models.Alert, error) {
	if !config.Enabled {
		return nil, fmt.Errorf("Alertmanager 未启用")
	}

	// 构建 URL
	alertsURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	alertsURL.Path = "/api/v2/alerts"

	// 添加过滤参数
	params := url.Values{}
	if filter != nil {
		for key, value := range filter {
			if value != "" {
				params.Add("filter", fmt.Sprintf("%s=%s", key, value))
			}
		}
	}
	if len(params) > 0 {
		alertsURL.RawQuery = params.Encode()
	}

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", alertsURL.String(), nil)
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
		return nil, fmt.Errorf("获取告警失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取告警失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	// 解析响应 - Alertmanager v2 API 直接返回数组
	var alerts []models.Alert
	if err := json.Unmarshal(body, &alerts); err != nil {
		return nil, fmt.Errorf("解析告警响应失败: %w", err)
	}

	return alerts, nil
}

// GetAlertGroups 获取告警分组
func (s *AlertManagerService) GetAlertGroups(ctx context.Context, config *models.AlertManagerConfig) ([]models.AlertGroup, error) {
	if !config.Enabled {
		return nil, fmt.Errorf("Alertmanager 未启用")
	}

	// 构建 URL
	groupsURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	groupsURL.Path = "/api/v2/alerts/groups"

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", groupsURL.String(), nil)
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
		return nil, fmt.Errorf("获取告警分组失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取告警分组失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	// 解析响应
	var groups []models.AlertGroup
	if err := json.Unmarshal(body, &groups); err != nil {
		return nil, fmt.Errorf("解析告警分组响应失败: %w", err)
	}

	return groups, nil
}

// GetSilences 获取静默规则列表
func (s *AlertManagerService) GetSilences(ctx context.Context, config *models.AlertManagerConfig) ([]models.Silence, error) {
	if !config.Enabled {
		return nil, fmt.Errorf("Alertmanager 未启用")
	}

	// 构建 URL
	silencesURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	silencesURL.Path = "/api/v2/silences"

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", silencesURL.String(), nil)
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
		return nil, fmt.Errorf("获取静默规则失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取静默规则失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	// 解析响应
	var silences []models.Silence
	if err := json.Unmarshal(body, &silences); err != nil {
		return nil, fmt.Errorf("解析静默规则响应失败: %w", err)
	}

	return silences, nil
}

// CreateSilence 创建静默规则
func (s *AlertManagerService) CreateSilence(ctx context.Context, config *models.AlertManagerConfig, silence *models.CreateSilenceRequest) (*models.Silence, error) {
	if !config.Enabled {
		return nil, fmt.Errorf("Alertmanager 未启用")
	}

	// 构建 URL
	silencesURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	silencesURL.Path = "/api/v2/silences"

	// 序列化请求体
	reqBody, err := json.Marshal(silence)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "POST", silencesURL.String(), strings.NewReader(string(reqBody)))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// 设置认证
	if err := s.setAuth(req, config.Auth); err != nil {
		return nil, fmt.Errorf("设置认证失败: %w", err)
	}

	// 执行请求
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("创建静默规则失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("创建静默规则失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	// 解析响应
	var result struct {
		SilenceID string `json:"silenceID"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	logger.Info("创建静默规则成功", "silenceID", result.SilenceID)

	// 返回创建的静默规则
	return &models.Silence{
		ID:        result.SilenceID,
		Matchers:  silence.Matchers,
		StartsAt:  silence.StartsAt,
		EndsAt:    silence.EndsAt,
		CreatedBy: silence.CreatedBy,
		Comment:   silence.Comment,
		Status: models.SilenceStatus{
			State: "active",
		},
	}, nil
}

// DeleteSilence 删除静默规则
func (s *AlertManagerService) DeleteSilence(ctx context.Context, config *models.AlertManagerConfig, silenceID string) error {
	if !config.Enabled {
		return fmt.Errorf("Alertmanager 未启用")
	}

	// 构建 URL
	silenceURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	silenceURL.Path = fmt.Sprintf("/api/v2/silence/%s", silenceID)

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "DELETE", silenceURL.String(), nil)
	if err != nil {
		return fmt.Errorf("创建请求失败: %w", err)
	}

	// 设置认证
	if err := s.setAuth(req, config.Auth); err != nil {
		return fmt.Errorf("设置认证失败: %w", err)
	}

	// 执行请求
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("删除静默规则失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("删除静默规则失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	logger.Info("删除静默规则成功", "silenceID", silenceID)
	return nil
}

// GetStatus 获取 Alertmanager 状态
func (s *AlertManagerService) GetStatus(ctx context.Context, config *models.AlertManagerConfig) (*models.AlertManagerStatus, error) {
	if !config.Enabled {
		return nil, fmt.Errorf("Alertmanager 未启用")
	}

	// 构建 URL
	statusURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	statusURL.Path = "/api/v2/status"

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", statusURL.String(), nil)
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
		return nil, fmt.Errorf("获取状态失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取状态失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	// 解析响应
	var status models.AlertManagerStatus
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, fmt.Errorf("解析状态响应失败: %w", err)
	}

	return &status, nil
}

// GetReceivers 获取接收器列表
func (s *AlertManagerService) GetReceivers(ctx context.Context, config *models.AlertManagerConfig) ([]models.Receiver, error) {
	if !config.Enabled {
		return nil, fmt.Errorf("Alertmanager 未启用")
	}

	// 构建 URL
	receiversURL, err := url.Parse(config.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("无效的 Alertmanager 端点: %w", err)
	}
	receiversURL.Path = "/api/v2/receivers"

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", receiversURL.String(), nil)
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
		return nil, fmt.Errorf("获取接收器失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取接收器失败: %s, 状态码: %d", string(body), resp.StatusCode)
	}

	// 解析响应
	var receivers []models.Receiver
	if err := json.Unmarshal(body, &receivers); err != nil {
		return nil, fmt.Errorf("解析接收器响应失败: %w", err)
	}

	return receivers, nil
}

// GetAlertStats 获取告警统计信息
func (s *AlertManagerService) GetAlertStats(ctx context.Context, config *models.AlertManagerConfig) (*models.AlertStats, error) {
	alerts, err := s.GetAlerts(ctx, config, nil)
	if err != nil {
		return nil, err
	}

	stats := &models.AlertStats{
		Total:      len(alerts),
		Firing:     0,
		Pending:    0,
		Resolved:   0,
		Suppressed: 0,
		BySeverity: make(map[string]int),
	}

	for _, alert := range alerts {
		// 统计状态
		switch alert.Status.State {
		case "active":
			stats.Firing++
		case "suppressed":
			stats.Suppressed++
		case "resolved":
			stats.Resolved++
		}

		// 统计严重程度
		if severity, ok := alert.Labels["severity"]; ok {
			stats.BySeverity[severity]++
		}
	}

	return stats, nil
}

// setAuth 设置认证
func (s *AlertManagerService) setAuth(req *http.Request, auth *models.MonitoringAuth) error {
	if auth == nil {
		return nil
	}

	switch auth.Type {
	case "none", "":
		// 无需认证
		return nil
	case "basic":
		req.SetBasicAuth(auth.Username, auth.Password)
	case "bearer":
		req.Header.Set("Authorization", "Bearer "+auth.Token)
	default:
		return fmt.Errorf("不支持的认证类型: %s", auth.Type)
	}

	return nil
}

