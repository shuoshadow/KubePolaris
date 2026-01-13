// Package integration 提供集成测试框架
package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/suite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"kubepolaris/internal/config"
	"kubepolaris/internal/handlers"
	"kubepolaris/internal/models"
)

// IntegrationTestSuite 集成测试套件
type IntegrationTestSuite struct {
	suite.Suite
	db     *gorm.DB
	router *gin.Engine
	cfg    *config.Config
}

// SetupSuite 测试套件开始前的设置
func (s *IntegrationTestSuite) SetupSuite() {
	// 检查是否设置了集成测试环境变量
	if os.Getenv("INTEGRATION_TEST") != "true" {
		s.T().Skip("Skipping integration tests. Set INTEGRATION_TEST=true to run.")
	}

	gin.SetMode(gin.TestMode)

	// 使用测试数据库
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		dsn = "root:password@tcp(127.0.0.1:3306)/kubepolaris_test?charset=utf8mb4&parseTime=True&loc=Local"
	}

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	s.Require().NoError(err)

	s.db = db
	s.cfg = &config.Config{
		JWT: config.JWTConfig{
			Secret:     "integration-test-secret",
			ExpireTime: 24,
		},
	}

	// 自动迁移测试表
	s.db.AutoMigrate(&models.User{}, &models.Cluster{}, &models.Role{})

	// 设置路由
	s.router = s.setupRouter()
}

// TearDownSuite 测试套件结束后的清理
func (s *IntegrationTestSuite) TearDownSuite() {
	if s.db != nil {
		// 清理测试数据
		s.db.Exec("DELETE FROM users WHERE username LIKE 'test_%'")
		s.db.Exec("DELETE FROM clusters WHERE name LIKE 'test_%'")

		sqlDB, _ := s.db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}
}

// setupRouter 设置测试路由
func (s *IntegrationTestSuite) setupRouter() *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())

	// 创建处理器
	clusterHandler := handlers.NewClusterHandler(s.db, s.cfg, nil, nil, nil)
	authHandler := handlers.NewAuthHandler(s.db, s.cfg, nil)

	// API 路由
	api := router.Group("/api")
	{
		// 认证路由
		api.POST("/auth/login", authHandler.Login)

		// 集群路由
		clusters := api.Group("/clusters")
		{
			clusters.GET("", clusterHandler.GetClusters)
			clusters.POST("/import", clusterHandler.ImportCluster)
			clusters.GET("/:id", clusterHandler.GetCluster)
			clusters.DELETE("/:id", clusterHandler.DeleteCluster)
		}
	}

	return router
}

// TestClusterCRUD 测试集群 CRUD 操作
func (s *IntegrationTestSuite) TestClusterCRUD() {
	// 1. 导入集群
	importReq := map[string]interface{}{
		"name":       "test_integration_cluster",
		"apiServer":  "https://kubernetes.example.com:6443",
		"kubeconfig": "test-config-content",
	}
	body, _ := json.Marshal(importReq)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/clusters/import", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	s.router.ServeHTTP(w, req)

	s.Equal(http.StatusOK, w.Code)

	var importResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &importResp)
	s.Equal(float64(200), importResp["code"])

	// 获取导入的集群 ID
	data := importResp["data"].(map[string]interface{})
	clusterID := int(data["id"].(float64))

	// 2. 获取集群列表
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/clusters", nil)
	s.router.ServeHTTP(w, req)

	s.Equal(http.StatusOK, w.Code)

	// 3. 获取单个集群
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/clusters/"+string(rune(clusterID)), nil)
	s.router.ServeHTTP(w, req)

	// 4. 删除集群
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("DELETE", "/api/clusters/"+string(rune(clusterID)), nil)
	s.router.ServeHTTP(w, req)
}

// TestAuthFlow 测试认证流程
func (s *IntegrationTestSuite) TestAuthFlow() {
	// 1. 直接在数据库中创建测试用户（因为系统没有注册接口）
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Test@123456"+"test_salt"), bcrypt.DefaultCost)
	testUser := &models.User{
		Username:     "test_integration_user",
		PasswordHash: string(hashedPassword),
		Salt:         "test_salt",
		Email:        "test@example.com",
		Status:       "active",
		AuthType:     "local",
	}
	s.db.Create(testUser)

	// 2. 登录
	loginReq := map[string]string{
		"username": "test_integration_user",
		"password": "Test@123456",
	}
	body, _ := json.Marshal(loginReq)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	s.router.ServeHTTP(w, req)

	// 验证登录响应
	var loginResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &loginResp)

	if loginResp["code"] == float64(200) {
		data := loginResp["data"].(map[string]interface{})
		s.NotEmpty(data["token"])
	}
}

// TestIntegrationSuite 运行集成测试套件
func TestIntegrationSuite(t *testing.T) {
	suite.Run(t, new(IntegrationTestSuite))
}
