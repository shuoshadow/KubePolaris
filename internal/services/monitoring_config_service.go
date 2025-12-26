package services

import (
	"encoding/json"
	"fmt"

	"kubepolaris/internal/models"
	"kubepolaris/pkg/logger"

	"gorm.io/gorm"
)

// MonitoringConfigService 监控配置服务
type MonitoringConfigService struct {
	db             *gorm.DB
	grafanaService *GrafanaService
}

// NewMonitoringConfigService 创建监控配置服务
func NewMonitoringConfigService(db *gorm.DB) *MonitoringConfigService {
	return &MonitoringConfigService{db: db}
}

// NewMonitoringConfigServiceWithGrafana 创建带 Grafana 同步功能的监控配置服务
func NewMonitoringConfigServiceWithGrafana(db *gorm.DB, grafanaService *GrafanaService) *MonitoringConfigService {
	return &MonitoringConfigService{
		db:             db,
		grafanaService: grafanaService,
	}
}

// GetMonitoringConfig 获取集群监控配置
func (s *MonitoringConfigService) GetMonitoringConfig(clusterID uint) (*models.MonitoringConfig, error) {
	var cluster models.Cluster
	if err := s.db.Select("monitoring_config").First(&cluster, clusterID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("集群不存在: %d", clusterID)
		}
		return nil, fmt.Errorf("获取集群失败: %w", err)
	}

	if cluster.MonitoringConfig == "" {
		// 返回默认配置（禁用监控）
		return &models.MonitoringConfig{
			Type: "disabled",
		}, nil
	}

	var config models.MonitoringConfig
	if err := json.Unmarshal([]byte(cluster.MonitoringConfig), &config); err != nil {
		logger.Error("解析监控配置失败", "cluster_id", clusterID, "error", err)
		return &models.MonitoringConfig{
			Type: "disabled",
		}, nil
	}

	return &config, nil
}

// UpdateMonitoringConfig 更新集群监控配置
func (s *MonitoringConfigService) UpdateMonitoringConfig(clusterID uint, config *models.MonitoringConfig) error {
	// 验证配置
	if err := s.validateConfig(config); err != nil {
		return fmt.Errorf("配置验证失败: %w", err)
	}

	// 获取集群名称（用于 Grafana 数据源命名）
	var cluster models.Cluster
	if err := s.db.Select("name").First(&cluster, clusterID).Error; err != nil {
		return fmt.Errorf("获取集群信息失败: %w", err)
	}

	// 序列化配置
	configJSON, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("序列化配置失败: %w", err)
	}

	// 更新数据库
	result := s.db.Model(&models.Cluster{}).Where("id = ?", clusterID).Update("monitoring_config", string(configJSON))
	if result.Error != nil {
		return fmt.Errorf("更新监控配置失败: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("集群不存在: %d", clusterID)
	}

	// 同步 Grafana 数据源
	if s.grafanaService != nil && s.grafanaService.IsEnabled() {
		if config.Type == "disabled" {
			// 监控禁用时删除数据源
			if err := s.grafanaService.DeleteDataSource(cluster.Name); err != nil {
				logger.Error("删除 Grafana 数据源失败", "cluster", cluster.Name, "error", err)
				// 不返回错误，只记录日志
			}
		} else {
			// 同步数据源
			if err := s.grafanaService.SyncDataSource(cluster.Name, config.Endpoint); err != nil {
				logger.Error("同步 Grafana 数据源失败", "cluster", cluster.Name, "error", err)
				// 不返回错误，只记录日志
			}
		}
	}

	logger.Info("监控配置更新成功", "cluster_id", clusterID, "type", config.Type)
	return nil
}

// DeleteMonitoringConfig 删除集群监控配置
func (s *MonitoringConfigService) DeleteMonitoringConfig(clusterID uint) error {
	result := s.db.Model(&models.Cluster{}).Where("id = ?", clusterID).Update("monitoring_config", "")
	if result.Error != nil {
		return fmt.Errorf("删除监控配置失败: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("集群不存在: %d", clusterID)
	}

	logger.Info("监控配置删除成功", "cluster_id", clusterID)
	return nil
}

// validateConfig 验证监控配置
func (s *MonitoringConfigService) validateConfig(config *models.MonitoringConfig) error {
	if config.Type == "disabled" {
		return nil // 禁用监控不需要验证
	}

	if config.Endpoint == "" {
		return fmt.Errorf("监控端点不能为空")
	}

	// 验证认证配置
	if config.Auth != nil {
		switch config.Auth.Type {
		case "none":
			// 无需认证，不需要验证额外字段
		case "basic":
			if config.Auth.Username == "" || config.Auth.Password == "" {
				return fmt.Errorf("Basic 认证需要用户名和密码")
			}
		case "bearer":
			if config.Auth.Token == "" {
				return fmt.Errorf("Bearer 认证需要 Token")
			}
		case "mtls":
			if config.Auth.CertFile == "" || config.Auth.KeyFile == "" {
				return fmt.Errorf("mTLS 认证需要证书文件和密钥文件")
			}
		default:
			return fmt.Errorf("不支持的认证类型: %s", config.Auth.Type)
		}
	}

	return nil
}

// GetDefaultConfig 获取默认监控配置
func (s *MonitoringConfigService) GetDefaultConfig() *models.MonitoringConfig {
	return &models.MonitoringConfig{
		Type: "disabled",
	}
}

// GetPrometheusConfig 获取 Prometheus 配置模板
func (s *MonitoringConfigService) GetPrometheusConfig() *models.MonitoringConfig {
	return &models.MonitoringConfig{
		Type:     "prometheus",
		Endpoint: "http://prometheus:9090",
		Auth: &models.MonitoringAuth{
			Type: "none",
		},
		Labels: map[string]string{
			"cluster": "",
		},
	}
}

// GetVictoriaMetricsConfig 获取 VictoriaMetrics 配置模板
func (s *MonitoringConfigService) GetVictoriaMetricsConfig() *models.MonitoringConfig {
	return &models.MonitoringConfig{
		Type:     "victoriametrics",
		Endpoint: "http://victoriametrics:8428",
		Auth: &models.MonitoringAuth{
			Type: "none",
		},
		Labels: map[string]string{
			"cluster": "",
		},
	}
}
