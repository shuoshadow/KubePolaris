import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const WorkloadDetail: React.FC = () => {
  return (
    <div>
      <Title level={2}>工作负载详情</Title>
      <Card>
        <p>工作负载详情页面正在开发中...</p>
      </Card>
    </div>
  );
};

export default WorkloadDetail;