package handlers

import (
	"net/http"

	"k8s-management-backend/internal/config"
	"k8s-management-backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SearchHandler 搜索处理器
type SearchHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewSearchHandler 创建搜索处理器
func NewSearchHandler(db *gorm.DB, cfg *config.Config) *SearchHandler {
	return &SearchHandler{
		db:  db,
		cfg: cfg,
	}
}

// GlobalSearch 全局搜索
func (h *SearchHandler) GlobalSearch(c *gin.Context) {
	query := c.Query("q")
	logger.Info("全局搜索: %s", query)

	// TODO: 实现全局搜索逻辑
	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "搜索成功",
		"data": gin.H{
			"clusters":  []interface{}{},
			"nodes":     []interface{}{},
			"pods":      []interface{}{},
			"workloads": []interface{}{},
		},
	})
}
