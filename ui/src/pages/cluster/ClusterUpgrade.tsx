import React from 'react';
import { Result, Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

const ClusterUpgrade: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 200px)',
    }}>
      <Result
        icon={<CloudServerOutlined style={{ color: '#1890ff', fontSize: '64px' }} />}
        title={
          <span style={{ fontSize: '24px', fontWeight: 500 }}>
            该功能正在积极开发中
          </span>
        }
        subTitle={
          <Paragraph style={{ color: '#666', maxWidth: '400px', margin: '0 auto', fontSize: '14px' }}>
            我们正在努力为您打造强大的 Kubernetes 集群升级功能，帮助您安全、高效地完成集群版本升级。
          </Paragraph>
        }
      />
    </div>
  );
};

export default ClusterUpgrade;
