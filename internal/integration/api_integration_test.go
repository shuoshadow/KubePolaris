// Package integration 提供 API 集成测试
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

// APIIntegrationTestSuite API 集成测试套件
type APIIntegrationTestSuite struct {
	suite.Suite
	db     *gorm.DB
	router *gin.Engine
	cfg    *config.Config
	token  string
}

// SetupSuite 测试套件开始前的设置
func (s *APIIntegrationTestSuite) SetupSuite() {
	if os.Getenv("INTEGRATION_TEST") != "true" {
		s.T().Skip("Skipping integration tests. Set INTEGRATION_TEST=true to run.")
	}

	gin.SetMode(gin.TestMode)

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
			Secret:     "api-integration-test-secret",
			ExpireTime: 24,
		},
	}

	s.db.AutoMigrate(&models.User{}, &models.Cluster{}, &models.Role{})
	s.router = s.setupRouter()

	// 创建测试用户并获取 token
	s.setupTestUser()
}

// TearDownSuite 测试套件结束后的清理
func (s *APIIntegrationTestSuite) TearDownSuite() {
	if s.db != nil {
		s.db.Exec("DELETE FROM users WHERE username LIKE 'api_test_%'")
		s.db.Exec("DELETE FROM clusters WHERE name LIKE 'api_test_%'")

		sqlDB, _ := s.db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}
}

// setupRouter 设置测试路由
func (s *APIIntegrationTestSuite) setupRouter() *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())

	authHandler := handlers.NewAuthHandler(s.db, s.cfg, nil)
	clusterHandler := handlers.NewClusterHandler(s.db, s.cfg, nil, nil, nil)

	api := router.Group("/api")
	{
		api.POST("/auth/login", authHandler.Login)

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

// setupTestUser 创建测试用户
func (s *APIIntegrationTestSuite) setupTestUser() {
	// 直接在数据库中创建测试用户（因为系统没有注册接口）
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("ApiTest@123"+"test_salt"), bcrypt.DefaultCost)
	testUser := &models.User{
		Username:     "api_test_user",
		PasswordHash: string(hashedPassword),
		Salt:         "test_salt",
		Email:        "api_test@example.com",
		Status:       "active",
		AuthType:     "local",
	}
	s.db.Create(testUser)

	// 登录获取 token
	loginReq := map[string]string{
		"username": "api_test_user",
		"password": "ApiTest@123",
	}
	body, _ := json.Marshal(loginReq)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	s.router.ServeHTTP(w, req)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["code"] == float64(200) {
		data := resp["data"].(map[string]interface{})
		s.token = data["token"].(string)
	}
}

// makeAuthenticatedRequest 创建带认证的请求
func (s *APIIntegrationTestSuite) makeAuthenticatedRequest(method, path string, body interface{}) *httptest.ResponseRecorder {
	var reqBody *bytes.Buffer
	if body != nil {
		jsonBytes, _ := json.Marshal(body)
		reqBody = bytes.NewBuffer(jsonBytes)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}
	s.router.ServeHTTP(w, req)
	return w
}

// TestClusterAPI 测试集群 API
func (s *APIIntegrationTestSuite) TestClusterAPI() {
	// 测试获取空集群列表
	w := s.makeAuthenticatedRequest("GET", "/api/clusters", nil)
	s.Equal(http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	s.Equal(float64(200), resp["code"])
}

// TestInvalidClusterID 测试无效的集群 ID
func (s *APIIntegrationTestSuite) TestInvalidClusterID() {
	w := s.makeAuthenticatedRequest("GET", "/api/clusters/invalid", nil)
	s.Equal(http.StatusBadRequest, w.Code)
}

// TestClusterNotFound 测试集群不存在
func (s *APIIntegrationTestSuite) TestClusterNotFound() {
	w := s.makeAuthenticatedRequest("GET", "/api/clusters/99999", nil)
	s.Equal(http.StatusNotFound, w.Code)
}

// TestAPIIntegrationSuite 运行 API 集成测试套件
func TestAPIIntegrationSuite(t *testing.T) {
	suite.Run(t, new(APIIntegrationTestSuite))
}
