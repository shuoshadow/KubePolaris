package handlers

import (
	"net/http"
	"strconv"

	"kubepolaris/internal/models"
	"kubepolaris/internal/services"
	"kubepolaris/pkg/logger"

	"github.com/gin-gonic/gin"
)

// PermissionHandler 权限管理处理器
type PermissionHandler struct {
	permissionService *services.PermissionService
	clusterService    *services.ClusterService
	rbacService       *services.RBACService
}

// NewPermissionHandler 创建权限管理处理器
func NewPermissionHandler(permissionService *services.PermissionService, clusterService *services.ClusterService, rbacService *services.RBACService) *PermissionHandler {
	return &PermissionHandler{
		permissionService: permissionService,
		clusterService:    clusterService,
		rbacService:       rbacService,
	}
}

// ========== 权限类型 ==========

// GetPermissionTypes 获取权限类型列表
func (h *PermissionHandler) GetPermissionTypes(c *gin.Context) {
	types := models.GetPermissionTypes()
	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    types,
	})
}

// ========== 用户组管理 ==========

// CreateUserGroupRequest 创建用户组请求
type CreateUserGroupRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// CreateUserGroup 创建用户组
func (h *PermissionHandler) CreateUserGroup(c *gin.Context) {
	var req CreateUserGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误",
		})
		return
	}

	group, err := h.permissionService.CreateUserGroup(req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "创建成功",
		"data":    group,
	})
}

// UpdateUserGroupRequest 更新用户组请求
type UpdateUserGroupRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateUserGroup 更新用户组
func (h *PermissionHandler) UpdateUserGroup(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的用户组ID",
		})
		return
	}

	var req UpdateUserGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误",
		})
		return
	}

	group, err := h.permissionService.UpdateUserGroup(uint(id), req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "更新成功",
		"data":    group,
	})
}

// DeleteUserGroup 删除用户组
func (h *PermissionHandler) DeleteUserGroup(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的用户组ID",
		})
		return
	}

	if err := h.permissionService.DeleteUserGroup(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "删除成功",
	})
}

// GetUserGroup 获取用户组详情
func (h *PermissionHandler) GetUserGroup(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的用户组ID",
		})
		return
	}

	group, err := h.permissionService.GetUserGroup(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    group,
	})
}

// ListUserGroups 获取用户组列表
func (h *PermissionHandler) ListUserGroups(c *gin.Context) {
	groups, err := h.permissionService.ListUserGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    groups,
	})
}

// AddUserToGroupRequest 添加用户到用户组请求
type AddUserToGroupRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

// AddUserToGroup 添加用户到用户组
func (h *PermissionHandler) AddUserToGroup(c *gin.Context) {
	groupID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的用户组ID",
		})
		return
	}

	var req AddUserToGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误",
		})
		return
	}

	if err := h.permissionService.AddUserToGroup(req.UserID, uint(groupID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "添加成功",
	})
}

// RemoveUserFromGroup 从用户组移除用户
func (h *PermissionHandler) RemoveUserFromGroup(c *gin.Context) {
	groupID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的用户组ID",
		})
		return
	}

	userID, err := strconv.ParseUint(c.Param("userId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的用户ID",
		})
		return
	}

	if err := h.permissionService.RemoveUserFromGroup(uint(userID), uint(groupID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "移除成功",
	})
}

// ========== 集群权限管理 ==========

// CreateClusterPermissionRequest 创建集群权限请求
type CreateClusterPermissionRequest struct {
	ClusterID      uint     `json:"cluster_id" binding:"required"`
	UserID         *uint    `json:"user_id"`
	UserGroupID    *uint    `json:"user_group_id"`
	PermissionType string   `json:"permission_type" binding:"required"`
	Namespaces     []string `json:"namespaces"`
	CustomRoleRef  string   `json:"custom_role_ref"`
}

// CreateClusterPermission 创建集群权限
func (h *PermissionHandler) CreateClusterPermission(c *gin.Context) {
	var req CreateClusterPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误",
		})
		return
	}

	serviceReq := &services.CreateClusterPermissionRequest{
		ClusterID:      req.ClusterID,
		UserID:         req.UserID,
		UserGroupID:    req.UserGroupID,
		PermissionType: req.PermissionType,
		Namespaces:     req.Namespaces,
		CustomRoleRef:  req.CustomRoleRef,
	}

	permission, err := h.permissionService.CreateClusterPermission(serviceReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": err.Error(),
		})
		return
	}

	// 异步创建 RBAC 资源（如果需要）
	go h.ensureUserRBACInCluster(permission)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "创建成功",
		"data":    permission.ToResponse(),
	})
}

// ensureUserRBACInCluster 确保用户在集群中有对应的 RBAC 资源
func (h *PermissionHandler) ensureUserRBACInCluster(permission *models.ClusterPermission) {
	// 只有用户级别的权限才需要创建 RBAC（用户组的权限需要特殊处理）
	if permission.UserID == nil {
		logger.Info("用户组权限暂不自动创建 RBAC", "userGroupID", permission.UserGroupID)
		return
	}

	// 获取集群信息
	cluster, err := h.clusterService.GetCluster(permission.ClusterID)
	if err != nil {
		logger.Error("获取集群信息失败，无法创建 RBAC", "clusterID", permission.ClusterID, "error", err)
		return
	}

	// 创建 K8s 客户端
	var k8sClient *services.K8sClient
	if cluster.KubeconfigEnc != "" {
		k8sClient, err = services.NewK8sClientFromKubeconfig(cluster.KubeconfigEnc)
	} else {
		k8sClient, err = services.NewK8sClientFromToken(cluster.APIServer, cluster.SATokenEnc, cluster.CAEnc)
	}
	if err != nil {
		logger.Error("创建 K8s 客户端失败", "clusterID", permission.ClusterID, "error", err)
		return
	}

	// 解析命名空间
	namespaces := permission.GetNamespaceList()

	// 创建 RBAC 配置
	config := &services.UserRBACConfig{
		UserID:         *permission.UserID,
		PermissionType: permission.PermissionType,
		Namespaces:     namespaces,
		ClusterRoleRef: permission.CustomRoleRef,
	}

	// 确保 RBAC 资源存在
	if err := h.rbacService.EnsureUserRBAC(k8sClient.GetClientset(), config); err != nil {
		logger.Error("创建用户 RBAC 失败", "userID", *permission.UserID, "clusterID", permission.ClusterID, "error", err)
	} else {
		logger.Info("用户 RBAC 创建成功", "userID", *permission.UserID, "clusterID", permission.ClusterID, "permissionType", permission.PermissionType)
	}
}

// UpdateClusterPermissionRequest 更新集群权限请求
type UpdateClusterPermissionRequest struct {
	PermissionType string   `json:"permission_type"`
	Namespaces     []string `json:"namespaces"`
	CustomRoleRef  string   `json:"custom_role_ref"`
}

// UpdateClusterPermission 更新集群权限
func (h *PermissionHandler) UpdateClusterPermission(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的权限ID",
		})
		return
	}

	var req UpdateClusterPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误",
		})
		return
	}

	serviceReq := &services.UpdateClusterPermissionRequest{
		PermissionType: req.PermissionType,
		Namespaces:     req.Namespaces,
		CustomRoleRef:  req.CustomRoleRef,
	}

	// 获取旧权限配置用于清理
	oldPermission, _ := h.permissionService.GetClusterPermission(uint(id))

	permission, err := h.permissionService.UpdateClusterPermission(uint(id), serviceReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": err.Error(),
		})
		return
	}

	// 异步更新 RBAC 资源
	go h.updateUserRBACInCluster(oldPermission, permission)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "更新成功",
		"data":    permission.ToResponse(),
	})
}

// updateUserRBACInCluster 更新用户在集群中的 RBAC 资源
func (h *PermissionHandler) updateUserRBACInCluster(oldPermission, newPermission *models.ClusterPermission) {
	if newPermission.UserID == nil {
		return
	}

	// 获取集群信息
	cluster, err := h.clusterService.GetCluster(newPermission.ClusterID)
	if err != nil {
		logger.Error("获取集群信息失败", "clusterID", newPermission.ClusterID, "error", err)
		return
	}

	// 创建 K8s 客户端
	var k8sClient *services.K8sClient
	if cluster.KubeconfigEnc != "" {
		k8sClient, err = services.NewK8sClientFromKubeconfig(cluster.KubeconfigEnc)
	} else {
		k8sClient, err = services.NewK8sClientFromToken(cluster.APIServer, cluster.SATokenEnc, cluster.CAEnc)
	}
	if err != nil {
		logger.Error("创建 K8s 客户端失败", "error", err)
		return
	}

	// 如果旧权限存在，先清理
	if oldPermission != nil && oldPermission.UserID != nil {
		oldNamespaces := oldPermission.GetNamespaceList()
		if err := h.rbacService.CleanupUserRBAC(k8sClient.GetClientset(), *oldPermission.UserID, oldPermission.PermissionType, oldNamespaces); err != nil {
			logger.Warn("清理旧 RBAC 失败", "error", err)
		}
	}

	// 创建新 RBAC
	newNamespaces := newPermission.GetNamespaceList()
	config := &services.UserRBACConfig{
		UserID:         *newPermission.UserID,
		PermissionType: newPermission.PermissionType,
		Namespaces:     newNamespaces,
		ClusterRoleRef: newPermission.CustomRoleRef,
	}

	if err := h.rbacService.EnsureUserRBAC(k8sClient.GetClientset(), config); err != nil {
		logger.Error("更新用户 RBAC 失败", "error", err)
	} else {
		logger.Info("用户 RBAC 更新成功", "userID", *newPermission.UserID, "clusterID", newPermission.ClusterID)
	}
}

// DeleteClusterPermission 删除集群权限
func (h *PermissionHandler) DeleteClusterPermission(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的权限ID",
		})
		return
	}

	// 先获取权限信息用于清理 RBAC
	permission, _ := h.permissionService.GetClusterPermission(uint(id))

	if err := h.permissionService.DeleteClusterPermission(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	// 异步清理 RBAC 资源
	if permission != nil {
		go h.cleanupUserRBACInCluster(permission)
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "删除成功",
	})
}

// cleanupUserRBACInCluster 清理用户在集群中的 RBAC 资源
func (h *PermissionHandler) cleanupUserRBACInCluster(permission *models.ClusterPermission) {
	if permission.UserID == nil {
		return
	}

	// 获取集群信息
	cluster, err := h.clusterService.GetCluster(permission.ClusterID)
	if err != nil {
		logger.Error("获取集群信息失败，无法清理 RBAC", "clusterID", permission.ClusterID, "error", err)
		return
	}

	// 创建 K8s 客户端
	var k8sClient *services.K8sClient
	if cluster.KubeconfigEnc != "" {
		k8sClient, err = services.NewK8sClientFromKubeconfig(cluster.KubeconfigEnc)
	} else {
		k8sClient, err = services.NewK8sClientFromToken(cluster.APIServer, cluster.SATokenEnc, cluster.CAEnc)
	}
	if err != nil {
		logger.Error("创建 K8s 客户端失败", "error", err)
		return
	}

	namespaces := permission.GetNamespaceList()
	if err := h.rbacService.CleanupUserRBAC(k8sClient.GetClientset(), *permission.UserID, permission.PermissionType, namespaces); err != nil {
		logger.Error("清理用户 RBAC 失败", "error", err)
	} else {
		logger.Info("用户 RBAC 清理成功", "userID", *permission.UserID, "clusterID", permission.ClusterID)
	}
}

// BatchDeleteClusterPermissionsRequest 批量删除请求
type BatchDeleteClusterPermissionsRequest struct {
	IDs []uint `json:"ids" binding:"required"`
}

// BatchDeleteClusterPermissions 批量删除集群权限
func (h *PermissionHandler) BatchDeleteClusterPermissions(c *gin.Context) {
	var req BatchDeleteClusterPermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误",
		})
		return
	}

	if err := h.permissionService.BatchDeleteClusterPermissions(req.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "批量删除成功",
	})
}

// GetClusterPermission 获取集群权限详情
func (h *PermissionHandler) GetClusterPermission(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的权限ID",
		})
		return
	}

	permission, err := h.permissionService.GetClusterPermission(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    permission.ToResponse(),
	})
}

// ListClusterPermissions 获取集群权限列表
func (h *PermissionHandler) ListClusterPermissions(c *gin.Context) {
	clusterIDStr := c.Query("cluster_id")
	var clusterID uint
	if clusterIDStr != "" {
		id, err := strconv.ParseUint(clusterIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "无效的集群ID",
			})
			return
		}
		clusterID = uint(id)
	}

	permissions, err := h.permissionService.ListClusterPermissions(clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	// 转换为响应格式
	responses := make([]models.ClusterPermissionResponse, len(permissions))
	for i, p := range permissions {
		responses[i] = p.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    responses,
	})
}

// ListAllClusterPermissions 获取所有集群权限列表
func (h *PermissionHandler) ListAllClusterPermissions(c *gin.Context) {
	permissions, err := h.permissionService.ListAllClusterPermissions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	// 转换为响应格式
	responses := make([]models.ClusterPermissionResponse, len(permissions))
	for i, p := range permissions {
		responses[i] = p.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    responses,
	})
}

// ========== 用户权限查询 ==========

// GetMyPermissions 获取当前用户的权限
func (h *PermissionHandler) GetMyPermissions(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "未登录",
		})
		return
	}

	permissions, err := h.permissionService.GetUserAllClusterPermissions(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	// 转换为响应格式
	responses := make([]models.MyPermissionsResponse, len(permissions))
	for i, p := range permissions {
		permissionName := ""
		for _, pt := range models.GetPermissionTypes() {
			if pt.Type == p.PermissionType {
				permissionName = pt.Name
				break
			}
		}

		clusterName := ""
		if p.Cluster != nil {
			clusterName = p.Cluster.Name
		}

		responses[i] = models.MyPermissionsResponse{
			ClusterID:      p.ClusterID,
			ClusterName:    clusterName,
			PermissionType: p.PermissionType,
			PermissionName: permissionName,
			Namespaces:     p.GetNamespaceList(),
			CustomRoleRef:  p.CustomRoleRef,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    responses,
	})
}

// GetMyClusterPermission 获取当前用户在指定集群的权限
func (h *PermissionHandler) GetMyClusterPermission(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "未登录",
		})
		return
	}

	clusterID, err := strconv.ParseUint(c.Param("clusterID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "无效的集群ID",
		})
		return
	}

	permission, err := h.permissionService.GetUserClusterPermission(userID, uint(clusterID))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": "无权限访问该集群",
		})
		return
	}

	// 获取权限类型信息
	permissionName := ""
	var allowedActions []string
	for _, pt := range models.GetPermissionTypes() {
		if pt.Type == permission.PermissionType {
			permissionName = pt.Name
			allowedActions = pt.Actions
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data": models.MyPermissionsResponse{
			ClusterID:      permission.ClusterID,
			PermissionType: permission.PermissionType,
			PermissionName: permissionName,
			Namespaces:     permission.GetNamespaceList(),
			AllowedActions: allowedActions,
			CustomRoleRef:  permission.CustomRoleRef,
		},
	})
}

// ========== 用户列表 ==========

// ListUsers 获取用户列表
func (h *PermissionHandler) ListUsers(c *gin.Context) {
	users, err := h.permissionService.ListUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "获取成功",
		"data":    users,
	})
}

