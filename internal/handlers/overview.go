package handlers

import (
	"net/http"
	"strconv"
	"time"

	"kubepolaris/internal/services"
	"kubepolaris/pkg/logger"

	"github.com/gin-gonic/gin"
)

// OverviewHandler 总览处理器
type OverviewHandler struct {
	overviewService *services.OverviewService
}

// NewOverviewHandler 创建总览处理器
func NewOverviewHandler(
	clusterService *services.ClusterService,
	listerProvider services.InformerListerProvider,
	promService *services.PrometheusService,
	monitoringCfgSvc *services.MonitoringConfigService,
) *OverviewHandler {
	overviewSvc := services.NewOverviewService(
		nil, // db 可选，如果需要直接查询数据库
		clusterService,
		listerProvider,
		promService,
		monitoringCfgSvc,
	)
	return &OverviewHandler{
		overviewService: overviewSvc,
	}
}

// GetStats 获取总览统计数据
// @Summary 获取总览统计数据
// @Description 返回集群、节点、Pod 的统计数据以及版本分布
// @Tags Overview
// @Accept json
// @Produce json
// @Success 200 {object} services.OverviewStatsResponse
// @Router /api/v1/overview/stats [get]
func (h *OverviewHandler) GetStats(c *gin.Context) {
	logger.Info("获取总览统计数据")

	stats, err := h.overviewService.GetOverviewStats(c.Request.Context())
	if err != nil {
		logger.Error("获取总览统计数据失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取统计数据失败: " + err.Error(),
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

// GetResourceUsage 获取资源使用率
// @Summary 获取资源使用率
// @Description 返回 CPU、内存、存储的使用率
// @Tags Overview
// @Accept json
// @Produce json
// @Success 200 {object} services.ResourceUsageResponse
// @Router /api/v1/overview/resource-usage [get]
func (h *OverviewHandler) GetResourceUsage(c *gin.Context) {
	logger.Info("获取资源使用率")

	usage, err := h.overviewService.GetResourceUsage(c.Request.Context())
	if err != nil {
		logger.Error("获取资源使用率失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取资源使用率失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    usage,
	})
}

// GetDistribution 获取资源分布
// @Summary 获取资源分布
// @Description 返回各集群的 Pod、Node、CPU、内存分布
// @Tags Overview
// @Accept json
// @Produce json
// @Success 200 {object} services.ResourceDistributionResponse
// @Router /api/v1/overview/distribution [get]
func (h *OverviewHandler) GetDistribution(c *gin.Context) {
	logger.Info("获取资源分布")

	distribution, err := h.overviewService.GetResourceDistribution(c.Request.Context())
	if err != nil {
		logger.Error("获取资源分布失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取资源分布失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    distribution,
	})
}

// GetTrends 获取趋势数据
// @Summary 获取趋势数据
// @Description 返回 Pod 和 Node 的历史趋势数据
// @Tags Overview
// @Accept json
// @Produce json
// @Param timeRange query string false "时间范围: 7d, 30d" default(7d)
// @Param step query string false "步长: 1h, 6h, 1d" default(1h)
// @Success 200 {object} services.TrendResponse
// @Router /api/v1/overview/trends [get]
func (h *OverviewHandler) GetTrends(c *gin.Context) {
	startTime := time.Now()
	timeRange := c.DefaultQuery("timeRange", "7d")
	step := c.DefaultQuery("step", "")

	logger.Info("获取趋势数据开始", "timeRange", timeRange, "step", step)

	trends, err := h.overviewService.GetTrends(c.Request.Context(), timeRange, step)
	
	elapsed := time.Since(startTime)
	logger.Info("获取趋势数据完成", "耗时", elapsed.String())

	if err != nil {
		logger.Error("获取趋势数据失败", "error", err, "耗时", elapsed.String())
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取趋势数据失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    trends,
	})
}

// GetAbnormalWorkloads 获取异常工作负载
// @Summary 获取异常工作负载
// @Description 返回异常的 Pod、Deployment、StatefulSet 列表
// @Tags Overview
// @Accept json
// @Produce json
// @Param limit query int false "返回数量限制" default(20)
// @Success 200 {array} services.AbnormalWorkload
// @Router /api/v1/overview/abnormal-workloads [get]
func (h *OverviewHandler) GetAbnormalWorkloads(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitStr)

	logger.Info("获取异常工作负载", "limit", limit)

	workloads, err := h.overviewService.GetAbnormalWorkloads(c.Request.Context(), limit)
	if err != nil {
		logger.Error("获取异常工作负载失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取异常工作负载失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    workloads,
	})
}

