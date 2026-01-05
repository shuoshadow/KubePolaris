import { request } from '../utils/api';
import type { ApiResponse, User, LDAPConfig, SSHConfig, MyPermissionsResponse } from '../types';

// 登录请求参数
export interface LoginRequest {
  username: string;
  password: string;
  auth_type?: 'local' | 'ldap';
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: User;
  expires_at: number;
  permissions?: MyPermissionsResponse[];
}

// 认证状态
export interface AuthStatus {
  ldap_enabled: boolean;
}

// 修改密码请求
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// LDAP测试认证请求
export interface TestLDAPAuthRequest {
  username: string;
  password: string;
  server?: string;
  port?: number;
  use_tls?: boolean;
  skip_tls_verify?: boolean;
  bind_dn?: string;
  bind_password?: string;
  base_dn?: string;
  user_filter?: string;
  username_attr?: string;
  email_attr?: string;
  display_name_attr?: string;
  group_filter?: string;
  group_attr?: string;
}

// LDAP测试认证响应
export interface TestLDAPAuthResponse {
  success: boolean;
  error?: string;
  username?: string;
  email?: string;
  display_name?: string;
  groups?: string[];
}

// 认证服务
export const authService = {
  // 用户登录
  login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return request.post<LoginResponse>('/auth/login', data);
  },

  // 用户登出
  logout: (): Promise<ApiResponse<null>> => {
    return request.post<null>('/auth/logout');
  },

  // 获取当前用户信息
  getProfile: (): Promise<ApiResponse<User>> => {
    return request.get<User>('/auth/me');
  },

  // 获取认证状态（是否启用LDAP）
  getAuthStatus: (): Promise<ApiResponse<AuthStatus>> => {
    return request.get<AuthStatus>('/auth/status');
  },

  // 修改密码
  changePassword: (data: ChangePasswordRequest): Promise<ApiResponse<null>> => {
    return request.post<null>('/auth/change-password', data);
  },
};

// 系统设置服务
export const systemSettingService = {
  // 获取LDAP配置
  getLDAPConfig: (): Promise<ApiResponse<LDAPConfig>> => {
    return request.get<LDAPConfig>('/system/ldap/config');
  },

  // 更新LDAP配置
  updateLDAPConfig: (config: LDAPConfig): Promise<ApiResponse<null>> => {
    return request.put<null>('/system/ldap/config', config);
  },

  // 测试LDAP连接
  testLDAPConnection: (config: LDAPConfig): Promise<ApiResponse<{ success: boolean; error?: string }>> => {
    return request.post<{ success: boolean; error?: string }>('/system/ldap/test-connection', config);
  },

  // 测试LDAP用户认证
  testLDAPAuth: (data: TestLDAPAuthRequest): Promise<ApiResponse<TestLDAPAuthResponse>> => {
    return request.post<TestLDAPAuthResponse>('/system/ldap/test-auth', data);
  },

  // 获取SSH配置
  getSSHConfig: (): Promise<ApiResponse<SSHConfig>> => {
    return request.get<SSHConfig>('/system/ssh/config');
  },

  // 更新SSH配置
  updateSSHConfig: (config: SSHConfig): Promise<ApiResponse<null>> => {
    return request.put<null>('/system/ssh/config', config);
  },

  // 获取SSH凭据（用于自动连接）
  getSSHCredentials: (): Promise<ApiResponse<SSHConfig>> => {
    return request.get<SSHConfig>('/system/ssh/credentials');
  },
};

// Token 管理工具
export const tokenManager = {
  // 获取 token
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  // 设置 token
  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },

  // 移除 token
  removeToken: (): void => {
    localStorage.removeItem('token');
  },

  // 获取用户信息
  getUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // 设置用户信息
  setUser: (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // 移除用户信息
  removeUser: (): void => {
    localStorage.removeItem('user');
  },

  // 获取权限信息
  getPermissions: (): MyPermissionsResponse[] => {
    const permStr = localStorage.getItem('permissions');
    if (permStr) {
      try {
        return JSON.parse(permStr);
      } catch {
        return [];
      }
    }
    return [];
  },

  // 设置权限信息
  setPermissions: (permissions: MyPermissionsResponse[]): void => {
    localStorage.setItem('permissions', JSON.stringify(permissions));
  },

  // 移除权限信息
  removePermissions: (): void => {
    localStorage.removeItem('permissions');
  },

  // 检查是否已登录
  isLoggedIn: (): boolean => {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (!token || !expiresAt) {
      return false;
    }

    // 检查 token 是否过期
    const expiresAtNum = parseInt(expiresAt, 10);
    if (Date.now() / 1000 > expiresAtNum) {
      // Token 已过期，清理存储
      tokenManager.clear();
      return false;
    }

    return true;
  },

  // 设置过期时间
  setExpiresAt: (expiresAt: number): void => {
    localStorage.setItem('token_expires_at', expiresAt.toString());
  },

  // 清除所有认证信息
  clear: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('permissions');
  },
};

export default authService;
