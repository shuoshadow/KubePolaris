/**
 * 权限守卫组件
 * 用于保护需要特定权限才能访问的路由和组件
 */

import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { Result, Button } from 'antd';
import { tokenManager } from '../services/authService';
import { usePermission } from '../contexts/PermissionContext';
import { 
  isPlatformAdmin, 
  hasPermission, 
  ROUTE_PERMISSIONS, 
  CLUSTER_ROUTE_PERMISSIONS 
} from '../config/menuPermissions';
import type { PermissionType } from '../types';

interface PermissionGuardProps {
  children: React.ReactNode;
  // 平台管理员专属
  platformAdminOnly?: boolean;
  // 集群级别权限要求
  requiredPermission?: PermissionType;
  // 自定义无权限时的行为
  fallback?: React.ReactNode;
}

/**
 * 权限守卫组件
 * 根据用户权限决定是否渲染子组件
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  platformAdminOnly = false,
  requiredPermission,
  fallback,
}) => {
  const currentUser = tokenManager.getUser();
  const { currentClusterPermission, loading } = usePermission();
  const location = useLocation();

  // 如果权限还在加载中，可以显示加载状态
  if (loading) {
    return null;
  }

  // 检查平台管理员权限
  if (platformAdminOnly) {
    if (!isPlatformAdmin(currentUser?.username)) {
      if (fallback) return <>{fallback}</>;
      return (
        <Result
          status="403"
          title="无权访问"
          subTitle="此页面仅限平台管理员访问"
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              返回上一页
            </Button>
          }
        />
      );
    }
  }

  // 检查集群级别权限
  if (requiredPermission) {
    const userPermission = currentClusterPermission?.permission_type as PermissionType | undefined;
    if (!hasPermission(userPermission, requiredPermission)) {
      if (fallback) return <>{fallback}</>;
      return (
        <Result
          status="403"
          title="权限不足"
          subTitle={`访问此页面需要 ${getPermissionLabel(requiredPermission)} 或更高权限`}
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              返回上一页
            </Button>
          }
        />
      );
    }
  }

  return <>{children}</>;
};

/**
 * 平台管理员路由守卫
 * 自动检测当前路由是否需要平台管理员权限
 */
export const PlatformAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const currentUser = tokenManager.getUser();

  // 检查当前路由是否需要平台管理员权限
  const routeConfig = ROUTE_PERMISSIONS[location.pathname];
  
  if (routeConfig?.platformAdminOnly && !isPlatformAdmin(currentUser?.username)) {
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
};

/**
 * 集群权限路由守卫
 * 自动检测当前集群路由是否需要特定权限
 */
export const ClusterPermissionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { currentClusterPermission, loading } = usePermission();
  const { clusterId, id } = useParams();
  const currentClusterId = clusterId || id;

  if (loading) {
    return null;
  }

  // 从路径中提取子路由部分
  const pathMatch = location.pathname.match(/\/clusters\/[^/]+(.+)/);
  const subPath = pathMatch ? pathMatch[1] : '';

  // 检查是否需要特定权限
  for (const [routePattern, requiredPermission] of Object.entries(CLUSTER_ROUTE_PERMISSIONS)) {
    if (subPath.startsWith(routePattern)) {
      const userPermission = currentClusterPermission?.permission_type as PermissionType | undefined;
      if (!hasPermission(userPermission, requiredPermission)) {
        return (
          <Result
            status="403"
            title="权限不足"
            subTitle={`访问此页面需要 ${getPermissionLabel(requiredPermission)} 或更高权限`}
            extra={
              <Button type="primary" onClick={() => window.history.back()}>
                返回上一页
              </Button>
            }
          />
        );
      }
      break;
    }
  }

  return <>{children}</>;
};

/**
 * 操作权限检查 Hook
 * 用于在组件内检查是否有权限执行某个操作
 */
export const useActionPermission = () => {
  const { currentClusterPermission } = usePermission();
  const currentUser = tokenManager.getUser();

  const canPerform = (action: string): boolean => {
    // 平台管理员可以执行所有操作
    if (isPlatformAdmin(currentUser?.username)) {
      return true;
    }

    const userPermission = currentClusterPermission?.permission_type as PermissionType | undefined;
    if (!userPermission) return false;

    // 管理员权限可以执行所有操作
    if (userPermission === 'admin') return true;

    // 只读权限只能查看
    if (userPermission === 'readonly') {
      return ['view', 'list', 'get'].includes(action);
    }

    // 开发权限
    if (userPermission === 'dev') {
      const allowedPrefixes = ['pod:', 'deployment:', 'statefulset:', 'service:', 'configmap:', 'secret:', 'ingress:', 'job:', 'cronjob:'];
      return allowedPrefixes.some(prefix => action.startsWith(prefix)) || ['view', 'list', 'get'].includes(action);
    }

    // 运维权限（排除节点和存储的高危操作）
    if (userPermission === 'ops') {
      const restricted = ['node:cordon', 'node:uncordon', 'node:drain', 'pv:delete', 'storageclass:delete'];
      return !restricted.includes(action);
    }

    return false;
  };

  return { canPerform };
};

// 获取权限类型的显示名称
const getPermissionLabel = (type: PermissionType): string => {
  const labels: Record<PermissionType, string> = {
    admin: '管理员权限',
    ops: '运维权限',
    dev: '开发权限',
    readonly: '只读权限',
    custom: '自定义权限',
  };
  return labels[type] || type;
};

export default PermissionGuard;

