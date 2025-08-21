import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const PodList: React.FC = () => {
  return (
    <div>
      <Title level={2}>Pod列表</Title>
      <Card>
        <p>Pod列表页面正在开发中...</p>
      </Card>
    </div>
  );
};

export default PodList;