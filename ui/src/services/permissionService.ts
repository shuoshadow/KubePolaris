import api from '../utils/api';
import type {
  ApiResponse,
  PermissionTypeInfo,
  UserGroup,
  ClusterPermission,
  CreateClusterPermissionRequest,
  UpdateClusterPermissionRequest,
  MyPermissionsResponse,
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
  User,
} from '../types';

const BASE_URL = '/permissions';

// ========== 权限类型 ==========

// 获取权限类型列表
export const getPermissionTypes = async (): Promise<ApiResponse<PermissionTypeInfo[]>> => {
  const response = await api.get(`${BASE_URL}/types`);
  return response.data;
};

// ========== 用户列表 ==========

// 获取用户列表（用于权限分配）
export const getUsers = async (): Promise<ApiResponse<User[]>> => {
  const response = await api.get(`${BASE_URL}/users`);
  return response.data;
};

// ========== 用户组管理 ==========

// 获取用户组列表
export const getUserGroups = async (): Promise<ApiResponse<UserGroup[]>> => {
  const response = await api.get(`${BASE_URL}/user-groups`);
  return response.data;
};

// 获取用户组详情
export const getUserGroup = async (id: number): Promise<ApiResponse<UserGroup>> => {
  const response = await api.get(`${BASE_URL}/user-groups/${id}`);
  return response.data;
};

// 创建用户组
export const createUserGroup = async (data: CreateUserGroupRequest): Promise<ApiResponse<UserGroup>> => {
  const response = await api.post(`${BASE_URL}/user-groups`, data);
  return response.data;
};

// 更新用户组
export const updateUserGroup = async (id: number, data: UpdateUserGroupRequest): Promise<ApiResponse<UserGroup>> => {
  const response = await api.put(`${BASE_URL}/user-groups/${id}`, data);
  return response.data;
};

// 删除用户组
export const deleteUserGroup = async (id: number): Promise<ApiResponse<null>> => {
  const response = await api.delete(`${BASE_URL}/user-groups/${id}`);
  return response.data;
};

// 添加用户到用户组
export const addUserToGroup = async (groupId: number, userId: number): Promise<ApiResponse<null>> => {
  const response = await api.post(`${BASE_URL}/user-groups/${groupId}/users`, { user_id: userId });
  return response.data;
};

// 从用户组移除用户
export const removeUserFromGroup = async (groupId: number, userId: number): Promise<ApiResponse<null>> => {
  const response = await api.delete(`${BASE_URL}/user-groups/${groupId}/users/${userId}`);
  return response.data;
};

// ========== 集群权限管理 ==========

// 获取所有集群权限列表
export const getAllClusterPermissions = async (): Promise<ApiResponse<ClusterPermission[]>> => {
  const response = await api.get(`${BASE_URL}/cluster-permissions`);
  return response.data;
};

// 获取指定集群的权限列表
export const getClusterPermissions = async (clusterId: number): Promise<ApiResponse<ClusterPermission[]>> => {
  const response = await api.get(`${BASE_URL}/cluster-permissions`, {
    params: { cluster_id: clusterId }
  });
  return response.data;
};

// 获取权限详情
export const getClusterPermission = async (id: number): Promise<ApiResponse<ClusterPermission>> => {
  const response = await api.get(`${BASE_URL}/cluster-permissions/${id}`);
  return response.data;
};

// 创建集群权限
export const createClusterPermission = async (data: CreateClusterPermissionRequest): Promise<ApiResponse<ClusterPermission>> => {
  const response = await api.post(`${BASE_URL}/cluster-permissions`, data);
  return response.data;
};

// 更新集群权限
export const updateClusterPermission = async (id: number, data: UpdateClusterPermissionRequest): Promise<ApiResponse<ClusterPermission>> => {
  const response = await api.put(`${BASE_URL}/cluster-permissions/${id}`, data);
  return response.data;
};

// 删除集群权限
export const deleteClusterPermission = async (id: number): Promise<ApiResponse<null>> => {
  const response = await api.delete(`${BASE_URL}/cluster-permissions/${id}`);
  return response.data;
};

// 批量删除集群权限
export const batchDeleteClusterPermissions = async (ids: number[]): Promise<ApiResponse<null>> => {
  const response = await api.post(`${BASE_URL}/cluster-permissions/batch-delete`, { ids });
  return response.data;
};

// ========== 当前用户权限 ==========

// 获取当前用户的所有权限
export const getMyPermissions = async (): Promise<ApiResponse<MyPermissionsResponse[]>> => {
  const response = await api.get(`${BASE_URL}/my-permissions`);
  return response.data;
};

// 获取当前用户在指定集群的权限
export const getMyClusterPermission = async (clusterId: number | string): Promise<ApiResponse<MyPermissionsResponse>> => {
  const response = await api.get(`/api/v1/clusters/${clusterId}/my-permissions`);
  return response.data;
};

// ========== 权限工具函数 ==========

// 权限类型显示名称映射
export const permissionTypeNames: Record<string, string> = {
  admin: '管理员权限',
  ops: '运维权限',
  dev: '开发权限',
  readonly: '只读权限',
  custom: '自定义权限',
};

// 权限类型颜色映射
export const permissionTypeColors: Record<string, string> = {
  admin: 'red',
  ops: 'orange',
  dev: 'blue',
  readonly: 'green',
  custom: 'purple',
};

// 获取权限类型显示名称
export const getPermissionTypeName = (type: string): string => {
  return permissionTypeNames[type] || type;
};

// 获取权限类型颜色
export const getPermissionTypeColor = (type: string): string => {
  return permissionTypeColors[type] || 'default';
};

// 检查是否有全部命名空间权限
export const hasAllNamespaceAccess = (namespaces: string[]): boolean => {
  return namespaces.includes('*');
};

// 格式化命名空间显示
export const formatNamespaces = (namespaces: string[]): string => {
  if (hasAllNamespaceAccess(namespaces)) {
    return '全部命名空间';
  }
  return namespaces.join(', ');
};

// 权限类型是否允许部分命名空间
export const permissionTypeAllowsPartialNamespaces: Record<string, boolean> = {
  admin: false,  // 管理员必须是全部命名空间
  ops: false,    // 运维必须是全部命名空间  
  dev: true,     // 开发可以选择部分命名空间
  readonly: true, // 只读可以选择部分命名空间
  custom: true,  // 自定义可以选择部分命名空间
};

// 权限类型是否必须全部命名空间
export const permissionTypeRequiresAllNamespaces: Record<string, boolean> = {
  admin: true,   // 管理员必须是全部命名空间
  ops: true,     // 运维必须是全部命名空间
  dev: false,
  readonly: false,
  custom: false,
};

// 检查权限类型是否允许选择部分命名空间
export const allowsPartialNamespaces = (permissionType: string): boolean => {
  return permissionTypeAllowsPartialNamespaces[permissionType] ?? true;
};

// 检查权限类型是否必须选择全部命名空间
export const requiresAllNamespaces = (permissionType: string): boolean => {
  return permissionTypeRequiresAllNamespaces[permissionType] ?? false;
};

export const permissionService = {
  getPermissionTypes,
  getUsers,
  getUserGroups,
  getUserGroup,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  addUserToGroup,
  removeUserFromGroup,
  getAllClusterPermissions,
  getClusterPermissions,
  getClusterPermission,
  createClusterPermission,
  updateClusterPermission,
  deleteClusterPermission,
  batchDeleteClusterPermissions,
  getMyPermissions,
  getMyClusterPermission,
};

export default permissionService;

