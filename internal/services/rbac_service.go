package services

import (
	"context"
	"fmt"

	"kubepolaris/internal/templates/rbac"
	"kubepolaris/pkg/logger"

	authv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// RBACService handles RBAC operations
type RBACService struct{}

// NewRBACService creates a new RBACService
func NewRBACService() *RBACService {
	return &RBACService{}
}

// SyncResult represents the result of a sync operation
type SyncResult struct {
	Resource string `json:"resource"`
	Name     string `json:"name"`
	Action   string `json:"action"` // created, updated, skipped
	Error    string `json:"error,omitempty"`
}

// SyncPermissionsResult represents the overall sync result
type SyncPermissionsResult struct {
	Success bool          `json:"success"`
	Results []*SyncResult `json:"results"`
	Message string        `json:"message"`
}

// SyncPermissions syncs all KubePolaris RBAC resources to a cluster
func (s *RBACService) SyncPermissions(clientset *kubernetes.Clientset) (*SyncPermissionsResult, error) {
	ctx := context.Background()
	results := make([]*SyncResult, 0)
	hasError := false

	// 1. Create namespace
	nsResult := s.ensureNamespace(ctx, clientset)
	results = append(results, nsResult)
	if nsResult.Error != "" {
		hasError = true
	}

	// 2. Create ClusterRoles
	for _, cr := range rbac.GetAllClusterRoles() {
		result := s.ensureClusterRole(ctx, clientset, cr)
		results = append(results, result)
		if result.Error != "" {
			hasError = true
		}
	}

	// 3. Create ServiceAccounts
	saNames := []string{rbac.SAClusterAdmin, rbac.SAOps, rbac.SADev, rbac.SAReadonly}
	for _, saName := range saNames {
		result := s.ensureServiceAccount(ctx, clientset, saName)
		results = append(results, result)
		if result.Error != "" {
			hasError = true
		}
	}

	// 4. Create ClusterRoleBindings for admin and ops (they always have cluster-wide access)
	adminBinding := s.ensureClusterRoleBinding(ctx, clientset, "kubepolaris-admin-binding", rbac.ClusterRoleClusterAdmin, rbac.SAClusterAdmin)
	results = append(results, adminBinding)
	if adminBinding.Error != "" {
		hasError = true
	}

	opsBinding := s.ensureClusterRoleBinding(ctx, clientset, "kubepolaris-ops-binding", rbac.ClusterRoleOps, rbac.SAOps)
	results = append(results, opsBinding)
	if opsBinding.Error != "" {
		hasError = true
	}

	// Dev and readonly bindings are created dynamically based on user permissions

	message := "权限同步完成"
	if hasError {
		message = "权限同步完成，但有部分错误"
	}

	return &SyncPermissionsResult{
		Success: !hasError,
		Results: results,
		Message: message,
	}, nil
}

// ensureNamespace creates the KubePolaris namespace if it doesn't exist
func (s *RBACService) ensureNamespace(ctx context.Context, clientset *kubernetes.Clientset) *SyncResult {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   rbac.KubePolarisNamespace,
			Labels: rbac.GetKubePolarisLabels(),
		},
	}

	existing, err := clientset.CoreV1().Namespaces().Get(ctx, ns.Name, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			_, err = clientset.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
			if err != nil {
				return &SyncResult{Resource: "Namespace", Name: ns.Name, Action: "error", Error: err.Error()}
			}
			return &SyncResult{Resource: "Namespace", Name: ns.Name, Action: "created"}
		}
		return &SyncResult{Resource: "Namespace", Name: ns.Name, Action: "error", Error: err.Error()}
	}

	// Update labels if needed
	if existing.Labels == nil {
		existing.Labels = make(map[string]string)
	}
	existing.Labels[rbac.LabelManagedBy] = rbac.LabelValue
	_, err = clientset.CoreV1().Namespaces().Update(ctx, existing, metav1.UpdateOptions{})
	if err != nil {
		return &SyncResult{Resource: "Namespace", Name: ns.Name, Action: "error", Error: err.Error()}
	}
	return &SyncResult{Resource: "Namespace", Name: ns.Name, Action: "updated"}
}

// ensureClusterRole creates or updates a ClusterRole
func (s *RBACService) ensureClusterRole(ctx context.Context, clientset *kubernetes.Clientset, cr *rbacv1.ClusterRole) *SyncResult {
	existing, err := clientset.RbacV1().ClusterRoles().Get(ctx, cr.Name, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			_, err = clientset.RbacV1().ClusterRoles().Create(ctx, cr, metav1.CreateOptions{})
			if err != nil {
				logger.Error("Failed to create ClusterRole", "error", err)
				return &SyncResult{Resource: "ClusterRole", Name: cr.Name, Action: "error", Error: err.Error()}
			}
			return &SyncResult{Resource: "ClusterRole", Name: cr.Name, Action: "created"}
		}
		return &SyncResult{Resource: "ClusterRole", Name: cr.Name, Action: "error", Error: err.Error()}
	}

	// Update
	existing.Rules = cr.Rules
	if existing.Labels == nil {
		existing.Labels = make(map[string]string)
	}
	existing.Labels[rbac.LabelManagedBy] = rbac.LabelValue
	_, err = clientset.RbacV1().ClusterRoles().Update(ctx, existing, metav1.UpdateOptions{})
	if err != nil {
		return &SyncResult{Resource: "ClusterRole", Name: cr.Name, Action: "error", Error: err.Error()}
	}
	return &SyncResult{Resource: "ClusterRole", Name: cr.Name, Action: "updated"}
}

// ensureServiceAccount creates or updates a ServiceAccount
func (s *RBACService) ensureServiceAccount(ctx context.Context, clientset *kubernetes.Clientset, name string) *SyncResult {
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: rbac.KubePolarisNamespace,
			Labels:    rbac.GetKubePolarisLabels(),
		},
	}

	existing, err := clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			_, err = clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).Create(ctx, sa, metav1.CreateOptions{})
			if err != nil {
				return &SyncResult{Resource: "ServiceAccount", Name: name, Action: "error", Error: err.Error()}
			}
			return &SyncResult{Resource: "ServiceAccount", Name: name, Action: "created"}
		}
		return &SyncResult{Resource: "ServiceAccount", Name: name, Action: "error", Error: err.Error()}
	}

	// Update labels
	if existing.Labels == nil {
		existing.Labels = make(map[string]string)
	}
	existing.Labels[rbac.LabelManagedBy] = rbac.LabelValue
	_, err = clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).Update(ctx, existing, metav1.UpdateOptions{})
	if err != nil {
		return &SyncResult{Resource: "ServiceAccount", Name: name, Action: "error", Error: err.Error()}
	}
	return &SyncResult{Resource: "ServiceAccount", Name: name, Action: "updated"}
}

// ensureClusterRoleBinding creates or updates a ClusterRoleBinding
func (s *RBACService) ensureClusterRoleBinding(ctx context.Context, clientset *kubernetes.Clientset, name, clusterRoleName, saName string) *SyncResult {
	crb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:   name,
			Labels: rbac.GetKubePolarisLabels(),
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      saName,
				Namespace: rbac.KubePolarisNamespace,
			},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     clusterRoleName,
		},
	}

	existing, err := clientset.RbacV1().ClusterRoleBindings().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			_, err = clientset.RbacV1().ClusterRoleBindings().Create(ctx, crb, metav1.CreateOptions{})
			if err != nil {
				return &SyncResult{Resource: "ClusterRoleBinding", Name: name, Action: "error", Error: err.Error()}
			}
			return &SyncResult{Resource: "ClusterRoleBinding", Name: name, Action: "created"}
		}
		return &SyncResult{Resource: "ClusterRoleBinding", Name: name, Action: "error", Error: err.Error()}
	}

	// Update
	existing.Subjects = crb.Subjects
	existing.RoleRef = crb.RoleRef
	if existing.Labels == nil {
		existing.Labels = make(map[string]string)
	}
	existing.Labels[rbac.LabelManagedBy] = rbac.LabelValue
	_, err = clientset.RbacV1().ClusterRoleBindings().Update(ctx, existing, metav1.UpdateOptions{})
	if err != nil {
		return &SyncResult{Resource: "ClusterRoleBinding", Name: name, Action: "error", Error: err.Error()}
	}
	return &SyncResult{Resource: "ClusterRoleBinding", Name: name, Action: "updated"}
}

// EnsureRoleBinding creates or updates a RoleBinding for namespace-scoped permissions
func (s *RBACService) EnsureRoleBinding(clientset *kubernetes.Clientset, namespace, bindingName, clusterRoleName, saName, saNamespace string) error {
	ctx := context.Background()

	rb := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      bindingName,
			Namespace: namespace,
			Labels:    rbac.GetKubePolarisLabels(),
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      saName,
				Namespace: saNamespace,
			},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     clusterRoleName,
		},
	}

	existing, err := clientset.RbacV1().RoleBindings(namespace).Get(ctx, bindingName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			_, err = clientset.RbacV1().RoleBindings(namespace).Create(ctx, rb, metav1.CreateOptions{})
			return err
		}
		return err
	}

	// Update
	existing.Subjects = rb.Subjects
	existing.RoleRef = rb.RoleRef
	if existing.Labels == nil {
		existing.Labels = make(map[string]string)
	}
	existing.Labels[rbac.LabelManagedBy] = rbac.LabelValue
	_, err = clientset.RbacV1().RoleBindings(namespace).Update(ctx, existing, metav1.UpdateOptions{})
	return err
}

// DeleteRoleBinding deletes a RoleBinding
func (s *RBACService) DeleteRoleBinding(clientset *kubernetes.Clientset, namespace, bindingName string) error {
	ctx := context.Background()
	err := clientset.RbacV1().RoleBindings(namespace).Delete(ctx, bindingName, metav1.DeleteOptions{})
	if errors.IsNotFound(err) {
		return nil
	}
	return err
}

// GetSyncStatus checks the sync status of KubePolaris RBAC resources
func (s *RBACService) GetSyncStatus(clientset *kubernetes.Clientset) (*SyncStatusResult, error) {
	ctx := context.Background()
	result := &SyncStatusResult{
		Synced:    true,
		Resources: make([]*ResourceStatus, 0),
	}

	// Check namespace
	_, err := clientset.CoreV1().Namespaces().Get(ctx, rbac.KubePolarisNamespace, metav1.GetOptions{})
	nsStatus := &ResourceStatus{Resource: "Namespace", Name: rbac.KubePolarisNamespace}
	if err != nil {
		nsStatus.Exists = false
		result.Synced = false
	} else {
		nsStatus.Exists = true
	}
	result.Resources = append(result.Resources, nsStatus)

	// Check ClusterRoles
	for _, cr := range rbac.GetAllClusterRoles() {
		_, err := clientset.RbacV1().ClusterRoles().Get(ctx, cr.Name, metav1.GetOptions{})
		crStatus := &ResourceStatus{Resource: "ClusterRole", Name: cr.Name}
		if err != nil {
			crStatus.Exists = false
			result.Synced = false
		} else {
			crStatus.Exists = true
		}
		result.Resources = append(result.Resources, crStatus)
	}

	// Check ServiceAccounts
	saNames := []string{rbac.SAClusterAdmin, rbac.SAOps, rbac.SADev, rbac.SAReadonly}
	for _, saName := range saNames {
		_, err := clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).Get(ctx, saName, metav1.GetOptions{})
		saStatus := &ResourceStatus{Resource: "ServiceAccount", Name: saName}
		if err != nil {
			saStatus.Exists = false
			result.Synced = false
		} else {
			saStatus.Exists = true
		}
		result.Resources = append(result.Resources, saStatus)
	}

	return result, nil
}

// SyncStatusResult represents the sync status
type SyncStatusResult struct {
	Synced    bool              `json:"synced"`
	Resources []*ResourceStatus `json:"resources"`
}

// ResourceStatus represents a single resource status
type ResourceStatus struct {
	Resource string `json:"resource"`
	Name     string `json:"name"`
	Exists   bool   `json:"exists"`
}

// GetServiceAccountToken gets the token for a ServiceAccount
func (s *RBACService) GetServiceAccountToken(clientset *kubernetes.Clientset, saName string) (string, error) {
	ctx := context.Background()

	// Get the ServiceAccount
	sa, err := clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).Get(ctx, saName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get ServiceAccount: %w", err)
	}

	// For Kubernetes 1.24+, we need to create a token manually
	// First, try to find an existing secret
	for _, ref := range sa.Secrets {
		secret, err := clientset.CoreV1().Secrets(rbac.KubePolarisNamespace).Get(ctx, ref.Name, metav1.GetOptions{})
		if err != nil {
			continue
		}
		if token, ok := secret.Data["token"]; ok {
			return string(token), nil
		}
	}

	// If no secret found, create a token using TokenRequest API (K8s 1.22+)
	tokenRequest, err := clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).CreateToken(
		ctx,
		saName,
		&authv1.TokenRequest{
			Spec: authv1.TokenRequestSpec{
				ExpirationSeconds: int64Ptr(3600), // 1 hour
			},
		},
		metav1.CreateOptions{},
	)
	if err != nil {
		return "", fmt.Errorf("failed to create token: %w", err)
	}

	return tokenRequest.Status.Token, nil
}

func int64Ptr(i int64) *int64 {
	return &i
}

// CreateCustomClusterRole creates a custom ClusterRole
func (s *RBACService) CreateCustomClusterRole(clientset *kubernetes.Clientset, name string, rules []rbacv1.PolicyRule) error {
	ctx := context.Background()

	cr := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:   name,
			Labels: rbac.GetKubePolarisLabels(),
		},
		Rules: rules,
	}

	_, err := clientset.RbacV1().ClusterRoles().Create(ctx, cr, metav1.CreateOptions{})
	return err
}

// CreateCustomRole creates a custom Role in a namespace
func (s *RBACService) CreateCustomRole(clientset *kubernetes.Clientset, namespace, name string, rules []rbacv1.PolicyRule) error {
	ctx := context.Background()

	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels:    rbac.GetKubePolarisLabels(),
		},
		Rules: rules,
	}

	_, err := clientset.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{})
	return err
}

// ListClusterRoles lists all ClusterRoles
func (s *RBACService) ListClusterRoles(clientset *kubernetes.Clientset) ([]rbacv1.ClusterRole, error) {
	ctx := context.Background()

	list, err := clientset.RbacV1().ClusterRoles().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	return list.Items, nil
}

// ListRoles lists all Roles in a namespace
func (s *RBACService) ListRoles(clientset *kubernetes.Clientset, namespace string) ([]rbacv1.Role, error) {
	ctx := context.Background()

	list, err := clientset.RbacV1().Roles(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	return list.Items, nil
}

// DeleteClusterRole deletes a ClusterRole
func (s *RBACService) DeleteClusterRole(clientset *kubernetes.Clientset, name string) error {
	ctx := context.Background()
	return clientset.RbacV1().ClusterRoles().Delete(ctx, name, metav1.DeleteOptions{})
}

// DeleteRole deletes a Role
func (s *RBACService) DeleteRole(clientset *kubernetes.Clientset, namespace, name string) error {
	ctx := context.Background()
	return clientset.RbacV1().Roles(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ========== 动态用户 RBAC 管理 ==========

// UserRBACConfig 用户 RBAC 配置
type UserRBACConfig struct {
	UserID         uint
	PermissionType string   // admin, ops, dev, readonly, custom
	Namespaces     []string // ["*"] 表示全部, ["ns1", "ns2"] 表示部分
	ClusterRoleRef string   // 自定义权限时使用的 ClusterRole 名称
}

// GetUserServiceAccountName 获取用户专属 SA 名称
func GetUserServiceAccountName(userID uint) string {
	return fmt.Sprintf("kubepolaris-user-%d-sa", userID)
}

// GetUserRoleBindingName 获取用户 RoleBinding 名称
func GetUserRoleBindingName(userID uint, permissionType string) string {
	return fmt.Sprintf("kubepolaris-user-%d-%s", userID, permissionType)
}

// GetUserClusterRoleBindingName 获取用户 ClusterRoleBinding 名称
func GetUserClusterRoleBindingName(userID uint, permissionType string) string {
	return fmt.Sprintf("kubepolaris-user-%d-%s-cluster", userID, permissionType)
}

// HasAllNamespaceAccess 检查是否有全部命名空间权限
func HasAllNamespaceAccess(namespaces []string) bool {
	for _, ns := range namespaces {
		if ns == "*" {
			return true
		}
	}
	return false
}

// EnsureUserRBAC 确保用户的 RBAC 资源存在
// 根据权限配置自动创建 SA 和绑定
func (s *RBACService) EnsureUserRBAC(clientset *kubernetes.Clientset, config *UserRBACConfig) error {
	ctx := context.Background()
	hasAllAccess := HasAllNamespaceAccess(config.Namespaces)

	// 获取对应的 ClusterRole
	clusterRoleName := config.ClusterRoleRef
	if clusterRoleName == "" {
		clusterRoleName = rbac.GetClusterRoleByPermissionType(config.PermissionType)
	}

	// admin 和 ops 使用固定 SA，不需要动态创建
	if config.PermissionType == "admin" || config.PermissionType == "ops" {
		logger.Info("admin/ops 使用固定 SA，无需动态创建", "userID", config.UserID, "permissionType", config.PermissionType)
		return nil
	}

	// dev/readonly 全部命名空间时使用固定 SA
	if (config.PermissionType == "dev" || config.PermissionType == "readonly") && hasAllAccess {
		logger.Info("全部命名空间使用固定 SA，无需动态创建", "userID", config.UserID, "permissionType", config.PermissionType)
		return nil
	}

	// 需要动态创建用户专属 SA 和绑定
	saName := GetUserServiceAccountName(config.UserID)
	logger.Info("创建用户专属 RBAC", "userID", config.UserID, "saName", saName, "permissionType", config.PermissionType, "namespaces", config.Namespaces)

	// 1. 创建用户专属 SA
	if err := s.ensureUserServiceAccount(ctx, clientset, saName); err != nil {
		return fmt.Errorf("创建用户 SA 失败: %w", err)
	}

	// 2. 根据命名空间范围创建绑定
	if hasAllAccess {
		// 全部命名空间：创建 ClusterRoleBinding
		bindingName := GetUserClusterRoleBindingName(config.UserID, config.PermissionType)
		if err := s.ensureUserClusterRoleBinding(ctx, clientset, bindingName, clusterRoleName, saName); err != nil {
			return fmt.Errorf("创建 ClusterRoleBinding 失败: %w", err)
		}
	} else {
		// 部分命名空间：为每个命名空间创建 RoleBinding
		bindingName := GetUserRoleBindingName(config.UserID, config.PermissionType)
		for _, namespace := range config.Namespaces {
			if namespace == "" || namespace == "*" {
				continue
			}
			if err := s.EnsureRoleBinding(clientset, namespace, bindingName, clusterRoleName, saName, rbac.KubePolarisNamespace); err != nil {
				return fmt.Errorf("创建 RoleBinding(%s) 失败: %w", namespace, err)
			}
		}
	}

	return nil
}

// ensureUserServiceAccount 创建用户专属 SA
func (s *RBACService) ensureUserServiceAccount(ctx context.Context, clientset *kubernetes.Clientset, saName string) error {
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      saName,
			Namespace: rbac.KubePolarisNamespace,
			Labels:    rbac.GetKubePolarisLabels(),
		},
	}

	_, err := clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).Get(ctx, saName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			_, err = clientset.CoreV1().ServiceAccounts(rbac.KubePolarisNamespace).Create(ctx, sa, metav1.CreateOptions{})
			if err != nil {
				return err
			}
			logger.Info("创建用户 SA 成功", "saName", saName)
			return nil
		}
		return err
	}

	logger.Info("用户 SA 已存在", "saName", saName)
	return nil
}

// ensureUserClusterRoleBinding 创建用户 ClusterRoleBinding
func (s *RBACService) ensureUserClusterRoleBinding(ctx context.Context, clientset *kubernetes.Clientset, bindingName, clusterRoleName, saName string) error {
	crb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:   bindingName,
			Labels: rbac.GetKubePolarisLabels(),
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      saName,
				Namespace: rbac.KubePolarisNamespace,
			},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     clusterRoleName,
		},
	}

	existing, err := clientset.RbacV1().ClusterRoleBindings().Get(ctx, bindingName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			_, err = clientset.RbacV1().ClusterRoleBindings().Create(ctx, crb, metav1.CreateOptions{})
			if err != nil {
				return err
			}
			logger.Info("创建用户 ClusterRoleBinding 成功", "bindingName", bindingName)
			return nil
		}
		return err
	}

	// 更新
	existing.Subjects = crb.Subjects
	existing.RoleRef = crb.RoleRef
	_, err = clientset.RbacV1().ClusterRoleBindings().Update(ctx, existing, metav1.UpdateOptions{})
	return err
}

// CleanupUserRBAC 清理用户的 RBAC 资源
func (s *RBACService) CleanupUserRBAC(clientset *kubernetes.Clientset, userID uint, permissionType string, namespaces []string) error {
	ctx := context.Background()
	saName := GetUserServiceAccountName(userID)

	logger.Info("清理用户 RBAC 资源", "userID", userID, "saName", saName)

	// 1. 删除 ClusterRoleBinding
	crbName := GetUserClusterRoleBindingName(userID, permissionType)
	if err := clientset.RbacV1().ClusterRoleBindings().Delete(ctx, crbName, metav1.DeleteOptions{}); err != nil && !errors.IsNotFound(err) {
		logger.Warn("删除 ClusterRoleBinding 失败", "name", crbName, "error", err)
	}

	// 2. 删除 RoleBinding（每个命名空间）
	rbName := GetUserRoleBindingName(userID, permissionType)
	for _, namespace := range namespaces {
		if namespace == "" || namespace == "*" {
			continue
		}
		if err := clientset.RbacV1().RoleBindings(namespace).Delete(ctx, rbName, metav1.DeleteOptions{}); err != nil && !errors.IsNotFound(err) {
			logger.Warn("删除 RoleBinding 失败", "namespace", namespace, "name", rbName, "error", err)
		}
	}

	// 3. 检查是否还有其他权限使用这个 SA，如果没有则删除 SA
	// 暂时不删除 SA，因为可能还有其他集群的权限
	// TODO: 可以添加引用计数逻辑

	return nil
}

// GetEffectiveServiceAccount 获取用户应该使用的 SA 名称
func (s *RBACService) GetEffectiveServiceAccount(config *UserRBACConfig) string {
	hasAllAccess := HasAllNamespaceAccess(config.Namespaces)

	switch config.PermissionType {
	case "admin":
		return rbac.SAClusterAdmin
	case "ops":
		return rbac.SAOps
	case "dev":
		if hasAllAccess {
			return rbac.SADev
		}
		return GetUserServiceAccountName(config.UserID)
	case "readonly":
		if hasAllAccess {
			return rbac.SAReadonly
		}
		return GetUserServiceAccountName(config.UserID)
	case "custom":
		return GetUserServiceAccountName(config.UserID)
	default:
		return rbac.SAReadonly
	}
}

