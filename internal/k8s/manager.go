package k8s

import (
	"context"
	"fmt"
	"sync"
	"time"

	"kubepolaris/internal/models"
	"kubepolaris/internal/services"
	"kubepolaris/pkg/logger"

	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

type ClusterRuntime struct {
	clientset *kubernetes.Clientset
	factory   informers.SharedInformerFactory

	startOnce sync.Once
	started   bool
	synced    bool

	stopCh chan struct{}
}

// ClusterInformerManager 统一管理各集群的 Informer 生命周期与缓存访问
type ClusterInformerManager struct {
	mu       sync.RWMutex
	clusters map[uint]*ClusterRuntime
}

func NewClusterInformerManager() *ClusterInformerManager {
	return &ClusterInformerManager{
		clusters: make(map[uint]*ClusterRuntime),
	}
}

// EnsureForCluster 确保指定集群的 informer 已创建并启动
func (m *ClusterInformerManager) EnsureForCluster(cluster *models.Cluster) (*ClusterRuntime, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if rt, ok := m.clusters[cluster.ID]; ok {
		return rt, nil
	}

	// 使用已有封装创建 clientset（复用认证/容错逻辑）
	var kc *services.K8sClient
	var err error
	if cluster.KubeconfigEnc != "" {
		kc, err = services.NewK8sClientFromKubeconfig(cluster.KubeconfigEnc)
	} else {
		kc, err = services.NewK8sClientFromToken(cluster.APIServer, cluster.SATokenEnc, cluster.CAEnc)
	}
	if err != nil {
		return nil, fmt.Errorf("为集群创建客户端失败: %w", err)
	}

	clientset := kc.GetClientset()
	// resync 为 0 表示关闭周期性全量 Resync，降低压力
	factory := informers.NewSharedInformerFactory(clientset, 0)

	rt := &ClusterRuntime{
		clientset: clientset,
		factory:   factory,
		stopCh:    make(chan struct{}),
	}

	// 预创建需要的 informer（pods/nodes/ns/services/deployments）
	_ = factory.Core().V1().Pods().Informer()
	_ = factory.Core().V1().Nodes().Informer()
	_ = factory.Core().V1().Namespaces().Informer()
	_ = factory.Core().V1().Services().Informer()
	_ = factory.Apps().V1().Deployments().Informer()

	// 启动
	rt.startOnce.Do(func() {
		factory.Start(rt.stopCh)
		rt.started = true
	})

	m.clusters[cluster.ID] = rt
	return rt, nil
}

// waitForSync 等待本集群的缓存同步就绪（首次可能需要几十到数百毫秒，取决于资源规模）
func (m *ClusterInformerManager) waitForSync(ctx context.Context, rt *ClusterRuntime) bool {
	if rt.synced {
		return true
	}
	syncCh := make(chan struct{})
	go func() {
		// 等待需要的 Informer 同步
		ok := cache.WaitForCacheSync(
			rt.stopCh,
			rt.factory.Core().V1().Pods().Informer().HasSynced,
			rt.factory.Core().V1().Nodes().Informer().HasSynced,
			rt.factory.Core().V1().Namespaces().Informer().HasSynced,
			rt.factory.Core().V1().Services().Informer().HasSynced,
			rt.factory.Apps().V1().Deployments().Informer().HasSynced,
		)
		if ok {
			rt.synced = true
		}
		close(syncCh)
	}()
	select {
	case <-ctx.Done():
		return false
	case <-syncCh:
		return rt.synced
	}
}

// GetOverviewSnapshot 从本地缓存即时汇总概览（不触发远端 List）
func (m *ClusterInformerManager) GetOverviewSnapshot(ctx context.Context, clusterID uint) (*OverviewSnapshot, error) {
	m.mu.RLock()
	rt, ok := m.clusters[clusterID]
	m.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("集群 %d 未初始化 informer", clusterID)
	}

	// 等待缓存同步（给一个较短的时间窗以保护延迟）
	sctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if !m.waitForSync(sctx, rt) {
		return nil, fmt.Errorf("informer 缓存尚未就绪")
	}

	snap := &OverviewSnapshot{ClusterID: clusterID}

	// Pods
	pods, err := rt.factory.Core().V1().Pods().Lister().List(labels.Everything())
	if err != nil {
		return nil, fmt.Errorf("读取缓存 pods 失败: %w", err)
	}
	for _, p := range pods {
		snap.Pods.Total++
		switch string(p.Status.Phase) {
		case "Running":
			snap.Pods.Running++
		case "Pending":
			snap.Pods.Pending++
		case "Failed":
			snap.Pods.Failed++
		case "Succeeded":
			snap.Pods.Succeeded++
		default:
			snap.Pods.Unknown++
		}
	}

	// Nodes
	nodes, err := rt.factory.Core().V1().Nodes().Lister().List(labels.Everything())
	if err != nil {
		return nil, fmt.Errorf("读取缓存 nodes 失败: %w", err)
	}
	snap.Nodes.Total = len(nodes)
	for _, n := range nodes {
		for _, c := range n.Status.Conditions {
			if c.Type == "Ready" && c.Status == "True" {
				snap.Nodes.Ready++
				break
			}
		}
	}

	// Namespaces
	nss, err := rt.factory.Core().V1().Namespaces().Lister().List(labels.Everything())
	if err != nil {
		logger.Error("读取缓存 namespaces 失败", "error", err)
	} else {
		snap.Namespaces = len(nss)
	}

	// Services
	svcs, err := rt.factory.Core().V1().Services().Lister().List(labels.Everything())
	if err != nil {
		logger.Error("读取缓存 services 失败", "error", err)
	} else {
		snap.Services = len(svcs)
	}

	// Deployments
	deploys, err := rt.factory.Apps().V1().Deployments().Lister().List(labels.Everything())
	if err != nil {
		logger.Error("读取缓存 deployments 失败", "error", err)
	} else {
		snap.Deploys = len(deploys)
	}

	return snap, nil
}

// Stop 关闭所有集群的 informer（应用退出时调用）
func (m *ClusterInformerManager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for id, rt := range m.clusters {
		close(rt.stopCh)
		delete(m.clusters, id)
	}
}
