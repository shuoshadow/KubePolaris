package handlers

import (
	"net/http"
	"strconv"

	"kubepolaris/internal/models"
	"kubepolaris/internal/services"
	"kubepolaris/pkg/logger"

	"github.com/gin-gonic/gin"
)

// AlertHandler 告警处理器
type AlertHandler struct {
	alertManagerConfigService *services.AlertManagerConfigService
	alertManagerService       *services.AlertManagerService
}

// NewAlertHandler 创建告警处理器
func NewAlertHandler(alertManagerConfigService *services.AlertManagerConfigService, alertManagerService *services.AlertManagerService) *AlertHandler {
	return &AlertHandler{
		alertManagerConfigService: alertManagerConfigService,
		alertManagerService:       alertManagerService,
	}
}

// GetAlertManagerConfig 获取集群 Alertmanager 配置
func (h *AlertHandler) GetAlertManagerConfig(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    config,
	})
}

// UpdateAlertManagerConfig 更新集群 Alertmanager 配置
func (h *AlertHandler) UpdateAlertManagerConfig(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	var config models.AlertManagerConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 更新配置
	if err := h.alertManagerConfigService.UpdateAlertManagerConfig(uint(clusterID), &config); err != nil {
		logger.Error("更新 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "更新 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "更新成功",
		"data":    nil,
	})
}

// TestAlertManagerConnection 测试 Alertmanager 连接
func (h *AlertHandler) TestAlertManagerConnection(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	_, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	var config models.AlertManagerConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 测试连接
	if err := h.alertManagerService.TestConnection(c.Request.Context(), &config); err != nil {
		logger.Error("测试 Alertmanager 连接失败", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "连接测试失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "连接测试成功",
		"data":    nil,
	})
}

// GetAlertManagerStatus 获取 Alertmanager 状态
func (h *AlertHandler) GetAlertManagerStatus(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Alertmanager 未启用",
			"data":    nil,
		})
		return
	}

	// 获取状态
	status, err := h.alertManagerService.GetStatus(c.Request.Context(), config)
	if err != nil {
		logger.Error("获取 Alertmanager 状态失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 状态失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    status,
	})
}

// GetAlerts 获取告警列表
func (h *AlertHandler) GetAlerts(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Alertmanager 未启用",
			"data":    []models.Alert{},
		})
		return
	}

	// 获取过滤参数
	filter := make(map[string]string)
	if severity := c.Query("severity"); severity != "" {
		filter["severity"] = severity
	}
	if alertname := c.Query("alertname"); alertname != "" {
		filter["alertname"] = alertname
	}

	// 获取告警列表
	alerts, err := h.alertManagerService.GetAlerts(c.Request.Context(), config, filter)
	if err != nil {
		logger.Error("获取告警列表失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取告警列表失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    alerts,
	})
}

// GetAlertGroups 获取告警分组
func (h *AlertHandler) GetAlertGroups(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Alertmanager 未启用",
			"data":    []models.AlertGroup{},
		})
		return
	}

	// 获取告警分组
	groups, err := h.alertManagerService.GetAlertGroups(c.Request.Context(), config)
	if err != nil {
		logger.Error("获取告警分组失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取告警分组失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    groups,
	})
}

// GetAlertStats 获取告警统计
func (h *AlertHandler) GetAlertStats(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Alertmanager 未启用",
			"data": &models.AlertStats{
				Total:      0,
				Firing:     0,
				Pending:    0,
				Resolved:   0,
				Suppressed: 0,
				BySeverity: make(map[string]int),
			},
		})
		return
	}

	// 获取告警统计
	stats, err := h.alertManagerService.GetAlertStats(c.Request.Context(), config)
	if err != nil {
		logger.Error("获取告警统计失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取告警统计失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    stats,
	})
}

// GetSilences 获取静默规则列表
func (h *AlertHandler) GetSilences(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Alertmanager 未启用",
			"data":    []models.Silence{},
		})
		return
	}

	// 获取静默规则
	silences, err := h.alertManagerService.GetSilences(c.Request.Context(), config)
	if err != nil {
		logger.Error("获取静默规则失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取静默规则失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    silences,
	})
}

// CreateSilence 创建静默规则
func (h *AlertHandler) CreateSilence(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Alertmanager 未启用",
			"data":    nil,
		})
		return
	}

	var req models.CreateSilenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 创建静默规则
	silence, err := h.alertManagerService.CreateSilence(c.Request.Context(), config, &req)
	if err != nil {
		logger.Error("创建静默规则失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "创建静默规则失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "创建成功",
		"data":    silence,
	})
}

// DeleteSilence 删除静默规则
func (h *AlertHandler) DeleteSilence(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	silenceID := c.Param("silenceId")
	if silenceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "静默规则ID不能为空",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Alertmanager 未启用",
			"data":    nil,
		})
		return
	}

	// 删除静默规则
	if err := h.alertManagerService.DeleteSilence(c.Request.Context(), config, silenceID); err != nil {
		logger.Error("删除静默规则失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "删除静默规则失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "删除成功",
		"data":    nil,
	})
}

// GetReceivers 获取接收器列表
func (h *AlertHandler) GetReceivers(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取配置
	config, err := h.alertManagerConfigService.GetAlertManagerConfig(uint(clusterID))
	if err != nil {
		logger.Error("获取 Alertmanager 配置失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取 Alertmanager 配置失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Alertmanager 未启用",
			"data":    []models.Receiver{},
		})
		return
	}

	// 获取接收器列表
	receivers, err := h.alertManagerService.GetReceivers(c.Request.Context(), config)
	if err != nil {
		logger.Error("获取接收器列表失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取接收器列表失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    receivers,
	})
}

// GetAlertManagerConfigTemplate 获取 Alertmanager 配置模板
func (h *AlertHandler) GetAlertManagerConfigTemplate(c *gin.Context) {
	template := h.alertManagerConfigService.GetAlertManagerConfigTemplate()
	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    template,
	})
}

