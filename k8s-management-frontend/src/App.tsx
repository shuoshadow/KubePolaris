import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import ClusterList from './pages/cluster/ClusterList';
import ClusterDetail from './pages/cluster/ClusterDetail';
import ClusterImport from './pages/cluster/ClusterImport';
import NodeList from './pages/node/NodeList';
import NodeDetail from './pages/node/NodeDetail';
import NodeOperations from './pages/node/NodeOperations';
import PodList from './pages/pod/PodList';
import PodDetail from './pages/pod/PodDetail';
import WorkloadList from './pages/workload/WorkloadList';
import WorkloadDetail from './pages/workload/WorkloadDetail';
import GlobalSearch from './pages/search/GlobalSearch';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/clusters" replace />} />
            <Route path="clusters" element={<ClusterList />} />
            <Route path="clusters/:id" element={<ClusterDetail />} />
            <Route path="clusters/import" element={<ClusterImport />} />
            <Route path="clusters/:clusterId/nodes" element={<NodeList />} />
            <Route path="clusters/:clusterId/nodes/:nodeName" element={<NodeDetail />} />
            <Route path="nodes" element={<NodeList />} />
            <Route path="nodes/:id" element={<NodeDetail />} />
            <Route path="nodes/operations" element={<NodeOperations />} />
            <Route path="pods" element={<PodList />} />
            <Route path="pods/:namespace/:name" element={<PodDetail />} />
            <Route path="workloads" element={<WorkloadList />} />
            <Route path="workloads/:type/:namespace/:name" element={<WorkloadDetail />} />
            <Route path="search" element={<GlobalSearch />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;