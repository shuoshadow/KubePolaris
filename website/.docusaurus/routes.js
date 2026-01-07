import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '41e'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'cd9'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'c10'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', '7cc'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/admin-guide/backup-restore',
                component: ComponentCreator('/docs/admin-guide/backup-restore', '4bd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/admin-guide/deployment',
                component: ComponentCreator('/docs/admin-guide/deployment', '146'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/admin-guide/high-availability',
                component: ComponentCreator('/docs/admin-guide/high-availability', '315'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/admin-guide/security',
                component: ComponentCreator('/docs/admin-guide/security', 'bb6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/admin-guide/troubleshooting',
                component: ComponentCreator('/docs/admin-guide/troubleshooting', '06e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/authentication',
                component: ComponentCreator('/docs/api/authentication', '763'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/clusters',
                component: ComponentCreator('/docs/api/clusters', '75c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/overview',
                component: ComponentCreator('/docs/api/overview', '7be'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/pods',
                component: ComponentCreator('/docs/api/pods', '847'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/workloads',
                component: ComponentCreator('/docs/api/workloads', 'dd5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/faq',
                component: ComponentCreator('/docs/faq', '3d1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/configuration',
                component: ComponentCreator('/docs/getting-started/configuration', 'a00'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/installation',
                component: ComponentCreator('/docs/getting-started/installation', 'c16'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/quick-start',
                component: ComponentCreator('/docs/getting-started/quick-start', '801'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/installation/docker',
                component: ComponentCreator('/docs/installation/docker', '4f1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/installation/kubernetes',
                component: ComponentCreator('/docs/installation/kubernetes', '3d2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/installation/source',
                component: ComponentCreator('/docs/installation/source', '1d9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/installation/upgrade',
                component: ComponentCreator('/docs/installation/upgrade', 'ff6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/plugins/alertmanager',
                component: ComponentCreator('/docs/plugins/alertmanager', '46f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/plugins/argocd',
                component: ComponentCreator('/docs/plugins/argocd', '759'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/plugins/grafana',
                component: ComponentCreator('/docs/plugins/grafana', '39b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/plugins/prometheus',
                component: ComponentCreator('/docs/plugins/prometheus', '177'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/roadmap',
                component: ComponentCreator('/docs/roadmap', 'f0b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/cluster-management',
                component: ComponentCreator('/docs/user-guide/cluster-management', '3b1'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/log-center',
                component: ComponentCreator('/docs/user-guide/log-center', 'a49'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/monitoring-alerting',
                component: ComponentCreator('/docs/user-guide/monitoring-alerting', 'e9b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/node-management',
                component: ComponentCreator('/docs/user-guide/node-management', '077'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/pod-management',
                component: ComponentCreator('/docs/user-guide/pod-management', '0b6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/rbac-permissions',
                component: ComponentCreator('/docs/user-guide/rbac-permissions', '692'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/terminal-access',
                component: ComponentCreator('/docs/user-guide/terminal-access', '5fd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/user-guide/workload-management',
                component: ComponentCreator('/docs/user-guide/workload-management', '2af'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
