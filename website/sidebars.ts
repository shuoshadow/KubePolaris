import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '介绍',
    },
    {
      type: 'category',
      label: '快速开始',
      collapsed: false,
      items: [
        'getting-started/quick-start',
        'getting-started/installation',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: '安装部署',
      items: [
        'installation/docker',
        'installation/kubernetes',
        'installation/source',
        'installation/upgrade',
      ],
    },
    {
      type: 'category',
      label: '用户指南',
      items: [
        'user-guide/cluster-management',
        'user-guide/workload-management',
        'user-guide/pod-management',
        'user-guide/node-management',
        'user-guide/terminal-access',
        'user-guide/monitoring-alerting',
        'user-guide/log-center',
        'user-guide/rbac-permissions',
      ],
    },
    {
      type: 'category',
      label: '管理员指南',
      items: [
        'admin-guide/deployment',
        'admin-guide/high-availability',
        'admin-guide/security',
        'admin-guide/backup-restore',
        'admin-guide/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: '插件集成',
      items: [
        'plugins/argocd',
        'plugins/prometheus',
        'plugins/grafana',
        'plugins/alertmanager',
      ],
    },
    {
      type: 'category',
      label: 'API 参考',
      items: [
        'api/overview',
        'api/authentication',
        'api/clusters',
        'api/workloads',
        'api/pods',
      ],
    },
    {
      type: 'doc',
      id: 'faq',
      label: '常见问题',
    },
    {
      type: 'doc',
      id: 'roadmap',
      label: '路线图',
    },
  ],
};

export default sidebars;

