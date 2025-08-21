import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const GlobalSearch: React.FC = () => {
  return (
    <div>
      <Title level={2}>全局搜索</Title>
      <Card>
        <p>全局搜索页面正在开发中...</p>
      </Card>
    </div>
  );
};

export default GlobalSearch;