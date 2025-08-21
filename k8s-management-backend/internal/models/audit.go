package models

import (
	"time"

	"gorm.io/gorm"
)

// TerminalSession 终端会话模型
type TerminalSession struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	UserID     uint           `json:"user_id" gorm:"not null"`
	ClusterID  uint           `json:"cluster_id" gorm:"not null"`
	TargetType string         `json:"target_type" gorm:"not null;size:20"` // pod, node, cluster
	TargetRef  string         `json:"target_ref" gorm:"type:json"`         // JSON格式存储目标引用信息
	Namespace  string         `json:"namespace" gorm:"size:100"`
	Pod        string         `json:"pod" gorm:"size:100"`
	Container  string         `json:"container" gorm:"size:100"`
	Node       string         `json:"node" gorm:"size:100"`
	StartAt    time.Time      `json:"start_at"`
	EndAt      *time.Time     `json:"end_at"`
	InputSize  int64          `json:"input_size" gorm:"default:0"`          // 输入流大小（字节）
	Status     string         `json:"status" gorm:"default:active;size:20"` // active, closed, error
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`

	// 关联关系
	User     User              `json:"user" gorm:"foreignKey:UserID"`
	Cluster  Cluster           `json:"cluster" gorm:"foreignKey:ClusterID"`
	Commands []TerminalCommand `json:"commands" gorm:"foreignKey:SessionID"`
}

// TerminalCommand 终端命令记录模型
type TerminalCommand struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	SessionID uint      `json:"session_id" gorm:"not null;index"`
	Timestamp time.Time `json:"timestamp"`
	RawInput  string    `json:"raw_input" gorm:"type:text"`  // 原始输入
	ParsedCmd string    `json:"parsed_cmd" gorm:"size:1024"` // 解析后的命令
	ExitCode  *int      `json:"exit_code"`                   // 命令退出码
	CreatedAt time.Time `json:"created_at"`

	// 关联关系
	Session TerminalSession `json:"session" gorm:"foreignKey:SessionID"`
}

// AuditLog 审计日志模型
type AuditLog struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null;index"`
	Action       string    `json:"action" gorm:"not null;size:100"`       // 操作类型
	ResourceType string    `json:"resource_type" gorm:"not null;size:50"` // 资源类型
	ResourceRef  string    `json:"resource_ref" gorm:"type:json"`         // 资源引用信息
	Result       string    `json:"result" gorm:"not null;size:20"`        // success, failed
	IP           string    `json:"ip" gorm:"size:45"`                     // 客户端IP
	UserAgent    string    `json:"user_agent" gorm:"size:500"`            // 用户代理
	Details      string    `json:"details" gorm:"type:text"`              // 详细信息
	CreatedAt    time.Time `json:"created_at"`

	// 关联关系
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// TableName 指定终端会话表名
func (TerminalSession) TableName() string {
	return "terminal_sessions"
}

// TableName 指定终端命令表名
func (TerminalCommand) TableName() string {
	return "terminal_commands"
}

// TableName 指定审计日志表名
func (AuditLog) TableName() string {
	return "audit_logs"
}
