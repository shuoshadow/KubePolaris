/**
 * 菜单权限配置
 * 定义每个菜单项需要的权限类型
 */

import type { PermissionType } from '../types';

// 权限类型优先级（数值越大权限越高）
export const PERMISSION_PRIORITY: Record<PermissionType, number> = {
  readonly: 1,
  dev: 2,
  ops: 3,
  admin: 4,
  custom: 2, // 自定义权限默认与开发权限相同
};

// 检查是否有足够的权限
export const hasPermission = (
  userPermission: PermissionType | null | undefined,
  requiredPermission: PermissionType
): boolean => {
  if (!userPermission) return false;
  return PERMISSION_PRIORITY[userPermission] >= PERMISSION_PRIORITY[requiredPermission];
};

// 检查是否是平台管理员（基于用户名）
export const isPlatformAdmin = (username: string | undefined): boolean => {
  return username === 'admin';
};

// 外层侧边栏菜单权限配置
export const MAIN_MENU_PERMISSIONS: Record<string, {
  requiredPermission?: PermissionType;  // 集群级权限要求
  platformAdminOnly?: boolean;          // 是否仅平台管理员可见
}> = {
  // 所有人可见
  'overview': {},
  'cluster-management': {},
  
  // 仅平台管理员可见
  'permission-management': { platformAdminOnly: true },
  'audit-management': { platformAdminOnly: true },
  'audit-operations': { platformAdminOnly: true },
  'audit-commands': { platformAdminOnly: true },
  'system-settings': { platformAdminOnly: true },
};

// 集群内层侧边栏菜单权限配置
export const CLUSTER_MENU_PERMISSIONS: Record<string, {
  requiredPermission?: PermissionType;
  description?: string;
}> = {
  // === 概览 - 所有人可见 ===
  'cluster-overview': {},
  
  // === Kubernetes资源 - 大部分所有人可见 ===
  'kubernetes-resources': {},
  'k8s-workloads': {},
  'k8s-pods': {},
  'k8s-network': {},
  'k8s-storage': {},           // 存储管理，所有人可查看
  'k8s-configs': {},
  'k8s-namespaces': {},        // 命名空间，所有人可查看
  
  // === 集群管理 - 需要较高权限 ===
  'cluster': { requiredPermission: 'ops' },           // 集群分组需要运维权限
  'cluster-nodes': { requiredPermission: 'ops' },     // 节点管理需要运维权限
  'cluster-config': { requiredPermission: 'ops' },    // 配置中心需要运维权限
  'cluster-upgrade': { requiredPermission: 'admin' }, // 集群升级仅管理员
  'cluster-plugins': { requiredPermission: 'ops' },   // 插件中心需要运维权限
  
  // === 云原生观测 - 大部分所有人可见 ===
  'cloud-native-observability': {},
  'observability-monitoring': {},
  'observability-logs': {},
  'observability-alerts': { requiredPermission: 'dev' }, // 告警中心需要开发及以上权限
  
  // === 云原生成本治理 - 需要运维权限 ===
  'cloud-native-cost': { requiredPermission: 'ops' },
  'cost-insights': { requiredPermission: 'ops' },
};

// 操作按钮权限配置
export const ACTION_PERMISSIONS: Record<string, PermissionType> = {
  // Pod 操作
  'pod:delete': 'dev',
  'pod:exec': 'dev',
  'pod:logs': 'readonly',
  
  // 工作负载操作
  'deployment:create': 'dev',
  'deployment:update': 'dev',
  'deployment:delete': 'dev',
  'deployment:scale': 'dev',
  'deployment:restart': 'dev',
  
  'statefulset:create': 'dev',
  'statefulset:update': 'dev',
  'statefulset:delete': 'dev',
  'statefulset:scale': 'dev',
  
  'daemonset:create': 'ops',
  'daemonset:update': 'ops',
  'daemonset:delete': 'ops',
  
  // 服务和路由
  'service:create': 'dev',
  'service:update': 'dev',
  'service:delete': 'dev',
  
  'ingress:create': 'dev',
  'ingress:update': 'dev',
  'ingress:delete': 'dev',
  
  // 配置
  'configmap:create': 'dev',
  'configmap:update': 'dev',
  'configmap:delete': 'dev',
  
  'secret:create': 'dev',
  'secret:update': 'dev',
  'secret:delete': 'dev',
  
  // 存储
  'pv:create': 'admin',
  'pv:delete': 'admin',
  'pvc:create': 'ops',
  'pvc:delete': 'ops',
  'storageclass:create': 'admin',
  'storageclass:delete': 'admin',
  
  // 节点
  'node:cordon': 'admin',
  'node:uncordon': 'admin',
  'node:drain': 'admin',
  
  // 命名空间
  'namespace:create': 'admin',
  'namespace:delete': 'admin',
  
  // 终端
  'terminal:kubectl': 'dev',
  'terminal:pod': 'dev',
  'terminal:ssh': 'ops',
};

// 检查是否有操作权限
export const canPerformAction = (
  userPermission: PermissionType | null | undefined,
  action: string
): boolean => {
  const requiredPermission = ACTION_PERMISSIONS[action];
  if (!requiredPermission) return true; // 未定义的操作默认允许
  return hasPermission(userPermission, requiredPermission);
};

// 路由权限配置
export const ROUTE_PERMISSIONS: Record<string, {
  requiredPermission?: PermissionType;
  platformAdminOnly?: boolean;
}> = {
  '/permissions': { platformAdminOnly: true },
  '/audit': { platformAdminOnly: true },
  '/audit/operations': { platformAdminOnly: true },
  '/audit/commands': { platformAdminOnly: true },
  '/settings': { platformAdminOnly: true },
};

// 集群内路由权限配置（基于路径模式）
export const CLUSTER_ROUTE_PERMISSIONS: Record<string, PermissionType> = {
  '/nodes': 'ops',
  '/config-center': 'ops',
  '/upgrade': 'admin',
  '/plugins': 'ops',
  '/cost-insights': 'ops',
};

export default {
  PERMISSION_PRIORITY,
  hasPermission,
  isPlatformAdmin,
  MAIN_MENU_PERMISSIONS,
  CLUSTER_MENU_PERMISSIONS,
  ACTION_PERMISSIONS,
  canPerformAction,
  ROUTE_PERMISSIONS,
  CLUSTER_ROUTE_PERMISSIONS,
};

