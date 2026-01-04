package services

import (
	"encoding/json"
	"fmt"

	"kubepolaris/internal/models"
	"kubepolaris/pkg/logger"

	"gorm.io/gorm"
)

// AlertManagerConfigService Alertmanager 配置服务
type AlertManagerConfigService struct {
	db *gorm.DB
}

// NewAlertManagerConfigService 创建 Alertmanager 配置服务
func NewAlertManagerConfigService(db *gorm.DB) *AlertManagerConfigService {
	return &AlertManagerConfigService{db: db}
}

// GetAlertManagerConfig 获取集群 Alertmanager 配置
func (s *AlertManagerConfigService) GetAlertManagerConfig(clusterID uint) (*models.AlertManagerConfig, error) {
	var cluster models.Cluster
	if err := s.db.Select("alert_manager_config").First(&cluster, clusterID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("集群不存在: %d", clusterID)
		}
		return nil, fmt.Errorf("获取集群失败: %w", err)
	}

	if cluster.AlertManagerConfig == "" {
		// 返回默认配置（禁用）
		return &models.AlertManagerConfig{
			Enabled: false,
		}, nil
	}

	var config models.AlertManagerConfig
	if err := json.Unmarshal([]byte(cluster.AlertManagerConfig), &config); err != nil {
		logger.Error("解析 Alertmanager 配置失败", "cluster_id", clusterID, "error", err)
		return &models.AlertManagerConfig{
			Enabled: false,
		}, nil
	}

	return &config, nil
}

// UpdateAlertManagerConfig 更新集群 Alertmanager 配置
func (s *AlertManagerConfigService) UpdateAlertManagerConfig(clusterID uint, config *models.AlertManagerConfig) error {
	// 验证配置
	if err := s.validateConfig(config); err != nil {
		return fmt.Errorf("配置验证失败: %w", err)
	}

	// 序列化配置
	configJSON, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("序列化配置失败: %w", err)
	}

	// 更新数据库
	result := s.db.Model(&models.Cluster{}).Where("id = ?", clusterID).Update("alert_manager_config", string(configJSON))
	if result.Error != nil {
		return fmt.Errorf("更新 Alertmanager 配置失败: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("集群不存在: %d", clusterID)
	}

	logger.Info("Alertmanager 配置更新成功", "cluster_id", clusterID, "enabled", config.Enabled)
	return nil
}

// DeleteAlertManagerConfig 删除集群 Alertmanager 配置
func (s *AlertManagerConfigService) DeleteAlertManagerConfig(clusterID uint) error {
	result := s.db.Model(&models.Cluster{}).Where("id = ?", clusterID).Update("alert_manager_config", "")
	if result.Error != nil {
		return fmt.Errorf("删除 Alertmanager 配置失败: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("集群不存在: %d", clusterID)
	}

	logger.Info("Alertmanager 配置删除成功", "cluster_id", clusterID)
	return nil
}

// validateConfig 验证 Alertmanager 配置
func (s *AlertManagerConfigService) validateConfig(config *models.AlertManagerConfig) error {
	if !config.Enabled {
		return nil // 禁用状态不需要验证
	}

	if config.Endpoint == "" {
		return fmt.Errorf("Alertmanager 端点地址不能为空")
	}

	// 验证认证配置
	if config.Auth != nil {
		switch config.Auth.Type {
		case "none", "":
			// 无需认证，不需要验证额外字段
		case "basic":
			if config.Auth.Username == "" || config.Auth.Password == "" {
				return fmt.Errorf("Basic 认证需要用户名和密码")
			}
		case "bearer":
			if config.Auth.Token == "" {
				return fmt.Errorf("Bearer 认证需要 Token")
			}
		default:
			return fmt.Errorf("不支持的认证类型: %s", config.Auth.Type)
		}
	}

	return nil
}

// GetDefaultConfig 获取默认 Alertmanager 配置
func (s *AlertManagerConfigService) GetDefaultConfig() *models.AlertManagerConfig {
	return &models.AlertManagerConfig{
		Enabled: false,
	}
}

// GetAlertManagerConfigTemplate 获取 Alertmanager 配置模板
func (s *AlertManagerConfigService) GetAlertManagerConfigTemplate() *models.AlertManagerConfig {
	return &models.AlertManagerConfig{
		Enabled:  true,
		Endpoint: "http://alertmanager:9093",
		Auth: &models.MonitoringAuth{
			Type: "none",
		},
	}
}

