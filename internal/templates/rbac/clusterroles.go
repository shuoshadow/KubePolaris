package rbac

import (
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// Namespace for KubePolaris resources
	KubePolarisNamespace = "kubepolaris-system"

	// ClusterRole names
	ClusterRoleClusterAdmin = "kubepolaris-cluster-admin"
	ClusterRoleOps          = "kubepolaris-ops"
	ClusterRoleDev          = "kubepolaris-dev"
	ClusterRoleReadonly     = "kubepolaris-readonly"

	// ServiceAccount names
	SAClusterAdmin = "kubepolaris-admin-sa"
	SAOps          = "kubepolaris-ops-sa"
	SADev          = "kubepolaris-dev-sa"
	SAReadonly     = "kubepolaris-readonly-sa"

	// Labels
	LabelManagedBy = "app.kubernetes.io/managed-by"
	LabelValue     = "kubepolaris"
)

// GetKubePolarisLabels returns common labels for KubePolaris resources
func GetKubePolarisLabels() map[string]string {
	return map[string]string{
		LabelManagedBy: LabelValue,
	}
}

// GetClusterAdminClusterRole returns the cluster-admin ClusterRole
func GetClusterAdminClusterRole() *rbacv1.ClusterRole {
	return &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:   ClusterRoleClusterAdmin,
			Labels: GetKubePolarisLabels(),
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
			{
				NonResourceURLs: []string{"*"},
				Verbs:           []string{"*"},
			},
		},
	}
}

// GetOpsClusterRole returns the ops ClusterRole (based on admin, without RBAC write)
func GetOpsClusterRole() *rbacv1.ClusterRole {
	return &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:   ClusterRoleOps,
			Labels: GetKubePolarisLabels(),
		},
		Rules: []rbacv1.PolicyRule{
			// Argo Rollouts - full access
			{
				APIGroups: []string{"argoproj.io"},
				Resources: []string{"rollouts", "rollouts/scale", "rollouts/status", "experiments", "analysistemplates", "clusteranalysistemplates", "analysisruns"},
				Verbs:     []string{"create", "delete", "deletecollection", "get", "list", "patch", "update", "watch"},
			},
			// Pods - read for some, write for others
			{
				APIGroups: []string{""},
				Resources: []string{"pods/attach", "pods/exec", "pods/portforward", "pods/proxy", "secrets", "services/proxy"},
				Verbs:     []string{"get", "list", "watch"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"serviceaccounts"},
				Verbs:     []string{"impersonate"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"pods", "pods/attach", "pods/exec", "pods/portforward", "pods/proxy"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Core resources - write
			{
				APIGroups: []string{""},
				Resources: []string{"configmaps", "endpoints", "persistentvolumeclaims", "replicationcontrollers", "replicationcontrollers/scale", "secrets", "serviceaccounts", "services", "services/proxy"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Apps resources - write
			{
				APIGroups: []string{"apps"},
				Resources: []string{"daemonsets", "deployments", "deployments/rollback", "deployments/scale", "replicasets", "replicasets/scale", "statefulsets", "statefulsets/scale"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Autoscaling - write
			{
				APIGroups: []string{"autoscaling"},
				Resources: []string{"horizontalpodautoscalers"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Batch - write
			{
				APIGroups: []string{"batch"},
				Resources: []string{"cronjobs", "jobs"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Extensions - write
			{
				APIGroups: []string{"extensions"},
				Resources: []string{"daemonsets", "deployments", "deployments/rollback", "deployments/scale", "ingresses", "networkpolicies", "replicasets", "replicasets/scale", "replicationcontrollers/scale"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Policy - write
			{
				APIGroups: []string{"policy"},
				Resources: []string{"poddisruptionbudgets"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Networking - write
			{
				APIGroups: []string{"networking.k8s.io"},
				Resources: []string{"ingresses", "networkpolicies"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Snapshot - full access
			{
				APIGroups: []string{"snapshot.storage.k8s.io"},
				Resources: []string{"volumesnapshotclasses", "volumesnapshots", "volumesnapshotcontents"},
				Verbs:     []string{"create", "get", "list", "watch", "update", "patch", "delete"},
			},
			{
				APIGroups: []string{"snapshot.storage.k8s.io"},
				Resources: []string{"volumesnapshots/status", "volumesnapshotcontents/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Metrics - read
			{
				APIGroups: []string{"metrics.k8s.io"},
				Resources: []string{"pods", "nodes"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Core resources - read
			{
				APIGroups: []string{""},
				Resources: []string{"configmaps", "endpoints", "persistentvolumeclaims", "persistentvolumeclaims/status", "pods", "replicationcontrollers", "replicationcontrollers/scale", "serviceaccounts", "services", "services/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"bindings", "events", "limitranges", "namespaces/status", "pods/log", "pods/status", "replicationcontrollers/status", "resourcequotas", "resourcequotas/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Namespaces - read only (important: ops cannot create/delete namespaces)
			{
				APIGroups: []string{""},
				Resources: []string{"namespaces"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Apps - read
			{
				APIGroups: []string{"apps"},
				Resources: []string{"controllerrevisions", "daemonsets", "daemonsets/status", "deployments", "deployments/scale", "deployments/status", "replicasets", "replicasets/scale", "replicasets/status", "statefulsets", "statefulsets/scale", "statefulsets/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Autoscaling - read
			{
				APIGroups: []string{"autoscaling"},
				Resources: []string{"horizontalpodautoscalers", "horizontalpodautoscalers/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Batch - read
			{
				APIGroups: []string{"batch"},
				Resources: []string{"cronjobs", "cronjobs/status", "jobs", "jobs/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Extensions - read
			{
				APIGroups: []string{"extensions"},
				Resources: []string{"daemonsets", "daemonsets/status", "deployments", "deployments/scale", "deployments/status", "ingresses", "ingresses/status", "networkpolicies", "replicasets", "replicasets/scale", "replicasets/status", "replicationcontrollers/scale"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Policy - read
			{
				APIGroups: []string{"policy"},
				Resources: []string{"poddisruptionbudgets", "poddisruptionbudgets/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Networking - read
			{
				APIGroups: []string{"networking.k8s.io"},
				Resources: []string{"ingresses", "ingresses/status", "networkpolicies"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// LocalSubjectAccessReviews
			{
				APIGroups: []string{"authorization.k8s.io"},
				Resources: []string{"localsubjectaccessreviews"},
				Verbs:     []string{"create"},
			},
			// Nodes - read only
			{
				APIGroups: []string{""},
				Resources: []string{"nodes", "persistentvolumes"},
				Verbs:     []string{"get", "list", "watch"},
			},
		},
	}
}

// GetDevClusterRole returns the dev ClusterRole (based on edit)
func GetDevClusterRole() *rbacv1.ClusterRole {
	return &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:   ClusterRoleDev,
			Labels: GetKubePolarisLabels(),
		},
		Rules: []rbacv1.PolicyRule{
			// Argo Rollouts - full access
			{
				APIGroups: []string{"argoproj.io"},
				Resources: []string{"rollouts", "rollouts/scale", "rollouts/status", "experiments", "analysistemplates", "clusteranalysistemplates", "analysisruns"},
				Verbs:     []string{"create", "delete", "deletecollection", "get", "list", "patch", "update", "watch"},
			},
			// Pods - read for some
			{
				APIGroups: []string{""},
				Resources: []string{"pods/attach", "pods/exec", "pods/portforward", "pods/proxy", "secrets", "services/proxy"},
				Verbs:     []string{"get", "list", "watch"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"serviceaccounts"},
				Verbs:     []string{"impersonate"},
			},
			// Pods - write
			{
				APIGroups: []string{""},
				Resources: []string{"pods", "pods/attach", "pods/exec", "pods/portforward", "pods/proxy"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Core resources - write
			{
				APIGroups: []string{""},
				Resources: []string{"configmaps", "endpoints", "persistentvolumeclaims", "replicationcontrollers", "replicationcontrollers/scale", "secrets", "serviceaccounts", "services", "services/proxy"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Apps - write
			{
				APIGroups: []string{"apps"},
				Resources: []string{"daemonsets", "deployments", "deployments/rollback", "deployments/scale", "replicasets", "replicasets/scale", "statefulsets", "statefulsets/scale"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Autoscaling - write
			{
				APIGroups: []string{"autoscaling"},
				Resources: []string{"horizontalpodautoscalers"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Batch - write
			{
				APIGroups: []string{"batch"},
				Resources: []string{"cronjobs", "jobs"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Extensions - write
			{
				APIGroups: []string{"extensions"},
				Resources: []string{"daemonsets", "deployments", "deployments/rollback", "deployments/scale", "ingresses", "networkpolicies", "replicasets", "replicasets/scale", "replicationcontrollers/scale"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Policy - write
			{
				APIGroups: []string{"policy"},
				Resources: []string{"poddisruptionbudgets"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Networking - write
			{
				APIGroups: []string{"networking.k8s.io"},
				Resources: []string{"ingresses", "networkpolicies"},
				Verbs:     []string{"create", "delete", "deletecollection", "patch", "update"},
			},
			// Snapshot - full access
			{
				APIGroups: []string{"snapshot.storage.k8s.io"},
				Resources: []string{"volumesnapshotclasses", "volumesnapshots", "volumesnapshotcontents"},
				Verbs:     []string{"create", "get", "list", "watch", "update", "patch", "delete"},
			},
			{
				APIGroups: []string{"snapshot.storage.k8s.io"},
				Resources: []string{"volumesnapshots/status", "volumesnapshotcontents/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Metrics - read
			{
				APIGroups: []string{"metrics.k8s.io"},
				Resources: []string{"pods", "nodes"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Core resources - read
			{
				APIGroups: []string{""},
				Resources: []string{"configmaps", "endpoints", "persistentvolumeclaims", "persistentvolumeclaims/status", "pods", "replicationcontrollers", "replicationcontrollers/scale", "serviceaccounts", "services", "services/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"bindings", "events", "limitranges", "namespaces/status", "pods/log", "pods/status", "replicationcontrollers/status", "resourcequotas", "resourcequotas/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Namespaces - read only
			{
				APIGroups: []string{""},
				Resources: []string{"namespaces"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Apps - read
			{
				APIGroups: []string{"apps"},
				Resources: []string{"controllerrevisions", "daemonsets", "daemonsets/status", "deployments", "deployments/scale", "deployments/status", "replicasets", "replicasets/scale", "replicasets/status", "statefulsets", "statefulsets/scale", "statefulsets/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Autoscaling - read
			{
				APIGroups: []string{"autoscaling"},
				Resources: []string{"horizontalpodautoscalers", "horizontalpodautoscalers/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Batch - read
			{
				APIGroups: []string{"batch"},
				Resources: []string{"cronjobs", "cronjobs/status", "jobs", "jobs/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Extensions - read
			{
				APIGroups: []string{"extensions"},
				Resources: []string{"daemonsets", "daemonsets/status", "deployments", "deployments/scale", "deployments/status", "ingresses", "ingresses/status", "networkpolicies", "replicasets", "replicasets/scale", "replicasets/status", "replicationcontrollers/scale"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Policy - read
			{
				APIGroups: []string{"policy"},
				Resources: []string{"poddisruptionbudgets", "poddisruptionbudgets/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Networking - read
			{
				APIGroups: []string{"networking.k8s.io"},
				Resources: []string{"ingresses", "ingresses/status", "networkpolicies"},
				Verbs:     []string{"get", "list", "watch"},
			},
		},
	}
}

// GetReadonlyClusterRole returns the readonly ClusterRole (based on view)
func GetReadonlyClusterRole() *rbacv1.ClusterRole {
	return &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:   ClusterRoleReadonly,
			Labels: GetKubePolarisLabels(),
		},
		Rules: []rbacv1.PolicyRule{
			// Argo Rollouts - read
			{
				APIGroups: []string{"argoproj.io"},
				Resources: []string{"rollouts", "rollouts/scale", "experiments", "analysistemplates", "clusteranalysistemplates", "analysisruns"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Core resources - read
			{
				APIGroups: []string{""},
				Resources: []string{"configmaps", "endpoints", "persistentvolumeclaims", "persistentvolumeclaims/status", "pods", "replicationcontrollers", "replicationcontrollers/scale", "serviceaccounts", "services", "services/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			{
				APIGroups: []string{""},
				Resources: []string{"bindings", "events", "limitranges", "namespaces/status", "pods/log", "pods/status", "replicationcontrollers/status", "resourcequotas", "resourcequotas/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Namespaces - read
			{
				APIGroups: []string{""},
				Resources: []string{"namespaces"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Apps - read
			{
				APIGroups: []string{"apps"},
				Resources: []string{"controllerrevisions", "daemonsets", "daemonsets/status", "deployments", "deployments/scale", "deployments/status", "replicasets", "replicasets/scale", "replicasets/status", "statefulsets", "statefulsets/scale", "statefulsets/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Autoscaling - read
			{
				APIGroups: []string{"autoscaling"},
				Resources: []string{"horizontalpodautoscalers", "horizontalpodautoscalers/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Batch - read
			{
				APIGroups: []string{"batch"},
				Resources: []string{"cronjobs", "cronjobs/status", "jobs", "jobs/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Extensions - read
			{
				APIGroups: []string{"extensions"},
				Resources: []string{"daemonsets", "daemonsets/status", "deployments", "deployments/scale", "deployments/status", "ingresses", "ingresses/status", "networkpolicies", "replicasets", "replicasets/scale", "replicasets/status", "replicationcontrollers/scale"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Policy - read
			{
				APIGroups: []string{"policy"},
				Resources: []string{"poddisruptionbudgets", "poddisruptionbudgets/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Networking - read
			{
				APIGroups: []string{"networking.k8s.io"},
				Resources: []string{"ingresses", "ingresses/status", "networkpolicies"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Snapshot - read
			{
				APIGroups: []string{"snapshot.storage.k8s.io"},
				Resources: []string{"volumesnapshotclasses", "volumesnapshots", "volumesnapshots/status", "volumesnapshotcontents", "volumesnapshotcontents/status"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Metrics - read
			{
				APIGroups: []string{"metrics.k8s.io"},
				Resources: []string{"pods", "nodes"},
				Verbs:     []string{"get", "list", "watch"},
			},
			// Nodes and PVs - read
			{
				APIGroups: []string{""},
				Resources: []string{"nodes", "persistentvolumes"},
				Verbs:     []string{"get", "list", "watch"},
			},
		},
	}
}

// GetAllClusterRoles returns all KubePolaris ClusterRoles
func GetAllClusterRoles() []*rbacv1.ClusterRole {
	return []*rbacv1.ClusterRole{
		GetClusterAdminClusterRole(),
		GetOpsClusterRole(),
		GetDevClusterRole(),
		GetReadonlyClusterRole(),
	}
}

// GetClusterRoleByPermissionType returns the ClusterRole name for a permission type
func GetClusterRoleByPermissionType(permissionType string) string {
	switch permissionType {
	case "admin":
		return ClusterRoleClusterAdmin
	case "ops":
		return ClusterRoleOps
	case "dev":
		return ClusterRoleDev
	case "readonly":
		return ClusterRoleReadonly
	default:
		return ""
	}
}

// GetServiceAccountByPermissionType returns the ServiceAccount name for a permission type
func GetServiceAccountByPermissionType(permissionType string) string {
	switch permissionType {
	case "admin":
		return SAClusterAdmin
	case "ops":
		return SAOps
	case "dev":
		return SADev
	case "readonly":
		return SAReadonly
	default:
		return ""
	}
}

