package k8s

// OverviewSnapshot 统一的集群概览快照（由本地 Informer 缓存即时汇总）
type OverviewSnapshot struct {
	ClusterID uint `json:"clusterID"`

	Nodes struct {
		Total int `json:"total"`
		Ready int `json:"ready"`
	} `json:"nodes"`

	Pods struct {
		Total     int `json:"total"`
		Running   int `json:"running"`
		Pending   int `json:"pending"`
		Failed    int `json:"failed"`
		Succeeded int `json:"succeeded"`
		Unknown   int `json:"unknown"`
	} `json:"pods"`

	Namespaces int `json:"namespaces"`
	Services   int `json:"services"`
	Deploys    int `json:"deployments"`
}
