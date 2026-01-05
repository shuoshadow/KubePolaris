import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Tabs,
  Space,
  Spin,
  App,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { authService, tokenManager } from '../../services/authService';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

// 样式定义
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.3; }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .login-container {
    animation: fadeIn 0.6s ease-out;
  }

  .login-card {
    animation: slideInUp 0.8s ease-out;
  }

  .login-card:hover {
    transform: translateY(-4px);
    transition: all 0.3s ease;
  }

  .decorative-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    animation: float 8s ease-in-out infinite;
  }

  .decorative-circle:nth-child(1) {
    width: 300px;
    height: 300px;
    top: -150px;
    left: -150px;
    animation-delay: 0s;
  }

  .decorative-circle:nth-child(2) {
    width: 200px;
    height: 200px;
    bottom: -100px;
    right: -100px;
    animation-delay: 2s;
  }

  .decorative-circle:nth-child(3) {
    width: 150px;
    height: 150px;
    top: 50%;
    right: 10%;
    animation-delay: 4s;
  }

  .kubernetes-pattern {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }

  .tech-text {
    position: absolute;
    font-size: 48px;
    font-weight: 700;
    opacity: 0.05;
    color: #667eea;
    animation: pulse 6s ease-in-out infinite;
    font-family: 'Arial Black', sans-serif;
  }

  .tech-text:nth-child(1) { top: 10%; left: 10%; animation-delay: 0s; }
  .tech-text:nth-child(2) { top: 20%; right: 15%; animation-delay: 2s; }
  .tech-text:nth-child(3) { bottom: 15%; left: 20%; animation-delay: 4s; }
  .tech-text:nth-child(4) { bottom: 25%; right: 10%; animation-delay: 6s; }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Login: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [activeTab, setActiveTab] = useState<'local' | 'ldap'>('local');

  // 注入样式
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // 获取重定向地址
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // 检查是否已登录
  useEffect(() => {
    if (tokenManager.isLoggedIn()) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

  // 获取认证状态
  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        const response = await authService.getAuthStatus();
        if (response.code === 200) {
          setLdapEnabled(response.data.ldap_enabled);
        }
      } catch (error) {
        console.error('获取认证状态失败:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchAuthStatus();
  }, []);

  // 登录处理
  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const response = await authService.login({
        username: values.username,
        password: values.password,
        auth_type: activeTab,
      });

      if (response.code === 200) {
        // 保存认证信息
        tokenManager.setToken(response.data.token);
        tokenManager.setUser(response.data.user);
        tokenManager.setExpiresAt(response.data.expires_at);
        
        // 保存权限信息
        if (response.data.permissions) {
          tokenManager.setPermissions(response.data.permissions);
        }

        message.success('登录成功');
        navigate(from, { replace: true });
      } else {
        message.error(response.message || '登录失败');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'local',
      label: (
        <Space>
          <UserOutlined />
          密码登录
        </Space>
      ),
    },
    ...(ldapEnabled ? [{
      key: 'ldap',
      label: (
        <Space>
          <CloudServerOutlined />
          LDAP登录
        </Space>
      ),
    }] : []),
  ];

  return (
    <div
      className="login-container"
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 装饰性背景圆圈 */}
      <div className="decorative-circle" />
      <div className="decorative-circle" />
      <div className="decorative-circle" />

      {/* 技术栈文字背景 */}
      <div className="kubernetes-pattern">
        <div className="tech-text">SRE</div>
        <div className="tech-text">AI</div>
        <div className="tech-text">K8s</div>
        <div className="tech-text">Agent</div>
      </div>

      <Card
        className="login-card"
        style={{
          width: 460,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          borderRadius: 24,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}
        bodyStyle={{ padding: '48px 40px' }}
      >
        {/* Logo 和标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div 
            style={{ 
              marginBottom: 20,
              position: 'relative',
              display: 'inline-block'
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                filter: 'blur(20px)',
                opacity: 0.3,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
            <img
              src="/src/assets/kubernetes.png"
              alt="KubePolaris"
              style={{ 
                width: 72, 
                height: 72,
                position: 'relative',
                filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3))',
              }}
            />
          </div>
          <Title 
            level={2} 
            style={{ 
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              fontSize: 32,
            }}
          >
            KubePolaris
          </Title>
          <Text 
            style={{ 
              fontSize: 15,
              color: '#6b7280',
              fontWeight: 500,
            }}
          >
            Kubernetes 集群管理平台
          </Text>
        </div>

        {/* 登录方式切换 */}
        {ldapEnabled ? (
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'local' | 'ldap')}
            items={tabItems}
            centered
            style={{ marginBottom: 32 }}
          />
        ) : null}

        {/* 登录表单 */}
        <Form
          form={form}
          onFinish={handleLogin}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="用户名"
              size="large"
              autoComplete="username"
              style={{
                height: 48,
                borderRadius: 12,
                fontSize: 15,
                border: '1px solid #e5e7eb',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
            style={{ marginBottom: 32 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="密码"
              size="large"
              autoComplete="current-password"
              style={{
                height: 48,
                borderRadius: 12,
                fontSize: 15,
                border: '1px solid #e5e7eb',
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<LoginOutlined />}
              style={{
                height: 52,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {/* 提示信息 */}
        <div 
          style={{ 
            textAlign: 'center', 
            marginTop: 32,
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderRadius: 12,
            border: '1px solid rgba(102, 126, 234, 0.1)',
          }}
        >
          <Text 
            style={{ 
              fontSize: 13,
              color: '#6b7280',
              lineHeight: '1.6',
            }}
          >
            {activeTab === 'ldap' 
              ? '🔐 使用企业账号登录' 
              : '👤 默认管理员: admin / KubePolaris@2026'}
          </Text>
        </div>

        {/* 版权信息 */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text 
            type="secondary" 
            style={{ 
              fontSize: 12,
              color: '#9ca3af',
            }}
          >
            © 2026 KubePolaris. All rights reserved.
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
