package services

import (
	"context"
	"encoding/base64"
	"fmt"
	"math"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

type K8sClient struct {
	clientset *kubernetes.Clientset
	config    *rest.Config
}

type ClusterInfo struct {
	Version           string `json:"version"`
	NodeCount         int    `json:"nodeCount"`
	ReadyNodes        int    `json:"readyNodes"`
	Status            string `json:"status"`
	PodCount          int    `json:"podCount,omitempty"`
	RunningPods       int    `json:"runningPods,omitempty"`
	CanAccessPods     bool   `json:"canAccessPods,omitempty"`
	CanAccessServices bool   `json:"canAccessServices,omitempty"`
}

// NewK8sClientFromKubeconfig 从kubeconfig创建客户端
func NewK8sClientFromKubeconfig(kubeconfig string) (*K8sClient, error) {
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
	if err != nil {
		return nil, fmt.Errorf("解析kubeconfig失败: %v", err)
	}

	// 设置超时时间
	config.Timeout = 30 * time.Second

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("创建kubernetes客户端失败: %v", err)
	}

	return &K8sClient{
		clientset: clientset,
		config:    config,
	}, nil
}

// NewK8sClientFromToken 从API Server和Token创建客户端
func NewK8sClientFromToken(apiServer, token, caCert string) (*K8sClient, error) {
	// 确保API Server地址格式正确
	if !strings.HasPrefix(apiServer, "http://") && !strings.HasPrefix(apiServer, "https://") {
		apiServer = "https://" + apiServer
	}

	config := &rest.Config{
		Host:        apiServer,
		BearerToken: token,
		Timeout:     30 * time.Second, // 增加超时时间
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: true, // 默认跳过TLS验证，避免证书问题
		},
	}

	// 如果提供了CA证书，尝试使用它
	if caCert != "" {
		// 尝试base64解码
		caCertData, err := base64.StdEncoding.DecodeString(caCert)
		if err != nil {
			// 如果base64解码失败，尝试直接使用原始数据
			caCertData = []byte(caCert)
		}
		config.TLSClientConfig.CAData = caCertData
		config.TLSClientConfig.Insecure = false
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("创建kubernetes客户端失败: %v", err)
	}

	return &K8sClient{
		clientset: clientset,
		config:    config,
	}, nil
}

// TestConnection 测试连接并获取集群信息
func (c *K8sClient) TestConnection() (*ClusterInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 1. 测试基本连接 - 获取集群版本信息
	version, err := c.clientset.Discovery().ServerVersion()
	if err != nil {
		return nil, fmt.Errorf("连接失败，无法获取集群版本: %w", err)
	}

	// 2. 测试权限 - 尝试获取节点列表
	nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("权限不足，无法获取节点列表: %w", err)
	}

	// 3. 统计节点状态
	readyNodes := 0
	notReadyNodes := 0
	for _, node := range nodes.Items {
		isReady := false
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady {
				if condition.Status == corev1.ConditionTrue {
					readyNodes++
					isReady = true
				}
				break
			}
		}
		if !isReady {
			notReadyNodes++
		}
	}

	// 4. 测试Pod访问权限
	pods, err := c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{Limit: 1})
	canAccessPods := err == nil

	// 5. 测试Service访问权限
	_, err = c.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{Limit: 1})
	canAccessServices := err == nil

	// 6. 确定集群整体状态
	status := "healthy"
	if notReadyNodes > 0 {
		if readyNodes == 0 {
			status = "unhealthy"
		} else {
			status = "warning"
		}
	}

	// 7. 获取集群基本信息
	clusterInfo := &ClusterInfo{
		Version:           version.String(),
		NodeCount:         len(nodes.Items),
		ReadyNodes:        readyNodes,
		Status:            status,
		CanAccessPods:     canAccessPods,
		CanAccessServices: canAccessServices,
	}

	// 8. 尝试获取更多统计信息（可选，不影响连接测试结果）
	if canAccessPods && pods != nil {
		// 统计Pod数量（仅在有权限时）
		allPods, err := c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
		if err == nil {
			clusterInfo.PodCount = len(allPods.Items)
			runningPods := 0
			for _, pod := range allPods.Items {
				if pod.Status.Phase == corev1.PodRunning {
					runningPods++
				}
			}
			clusterInfo.RunningPods = runningPods
		}
	}

	return clusterInfo, nil
}

// analyzeConnectionError 分析连接错误并提供诊断信息
func analyzeConnectionError(err error) string {
	errStr := err.Error()

	switch {
	case strings.Contains(errStr, "unexpected EOF"):
		return "网络连接意外中断，可能原因：1) API Server地址错误或不可达 2) 网络连接不稳定 3) TLS握手失败 4) 防火墙阻止连接"
	case strings.Contains(errStr, "connection refused"):
		return "连接被拒绝，API Server可能未运行或端口不正确"
	case strings.Contains(errStr, "timeout") || strings.Contains(errStr, "context deadline exceeded"):
		return "连接超时，可能原因：1) API Server响应过慢 2) 网络延迟过高 3) 防火墙限制 4) 集群负载过高，建议检查网络连接和集群状态"
	case strings.Contains(errStr, "certificate"):
		return "TLS证书验证失败，请检查CA证书配置或尝试跳过证书验证"
	case strings.Contains(errStr, "unauthorized") || strings.Contains(errStr, "401"):
		return "认证失败，请检查Token或kubeconfig中的认证信息"
	case strings.Contains(errStr, "forbidden") || strings.Contains(errStr, "403"):
		return "权限不足，当前用户没有访问该资源的权限"
	case strings.Contains(errStr, "not found") || strings.Contains(errStr, "404"):
		return "API路径不存在，请检查API Server地址和版本"
	case strings.Contains(errStr, "no such host"):
		return "域名解析失败，请检查API Server地址是否正确"
	case strings.Contains(errStr, "network is unreachable"):
		return "网络不可达，请检查网络连接和路由配置"
	default:
		return "未知连接错误，请检查网络连接和集群配置"
	}
}

// GetClusterOverview 获取集群概览信息
func (c *K8sClient) GetClusterOverview() (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	overview := make(map[string]interface{})

	// 获取节点信息
	nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取节点信息失败: %v", err)
	}

	// 获取Pod信息
	pods, err := c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取Pod信息失败: %v", err)
	}

	// 获取命名空间信息
	namespaces, err := c.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取命名空间信息失败: %v", err)
	}

	// 统计Pod状态
	runningPods := 0
	pendingPods := 0
	failedPods := 0
	for _, pod := range pods.Items {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			runningPods++
		case corev1.PodPending:
			pendingPods++
		case corev1.PodFailed:
			failedPods++
		}
	}

	overview["nodes"] = map[string]interface{}{
		"total": len(nodes.Items),
		"ready": func() int {
			ready := 0
			for _, node := range nodes.Items {
				for _, condition := range node.Status.Conditions {
					if condition.Type == corev1.NodeReady && condition.Status == corev1.ConditionTrue {
						ready++
						break
					}
				}
			}
			return ready
		}(),
	}

	overview["pods"] = map[string]interface{}{
		"total":   len(pods.Items),
		"running": runningPods,
		"pending": pendingPods,
		"failed":  failedPods,
	}

	overview["namespaces"] = len(namespaces.Items)

	return overview, nil
}

// CreateKubeconfigFromToken 从token和API server创建kubeconfig内容
func CreateKubeconfigFromToken(clusterName, apiServer, token, caCert string) string {
	config := api.Config{
		APIVersion: "v1",
		Kind:       "Config",
		Clusters: map[string]*api.Cluster{
			clusterName: {
				Server: apiServer,
			},
		},
		Contexts: map[string]*api.Context{
			clusterName: {
				Cluster:  clusterName,
				AuthInfo: clusterName,
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			clusterName: {
				Token: token,
			},
		},
		CurrentContext: clusterName,
	}

	// 如果提供了CA证书，添加到配置中
	if caCert != "" {
		config.Clusters[clusterName].CertificateAuthorityData = []byte(caCert)
	} else {
		config.Clusters[clusterName].InsecureSkipTLSVerify = true
	}

	// 将配置转换为YAML字符串
	configBytes, _ := clientcmd.Write(config)
	return string(configBytes)
}

// ValidateKubeconfig 验证kubeconfig格式
func ValidateKubeconfig(kubeconfig string) error {
	_, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
	return err
}

// GetClientset 获取kubernetes客户端
func (c *K8sClient) GetClientset() *kubernetes.Clientset {
	return c.clientset
}

// GetClusterMetrics 获取集群监控数据
func (c *K8sClient) GetClusterMetrics(timeRange string, step string) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	metrics := make(map[string]interface{})

	// 获取节点信息
	nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取节点信息失败: %v", err)
	}

	// 获取Pod信息
	pods, err := c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取Pod信息失败: %v", err)
	}

	// 计算时间范围
	endTime := time.Now()
	var startTime time.Time

	switch timeRange {
	case "1h":
		startTime = endTime.Add(-1 * time.Hour)
	case "6h":
		startTime = endTime.Add(-6 * time.Hour)
	case "12h":
		startTime = endTime.Add(-12 * time.Hour)
	case "1d":
		startTime = endTime.Add(-24 * time.Hour)
	case "7d":
		startTime = endTime.Add(-7 * 24 * time.Hour)
	default:
		startTime = endTime.Add(-1 * time.Hour)
	}

	// 从节点状态和Pod分布估算资源使用情况
	// 计算节点资源总量和已分配资源
	var totalCPUCapacity, allocatableCPU int64
	var totalMemoryCapacity, allocatableMemory int64

	for _, node := range nodes.Items {
		// 获取节点总容量
		cpuCapacity := node.Status.Capacity.Cpu().MilliValue()
		memoryCapacity := node.Status.Capacity.Memory().Value()

		totalCPUCapacity += cpuCapacity
		totalMemoryCapacity += memoryCapacity

		// 获取节点可分配资源
		allocatableCPU += node.Status.Allocatable.Cpu().MilliValue()
		allocatableMemory += node.Status.Allocatable.Memory().Value()
	}

	// 计算Pod请求的资源总量
	var requestedCPU, requestedMemory int64
	var runningPodCount int

	for _, pod := range pods.Items {
		if pod.Status.Phase == corev1.PodRunning {
			runningPodCount++

			// 累加Pod中所有容器请求的资源
			for _, container := range pod.Spec.Containers {
				if container.Resources.Requests != nil {
					if cpu, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
						requestedCPU += cpu.MilliValue()
					}
					if memory, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
						requestedMemory += memory.Value()
					}
				}
			}
		}
	}

	// 计算资源使用率
	cpuUsagePercent := 0.0
	memoryUsagePercent := 0.0

	if allocatableCPU > 0 {
		cpuUsagePercent = math.Min(100, float64(requestedCPU)/float64(allocatableCPU)*100)
	}

	if allocatableMemory > 0 {
		memoryUsagePercent = math.Min(100, float64(requestedMemory)/float64(allocatableMemory)*100)
	}

	// 如果无法获取请求资源信息，使用Pod数量和节点数量估算
	if requestedCPU == 0 || requestedMemory == 0 {
		readyNodeCount := 0
		for _, node := range nodes.Items {
			for _, condition := range node.Status.Conditions {
				if condition.Type == corev1.NodeReady && condition.Status == corev1.ConditionTrue {
					readyNodeCount++
					break
				}
			}
		}

		if readyNodeCount > 0 {
			// 根据运行中的Pod数量和节点数量估算使用率
			podsPerNode := float64(runningPodCount) / float64(readyNodeCount)
			cpuUsagePercent = math.Min(95, podsPerNode*10)   // 假设每个Pod平均使用10%的CPU
			memoryUsagePercent = math.Min(90, podsPerNode*8) // 假设每个Pod平均使用8%的内存
		}
	}

	// 统计Pod状态分布
	podStatus := map[string]int{
		"Running":   0,
		"Pending":   0,
		"Succeeded": 0,
		"Failed":    0,
		"Unknown":   0,
	}

	for _, pod := range pods.Items {
		status := string(pod.Status.Phase)
		if count, exists := podStatus[status]; exists {
			podStatus[status] = count + 1
		} else {
			podStatus["Unknown"]++
		}
	}

	// 统计节点状态
	nodeStatus := map[string]int{
		"Ready":    0,
		"NotReady": 0,
	}

	for _, node := range nodes.Items {
		isReady := false
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady {
				if condition.Status == corev1.ConditionTrue {
					nodeStatus["Ready"]++
					isReady = true
				}
				break
			}
		}
		if !isReady {
			nodeStatus["NotReady"]++
		}
	}

	// 生成时间序列数据
	// 注意：这里我们仍然使用模拟数据生成时间序列，因为获取历史数据需要Prometheus等监控系统
	// 在实际生产环境中，应该集成Prometheus API来获取真实的历史数据
	var timePoints []time.Time
	stepDuration, _ := time.ParseDuration(step)
	if stepDuration == 0 {
		stepDuration = time.Minute // 默认1分钟
	}

	for t := startTime; t.Before(endTime); t = t.Add(stepDuration) {
		timePoints = append(timePoints, t)
	}
	timePoints = append(timePoints, endTime)

	// 生成CPU使用率数据，但使用当前真实的CPU使用率作为基准
	cpuData := make([]map[string]interface{}, 0, len(timePoints))
	for i, t := range timePoints {
		// 使用真实的当前值作为基准，历史数据仍然模拟
		var value float64
		if i == len(timePoints)-1 {
			value = cpuUsagePercent
		} else {
			// 模拟历史数据，但围绕当前真实值波动
			variance := 20.0
			if cpuUsagePercent > 80 {
				variance = 10.0
			}
			value = math.Max(0, math.Min(100, cpuUsagePercent+(math.Sin(float64(t.Unix()%3600)/3600*2*math.Pi)-0.5)*variance))
		}

		cpuData = append(cpuData, map[string]interface{}{
			"timestamp": t.Unix(),
			"value":     value,
		})
	}

	// 生成内存使用率数据，但使用当前真实的内存使用率作为基准
	memoryData := make([]map[string]interface{}, 0, len(timePoints))
	for i, t := range timePoints {
		// 使用真实的当前值作为基准，历史数据仍然模拟
		var value float64
		if i == len(timePoints)-1 {
			value = memoryUsagePercent
		} else {
			// 模拟历史数据，但围绕当前真实值波动
			variance := 15.0
			if memoryUsagePercent > 80 {
				variance = 8.0
			}
			value = math.Max(0, math.Min(100, memoryUsagePercent+(math.Sin(float64(t.Unix()%7200)/7200*2*math.Pi)-0.5)*variance))
		}

		memoryData = append(memoryData, map[string]interface{}{
			"timestamp": t.Unix(),
			"value":     value,
		})
	}

	// 网络和磁盘数据仍然使用模拟数据，因为这些需要特定的监控系统
	networkInData := make([]map[string]interface{}, 0, len(timePoints))
	networkOutData := make([]map[string]interface{}, 0, len(timePoints))
	for _, t := range timePoints {
		networkInData = append(networkInData, map[string]interface{}{
			"timestamp": t.Unix(),
			"value":     30 + 20*math.Sin(float64(t.Unix()%5400)/5400*2*math.Pi),
		})
		networkOutData = append(networkOutData, map[string]interface{}{
			"timestamp": t.Unix(),
			"value":     25 + 15*math.Sin(float64(t.Unix()%4800)/4800*2*math.Pi),
		})
	}

	diskData := make([]map[string]interface{}, 0, len(timePoints))
	for _, t := range timePoints {
		diskData = append(diskData, map[string]interface{}{
			"timestamp": t.Unix(),
			"value":     40 + 5*math.Sin(float64(t.Unix()%10800)/10800*2*math.Pi),
		})
	}

	// 组装返回数据
	metrics["cpu"] = map[string]interface{}{
		"current": cpuUsagePercent,
		"series":  cpuData,
	}

	metrics["memory"] = map[string]interface{}{
		"current": memoryUsagePercent,
		"series":  memoryData,
	}

	metrics["network"] = map[string]interface{}{
		"in": map[string]interface{}{
			"current": networkInData[len(networkInData)-1]["value"],
			"series":  networkInData,
		},
		"out": map[string]interface{}{
			"current": networkOutData[len(networkOutData)-1]["value"],
			"series":  networkOutData,
		},
	}

	metrics["disk"] = map[string]interface{}{
		"current": diskData[len(diskData)-1]["value"],
		"series":  diskData,
	}

	metrics["pods"] = podStatus
	metrics["nodes"] = nodeStatus

	// 添加时间范围信息
	metrics["timeRange"] = map[string]interface{}{
		"start": startTime.Unix(),
		"end":   endTime.Unix(),
		"step":  step,
	}

	return metrics, nil
}

// CordonNode 封锁节点（标记为不可调度）
func (c *K8sClient) CordonNode(nodeName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取节点
	node, err := c.clientset.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("获取节点失败: %v", err)
	}

	// 检查节点是否已经被封锁
	if node.Spec.Unschedulable {
		return nil // 节点已经被封锁，无需操作
	}

	// 标记节点为不可调度
	node.Spec.Unschedulable = true

	// 更新节点
	_, err = c.clientset.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("封锁节点失败: %v", err)
	}

	return nil
}

// UncordonNode 解封节点（标记为可调度）
func (c *K8sClient) UncordonNode(nodeName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取节点
	node, err := c.clientset.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("获取节点失败: %v", err)
	}

	// 检查节点是否已经可调度
	if !node.Spec.Unschedulable {
		return nil // 节点已经可调度，无需操作
	}

	// 标记节点为可调度
	node.Spec.Unschedulable = false

	// 更新节点
	_, err = c.clientset.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("解封节点失败: %v", err)
	}

	return nil
}

// DrainNode 驱逐节点上的Pod
func (c *K8sClient) DrainNode(nodeName string, options map[string]interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute) // 驱逐操作可能需要更长时间
	defer cancel()

	// 获取节点
	node, err := c.clientset.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("获取节点失败: %v", err)
	}

	// 1. 首先封锁节点，防止新的Pod调度到该节点
	if !node.Spec.Unschedulable {
		node.Spec.Unschedulable = true
		_, err = c.clientset.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
		if err != nil {
			return fmt.Errorf("封锁节点失败: %v", err)
		}
	}

	// 解析选项
	ignoreDaemonSets := true
	if val, ok := options["ignoreDaemonSets"]; ok {
		ignoreDaemonSets = val.(bool)
	}

	deleteLocalData := false
	if val, ok := options["deleteLocalData"]; ok {
		deleteLocalData = val.(bool)
	}

	force := false
	if val, ok := options["force"]; ok {
		force = val.(bool)
	}

	gracePeriodSeconds := int64(30)
	if val, ok := options["gracePeriodSeconds"]; ok {
		if intVal, ok := val.(float64); ok {
			gracePeriodSeconds = int64(intVal)
		}
	}

	// 2. 获取节点上的所有Pod
	fieldSelector := fmt.Sprintf("spec.nodeName=%s", nodeName)
	pods, err := c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{
		FieldSelector: fieldSelector,
	})
	if err != nil {
		return fmt.Errorf("获取节点上的Pod失败: %v", err)
	}

	// 3. 驱逐Pod
	for _, pod := range pods.Items {
		// 如果忽略DaemonSet，检查Pod是否由DaemonSet控制
		if ignoreDaemonSets {
			isDaemonSet := false
			for _, owner := range pod.OwnerReferences {
				if owner.Kind == "DaemonSet" {
					isDaemonSet = true
					break
				}
			}
			if isDaemonSet {
				continue // 跳过DaemonSet管理的Pod
			}
		}

		// 检查Pod是否使用emptyDir卷
		if !deleteLocalData {
			hasEmptyDir := false
			for _, volume := range pod.Spec.Volumes {
				if volume.EmptyDir != nil {
					hasEmptyDir = true
					break
				}
			}
			if hasEmptyDir && !force {
				return fmt.Errorf("Pod %s/%s 使用emptyDir卷，需要设置deleteLocalData=true或force=true", pod.Namespace, pod.Name)
			}
		}

		// 删除Pod
		deleteOptions := metav1.DeleteOptions{}
		if gracePeriodSeconds >= 0 {
			deleteOptions.GracePeriodSeconds = &gracePeriodSeconds
		}

		err = c.clientset.CoreV1().Pods(pod.Namespace).Delete(ctx, pod.Name, deleteOptions)
		if err != nil {
			if !force {
				return fmt.Errorf("驱逐Pod %s/%s 失败: %v", pod.Namespace, pod.Name, err)
			}
			// 如果设置了force，则忽略错误继续执行
		}
	}

	return nil
}
