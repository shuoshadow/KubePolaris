import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const WorkloadList: React.FC = () => {
  return (
    <div>
      <Title level={2}>工作负载列表</Title>
      <Card>
        <p>工作负载列表页面正在开发中...</p>
      </Card>
    </div>
  );
};

export default WorkloadList;