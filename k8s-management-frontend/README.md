# K8s管理平台 - 前端项目

一个基于React + TypeScript + Ant Design的现代化Kubernetes集群管理平台前端应用。

## 🚀 技术选型

### 核心技术栈
- **React 19.1.1** - 现代化前端框架
- **TypeScript 5.8.3** - 类型安全的JavaScript超集
- **Vite 7.1.2** - 快速的前端构建工具
- **Ant Design 5.x** - 企业级UI组件库
- **React Router DOM** - 前端路由管理

### 开发工具
- **ESLint** - 代码质量检查
- **TypeScript ESLint** - TypeScript代码规范
- **Vite Plugin React** - React支持插件

### 依赖包
```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "antd": "^5.x",
    "@ant-design/icons": "^5.x",
    "react-router-dom": "^6.x",
    "axios": "^1.x"
  }
}
```

## 📁 项目结构

```
k8s-management-frontend/
├── public/                          # 静态资源
│   └── vite.svg                    # Vite图标
├── src/                            # 源代码目录
│   ├── assets/                     # 静态资源
│   │   └── react.svg              # React图标
│   ├── layouts/                    # 布局组件
│   │   └── MainLayout.tsx         # 主布局组件
│   ├── pages/                      # 页面组件
│   │   ├── cluster/               # 集群管理模块
│   │   │   ├── ClusterList.tsx    # 集群列表页面
│   │   │   ├── ClusterDetail.tsx  # 集群详情页面
│   │   │   └── ClusterImport.tsx  # 集群导入页面
│   │   ├── node/                  # 节点管理模块
│   │   │   ├── NodeList.tsx       # 节点列表页面
│   │   │   ├── NodeDetail.tsx     # 节点详情页面
│   │   │   └── NodeOperations.tsx # 节点操作页面
│   │   ├── pod/                   # Pod管理模块
│   │   │   ├── PodList.tsx        # Pod列表页面
│   │   │   └── PodDetail.tsx      # Pod详情页面
│   │   ├── workload/              # 工作负载模块
│   │   │   ├── WorkloadList.tsx   # 工作负载列表页面
│   │   │   └── WorkloadDetail.tsx # 工作负载详情页面
│   │   └── search/                # 搜索模块
│   │       └── GlobalSearch.tsx   # 全局搜索页面
│   ├── App.tsx                    # 主应用组件
│   ├── App.css                    # 应用样式
│   ├── main.tsx                   # 应用入口
│   ├── index.css                  # 全局样式
│   └── vite-env.d.ts             # Vite类型定义
├── index.html                     # HTML模板
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript配置
├── tsconfig.app.json             # 应用TypeScript配置
├── tsconfig.node.json            # Node.js TypeScript配置
├── vite.config.ts                # Vite配置
├── eslint.config.js              # ESLint配置
└── README.md                     # 项目文档
```

## 🎯 功能模块

### 1. 集群管理 (`/clusters`)
- **集群列表** - 展示所有K8s集群的状态、版本、资源使用情况
- **集群详情** - 查看单个集群的详细信息和监控数据
- **集群导入** - 通过kubeconfig、手动配置或云服务商导入集群

### 2. 节点管理 (`/nodes`)
- **节点列表** - 展示集群中所有节点的状态和资源使用情况
- **节点详情** - 查看节点的详细信息、Pod分布、事件等
- **节点操作** - 执行Cordon、Uncordon、Drain等节点维护操作

### 3. Pod管理 (`/pods`)
- **Pod列表** - 展示所有Pod的状态、资源使用情况
- **Pod详情** - 查看Pod的详细信息、日志、事件等

### 4. 工作负载管理 (`/workloads`)
- **工作负载列表** - 展示Deployments、StatefulSets、DaemonSets等
- **工作负载详情** - 查看工作负载的详细配置和状态

### 5. 全局搜索 (`/search`)
- **统一搜索** - 跨资源类型的全局搜索功能

## 🎨 设计系统 - 腾讯设计语言

### 设计理念
本项目采用**腾讯设计语言**作为核心设计系统，追求简洁、现代、高效的企业级用户体验。设计理念基于以下核心原则：

#### 核心设计原则
- **简洁至上** - 去除冗余元素，突出核心功能
- **一致性** - 统一的视觉语言和交互模式
- **高效性** - 优化用户操作路径，提升工作效率
- **可访问性** - 确保所有用户都能轻松使用

### 视觉设计系统

#### 色彩系统
```css
/* 主色调 - 腾讯蓝 */
--primary-color: #006eff;
--primary-hover: #1a7aff;
--primary-light: #f0f6ff;
--primary-bg: #e6f3ff;

/* 功能色彩 */
--success-color: #00d4aa;    /* 健康状态 */
--warning-color: #ff9f43;    /* 告警状态 */
--error-color: #ff7675;      /* 错误状态 */
--info-color: #a55eea;       /* 信息状态 */

/* 中性色彩 */
--text-primary: #333333;     /* 主要文字 */
--text-secondary: #666666;   /* 次要文字 */
--text-disabled: #999999;    /* 禁用文字 */
--border-color: #e8eaec;     /* 边框颜色 */
--bg-color: #f5f7fa;         /* 背景颜色 */
--card-bg: #ffffff;          /* 卡片背景 */
```

#### 字体系统
```css
/* 字体家族 */
font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 
             'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', 
             Arial, sans-serif;

/* 字体大小层级 */
--font-size-xs: 12px;        /* 辅助信息 */
--font-size-sm: 14px;        /* 正文内容 */
--font-size-md: 16px;        /* 标题文字 */
--font-size-lg: 18px;        /* 页面标题 */
--font-size-xl: 24px;        /* 主标题 */
--font-size-xxl: 28px;       /* 数据展示 */

/* 字重层级 */
--font-weight-normal: 400;   /* 正文 */
--font-weight-medium: 500;   /* 按钮、标签 */
--font-weight-semibold: 600; /* 小标题 */
--font-weight-bold: 700;     /* 主标题、数据 */
```

#### 间距系统
基于8pt网格系统，确保视觉节奏的一致性：
```css
--spacing-xs: 4px;   /* 紧密间距 */
--spacing-sm: 8px;   /* 小间距 */
--spacing-md: 12px;  /* 中等间距 */
--spacing-lg: 16px;  /* 大间距 */
--spacing-xl: 20px;  /* 超大间距 */
--spacing-xxl: 24px; /* 区块间距 */
--spacing-xxxl: 32px;/* 页面间距 */
```

#### 圆角系统
```css
--border-radius-sm: 6px;   /* 标签、进度条 */
--border-radius-md: 8px;   /* 按钮、输入框 */
--border-radius-lg: 12px;  /* 卡片、容器 */
--border-radius-xl: 16px;  /* 统计卡片 */
```

#### 阴影系统
```css
--shadow-sm: 0 1px 4px 0 rgba(0, 0, 0, 0.08);      /* 轻微阴影 */
--shadow-md: 0 2px 8px 0 rgba(0, 0, 0, 0.06);      /* 中等阴影 */
--shadow-lg: 0 4px 12px 0 rgba(0, 0, 0, 0.12);     /* 悬浮阴影 */
--shadow-xl: 0 8px 24px 0 rgba(0, 0, 0, 0.16);     /* 强调阴影 */
```

### 组件设计规范

#### 统计卡片设计
- **渐变背景** - 使用品牌色渐变增强视觉冲击力
- **数据突出** - 大字号、粗字重突出关键数据
- **图标辅助** - 使用语义化图标增强理解
- **悬浮效果** - 微妙的transform和阴影变化

#### 表格设计
- **清晰层次** - 表头使用浅灰背景区分
- **悬浮反馈** - 行悬浮时的背景色变化
- **状态标签** - 彩色标签直观显示状态
- **操作按钮** - 图标按钮减少视觉噪音

#### 侧边栏菜单
- **层次分明** - 一级菜单浅灰背景，二级菜单白色背景
- **选中状态** - 腾讯蓝渐变背景突出当前页面
- **悬浮反馈** - 浅蓝背景和边框提供即时反馈
- **图标语义** - 16px图标配合文字增强识别

#### 按钮设计
- **主要按钮** - 腾讯蓝背景，白色文字，带阴影
- **次要按钮** - 白色背景，灰色边框，深色文字
- **悬浮效果** - 轻微上移和阴影加深
- **圆角统一** - 8px圆角保持一致性

### 布局结构

#### 整体布局
```
┌─────────────────────────────────────────┐
│              Header (60px)              │ 固定头部
├─────────┬───────────────────────────────┤
│         │                               │
│ Sidebar │         Content               │ 主体区域
│ (200px) │        (flex-1)               │
│         │                               │
└─────────┴───────────────────────────────┘
```

#### 页面结构
```
┌─────────────────────────────────────────┐
│            Page Header                  │ 页面头部
├─────────────────────────────────────────┤
│          Stats Cards Grid               │ 统计卡片
├─────────────────────────────────────────┤
│            Toolbar                      │ 工具栏
├─────────────────────────────────────────┤
│           Data Table                    │ 数据表格
└─────────────────────────────────────────┘
```

### 响应式设计

#### 断点系统
```css
/* 移动端 */
@media (max-width: 768px) {
  /* 侧边栏折叠，工具栏垂直排列 */
}

/* 平板端 */
@media (max-width: 1200px) {
  /* 统计卡片2列显示 */
}

/* 桌面端 */
@media (min-width: 1200px) {
  /* 完整4列统计卡片显示 */
}
```

### 动效设计

#### 过渡动画
```css
/* 标准过渡 */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* 悬浮效果 */
transform: translateY(-4px);
box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.16);
```

#### 加载状态
- **骨架屏** - 内容加载时的占位效果
- **进度指示** - 操作进度的可视化反馈
- **状态切换** - 平滑的状态转换动画

### 可访问性设计

#### 色彩对比
- 确保文字与背景的对比度符合WCAG 2.1 AA标准
- 不仅依赖颜色传达信息，配合图标和文字

#### 键盘导航
- 支持Tab键导航
- 明确的焦点指示器
- 快捷键支持（⌘K 全局搜索）

#### 屏幕阅读器
- 语义化HTML结构
- 适当的ARIA标签
- 图片alt文本

### 设计实现

#### CSS架构
```
src/
├── index.css          # 全局样式和设计系统变量
├── App.css           # 应用级组件样式
└── components/       # 组件级样式
```

#### 样式组织
1. **全局样式** - 设计系统变量、重置样式
2. **组件样式** - 基于设计系统的组件实现
3. **工具类** - 常用的原子化样式类
4. **主题覆盖** - Ant Design组件的主题定制

这套设计系统确保了整个K8s管理平台具有统一、现代、高效的用户体验，符合企业级应用的专业标准。
# K8s管理平台 - 前端项目

一个基于React + TypeScript + Ant Design的现代化Kubernetes集群管理平台前端应用。

## 🚀 技术选型

### 核心技术栈
- **React 19.1.1** - 现代化前端框架
- **TypeScript 5.8.3** - 类型安全的JavaScript超集
- **Vite 7.1.2** - 快速的前端构建工具
- **Ant Design 5.x** - 企业级UI组件库
- **React Router DOM** - 前端路由管理

### 开发工具
- **ESLint** - 代码质量检查
- **TypeScript ESLint** - TypeScript代码规范
- **Vite Plugin React** - React支持插件

### 依赖包
```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "antd": "^5.x",
    "@ant-design/icons": "^5.x",
    "react-router-dom": "^6.x",
    "axios": "^1.x"
  }
}
```

## 📁 项目结构

```
k8s-management-frontend/
├── public/                          # 静态资源
│   └── vite.svg                    # Vite图标
├── src/                            # 源代码目录
│   ├── assets/                     # 静态资源
│   │   └── react.svg              # React图标
│   ├── layouts/                    # 布局组件
│   │   └── MainLayout.tsx         # 主布局组件
│   ├── pages/                      # 页面组件
│   │   ├── cluster/               # 集群管理模块
│   │   │   ├── ClusterList.tsx    # 集群列表页面
│   │   │   ├── ClusterDetail.tsx  # 集群详情页面
│   │   │   └── ClusterImport.tsx  # 集群导入页面
│   │   ├── node/                  # 节点管理模块
│   │   │   ├── NodeList.tsx       # 节点列表页面
│   │   │   ├── NodeDetail.tsx     # 节点详情页面
│   │   │   └── NodeOperations.tsx # 节点操作页面
│   │   ├── pod/                   # Pod管理模块
│   │   │   ├── PodList.tsx        # Pod列表页面
│   │   │   └── PodDetail.tsx      # Pod详情页面
│   │   ├── workload/              # 工作负载模块
│   │   │   ├── WorkloadList.tsx   # 工作负载列表页面
│   │   │   └── WorkloadDetail.tsx # 工作负载详情页面
│   │   └── search/                # 搜索模块
│   │       └── GlobalSearch.tsx   # 全局搜索页面
│   ├── App.tsx                    # 主应用组件
│   ├── App.css                    # 应用样式
│   ├── main.tsx                   # 应用入口
│   ├── index.css                  # 全局样式
│   └── vite-env.d.ts             # Vite类型定义
├── index.html                     # HTML模板
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript配置
├── tsconfig.app.json             # 应用TypeScript配置
├── tsconfig.node.json            # Node.js TypeScript配置
├── vite.config.ts                # Vite配置
├── eslint.config.js              # ESLint配置
└── README.md                     # 项目文档
```

## 🎯 功能模块

### 1. 集群管理 (`/clusters`)
- **集群列表** - 展示所有K8s集群的状态、版本、资源使用情况
- **集群详情** - 查看单个集群的详细信息和监控数据
- **集群导入** - 通过kubeconfig、手动配置或云服务商导入集群

### 2. 节点管理 (`/nodes`)
- **节点列表** - 展示集群中所有节点的状态和资源使用情况
- **节点详情** - 查看节点的详细信息、Pod分布、事件等
- **节点操作** - 执行Cordon、Uncordon、Drain等节点维护操作

### 3. Pod管理 (`/pods`)
- **Pod列表** - 展示所有Pod的状态、资源使用情况
- **Pod详情** - 查看Pod的详细信息、日志、事件等

### 4. 工作负载管理 (`/workloads`)
- **工作负载列表** - 展示Deployments、StatefulSets、DaemonSets等
- **工作负载详情** - 查看工作负载的详细配置和状态

### 5. 全局搜索 (`/search`)
- **统一搜索** - 跨资源类型的全局搜索功能


## 🎨 UI设计特性

### 布局结构
- **固定头部** - 包含Logo、全局搜索、通知和用户菜单
- **可折叠侧边栏** - 多级菜单导航，支持移动端适配
- **主内容区** - 面包屑导航 + 页面内容

### 组件特性
- **响应式设计** - 适配桌面端、平板端和移动端
- **统计卡片** - 直观展示关键指标
- **数据表格** - 支持排序、筛选、分页
- **状态标签** - 直观的状态指示器
- **进度条** - 资源使用率可视化
- **操作按钮** - 统一的操作入口

### 交互体验
- **快捷键支持** - ⌘K 快速搜索
- **加载状态** - 优雅的加载动画
- **错误处理** - 友好的错误提示
- **确认对话框** - 危险操作二次确认

## 🛠️ 开发指南

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```
访问 http://localhost:5173

### 构建生产版本
```bash
npm run build
```

### 代码检查
```bash
npm run lint
```

### 预览生产构建
```bash
npm run preview
```

## 📋 开发规范

### 文件命名
- 组件文件使用 PascalCase：`ClusterList.tsx`
- 工具函数使用 camelCase：`formatTime.ts`
- 常量文件使用 UPPER_CASE：`API_ENDPOINTS.ts`

### 组件结构
```tsx
import React from 'react';
import { ComponentProps } from 'antd';

interface Props {
  // 组件属性定义
}

const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // 组件逻辑
  
  return (
    <div>
      {/* 组件JSX */}
    </div>
  );
};

export default ComponentName;
```

### 路由配置
基于原型设计的路由结构：
```tsx
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<Navigate to="/clusters" replace />} />
    <Route path="clusters" element={<ClusterList />} />
    <Route path="clusters/:id" element={<ClusterDetail />} />
    <Route path="clusters/import" element={<ClusterImport />} />
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
```

## 🎯 后续开发计划

### 第1周 - 项目基建 ✅
- [x] 项目初始化和依赖配置
- [x] 基础路由和布局搭建
- [x] 页面组件基础结构

### 第2周 - 集群管理功能
- [ ] 完善集群列表页面功能
- [ ] 实现集群详情页面
- [ ] 开发集群导入向导
- [ ] 集成监控图表组件

### 第3周 - 节点管理功能
- [ ] 完善节点列表和详情页面
- [ ] 实现节点操作功能
- [ ] 开发节点监控界面

### 第4周 - Pod和工作负载管理
- [ ] 完善Pod管理功能
- [ ] 实现工作负载管理
- [ ] 集成YAML编辑器

### 第5-6周 - 全局搜索和完善
- [ ] 实现全局搜索功能
- [ ] 完善用户体验
- [ ] 性能优化

## 📞 联系方式

如有问题或建议，请联系开发团队。

---

**注意：** 本项目基于完整的原型设计开发，所有页面布局和交互都有对应的HTML原型可供参考。