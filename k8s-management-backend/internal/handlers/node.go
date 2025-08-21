package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"k8s-management-backend/internal/config"
	"k8s-management-backend/internal/models"
	"k8s-management-backend/internal/services"
	"k8s-management-backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NodeHandler 节点处理器
type NodeHandler struct {
	db             *gorm.DB
	cfg            *config.Config
	clusterService *services.ClusterService
}

// NewNodeHandler 创建节点处理器
func NewNodeHandler(db *gorm.DB, cfg *config.Config, clusterService *services.ClusterService) *NodeHandler {
	return &NodeHandler{
		db:             db,
		cfg:            cfg,
		clusterService: clusterService,
	}
}

// parseClusterID 解析集群ID字符串为uint
func parseClusterID(clusterIDStr string) uint {
	if id, err := strconv.ParseUint(clusterIDStr, 10, 32); err == nil {
		return uint(id)
	}
	return 0
}

// GetNodes 获取节点列表
func (h *NodeHandler) GetNodes(c *gin.Context) {
	clusterId := c.Param("clusterId")
	logger.Info("获取节点列表: %s", clusterId)

	// 从集群服务获取集群信息
	clusterID := parseClusterID(clusterId)
	cluster, err := h.clusterService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "集群不存在",
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "创建K8s客户端失败: " + err.Error(),
		})
		return
	}

	// 获取节点列表
	nodes, err := k8sClient.GetClientset().CoreV1().Nodes().List(c, metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取节点列表失败: " + err.Error(),
		})
		return
	}

	// 转换为API响应格式
	result := make([]map[string]interface{}, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		// 获取节点状态
		status := "NotReady"
		for _, condition := range node.Status.Conditions {
			if condition.Type == "Ready" {
				if condition.Status == "True" {
					status = "Ready"
				}
				break
			}
		}

		// 获取节点角色
		roles := []string{}
		for label := range node.Labels {
			if label == "node-role.kubernetes.io/control-plane" || label == "node-role.kubernetes.io/master" {
				roles = append(roles, "master")
			} else if strings.HasPrefix(label, "node-role.kubernetes.io/") {
				role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
				roles = append(roles, role)
			}
		}
		if len(roles) == 0 {
			roles = append(roles, "worker")
		}

		// 获取节点污点
		taints := []map[string]string{}
		for _, taint := range node.Spec.Taints {
			taints = append(taints, map[string]string{
				"key":    taint.Key,
				"value":  taint.Value,
				"effect": string(taint.Effect),
			})
		}

		// 获取节点资源信息
		cpuCapacity := node.Status.Capacity.Cpu().MilliValue()
		memoryCapacity := node.Status.Capacity.Memory().Value() / (1024 * 1024) // 转换为MB
		podCapacity := node.Status.Capacity.Pods().Value()

		result = append(result, map[string]interface{}{
			"id":               node.Name, // 使用节点名作为ID
			"name":             node.Name,
			"status":           status,
			"roles":            roles,
			"version":          node.Status.NodeInfo.KubeletVersion,
			"osImage":          node.Status.NodeInfo.OSImage,
			"kernelVersion":    node.Status.NodeInfo.KernelVersion,
			"containerRuntime": node.Status.NodeInfo.ContainerRuntimeVersion,
			"cpuUsage":         0, // TODO: 获取实际CPU使用率
			"memoryUsage":      0, // TODO: 获取实际内存使用率
			"podCount":         0, // TODO: 获取实际Pod数量
			"maxPods":          podCapacity,
			"taints":           taints,
			"unschedulable":    node.Spec.Unschedulable,
			"createdAt":        node.CreationTimestamp.Time,
			"internalIP":       getNodeInternalIP(node),
			"externalIP":       getNodeExternalIP(node),
			"resources": map[string]interface{}{
				"cpu":    cpuCapacity,
				"memory": memoryCapacity,
				"pods":   podCapacity,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data": gin.H{
			"items":    result,
			"total":    len(result),
			"page":     1,
			"pageSize": 50,
		},
	})
}

// GetNodeOverview 获取节点概览信息
func (h *NodeHandler) GetNodeOverview(c *gin.Context) {
	clusterId := c.Param("clusterId")
	logger.Info("获取节点概览: %s", clusterId)

	// 从集群服务获取集群信息
	clusterID := parseClusterID(clusterId)
	cluster, err := h.clusterService.GetCluster(clusterID)
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
			"message": "获取节点概览失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 获取节点列表
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	nodes, err := k8sClient.GetClientset().CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Error("获取节点列表失败", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取节点列表失败: " + err.Error(),
			"data":    nil,
		})
		return
	}

	// 统计节点状态
	totalNodes := len(nodes.Items)
	readyNodes := 0
	notReadyNodes := 0
	maintenanceNodes := 0

	for _, node := range nodes.Items {
		for _, condition := range node.Status.Conditions {
			if condition.Type == "Ready" {
				if condition.Status == "True" {
					readyNodes++
				} else {
					notReadyNodes++
				}
				break
			}
		}

		// 检查是否处于维护状态（有NoSchedule污点）
		if node.Spec.Unschedulable {
			maintenanceNodes++
		}
	}

	// 构建概览数据
	overview := gin.H{
		"totalNodes":       totalNodes,
		"readyNodes":       readyNodes,
		"notReadyNodes":    notReadyNodes,
		"maintenanceNodes": maintenanceNodes,
		"cpuUsage":         65.0, // 模拟数据，后续可以通过metrics-server获取
		"memoryUsage":      72.0, // 模拟数据
		"storageUsage":     45.0, // 模拟数据
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    overview,
	})
}

// GetNode 获取节点详情
func (h *NodeHandler) GetNode(c *gin.Context) {
	clusterId := c.Param("clusterId")
	name := c.Param("name")
	logger.Info("获取节点详情: %s/%s", clusterId, name)

	// 从集群服务获取集群信息
	clusterID := parseClusterID(clusterId)
	cluster, err := h.clusterService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "集群不存在",
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "创建K8s客户端失败: " + err.Error(),
		})
		return
	}

	// 获取节点详情
	node, err := k8sClient.GetClientset().CoreV1().Nodes().Get(c, name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "获取节点详情失败: " + err.Error(),
		})
		return
	}

	// 获取节点状态
	status := "NotReady"
	conditions := []map[string]interface{}{}
	for _, condition := range node.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":    string(condition.Type),
			"status":  string(condition.Status),
			"reason":  condition.Reason,
			"message": condition.Message,
		})

		if condition.Type == "Ready" {
			if condition.Status == "True" {
				status = "Ready"
			}
		}
	}

	// 获取节点角色
	roles := []string{}
	for label := range node.Labels {
		if label == "node-role.kubernetes.io/control-plane" || label == "node-role.kubernetes.io/master" {
			roles = append(roles, "master")
		} else if strings.HasPrefix(label, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
			roles = append(roles, role)
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker")
	}

	// 获取节点污点
	taints := []map[string]string{}
	for _, taint := range node.Spec.Taints {
		taints = append(taints, map[string]string{
			"key":    taint.Key,
			"value":  taint.Value,
			"effect": string(taint.Effect),
		})
	}

	// 获取节点标签
	labels := []map[string]string{}
	for key, value := range node.Labels {
		labels = append(labels, map[string]string{
			"key":   key,
			"value": value,
		})
	}

	// 获取节点资源信息
	cpuCapacity := node.Status.Capacity.Cpu().MilliValue()
	memoryCapacity := node.Status.Capacity.Memory().Value() / (1024 * 1024) // 转换为MB
	podCapacity := node.Status.Capacity.Pods().Value()

	// 获取节点地址
	addresses := []map[string]string{}
	for _, address := range node.Status.Addresses {
		addresses = append(addresses, map[string]string{
			"type":    string(address.Type),
			"address": address.Address,
		})
	}

	result := map[string]interface{}{
		"name":              node.Name,
		"status":            status,
		"roles":             roles,
		"addresses":         addresses,
		"conditions":        conditions,
		"osImage":           node.Status.NodeInfo.OSImage,
		"kernelVersion":     node.Status.NodeInfo.KernelVersion,
		"kubeletVersion":    node.Status.NodeInfo.KubeletVersion,
		"containerRuntime":  node.Status.NodeInfo.ContainerRuntimeVersion,
		"architecture":      node.Status.NodeInfo.Architecture,
		"taints":            taints,
		"labels":            labels,
		"unschedulable":     node.Spec.Unschedulable,
		"creationTimestamp": node.CreationTimestamp.Time,
		"resources": map[string]interface{}{
			"cpu":    cpuCapacity,
			"memory": memoryCapacity,
			"pods":   podCapacity,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    result,
	})
}

// CordonNode 封锁节点
func (h *NodeHandler) CordonNode(c *gin.Context) {
	clusterId := c.Param("clusterId")
	name := c.Param("name")
	logger.Info("封锁节点: %s/%s", clusterId, name)

	// 从集群服务获取集群信息
	clusterID := parseClusterID(clusterId)
	cluster, err := h.clusterService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "集群不存在",
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "创建K8s客户端失败: " + err.Error(),
		})
		return
	}

	// 封锁节点
	err = k8sClient.CordonNode(name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "封锁节点失败: " + err.Error(),
		})
		return
	}

	// 记录审计日志
	auditLog := models.AuditLog{
		UserID:       1, // TODO: 从上下文获取用户ID
		Action:       "cordon_node",
		ResourceType: "node",
		ResourceRef:  `{"cluster_id":"` + clusterId + `","node_name":"` + name + `"}`,
		Result:       "success",
		Details:      "封锁节点: " + name,
	}
	h.db.Create(&auditLog)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "节点封锁成功",
		"data":    nil,
	})
}

// UncordonNode 解封节点
func (h *NodeHandler) UncordonNode(c *gin.Context) {
	clusterId := c.Param("clusterId")
	name := c.Param("name")
	logger.Info("解封节点: %s/%s", clusterId, name)

	// 从集群服务获取集群信息
	clusterID := parseClusterID(clusterId)
	cluster, err := h.clusterService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "集群不存在",
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "创建K8s客户端失败: " + err.Error(),
		})
		return
	}

	// 解封节点
	err = k8sClient.UncordonNode(name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "解封节点失败: " + err.Error(),
		})
		return
	}

	// 记录审计日志
	auditLog := models.AuditLog{
		UserID:       1, // TODO: 从上下文获取用户ID
		Action:       "uncordon_node",
		ResourceType: "node",
		ResourceRef:  `{"cluster_id":"` + clusterId + `","node_name":"` + name + `"}`,
		Result:       "success",
		Details:      "解封节点: " + name,
	}
	h.db.Create(&auditLog)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "节点解封成功",
		"data":    nil,
	})
}

// DrainNode 驱逐节点
func (h *NodeHandler) DrainNode(c *gin.Context) {
	clusterId := c.Param("clusterId")
	name := c.Param("name")
	logger.Info("驱逐节点: %s/%s", clusterId, name)

	// 解析请求参数
	var options map[string]interface{}
	if err := c.ShouldBindJSON(&options); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "参数解析失败: " + err.Error(),
		})
		return
	}

	// 从集群服务获取集群信息
	clusterID := parseClusterID(clusterId)
	cluster, err := h.clusterService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": "集群不存在",
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "创建K8s客户端失败: " + err.Error(),
		})
		return
	}

	// 驱逐节点
	err = k8sClient.DrainNode(name, options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "驱逐节点失败: " + err.Error(),
		})
		return
	}

	// 记录审计日志
	optionsJSON, _ := json.Marshal(options)
	auditLog := models.AuditLog{
		UserID:       1, // TODO: 从上下文获取用户ID
		Action:       "drain_node",
		ResourceType: "node",
		ResourceRef:  `{"cluster_id":"` + clusterId + `","node_name":"` + name + `"}`,
		Result:       "success",
		Details:      "驱逐节点: " + name + ", 选项: " + string(optionsJSON),
	}
	h.db.Create(&auditLog)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "节点驱逐成功",
		"data":    nil,
	})
}

// 获取节点内部IP
func getNodeInternalIP(node corev1.Node) string {
	for _, address := range node.Status.Addresses {
		if address.Type == corev1.NodeInternalIP {
			return address.Address
		}
	}
	return ""
}

// 获取节点外部IP
func getNodeExternalIP(node corev1.Node) string {
	for _, address := range node.Status.Addresses {
		if address.Type == corev1.NodeExternalIP {
			return address.Address
		}
	}
	return ""
}