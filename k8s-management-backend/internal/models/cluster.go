package models

import (
	"time"

	"gorm.io/gorm"
)

// Cluster 集群模型
type Cluster struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Name          string         `json:"name" gorm:"uniqueIndex;not null;size:100"`
	APIServer     string         `json:"api_server" gorm:"not null;size:255"`
	KubeconfigEnc string         `json:"-" gorm:"type:text"` // 加密存储的 kubeconfig
	CAEnc         string         `json:"-" gorm:"type:text"` // 加密存储的 CA 证书
	SATokenEnc    string         `json:"-" gorm:"type:text"` // 加密存储的 SA Token
	Version       string         `json:"version" gorm:"size:50"`
	Status        string         `json:"status" gorm:"default:unknown;size:20"` // healthy, unhealthy, unknown
	Labels        string         `json:"labels" gorm:"type:json"`               // JSON 格式存储标签
	CertExpireAt  *time.Time     `json:"cert_expire_at"`
	LastHeartbeat *time.Time     `json:"last_heartbeat"`
	CreatedBy     uint           `json:"created_by"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// 关联关系
	Creator         User              `json:"creator" gorm:"foreignKey:CreatedBy"`
	TerminalSession []TerminalSession `json:"terminal_sessions" gorm:"foreignKey:ClusterID"`
}

// ClusterStats 集群统计信息
type ClusterStats struct {
	TotalClusters     int `json:"total_clusters"`
	HealthyClusters   int `json:"healthy_clusters"`
	UnhealthyClusters int `json:"unhealthy_clusters"`
	TotalNodes        int `json:"total_nodes"`
	ReadyNodes        int `json:"ready_nodes"`
	TotalPods         int `json:"total_pods"`
	RunningPods       int `json:"running_pods"`
}

// ClusterMetrics 集群实时指标
type ClusterMetrics struct {
	ClusterID    uint      `json:"cluster_id" gorm:"primaryKey"`
	NodeCount    int       `json:"node_count"`
	ReadyNodes   int       `json:"ready_nodes"`
	PodCount     int       `json:"pod_count"`
	RunningPods  int       `json:"running_pods"`
	CPUUsage     float64   `json:"cpu_usage"`
	MemoryUsage  float64   `json:"memory_usage"`
	StorageUsage float64   `json:"storage_usage"`
	UpdatedAt    time.Time `json:"updated_at"`

	// 关联关系
	Cluster Cluster `json:"cluster" gorm:"foreignKey:ClusterID"`
}
