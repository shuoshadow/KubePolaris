package router

import (
	"k8s-management-backend/internal/config"
	"k8s-management-backend/internal/handlers"
	"k8s-management-backend/internal/middleware"
	"k8s-management-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Setup 设置路由
func Setup(db *gorm.DB, cfg *config.Config) *gin.Engine {
	r := gin.New()

	// 全局中间件
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "K8s Management Backend is running",
		})
	})

	// API 路由组
	api := r.Group("/api")
	{
		// 认证相关路由
		auth := api.Group("/auth")
		{
			authHandler := handlers.NewAuthHandler(db, cfg)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", middleware.AuthRequired(cfg.JWT.Secret), authHandler.GetProfile)
		}

		// 暂时移除认证，方便开发测试
		// protected := api.Group("")
		// protected.Use(middleware.AuthRequired(cfg.JWT.Secret))

		// 集群管理路由
		clusters := api.Group("/clusters")
		{
			clusterHandler := handlers.NewClusterHandler(db, cfg)
			clusters.GET("", clusterHandler.GetClusters)
			clusters.POST("/import", clusterHandler.ImportCluster)
			clusters.GET("/:clusterId", clusterHandler.GetCluster)
			clusters.GET("/:clusterId/status", clusterHandler.GetClusterStatus)
			clusters.GET("/:clusterId/overview", clusterHandler.GetClusterOverview)
			clusters.GET("/:clusterId/metrics", clusterHandler.GetClusterMetrics)
			clusters.DELETE("/:clusterId", clusterHandler.DeleteCluster)
			clusters.GET("/stats", clusterHandler.GetClusterStats)
			clusters.POST("/test-connection", clusterHandler.TestConnection)
		}

		// kubectl终端WebSocket路由
		v1 := api.Group("/v1")
		{
			clusterService := services.NewClusterService(db)
			kubectlTerminalHandler := handlers.NewKubectlTerminalHandler(clusterService)
			v1.GET("/clusters/:clusterId/kubectl-terminal", kubectlTerminalHandler.HandleKubectlTerminal)
		}

		// 节点管理路由
		clusterService := services.NewClusterService(db)
		nodeHandler := handlers.NewNodeHandler(db, cfg, clusterService)
		api.GET("/clusters/:clusterId/nodes", nodeHandler.GetNodes)
		api.GET("/clusters/:clusterId/nodes/overview", nodeHandler.GetNodeOverview)
		api.GET("/clusters/:clusterId/nodes/:name", nodeHandler.GetNode)
		api.POST("/clusters/:clusterId/nodes/:name/cordon", nodeHandler.CordonNode)
		api.POST("/clusters/:clusterId/nodes/:name/uncordon", nodeHandler.UncordonNode)
		api.POST("/clusters/:clusterId/nodes/:name/drain", nodeHandler.DrainNode)

		// Pod管理路由
		podHandler := handlers.NewPodHandler(db, cfg)
		api.GET("/clusters/:clusterId/pods", podHandler.GetPods)
		api.GET("/clusters/:clusterId/pods/:namespace/:name", podHandler.GetPod)
		api.GET("/clusters/:clusterId/pods/:namespace/:name/logs", podHandler.GetPodLogs)

		// 工作负载管理路由
		workloadHandler := handlers.NewWorkloadHandler(db, cfg)
		api.GET("/clusters/:clusterId/workloads", workloadHandler.GetWorkloads)
		api.GET("/clusters/:clusterId/workloads/:namespace/:name", workloadHandler.GetWorkload)
		api.POST("/clusters/:clusterId/workloads/:namespace/:name/scale", workloadHandler.ScaleWorkload)
		api.POST("/clusters/:clusterId/yaml/apply", workloadHandler.ApplyYAML)

		// 全局搜索路由
		search := api.Group("/search")
		{
			searchHandler := handlers.NewSearchHandler(db, cfg)
			search.GET("", searchHandler.GlobalSearch)
		}

		// 审计路由
		audit := api.Group("/audit")
		{
			auditHandler := handlers.NewAuditHandler(db, cfg)
			audit.GET("/terminal/sessions", auditHandler.GetTerminalSessions)
			audit.GET("/terminal/sessions/:sessionId", auditHandler.GetTerminalSession)
			audit.GET("/terminal/sessions/:sessionId/commands", auditHandler.GetTerminalCommands)
		}
	}

	// WebSocket 路由
	ws := r.Group("/ws")
	ws.Use(middleware.AuthRequired(cfg.JWT.Secret))
	{
		terminalHandler := handlers.NewTerminalHandler(db, cfg)
		ws.GET("/clusters/:clusterId/terminal", terminalHandler.ClusterTerminal)
		ws.GET("/clusters/:clusterId/nodes/:name/terminal", terminalHandler.NodeTerminal)
		ws.GET("/clusters/:clusterId/pods/:namespace/:name/terminal", terminalHandler.PodTerminal)
	}

	return r
}
