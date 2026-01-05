/**
 * 命名空间选择器组件
 * 根据用户权限自动过滤可选的命名空间
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Select, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { usePermission } from '../contexts/PermissionContext';
import { namespaceService } from '../services/namespaceService';

const { Option } = Select;

interface NamespaceSelectorProps {
  clusterId: string | number;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean; // 是否允许选择"全部命名空间"
  style?: React.CSSProperties;
  disabled?: boolean;
  showPermissionHint?: boolean; // 是否显示权限提示
}

const NamespaceSelector: React.FC<NamespaceSelectorProps> = ({
  clusterId,
  value,
  onChange,
  placeholder = '请选择命名空间',
  allowAll = true,
  style,
  disabled = false,
  showPermissionHint = true,
}) => {
  const [allNamespaces, setAllNamespaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { filterNamespaces, hasAllNamespaceAccess, getAllowedNamespaces } = usePermission();

  // 加载命名空间列表
  useEffect(() => {
    const fetchNamespaces = async () => {
      if (!clusterId) return;
      
      setLoading(true);
      try {
        const response = await namespaceService.getNamespaces(String(clusterId));
        if (response.code === 200 && response.data) {
          const names = response.data.map((ns: any) => ns.name || ns);
          setAllNamespaces(names);
        }
      } catch (error) {
        console.error('获取命名空间列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNamespaces();
  }, [clusterId]);

  // 根据权限过滤命名空间
  const filteredNamespaces = useMemo(() => {
    return filterNamespaces(allNamespaces, clusterId);
  }, [allNamespaces, filterNamespaces, clusterId]);

  // 检查是否有全部命名空间权限
  const hasFullAccess = hasAllNamespaceAccess(clusterId);
  
  // 获取允许的命名空间配置（用于显示提示）
  const allowedConfig = getAllowedNamespaces(clusterId);

  // 权限提示文案
  const getPermissionHint = () => {
    if (hasFullAccess) {
      return '您有全部命名空间的访问权限';
    }
    if (allowedConfig.length === 0) {
      return '您没有任何命名空间的访问权限';
    }
    return `您有权限访问: ${allowedConfig.join(', ')}`;
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <Select
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        loading={loading}
        disabled={disabled}
        style={{ minWidth: 180 }}
        allowClear={allowAll}
        showSearch
        filterOption={(input, option) =>
          (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
        }
      >
        {allowAll && hasFullAccess && (
          <Option value="">全部命名空间</Option>
        )}
        {filteredNamespaces.map((ns) => (
          <Option key={ns} value={ns}>
            {ns}
          </Option>
        ))}
      </Select>
      
      {showPermissionHint && !hasFullAccess && (
        <Tooltip title={getPermissionHint()}>
          <Tag icon={<LockOutlined />} color="warning" style={{ margin: 0 }}>
            受限
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};

export default NamespaceSelector;

