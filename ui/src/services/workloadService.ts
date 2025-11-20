import { request } from '../utils/api';

export interface WorkloadInfo {
  id: string;
  name: string;
  namespace: string;
  type: string;
  status: string;
  ready?: string;
  upToDate?: number;
  available?: number;
  age?: string;
  images: string[];
  selector: Record<string, string>;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  creationTimestamp?: string;
  replicas?: number;
  readyReplicas?: number;
  updatedReplicas?: number;
  availableReplicas?: number;
  strategy?: string;
  cpuLimit?: string;
  cpuRequest?: string;
  memoryLimit?: string;
  memoryRequest?: string;
  conditions?: Array<{
    type: string;
    status: string;
    lastUpdateTime: string;
    lastTransitionTime: string;
    reason: string;
    message: string;
  }>;
}

export interface WorkloadListResponse {
  code: number;
  message: string;
  data: {
    items: WorkloadInfo[];
    total: number;
  };
}

export interface WorkloadDetailResponse {
  code: number;
  message: string;
  data: {
    workload: WorkloadInfo;
    raw: any;
    pods: any[];
  };
}

export interface ScaleWorkloadRequest {
  replicas: number;
}

export interface YAMLApplyRequest {
  yaml: string;
  dryRun?: boolean;
}

export class WorkloadService {
  /** genAI_main_start */
  // 获取工作负载列表
  static async getWorkloads(
    clusterId: string,
    namespace?: string,
    workloadType?: string,
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<WorkloadListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    
    if (namespace) {
      params.append('namespace', namespace);
    }
    
    if (search) {
      params.append('search', search);
    }
    
    // 根据workloadType路由到不同的后端API端点
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += 'deployments';
        break;
      case 'Rollout':
        endpoint += 'rollouts';
        break;
      case 'StatefulSet':
        endpoint += 'statefulsets';
        break;
      case 'DaemonSet':
        endpoint += 'daemonsets';
        params.append('type', 'DaemonSet'); // 临时保留
        break;
      case 'Job':
        endpoint += 'jobs';
        params.append('type', 'Job'); // 临时保留
        break;
      case 'CronJob':
        endpoint += 'cronjobs';
        params.append('type', 'CronJob'); // 临时保留
        break;
      default:
        endpoint += 'workloads';
        if (workloadType) {
          params.append('type', workloadType);
        }
    }
    
    return request.get(`${endpoint}?${params}`);
  }
  /** genAI_main_end */

  /** genAI_main_start */
  // 获取工作负载命名空间列表
  static async getWorkloadNamespaces(
    clusterId: string,
    workloadType?: string
  ): Promise<{ code: number; message: string; data: Array<{ name: string; count: number }> }> {
    // 根据workloadType路由到不同的后端API端点
    let endpoint = `/clusters/${clusterId}/`;
    const params = new URLSearchParams();
    
    switch (workloadType) {
      case 'Deployment':
        endpoint += 'deployments/namespaces';
        break;
      case 'Rollout':
        endpoint += 'rollouts/namespaces';
        break;
      case 'StatefulSet':
        endpoint += 'statefulsets/namespaces';
        break;
      case 'DaemonSet':
        endpoint += 'daemonsets/namespaces';
        params.append('type', 'DaemonSet');
        break;
      case 'Job':
        endpoint += 'jobs/namespaces';
        params.append('type', 'Job');
        break;
      case 'CronJob':
        endpoint += 'cronjobs/namespaces';
        params.append('type', 'CronJob');
        break;
      default:
        endpoint += 'workloads/namespaces';
        if (workloadType) {
          params.append('type', workloadType);
        }
    }
    
    return request.get(`${endpoint}?${params}`);
  }
  /** genAI_main_end */

  /** genAI_main_start */
  // 获取工作负载详情
  static async getWorkloadDetail(
    clusterId: string,
    workloadType: string,
    namespace: string,
    name: string
  ): Promise<WorkloadDetailResponse> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${name}`;
        break;
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${name}`;
        break;
      case 'StatefulSet':
        endpoint += `statefulsets/${namespace}/${name}`;
        break;
      case 'DaemonSet':
        endpoint += `daemonsets/${namespace}/${name}?type=${workloadType}`;
        break;
      case 'Job':
        endpoint += `jobs/${namespace}/${name}?type=${workloadType}`;
        break;
      case 'CronJob':
        endpoint += `cronjobs/${namespace}/${name}?type=${workloadType}`;
        break;
      default:
        endpoint += `workloads/${namespace}/${name}?type=${workloadType}`;
    }
    return request.get(endpoint);
  }

  // 扩缩容工作负载
  static async scaleWorkload(
    clusterId: string,
    namespace: string,
    name: string,
    type: string,
    replicas: number
  ): Promise<any> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (type) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${name}/scale`;
        break;
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${name}/scale`;
        break;
      case 'StatefulSet':
        endpoint += `statefulsets/${namespace}/${name}/scale`;
        break;
      default:
        endpoint += `workloads/${namespace}/${name}/scale?type=${type}`;
    }
    return request.post(endpoint, { replicas });
  }

  // 删除工作负载
  static async deleteWorkload(
    clusterId: string,
    namespace: string,
    name: string,
    type: string
  ): Promise<any> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (type) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${name}`;
        break;
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${name}`;
        break;
      case 'StatefulSet':
        endpoint += `statefulsets/${namespace}/${name}`;
        break;
      case 'DaemonSet':
        endpoint += `daemonsets/${namespace}/${name}`;
        break;
      case 'Job':
        endpoint += `jobs/${namespace}/${name}`;
        break;
      case 'CronJob':
        endpoint += `cronjobs/${namespace}/${name}`;
        break;
      default:
        endpoint += `workloads/${namespace}/${name}?type=${type}`;
    }
    return request.delete(endpoint);
  }

  // 重新部署工作负载（重启）
  static async restartWorkload(
    clusterId: string,
    namespace: string,
    name: string,
    type: string
  ): Promise<any> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (type) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${name}/restart`;
        break;
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${name}/restart`;
        break;
      case 'StatefulSet':
        endpoint += `statefulsets/${namespace}/${name}/restart`;
        break;
      case 'DaemonSet':
        endpoint += `daemonsets/${namespace}/${name}/restart`;
        break;
      default:
        endpoint += `workloads/${namespace}/${name}/restart?type=${type}`;
    }
    return request.post(endpoint);
  }

  // 应用YAML
  static async applyYAML(
    clusterId: string,
    yaml: string,
    dryRun = false
  ): Promise<any> {
    // 解析YAML中的kind来确定使用哪个endpoint
    try {
      const kindMatch = yaml.match(/kind:\s*(\w+)/);
      if (kindMatch) {
        const kind = kindMatch[1];
        let endpoint = `/clusters/${clusterId}/`;
        switch (kind) {
          case 'Deployment':
            endpoint += 'deployments/yaml/apply';
            break;
          case 'Rollout':
            endpoint += 'rollouts/yaml/apply';
            break;
          case 'StatefulSet':
            endpoint += 'statefulsets/yaml/apply';
            break;
          case 'DaemonSet':
            endpoint += 'daemonsets/yaml/apply';
            break;
          case 'Job':
            endpoint += 'jobs/yaml/apply';
            break;
          case 'CronJob':
            endpoint += 'cronjobs/yaml/apply';
            break;
          default:
            endpoint += 'workloads/yaml/apply';
        }
        return request.post(endpoint, { yaml, dryRun });
      }
    } catch (e) {
      // fallback to default
    }
    return request.post(`/clusters/${clusterId}/workloads/yaml/apply`, {
      yaml,
      dryRun,
    });
  }
  /** genAI_main_end */

  // 获取工作负载类型列表
  static getWorkloadTypes(): Array<{ value: string; label: string; icon: string }> {
    return [
      { value: 'deployment', label: 'Deployment', icon: '🚀' },
      { value: 'argo-rollout', label: 'Argo Rollout', icon: '🌀' },
      { value: 'statefulset', label: 'StatefulSet', icon: '💾' },
      { value: 'daemonset', label: 'DaemonSet', icon: '👥' },
      { value: 'job', label: 'Job', icon: '⚡' },
      { value: 'cronjob', label: 'CronJob', icon: '⏰' },
    ];
  }

  // 获取工作负载状态颜色
  static getStatusColor(workload: WorkloadInfo): string {
    const { type, status, replicas, readyReplicas } = workload;
    
    if (type === 'job' || type === 'cronjob') {
      return status === 'Completed' ? 'success' : 'processing';
    }
    
    // 如果有副本数信息，使用副本数判断
    if (typeof replicas === 'number' && typeof readyReplicas === 'number') {
      if (readyReplicas === 0) return 'error';
      if (readyReplicas < replicas) return 'warning';
      return 'success';
    }
    
    // 根据状态字段判断
    if (status === 'Ready') return 'success';
    if (status === 'NotReady') return 'error';
    return 'processing';
  }

  // 格式化工作负载状态
  static formatStatus(workload: WorkloadInfo): { status: string; color: string } {
    const { type, status, replicas, readyReplicas } = workload;
    const color = this.getStatusColor(workload);
    
    let statusText = status || '未知';
    
    if (type === 'job') {
      statusText = status === 'Completed' ? '已完成' : '运行中';
    } else if (type === 'cronjob') {
      statusText = '已调度';
    } else if (typeof replicas === 'number' && typeof readyReplicas === 'number') {
      statusText = `${readyReplicas}/${replicas}`;
    }
    
    return { status: statusText, color };
  }

  /** genAI_main_start */
  // 表单数据转YAML
  static formDataToYAML(
    workloadType: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Rollout' | 'Job' | 'CronJob',
    formData: any
  ): string {
    // 解析labels和annotations
    const parseKeyValue = (str: string): Record<string, string> => {
      if (!str) return {};
      const result: Record<string, string> = {};
      str.split(',').forEach((item) => {
        const [key, value] = item.split('=');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      });
      return result;
    };

    const labels = typeof formData.labels === 'string' 
      ? parseKeyValue(formData.labels) 
      : formData.labels || {};
    const annotations = typeof formData.annotations === 'string'
      ? parseKeyValue(formData.annotations)
      : formData.annotations || {};

    // 基础metadata
    const metadata = {
      name: formData.name,
      namespace: formData.namespace || 'default',
      labels: Object.keys(labels).length > 0 ? labels : { app: formData.name },
      ...(Object.keys(annotations).length > 0 && { annotations }),
    };

    // 容器定义
    const container = {
      name: formData.containerName || 'main',
      image: formData.image,
      ...(formData.containerPort && {
        ports: [{ containerPort: formData.containerPort }],
      }),
      ...(formData.env && formData.env.length > 0 && {
        env: formData.env.map((e: any) => ({ name: e.name, value: e.value })),
      }),
      ...(formData.resources && {
        resources: {
          ...(formData.resources.requests && { requests: formData.resources.requests }),
          ...(formData.resources.limits && { limits: formData.resources.limits }),
        },
      }),
    };

    // PodSpec
    const podSpec = {
      containers: [container],
    };

    let yaml = '';

    switch (workloadType) {
      case 'Deployment':
        yaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${metadata.name}
  namespace: ${metadata.namespace}
  labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `    ${k}: ${v}`)
  .join('\n')}
${metadata.annotations ? `  annotations:\n${Object.entries(metadata.annotations).map(([k, v]) => `    ${k}: ${v}`).join('\n')}` : ''}
spec:
  replicas: ${formData.replicas || 1}
  selector:
    matchLabels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `      ${k}: ${v}`)
  .join('\n')}
  template:
    metadata:
      labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `        ${k}: ${v}`)
  .join('\n')}
    spec:
      containers:
      - name: ${container.name}
        image: ${container.image}
${container.ports ? `        ports:\n${container.ports.map((p: any) => `        - containerPort: ${p.containerPort}`).join('\n')}` : ''}
${container.env ? `        env:\n${container.env.map((e: any) => `        - name: ${e.name}\n          value: "${e.value}"`).join('\n')}` : ''}
${container.resources ? `        resources:\n${container.resources.requests ? `          requests:\n            cpu: ${container.resources.requests.cpu}\n            memory: ${container.resources.requests.memory}` : ''}${container.resources.limits ? `\n          limits:\n            cpu: ${container.resources.limits.cpu}\n            memory: ${container.resources.limits.memory}` : ''}` : ''}`;
        break;

      case 'StatefulSet':
        yaml = `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${metadata.name}
  namespace: ${metadata.namespace}
  labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `    ${k}: ${v}`)
  .join('\n')}
spec:
  serviceName: ${formData.serviceName || metadata.name}
  replicas: ${formData.replicas || 1}
  selector:
    matchLabels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `      ${k}: ${v}`)
  .join('\n')}
  template:
    metadata:
      labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `        ${k}: ${v}`)
  .join('\n')}
    spec:
      containers:
      - name: ${container.name}
        image: ${container.image}
${container.ports ? `        ports:\n${container.ports.map((p: any) => `        - containerPort: ${p.containerPort}`).join('\n')}` : ''}
${container.env ? `        env:\n${container.env.map((e: any) => `        - name: ${e.name}\n          value: "${e.value}"`).join('\n')}` : ''}
${container.resources ? `        resources:\n${container.resources.requests ? `          requests:\n            cpu: ${container.resources.requests.cpu}\n            memory: ${container.resources.requests.memory}` : ''}${container.resources.limits ? `\n          limits:\n            cpu: ${container.resources.limits.cpu}\n            memory: ${container.resources.limits.memory}` : ''}` : ''}`;
        break;

      case 'DaemonSet':
        yaml = `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ${metadata.name}
  namespace: ${metadata.namespace}
  labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `    ${k}: ${v}`)
  .join('\n')}
spec:
  selector:
    matchLabels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `      ${k}: ${v}`)
  .join('\n')}
  template:
    metadata:
      labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `        ${k}: ${v}`)
  .join('\n')}
    spec:
      containers:
      - name: ${container.name}
        image: ${container.image}
${container.ports ? `        ports:\n${container.ports.map((p: any) => `        - containerPort: ${p.containerPort}`).join('\n')}` : ''}
${container.env ? `        env:\n${container.env.map((e: any) => `        - name: ${e.name}\n          value: "${e.value}"`).join('\n')}` : ''}
${container.resources ? `        resources:\n${container.resources.requests ? `          requests:\n            cpu: ${container.resources.requests.cpu}\n            memory: ${container.resources.requests.memory}` : ''}${container.resources.limits ? `\n          limits:\n            cpu: ${container.resources.limits.cpu}\n            memory: ${container.resources.limits.memory}` : ''}` : ''}`;
        break;

      case 'Rollout':
        yaml = `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: ${metadata.name}
  namespace: ${metadata.namespace}
  labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `    ${k}: ${v}`)
  .join('\n')}
spec:
  replicas: ${formData.replicas || 1}
  selector:
    matchLabels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `      ${k}: ${v}`)
  .join('\n')}
  template:
    metadata:
      labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `        ${k}: ${v}`)
  .join('\n')}
    spec:
      containers:
      - name: ${container.name}
        image: ${container.image}
${container.ports ? `        ports:\n${container.ports.map((p: any) => `        - containerPort: ${p.containerPort}`).join('\n')}` : ''}
${container.env ? `        env:\n${container.env.map((e: any) => `        - name: ${e.name}\n          value: "${e.value}"`).join('\n')}` : ''}
${container.resources ? `        resources:\n${container.resources.requests ? `          requests:\n            cpu: ${container.resources.requests.cpu}\n            memory: ${container.resources.requests.memory}` : ''}${container.resources.limits ? `\n          limits:\n            cpu: ${container.resources.limits.cpu}\n            memory: ${container.resources.limits.memory}` : ''}` : ''}
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 10s}
      - setWeight: 50
      - pause: {duration: 10s}`;
        break;

      case 'Job':
        yaml = `apiVersion: batch/v1
kind: Job
metadata:
  name: ${metadata.name}
  namespace: ${metadata.namespace}
  labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `    ${k}: ${v}`)
  .join('\n')}
spec:
${formData.completions ? `  completions: ${formData.completions}` : ''}
${formData.parallelism ? `  parallelism: ${formData.parallelism}` : ''}
${formData.backoffLimit !== undefined ? `  backoffLimit: ${formData.backoffLimit}` : ''}
  template:
    metadata:
      labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `        ${k}: ${v}`)
  .join('\n')}
    spec:
      containers:
      - name: ${container.name}
        image: ${container.image}
${container.env ? `        env:\n${container.env.map((e: any) => `        - name: ${e.name}\n          value: "${e.value}"`).join('\n')}` : ''}
${container.resources ? `        resources:\n${container.resources.requests ? `          requests:\n            cpu: ${container.resources.requests.cpu}\n            memory: ${container.resources.requests.memory}` : ''}${container.resources.limits ? `\n          limits:\n            cpu: ${container.resources.limits.cpu}\n            memory: ${container.resources.limits.memory}` : ''}` : ''}
      restartPolicy: Never`;
        break;

      case 'CronJob':
        yaml = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: ${metadata.name}
  namespace: ${metadata.namespace}
  labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `    ${k}: ${v}`)
  .join('\n')}
spec:
  schedule: "${formData.schedule || '0 0 * * *'}"
${formData.suspend !== undefined ? `  suspend: ${formData.suspend}` : ''}
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
${Object.entries(metadata.labels)
  .map(([k, v]) => `            ${k}: ${v}`)
  .join('\n')}
        spec:
          containers:
          - name: ${container.name}
            image: ${container.image}
${container.env ? `            env:\n${container.env.map((e: any) => `            - name: ${e.name}\n              value: "${e.value}"`).join('\n')}` : ''}
${container.resources ? `            resources:\n${container.resources.requests ? `              requests:\n                cpu: ${container.resources.requests.cpu}\n                memory: ${container.resources.requests.memory}` : ''}${container.resources.limits ? `\n              limits:\n                cpu: ${container.resources.limits.cpu}\n                memory: ${container.resources.limits.memory}` : ''}` : ''}
          restartPolicy: OnFailure`;
        break;

      default:
        throw new Error(`不支持的工作负载类型: ${workloadType}`);
    }

    return yaml;
  }
  
  /** genAI_main_start */
  // 获取Deployment关联的Pods
  static async getWorkloadPods(
    clusterId: string,
    namespace: string,
    workloadType: string,
    workloadName: string
  ): Promise<any> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${workloadName}/pods`;
        break;
      /** genAI_main_start */
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${workloadName}/pods`;
        break;
      /** genAI_main_end */
      default:
        endpoint += `workloads/${workloadType}/${namespace}/${workloadName}/pods`;
    }
    return request.get(endpoint);
  }

  // 获取Deployment关联的Services
  static async getWorkloadServices(
    clusterId: string,
    namespace: string,
    workloadType: string,
    workloadName: string
  ): Promise<any> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${workloadName}/services`;
        break;
      /** genAI_main_start */
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${workloadName}/services`;
        break;
      /** genAI_main_end */
      default:
        endpoint += `workloads/${workloadType}/${namespace}/${workloadName}/services`;
    }
    return request.get(endpoint);
  }

  // 获取Deployment关联的Ingresses
  static async getWorkloadIngresses(
    clusterId: string,
    namespace: string,
    workloadType: string,
    workloadName: string
  ): Promise<any> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${workloadName}/ingresses`;
        break;
      /** genAI_main_start */
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${workloadName}/ingresses`;
        break;
      /** genAI_main_end */
      default:
        endpoint += `workloads/${workloadType}/${namespace}/${workloadName}/ingresses`;
    }
    return request.get(endpoint);
  }

  // 获取Deployment的HPA
  static async getWorkloadHPA(
    clusterId: string,
    namespace: string,
    workloadType: string,
    workloadName: string
  ): Promise<any> {
    /** genAI_main_start */
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${workloadName}/hpa`;
        break;
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${workloadName}/hpa`;
        break;
      default:
        endpoint += `workloads/${workloadType}/${namespace}/${workloadName}/hpa`;
    }
    return request.get(endpoint);
    /** genAI_main_end */
  }

  // 获取Deployment的ReplicaSets
  static async getWorkloadReplicaSets(
    clusterId: string,
    namespace: string,
    workloadType: string,
    workloadName: string
  ): Promise<any> {
    /** genAI_main_start */
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${workloadName}/replicasets`;
        break;
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${workloadName}/replicasets`;
        break;
      default:
        endpoint += `workloads/${workloadType}/${namespace}/${workloadName}/replicasets`;
    }
    return request.get(endpoint);
    /** genAI_main_end */
  }

  // 获取Deployment的Events
  static async getWorkloadEvents(
    clusterId: string,
    namespace: string,
    workloadType: string,
    workloadName: string
  ): Promise<any> {
    let endpoint = `/clusters/${clusterId}/`;
    switch (workloadType) {
      case 'Deployment':
        endpoint += `deployments/${namespace}/${workloadName}/events`;
        break;
      /** genAI_main_start */
      case 'Rollout':
        endpoint += `rollouts/${namespace}/${workloadName}/events`;
        break;
      /** genAI_main_end */
      default:
        endpoint += `workloads/${workloadType}/${namespace}/${workloadName}/events`;
    }
    return request.get(endpoint);
  }
  /** genAI_main_end */
  /** genAI_main_end */
}