package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"kubepolaris/internal/models"
	"kubepolaris/internal/services"
	"kubepolaris/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

const (
	kubectlPodNamespace    = "kubepolaris-system"
	kubectlPodImage        = "registry.cn-hangzhou.aliyuncs.com/clay-wangzhi/kubectl:v0.1"
	kubectlPodPrefix       = "kubepolaris-kubectl-"
	kubectlIdleTimeout     = 1 * time.Hour
	kubectlCleanupInterval = 10 * time.Minute
)

// KubectlPodTerminalHandler kubectl Pod 终端处理器
type KubectlPodTerminalHandler struct {
	clusterService *services.ClusterService
	auditService   *services.AuditService
	podTerminal    *PodTerminalHandler
	activeSessions map[string]int // podName -> activeConnections
	sessionsMutex  sync.RWMutex
	upgrader       websocket.Upgrader
}

// NewKubectlPodTerminalHandler 创建 kubectl Pod 终端处理器
func NewKubectlPodTerminalHandler(clusterService *services.ClusterService, auditService *services.AuditService) *KubectlPodTerminalHandler {
	h := &KubectlPodTerminalHandler{
		clusterService: clusterService,
		auditService:   auditService,
		podTerminal:    NewPodTerminalHandler(clusterService, auditService),
		activeSessions: make(map[string]int),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}

	// 启动后台清理任务
	go h.startCleanupWorker()

	return h
}

// HandleKubectlPodTerminal 处理 kubectl Pod 终端请求
func (h *KubectlPodTerminalHandler) HandleKubectlPodTerminal(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")
	clusterID, err := strconv.ParseUint(clusterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的集群ID"})
		return
	}

	userID := c.GetUint("user_id")

	// 获取用户的集群权限，确定使用哪个 ServiceAccount
	permissionType := "readonly" // 默认只读权限
	var namespaces []string
	var customRoleRef string
	
	if perm, exists := c.Get("cluster_permission"); exists {
		if cp, ok := perm.(*models.ClusterPermission); ok && cp != nil {
			permissionType = cp.PermissionType
			namespaces = cp.GetNamespaceList()
			customRoleRef = cp.CustomRoleRef
		}
	}

	// 使用 RBACService 获取有效的 ServiceAccount
	rbacSvc := services.NewRBACService()
	rbacConfig := &services.UserRBACConfig{
		UserID:         userID,
		PermissionType: permissionType,
		Namespaces:     namespaces,
		ClusterRoleRef: customRoleRef,
	}
	serviceAccount := rbacSvc.GetEffectiveServiceAccount(rbacConfig)

	logger.Info("用户kubectl终端权限", "userID", userID, "permissionType", permissionType, "namespaces", namespaces, "serviceAccount", serviceAccount)

	// 获取集群信息
	cluster, err := h.clusterService.GetCluster(uint(clusterID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "集群不存在"})
		return
	}

	// 创建 K8s 客户端
	k8sConfig, err := h.createK8sConfig(cluster)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建K8s配置失败"})
		return
	}

	client, err := kubernetes.NewForConfig(k8sConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建K8s客户端失败"})
		return
	}

	// 创建或获取 kubectl Pod，使用对应权限的 ServiceAccount
	// Pod 名称包含权限类型，确保不同权限使用不同的 Pod
	podName := fmt.Sprintf("%s%d-%s", kubectlPodPrefix, userID, permissionType)
	if err := h.ensureKubectlPod(client, podName, userID, serviceAccount, permissionType); err != nil {
		logger.Error("创建kubectl Pod失败", "error", err, "podName", podName)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("创建kubectl Pod失败: %v", err)})
		return
	}

	// 等待 Pod Running
	if err := h.waitForPodRunning(client, podName); err != nil {
		logger.Error("等待Pod运行超时", "error", err, "podName", podName)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Pod启动超时"})
		return
	}

	// 更新活动时间
	h.updateLastActivity(client, podName)

	// 记录活跃会话
	sessionKey := fmt.Sprintf("%s-%s", clusterIDStr, podName)
	h.sessionsMutex.Lock()
	h.activeSessions[sessionKey]++
	h.sessionsMutex.Unlock()

	defer func() {
		h.sessionsMutex.Lock()
		h.activeSessions[sessionKey]--
		if h.activeSessions[sessionKey] <= 0 {
			delete(h.activeSessions, sessionKey)
		}
		h.sessionsMutex.Unlock()
	}()

	logger.Info("kubectl Pod终端连接", "cluster", cluster.Name, "pod", podName, "user", userID)

	// 修改请求参数，复用 PodTerminalHandler
	c.Params = []gin.Param{
		{Key: "clusterID", Value: clusterIDStr},
		{Key: "namespace", Value: kubectlPodNamespace},
		{Key: "name", Value: podName},
	}
	c.Request.URL.RawQuery = "container=kubectl"

	// 设置终端类型为 kubectl（用于审计记录）
	c.Set("terminal_type", "kubectl")

	// 复用 Pod Terminal 处理逻辑
	h.podTerminal.HandlePodTerminal(c)
}

// ensureKubectlPod 确保 kubectl Pod 存在
func (h *KubectlPodTerminalHandler) ensureKubectlPod(client *kubernetes.Clientset, podName string, userID uint, serviceAccount string, permissionType string) error {
	ctx := context.Background()

	// 检查 Pod 是否已存在
	existingPod, err := client.CoreV1().Pods(kubectlPodNamespace).Get(ctx, podName, metav1.GetOptions{})
	if err == nil {
		// Pod 存在
		if existingPod.Status.Phase == corev1.PodRunning {
			logger.Info("复用已存在的kubectl Pod", "pod", podName, "sa", serviceAccount)
			return nil // 可以复用
		}
		if existingPod.Status.Phase == corev1.PodFailed || existingPod.Status.Phase == corev1.PodSucceeded {
			// 删除旧 Pod，重新创建
			logger.Info("删除已终止的kubectl Pod", "pod", podName, "phase", existingPod.Status.Phase)
			_ = client.CoreV1().Pods(kubectlPodNamespace).Delete(ctx, podName, metav1.DeleteOptions{})
			time.Sleep(2 * time.Second)
		}
		// 如果是 Pending 状态，继续等待
		if existingPod.Status.Phase == corev1.PodPending {
			return nil
		}
	}

	if !errors.IsNotFound(err) && err != nil {
		return err
	}

	// 创建新 Pod，使用对应权限的 ServiceAccount
	logger.Info("创建新的kubectl Pod", "pod", podName, "user", userID, "sa", serviceAccount, "permissionType", permissionType)
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      podName,
			Namespace: kubectlPodNamespace,
			Labels: map[string]string{
				"app":             "kubepolaris-kubectl",
				"user-id":         fmt.Sprintf("%d", userID),
				"permission-type": permissionType,
			},
			Annotations: map[string]string{
				"kubepolaris.io/last-activity":    time.Now().Format(time.RFC3339),
				"kubepolaris.io/permission-type":  permissionType,
				"kubepolaris.io/service-account":  serviceAccount,
			},
		},
		Spec: corev1.PodSpec{
			ServiceAccountName: serviceAccount, // 使用对应权限的 ServiceAccount
			Containers: []corev1.Container{{
				Name:    "kubectl",
				Image:   kubectlPodImage,
				Command: []string{"sleep", "infinity"},
				Stdin:   true,
				TTY:     true,
				Resources: corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("100m"),
						corev1.ResourceMemory: resource.MustParse("128Mi"),
					},
					Limits: corev1.ResourceList{
						corev1.ResourceCPU:    resource.MustParse("500m"),
						corev1.ResourceMemory: resource.MustParse("256Mi"),
					},
				},
			}},
			RestartPolicy: corev1.RestartPolicyNever,
		},
	}

	_, err = client.CoreV1().Pods(kubectlPodNamespace).Create(ctx, pod, metav1.CreateOptions{})
	return err
}

// waitForPodRunning 等待 Pod 运行
func (h *KubectlPodTerminalHandler) waitForPodRunning(client *kubernetes.Clientset, podName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	for {
		pod, err := client.CoreV1().Pods(kubectlPodNamespace).Get(ctx, podName, metav1.GetOptions{})
		if err != nil {
			return err
		}

		if pod.Status.Phase == corev1.PodRunning {
			return nil
		}

		if pod.Status.Phase == corev1.PodFailed {
			return fmt.Errorf("Pod启动失败: %s", pod.Status.Message)
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("等待Pod运行超时")
		case <-time.After(1 * time.Second):
			continue
		}
	}
}

// updateLastActivity 更新 Pod 最后活动时间
func (h *KubectlPodTerminalHandler) updateLastActivity(client *kubernetes.Clientset, podName string) {
	ctx := context.Background()
	patch := []byte(fmt.Sprintf(`{"metadata":{"annotations":{"kubepolaris.io/last-activity":"%s"}}}`,
		time.Now().Format(time.RFC3339)))

	_, err := client.CoreV1().Pods(kubectlPodNamespace).Patch(ctx, podName, types.MergePatchType, patch, metav1.PatchOptions{})
	if err != nil {
		logger.Error("更新Pod活动时间失败", "error", err, "pod", podName)
	}
}

// startCleanupWorker 启动后台清理任务
func (h *KubectlPodTerminalHandler) startCleanupWorker() {
	ticker := time.NewTicker(kubectlCleanupInterval)
	logger.Info("kubectl Pod清理任务已启动", "interval", kubectlCleanupInterval)

	for range ticker.C {
		h.cleanupIdlePods()
	}
}

// cleanupIdlePods 清理空闲的 kubectl Pod
func (h *KubectlPodTerminalHandler) cleanupIdlePods() {
	// 获取所有集群
	clusters, err := h.clusterService.GetAllClusters()
	if err != nil {
		logger.Error("获取集群列表失败", "error", err)
		return
	}

	for _, cluster := range clusters {
		h.cleanupClusterIdlePods(cluster)
	}
}

// cleanupClusterIdlePods 清理指定集群的空闲 Pod
func (h *KubectlPodTerminalHandler) cleanupClusterIdlePods(cluster *models.Cluster) {
	k8sConfig, err := h.createK8sConfig(cluster)
	if err != nil {
		return
	}

	client, err := kubernetes.NewForConfig(k8sConfig)
	if err != nil {
		return
	}

	ctx := context.Background()
	pods, err := client.CoreV1().Pods(kubectlPodNamespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app=kubepolaris-kubectl",
	})
	if err != nil {
		return
	}

	for _, pod := range pods.Items {
		// 检查是否有活跃会话
		sessionKey := fmt.Sprintf("%d-%s", cluster.ID, pod.Name)
		h.sessionsMutex.RLock()
		activeCount := h.activeSessions[sessionKey]
		h.sessionsMutex.RUnlock()

		if activeCount > 0 {
			continue // 有活跃连接，不清理
		}

		// 检查空闲时间
		lastActivityStr := pod.Annotations["kubepolaris.io/last-activity"]
		if lastActivityStr == "" {
			continue
		}

		lastActivity, err := time.Parse(time.RFC3339, lastActivityStr)
		if err != nil {
			continue
		}

		if time.Since(lastActivity) > kubectlIdleTimeout {
			logger.Info("清理空闲kubectl Pod", "cluster", cluster.Name, "pod", pod.Name, "idleTime", time.Since(lastActivity))
			_ = client.CoreV1().Pods(kubectlPodNamespace).Delete(ctx, pod.Name, metav1.DeleteOptions{})
		}
	}
}

// createK8sConfig 创建 K8s 配置
func (h *KubectlPodTerminalHandler) createK8sConfig(cluster *models.Cluster) (*rest.Config, error) {
	// 优先使用 Kubeconfig 方式
	if cluster.KubeconfigEnc != "" {
		config, err := clientcmd.RESTConfigFromKubeConfig([]byte(cluster.KubeconfigEnc))
		if err != nil {
			return nil, fmt.Errorf("解析kubeconfig失败: %v", err)
		}
		config.Timeout = 30 * time.Second
		return config, nil
	}

	// 回退到 Token 方式
	config := &rest.Config{
		Host:    cluster.APIServer,
		Timeout: 30 * time.Second,
	}

	if cluster.SATokenEnc != "" {
		config.BearerToken = cluster.SATokenEnc
	}

	if cluster.CAEnc != "" {
		config.CAData = []byte(cluster.CAEnc)
	} else {
		config.Insecure = true
	}

	return config, nil
}
