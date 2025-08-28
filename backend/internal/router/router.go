package router

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"kubepolaris/internal/config"
	"kubepolaris/internal/handlers"
	"kubepolaris/internal/middleware"
	"kubepolaris/internal/services"
)

func Setup(db *gorm.DB, cfg *config.Config) *gin.Engine {
	r := gin.New()

	// 根据环境设置 gin 模式（可选）
	// if cfg.Server.Mode == "release" {
	// 	gin.SetMode(gin.ReleaseMode)
	// }

	// 全局中间件：建议引入 RequestID + 结构化日志 + 统一恢复
	r.Use(
		// middleware.RequestID(), // TODO: 注入 traceId/requestId
		gin.Recovery(),    // 可替换为自定义 Recovery 统一错误响应
		gin.Logger(),      // 可替换为 zap/logrus 结构化日志中间件
		middleware.CORS(), // TODO: 从 cfg 读取允许的 Origin/Methods/Headers
		// middleware.Gzip(),     // TODO: 如需压缩
		// middleware.RateLimit() // TODO: 关键接口限流
	)

	// Health endpoints：liveness 与 readiness
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/readyz", func(c *gin.Context) {
		// TODO: 检查 db/k8s 可用性
		c.JSON(200, gin.H{"ready": true})
	})

	// 统一的 Service 实例，避免重复创建
	clusterSvc := services.NewClusterService(db)

	// /api/v1
	api := r.Group("/api/v1")

	// Auth 仅开放登录与登出，其余走受保护分组
	auth := api.Group("/auth")
	{
		authHandler := handlers.NewAuthHandler(db, cfg)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", authHandler.Logout)
		// /me 必须带 Auth
		auth.GET("/me", middleware.AuthRequired(cfg.JWT.Secret), authHandler.GetProfile)
	}

	// 受保护的业务路由
	protected := api.Group("")
	// protected.Use(middleware.AuthRequired(cfg.JWT.Secret))
	{
		// clusters 根分组
		clusters := protected.Group("/clusters")
		{
			clusterHandler := handlers.NewClusterHandler(db, cfg)

			// 静态路由优先
			clusters.GET("/stats", clusterHandler.GetClusterStats)
			clusters.POST("/import", clusterHandler.ImportCluster)
			clusters.POST("/test-connection", clusterHandler.TestConnection)
			clusters.GET("", clusterHandler.GetClusters)

			// 动态 cluster 子分组
			cluster := clusters.Group("/:clusterID")
			{
				cluster.GET("", clusterHandler.GetCluster)
				cluster.GET("/status", clusterHandler.GetClusterStatus)
				cluster.GET("/overview", clusterHandler.GetClusterOverview)
				cluster.GET("/metrics", clusterHandler.GetClusterMetrics)
				cluster.DELETE("", clusterHandler.DeleteCluster)

				// nodes 子分组
				nodeHandler := handlers.NewNodeHandler(db, cfg, clusterSvc)
				nodes := cluster.Group("/nodes")
				{
					nodes.GET("", nodeHandler.GetNodes)
					nodes.GET("/overview", nodeHandler.GetNodeOverview)
					nodes.GET("/:name", nodeHandler.GetNode)
					nodes.POST("/:name/cordon", nodeHandler.CordonNode)
					nodes.POST("/:name/uncordon", nodeHandler.UncordonNode)
					nodes.POST("/:name/drain", nodeHandler.DrainNode)
				}

				// pods 子分组
				podHandler := handlers.NewPodHandler(db, cfg, clusterSvc)
				pods := cluster.Group("/pods")
				{
					pods.GET("", podHandler.GetPods) // 可考虑使用 query 过滤 namespace/name
					pods.GET("/:namespace/:name", podHandler.GetPod)
					pods.DELETE("/:namespace/:name", podHandler.DeletePod)
					pods.GET("/:namespace/:name/logs", podHandler.GetPodLogs)
				}

				// workloads 子分组
				workloadHandler := handlers.NewWorkloadHandler(db, cfg, clusterSvc)
				workloads := cluster.Group("/workloads")
				{
					workloads.GET("", workloadHandler.GetWorkloads)
					workloads.GET("/:namespace/:name", workloadHandler.GetWorkload)
					workloads.POST("/:namespace/:name/scale", workloadHandler.ScaleWorkload)
					// YAML apply 可以考虑放 /apply 到 cluster 级别或 workloads 级别均可
					workloads.POST("/yaml/apply", workloadHandler.ApplyYAML)
				}
			}
		}

		// search
		search := protected.Group("/search")
		{
			searchHandler := handlers.NewSearchHandler(db, cfg)
			search.GET("", searchHandler.GlobalSearch)
		}

		// audit
		audit := protected.Group("/audit")
		{
			auditHandler := handlers.NewAuditHandler(db, cfg)
			audit.GET("/terminal/sessions", auditHandler.GetTerminalSessions)
			audit.GET("/terminal/sessions/:sessionId", auditHandler.GetTerminalSession)
			audit.GET("/terminal/sessions/:sessionId/commands", auditHandler.GetTerminalCommands)
		}
	}

	// WebSocket：建议也加认证
	ws := r.Group("/ws")
	// ws.Use(middleware.AuthRequired(cfg.JWT.Secret))
	{
		kctl := handlers.NewKubectlTerminalHandler(clusterSvc)
		ssh := handlers.NewSSHHandler()
		podTerminal := handlers.NewPodTerminalHandler(clusterSvc)

		// 集群级 kubectl 终端
		ws.GET("/clusters/:clusterID/terminal", kctl.HandleKubectlTerminal)

		// 节点 SSH 终端
		ws.GET("/ssh/terminal", ssh.SSHConnect)

		// Pod 终端：使用 kubectl exec 连接到 Pod
		ws.GET("/clusters/:clusterID/pods/:namespace/:name/terminal", podTerminal.HandlePodTerminal)
	}

	// TODO:
	// - 统一错误处理/响应格式中间件
	// - OpenAPI/Swagger 文档路由（/swagger/*any）
	// - 404/405 兜底处理
	return r
}
