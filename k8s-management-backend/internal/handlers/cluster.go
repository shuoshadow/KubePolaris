package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"k8s-management-backend/internal/config"
	"k8s-management-backend/internal/models"
	"k8s-management-backend/internal/services"
	"k8s-management-backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ClusterHandler 集群处理器
type ClusterHandler struct {
	db             *gorm.DB
	cfg            *config.Config
	clusterService *services.ClusterService
}

// NewClusterHandler 创建集群处理器
func NewClusterHandler(db *gorm.DB, cfg *config.Config) *ClusterHandler {
	return &ClusterHandler{
		db:             db,
		cfg:            cfg,
		clusterService: services.NewClusterService(db),
	}
}

// GetClusters 获取集群列表
func (h *ClusterHandler) GetClusters(c *gin.Context) {
	logger.Info("获取集群列表")

	clusters, err := h.clusterService.GetAllClusters()
	if err != nil {
		logger.Error("获取集群列表失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取集群列表失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 转换为响应格式
	clusterList := make([]gin.H, 0, len(clusters))
	for _, cluster := range clusters {
		clusterData := gin.H{
			"id":        cluster.ID,
			"name":      cluster.Name,
			"apiServer": cluster.APIServer,
			"version":   cluster.Version,
			"status":    cluster.Status,
			"createdAt": cluster.CreatedAt.Format("2006-01-02T15:04:05Z"),
			"updatedAt": cluster.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		}

		if cluster.LastHeartbeat != nil {
			clusterData["lastHeartbeat"] = cluster.LastHeartbeat.Format("2006-01-02T15:04:05Z")
		}

		// 获取实时节点信息和指标
		nodeCount, readyNodes := h.getClusterNodeInfo(cluster)
		clusterData["nodeCount"] = nodeCount
		clusterData["readyNodes"] = readyNodes

		// 获取集群指标（CPU、内存使用率等）
		if metrics, err := h.clusterService.GetClusterMetrics(cluster.ID); err == nil && metrics != nil {
			clusterData["cpuUsage"] = metrics.CPUUsage
			clusterData["memoryUsage"] = metrics.MemoryUsage
			clusterData["storageUsage"] = metrics.StorageUsage
		} else {
			// 如果没有指标数据，设置默认值
			clusterData["cpuUsage"] = 0.0
			clusterData["memoryUsage"] = 0.0
			clusterData["storageUsage"] = 0.0
		}

		clusterList = append(clusterList, clusterData)
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data": gin.H{
			"items":    clusterList,
			"total":    len(clusterList),
			"page":     1,
			"pageSize": 10,
		},
	})
}

// ImportCluster 导入集群
func (h *ClusterHandler) ImportCluster(c *gin.Context) {
	logger.Info("导入集群")

	// 获取请求参数
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		ApiServer   string `json:"apiServer"`
		Kubeconfig  string `json:"kubeconfig"`
		Token       string `json:"token"`
		CaCert      string `json:"caCert"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
			"data":    nil,
		})
		return
	}

	logger.Info("导入集群: %s, API Server: %s", req.Name, req.ApiServer)

	// 验证参数
	if req.Kubeconfig == "" && (req.ApiServer == "" || req.Token == "") {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请提供kubeconfig或者API Server地址和访问令牌",
			"data":    nil,
		})
		return
	}

	var k8sClient *services.K8sClient
	var err error

	// 根据提供的参数创建Kubernetes客户端
	if req.Kubeconfig != "" {
		k8sClient, err = services.NewK8sClientFromKubeconfig(req.Kubeconfig)
		if err != nil {
			logger.Error("从kubeconfig创建客户端失败", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": fmt.Sprintf("kubeconfig格式错误: %v", err),
				"data":    nil,
			})
			return
		}
	} else {
		k8sClient, err = services.NewK8sClientFromToken(req.ApiServer, req.Token, req.CaCert)
		if err != nil {
			logger.Error("从Token创建客户端失败", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": fmt.Sprintf("连接配置错误: %v", err),
				"data":    nil,
			})
			return
		}
	}

	// 测试连接
	clusterInfo, err := k8sClient.TestConnection()
	if err != nil {
		logger.Error("连接测试失败", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": fmt.Sprintf("连接测试失败: %v", err),
			"data":    nil,
		})
		return
	}

	// 创建集群模型
	cluster := &models.Cluster{
		Name:          req.Name,
		APIServer:     req.ApiServer,
		KubeconfigEnc: req.Kubeconfig, // TODO: 需要加密存储
		SATokenEnc:    req.Token,      // TODO: 需要加密存储
		CAEnc:         req.CaCert,     // TODO: 需要加密存储
		Version:       clusterInfo.Version,
		Status:        clusterInfo.Status,
		Labels:        "{}",
		CreatedBy:     1, // 临时设置为1，后续需要从JWT中获取用户ID
	}

	// 保存到数据库
	err = h.clusterService.CreateCluster(cluster)
	if err != nil {
		logger.Error("保存集群信息失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "保存集群信息失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 返回新创建的集群信息
	newCluster := gin.H{
		"id":        cluster.ID,
		"name":      cluster.Name,
		"apiServer": cluster.APIServer,
		"version":   cluster.Version,
		"status":    cluster.Status,
		"createdAt": cluster.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "集群导入成功",
		"data":    newCluster,
	})
}

// GetCluster 获取集群详情
func (h *ClusterHandler) GetCluster(c *gin.Context) {
	idStr := c.Param("clusterId")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	cluster, err := h.clusterService.GetCluster(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": err.Error(),
			"data":    nil,
		})
		return
	}

	clusterData := gin.H{
		"id":        cluster.ID,
		"name":      cluster.Name,
		"apiServer": cluster.APIServer,
		"version":   cluster.Version,
		"status":    cluster.Status,
		"createdAt": cluster.CreatedAt.Format("2006-01-02T15:04:05Z"),
		"updatedAt": cluster.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if cluster.LastHeartbeat != nil {
		clusterData["lastHeartbeat"] = cluster.LastHeartbeat.Format("2006-01-02T15:04:05Z")
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    clusterData,
	})
}

// DeleteCluster 删除集群
func (h *ClusterHandler) DeleteCluster(c *gin.Context) {
	idStr := c.Param("clusterId")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	err = h.clusterService.DeleteCluster(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
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

// GetClusterStats 获取集群统计
func (h *ClusterHandler) GetClusterStats(c *gin.Context) {
	logger.Info("获取集群统计")

	stats, err := h.clusterService.GetClusterStats()
	if err != nil {
		logger.Error("获取集群统计失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取集群统计失败: " + err.Error(),
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

// GetClusterStatus 获取集群实时状态
func (h *ClusterHandler) GetClusterStatus(c *gin.Context) {
	idStr := c.Param("clusterId")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	cluster, err := h.clusterService.GetCluster(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": err.Error(),
			"data":    nil,
		})
		return
	}

	// 获取实时节点信息
	nodeCount, readyNodes := h.getClusterNodeInfo(cluster)

	statusData := gin.H{
		"id":         cluster.ID,
		"name":       cluster.Name,
		"status":     cluster.Status,
		"nodeCount":  nodeCount,
		"readyNodes": readyNodes,
		"version":    cluster.Version,
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    statusData,
	})
}

// GetClusterOverview 获取集群概览信息
func (h *ClusterHandler) GetClusterOverview(c *gin.Context) {
	clusterID := c.Param("clusterId")
	id, err := strconv.ParseUint(clusterID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	// 获取集群信息
	cluster, err := h.clusterService.GetCluster(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "集群不存在",
			"data":    nil,
		})
		return
	}

	// 创建K8s客户端
	var k8sClient *services.K8sClient
	if cluster.KubeconfigEnc != "" {
		k8sClient, err = services.NewK8sClientFromKubeconfig(cluster.KubeconfigEnc)
	} else {
		k8sClient, err = services.NewK8sClientFromToken(cluster.APIServer, cluster.SATokenEnc, cluster.CAEnc)
	}

	if err != nil {
		logger.Error("创建K8s客户端失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取集群概览失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 获取节点信息
	nodeCount, readyNodes := h.getClusterNodeInfo(cluster)

	// 获取Pod信息
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pods, err := k8sClient.GetClientset().CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Error("获取Pod列表失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取Pod列表失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 统计Pod状态
	podTotal := len(pods.Items)
	podRunning := 0
	podPending := 0
	podFailed := 0
	podSucceeded := 0
	podUnknown := 0

	for _, pod := range pods.Items {
		switch pod.Status.Phase {
		case "Running":
			podRunning++
		case "Pending":
			podPending++
		case "Failed":
			podFailed++
		case "Succeeded":
			podSucceeded++
		default:
			podUnknown++
		}
	}

	// 获取命名空间信息
	var namespaceCount int
	namespaces, err := k8sClient.GetClientset().CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Error("获取命名空间列表失败", "error", err)
		// 命名空间获取失败不影响整体结果，设置为0
		namespaceCount = 0
	} else {
		namespaceCount = len(namespaces.Items)
	}

	// 获取服务信息
	var serviceCount int
	services, err := k8sClient.GetClientset().CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Error("获取服务列表失败", "error", err)
		// 服务获取失败不影响整体结果，设置为0
		serviceCount = 0
	} else {
		serviceCount = len(services.Items)
	}

	// 获取部署信息
	var deploymentCount int
	deployments, err := k8sClient.GetClientset().AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Error("获取部署列表失败", "error", err)
		// 部署获取失败不影响整体结果，设置为0
		deploymentCount = 0
	} else {
		deploymentCount = len(deployments.Items)
	}

	// 构建响应数据，使用前端需要的格式
	overview := gin.H{
		"code":    200,
		"message": "获取成功",
		"data": gin.H{
			"cluster_id": clusterID,
			"nodes": gin.H{
				"total":  nodeCount,
				"ready":  readyNodes,
				"master": 1, // 暂时固定为1，后续可以通过标签判断
				"worker": nodeCount - 1,
			},
			"pods": gin.H{
				"total":     podTotal,
				"Running":   podRunning,   // 注意：使用大写R以匹配前端期望的格式
				"Pending":   podPending,   // 使用大写P
				"Failed":    podFailed,    // 使用大写F
				"Succeeded": podSucceeded, // 添加成功状态
				"Unknown":   podUnknown,   // 添加未知状态
			},
			"namespaces": gin.H{
				"total": namespaceCount,
			},
			"services": gin.H{
				"total": serviceCount,
			},
			"deployments": gin.H{
				"total": deploymentCount,
			},
			"resource_usage": gin.H{
				"cpu": gin.H{
					"used":  "2.5", // 暂时使用固定值，后续可以通过metrics-server获取
					"total": "8",
					"unit":  "cores",
				},
				"memory": gin.H{
					"used":  "4.2", // 暂时使用固定值，后续可以通过metrics-server获取
					"total": "16",
					"unit":  "GB",
				},
			},
		},
	}

	c.JSON(http.StatusOK, overview)
}

// GetClusterMetrics 获取集群监控数据
func (h *ClusterHandler) GetClusterMetrics(c *gin.Context) {
	id := c.Param("clusterId")
	logger.Info("获取集群监控数据: %s", id)

	// 获取请求参数
	rangeParam := c.DefaultQuery("range", "1h")
	step := c.DefaultQuery("step", "1m")

	// 从数据库获取集群
	clusterID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
			"data":    nil,
		})
		return
	}

	cluster, err := h.clusterService.GetCluster(uint(clusterID))
	if err != nil {
		logger.Error("获取集群失败", "error", err)
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "集群不存在",
			"data":    nil,
		})
		return
	}

	// 创建K8s客户端
	var k8sClient *services.K8sClient
	if cluster.KubeconfigEnc != "" {
		k8sClient, err = services.NewK8sClientFromKubeconfig(cluster.KubeconfigEnc)
	} else {
		k8sClient, err = services.NewK8sClientFromToken(cluster.APIServer, cluster.SATokenEnc, cluster.CAEnc)
	}

	if err != nil {
		logger.Error("创建K8s客户端失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取集群监控数据失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 获取集群监控数据
	metrics, err := k8sClient.GetClusterMetrics(rangeParam, step)
	if err != nil {
		logger.Error("获取集群监控数据失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取集群监控数据失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    metrics,
	})
}

// TestConnection 测试集群连接
func (h *ClusterHandler) TestConnection(c *gin.Context) {
	logger.Info("测试集群连接")

	// 获取请求参数
	var req struct {
		ApiServer  string `json:"apiServer"`
		Kubeconfig string `json:"kubeconfig"`
		Token      string `json:"token"`
		CaCert     string `json:"caCert"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("参数绑定错误: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 打印接收到的参数用于调试

	// 验证参数
	if req.Kubeconfig == "" && (req.ApiServer == "" || req.Token == "") {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请提供kubeconfig或者API Server地址和访问令牌",
			"data":    nil,
		})
		return
	}

	var k8sClient *services.K8sClient
	var err error

	// 根据提供的参数创建Kubernetes客户端
	if req.Kubeconfig != "" {
		// 使用kubeconfig创建客户端
		k8sClient, err = services.NewK8sClientFromKubeconfig(req.Kubeconfig)
		if err != nil {
			logger.Error("从kubeconfig创建客户端失败", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": fmt.Sprintf("kubeconfig格式错误: %v", err),
				"data":    nil,
			})
			return
		}
	} else {
		// 使用API Server和Token创建客户端
		k8sClient, err = services.NewK8sClientFromToken(req.ApiServer, req.Token, req.CaCert)
		if err != nil {
			logger.Error("从Token创建客户端失败", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": fmt.Sprintf("连接配置错误: %v", err),
				"data":    nil,
			})
			return
		}
	}

	// 测试连接并获取集群信息
	clusterInfo, err := k8sClient.TestConnection()
	if err != nil {
		logger.Error("连接测试失败", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": fmt.Sprintf("连接测试失败: %v", err),
			"data":    nil,
		})
		return
	}

	testResult := gin.H{
		"version":    clusterInfo.Version,
		"nodeCount":  clusterInfo.NodeCount,
		"readyNodes": clusterInfo.ReadyNodes,
		"status":     clusterInfo.Status,
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "连接测试成功",
		"data":    testResult,
	})
}

// getClusterNodeInfo 获取集群节点信息
func (h *ClusterHandler) getClusterNodeInfo(cluster *models.Cluster) (int, int) {
	// 如果没有连接信息，返回默认值
	if cluster.KubeconfigEnc == "" && cluster.SATokenEnc == "" {
		return 0, 0
	}

	var k8sClient *services.K8sClient
	var err error

	// 根据存储的信息创建客户端
	if cluster.KubeconfigEnc != "" {
		k8sClient, err = services.NewK8sClientFromKubeconfig(cluster.KubeconfigEnc)
	} else if cluster.SATokenEnc != "" {
		k8sClient, err = services.NewK8sClientFromToken(cluster.APIServer, cluster.SATokenEnc, cluster.CAEnc)
	}

	if err != nil {
		logger.Error("创建K8s客户端失败 (集群: %s): %v", cluster.Name, err)
		return 0, 0
	}

	// 获取节点列表
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	nodes, err := k8sClient.GetClientset().CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Error("获取节点列表失败 (集群: %s): %v", cluster.Name, err)
		// 如果直接获取失败，尝试通过TestConnection
		clusterInfo, testErr := k8sClient.TestConnection()
		if testErr != nil {
			logger.Error("TestConnection也失败 (集群: %s): %v", cluster.Name, testErr)
			return 0, 0
		}
		return clusterInfo.NodeCount, clusterInfo.ReadyNodes
	}

	// 统计就绪节点数量
	nodeCount := len(nodes.Items)
	readyNodes := 0
	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == "Ready" && condition.Status == "True" {
				readyNodes++
				break
			}
		}
	}

	return nodeCount, readyNodes
}
