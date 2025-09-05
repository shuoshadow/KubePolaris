package handlers

import (
	"context"
	"fmt"

	"kubepolaris/internal/services"

	rollouts "github.com/argoproj/argo-rollouts/pkg/apis/rollouts/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	batchv1beta1 "k8s.io/api/batch/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
)

// getDeployments 获取Deployment列表
func (h *WorkloadHandler) getDeployments(ctx context.Context, k8sClient *services.K8sClient, namespace string) ([]WorkloadInfo, error) {
	var listOptions metav1.ListOptions
	if namespace != "" {
		// 如果指定了命名空间，则在该命名空间中查询
	}

	var deployments *appsv1.DeploymentList
	var err error

	if namespace == "" {
		deployments, err = k8sClient.GetClientset().AppsV1().Deployments("").List(ctx, listOptions)
	} else {
		deployments, err = k8sClient.GetClientset().AppsV1().Deployments(namespace).List(ctx, listOptions)
	}

	if err != nil {
		return nil, err
	}

	var workloads []WorkloadInfo
	for _, deployment := range deployments.Items {
		workloads = append(workloads, h.convertDeploymentToWorkloadInfo(&deployment))
	}

	return workloads, nil
}

// getStatefulSets 获取StatefulSet列表
func (h *WorkloadHandler) getStatefulSets(ctx context.Context, k8sClient *services.K8sClient, namespace string) ([]WorkloadInfo, error) {
	var listOptions metav1.ListOptions

	var statefulSets *appsv1.StatefulSetList
	var err error

	if namespace == "" {
		statefulSets, err = k8sClient.GetClientset().AppsV1().StatefulSets("").List(ctx, listOptions)
	} else {
		statefulSets, err = k8sClient.GetClientset().AppsV1().StatefulSets(namespace).List(ctx, listOptions)
	}

	if err != nil {
		return nil, err
	}

	var workloads []WorkloadInfo
	for _, statefulSet := range statefulSets.Items {
		workloads = append(workloads, h.convertStatefulSetToWorkloadInfo(&statefulSet))
	}

	return workloads, nil
}

// getDaemonSets 获取DaemonSet列表
func (h *WorkloadHandler) getDaemonSets(ctx context.Context, k8sClient *services.K8sClient, namespace string) ([]WorkloadInfo, error) {
	var listOptions metav1.ListOptions

	var daemonSets *appsv1.DaemonSetList
	var err error

	if namespace == "" {
		daemonSets, err = k8sClient.GetClientset().AppsV1().DaemonSets("").List(ctx, listOptions)
	} else {
		daemonSets, err = k8sClient.GetClientset().AppsV1().DaemonSets(namespace).List(ctx, listOptions)
	}

	if err != nil {
		return nil, err
	}

	var workloads []WorkloadInfo
	for _, daemonSet := range daemonSets.Items {
		workloads = append(workloads, h.convertDaemonSetToWorkloadInfo(&daemonSet))
	}

	return workloads, nil
}

// getJobs 获取Job列表
func (h *WorkloadHandler) getJobs(ctx context.Context, k8sClient *services.K8sClient, namespace string) ([]WorkloadInfo, error) {
	var listOptions metav1.ListOptions

	var jobs *batchv1.JobList
	var err error

	if namespace == "" {
		jobs, err = k8sClient.GetClientset().BatchV1().Jobs("").List(ctx, listOptions)
	} else {
		jobs, err = k8sClient.GetClientset().BatchV1().Jobs(namespace).List(ctx, listOptions)
	}

	if err != nil {
		return nil, err
	}

	var workloads []WorkloadInfo
	for _, job := range jobs.Items {
		workloads = append(workloads, h.convertJobToWorkloadInfo(&job))
	}

	return workloads, nil
}

// convertDeploymentToWorkloadInfo 转换Deployment为WorkloadInfo
func (h *WorkloadHandler) convertDeploymentToWorkloadInfo(deployment *appsv1.Deployment) WorkloadInfo {
	status := "Unknown"
	if deployment.Status.ReadyReplicas == *deployment.Spec.Replicas {
		status = "Ready"
	} else if deployment.Status.ReadyReplicas > 0 {
		status = "Partial"
	} else {
		status = "NotReady"
	}

	images := []string{}
	for _, container := range deployment.Spec.Template.Spec.Containers {
		images = append(images, container.Image)
	}

	strategy := string(deployment.Spec.Strategy.Type)

	return WorkloadInfo{
		ID:                fmt.Sprintf("%s-%s", deployment.Namespace, deployment.Name),
		Name:              deployment.Name,
		Namespace:         deployment.Namespace,
		Type:              WorkloadTypeDeployment,
		Status:            status,
		Replicas:          *deployment.Spec.Replicas,
		ReadyReplicas:     deployment.Status.ReadyReplicas,
		AvailableReplicas: deployment.Status.AvailableReplicas,
		Labels:            deployment.Labels,
		Annotations:       deployment.Annotations,
		CreatedAt:         deployment.CreationTimestamp.Time,
		Images:            images,
		Selector:          deployment.Spec.Selector.MatchLabels,
		Strategy:          strategy,
	}
}

// convertRolloutToWorkloadInfo 转换Rollout为WorkloadInfo
func (h *WorkloadHandler) convertRolloutToWorkloadInfo(rollout *rollouts.Rollout) WorkloadInfo {
	status := "Unknown"
	if rollout.Status.AvailableReplicas == *rollout.Spec.Replicas {
		status = "Ready"
	} else if rollout.Status.AvailableReplicas > 0 {
		status = "Partial"
	} else {
		status = "NotReady"
	}

	images := []string{}
	for _, container := range rollout.Spec.Template.Spec.Containers {
		images = append(images, container.Image)
	}

	strategy := "Unknown"
	if rollout.Spec.Strategy.Canary != nil {
		strategy = "Canary"
	} else if rollout.Spec.Strategy.BlueGreen != nil {
		strategy = "BlueGreen"
	}

	return WorkloadInfo{
		ID:                fmt.Sprintf("%s-%s", rollout.Namespace, rollout.Name),
		Name:              rollout.Name,
		Namespace:         rollout.Namespace,
		Type:              WorkloadTypeRollout,
		Status:            status, // Rollout没有Status字段
		Replicas:          *rollout.Spec.Replicas,
		ReadyReplicas:     rollout.Status.AvailableReplicas,
		AvailableReplicas: rollout.Status.AvailableReplicas,
		Labels:            rollout.Labels,
		Annotations:       rollout.Annotations,
		CreatedAt:         rollout.CreationTimestamp.Time,
		Images:            images,
		Selector:          rollout.Spec.Selector.MatchLabels,
		Strategy:          strategy,
	}
}

// convertStatefulSetToWorkloadInfo 转换StatefulSet为WorkloadInfo
func (h *WorkloadHandler) convertStatefulSetToWorkloadInfo(statefulSet *appsv1.StatefulSet) WorkloadInfo {
	status := "Unknown"
	if statefulSet.Status.ReadyReplicas == *statefulSet.Spec.Replicas {
		status = "Ready"
	} else if statefulSet.Status.ReadyReplicas > 0 {
		status = "Partial"
	} else {
		status = "NotReady"
	}

	images := []string{}
	for _, container := range statefulSet.Spec.Template.Spec.Containers {
		images = append(images, container.Image)
	}

	strategy := string(statefulSet.Spec.UpdateStrategy.Type)

	return WorkloadInfo{
		ID:                fmt.Sprintf("%s-%s", statefulSet.Namespace, statefulSet.Name),
		Name:              statefulSet.Name,
		Namespace:         statefulSet.Namespace,
		Type:              WorkloadTypeStatefulSet,
		Status:            status,
		Replicas:          *statefulSet.Spec.Replicas,
		ReadyReplicas:     statefulSet.Status.ReadyReplicas,
		AvailableReplicas: statefulSet.Status.ReadyReplicas, // StatefulSet没有AvailableReplicas字段
		Labels:            statefulSet.Labels,
		Annotations:       statefulSet.Annotations,
		CreatedAt:         statefulSet.CreationTimestamp.Time,
		Images:            images,
		Selector:          statefulSet.Spec.Selector.MatchLabels,
		Strategy:          strategy,
	}
}

// convertDaemonSetToWorkloadInfo 转换DaemonSet为WorkloadInfo
func (h *WorkloadHandler) convertDaemonSetToWorkloadInfo(daemonSet *appsv1.DaemonSet) WorkloadInfo {
	status := "Unknown"
	if daemonSet.Status.NumberReady == daemonSet.Status.DesiredNumberScheduled {
		status = "Ready"
	} else if daemonSet.Status.NumberReady > 0 {
		status = "Partial"
	} else {
		status = "NotReady"
	}

	images := []string{}
	for _, container := range daemonSet.Spec.Template.Spec.Containers {
		images = append(images, container.Image)
	}

	strategy := string(daemonSet.Spec.UpdateStrategy.Type)

	return WorkloadInfo{
		ID:                fmt.Sprintf("%s-%s", daemonSet.Namespace, daemonSet.Name),
		Name:              daemonSet.Name,
		Namespace:         daemonSet.Namespace,
		Type:              WorkloadTypeDaemonSet,
		Status:            status,
		Replicas:          daemonSet.Status.DesiredNumberScheduled,
		ReadyReplicas:     daemonSet.Status.NumberReady,
		AvailableReplicas: daemonSet.Status.NumberAvailable,
		Labels:            daemonSet.Labels,
		Annotations:       daemonSet.Annotations,
		CreatedAt:         daemonSet.CreationTimestamp.Time,
		Images:            images,
		Selector:          daemonSet.Spec.Selector.MatchLabels,
		Strategy:          strategy,
	}
}

// convertJobToWorkloadInfo 转换Job为WorkloadInfo
func (h *WorkloadHandler) convertJobToWorkloadInfo(job *batchv1.Job) WorkloadInfo {
	status := "Unknown"
	if job.Status.Succeeded > 0 {
		status = "Succeeded"
	} else if job.Status.Failed > 0 {
		status = "Failed"
	} else if job.Status.Active > 0 {
		status = "Running"
	} else {
		status = "Pending"
	}

	images := []string{}
	for _, container := range job.Spec.Template.Spec.Containers {
		images = append(images, container.Image)
	}

	replicas := int32(1)
	if job.Spec.Parallelism != nil {
		replicas = *job.Spec.Parallelism
	}

	return WorkloadInfo{
		ID:                fmt.Sprintf("%s-%s", job.Namespace, job.Name),
		Name:              job.Name,
		Namespace:         job.Namespace,
		Type:              WorkloadTypeJob,
		Status:            status,
		Replicas:          replicas,
		ReadyReplicas:     job.Status.Succeeded,
		AvailableReplicas: job.Status.Succeeded,
		Labels:            job.Labels,
		Annotations:       job.Annotations,
		CreatedAt:         job.CreationTimestamp.Time,
		Images:            images,
		Selector:          job.Spec.Selector.MatchLabels,
	}
}

// convertCronJobToWorkloadInfo 转换CronJob为WorkloadInfo
func (h *WorkloadHandler) convertCronJobToWorkloadInfo(cronJob *batchv1beta1.CronJob) WorkloadInfo {
	status := "Active"
	if cronJob.Spec.Suspend != nil && *cronJob.Spec.Suspend {
		status = "Suspended"
	}

	images := []string{}
	for _, container := range cronJob.Spec.JobTemplate.Spec.Template.Spec.Containers {
		images = append(images, container.Image)
	}

	activeJobs := int32(len(cronJob.Status.Active))
	selector := map[string]string{}
	if cronJob.Spec.JobTemplate.Spec.Selector != nil {
		selector = cronJob.Spec.JobTemplate.Spec.Selector.MatchLabels
	}

	return WorkloadInfo{
		ID:                fmt.Sprintf("%s-%s", cronJob.Namespace, cronJob.Name),
		Name:              cronJob.Name,
		Namespace:         cronJob.Namespace,
		Type:              WorkloadTypeCronJob,
		Status:            status,
		Replicas:          1, // CronJob没有副本概念
		ReadyReplicas:     activeJobs,
		AvailableReplicas: activeJobs,
		Labels:            cronJob.Labels,
		Annotations:       cronJob.Annotations,
		CreatedAt:         cronJob.CreationTimestamp.Time,
		Images:            images,
		Selector:          selector,
		Schedule:          cronJob.Spec.Schedule,
	}
}

// getWorkloadPods 获取工作负载关联的Pod
func (h *WorkloadHandler) getWorkloadPods(ctx context.Context, k8sClient *services.K8sClient, namespace string, selector map[string]string) ([]interface{}, error) {
	if len(selector) == 0 {
		return []interface{}{}, nil
	}

	labelSelector := labels.SelectorFromSet(selector)
	listOptions := metav1.ListOptions{
		LabelSelector: labelSelector.String(),
	}

	pods, err := k8sClient.GetClientset().CoreV1().Pods(namespace).List(ctx, listOptions)
	if err != nil {
		return nil, err
	}

	var result []interface{}
	for _, pod := range pods.Items {
		podInfo := map[string]interface{}{
			"name":      pod.Name,
			"namespace": pod.Namespace,
			"status":    string(pod.Status.Phase),
			"nodeName":  pod.Spec.NodeName,
			"createdAt": pod.CreationTimestamp.Time,
			"labels":    pod.Labels,
		}

		// 获取容器状态
		containers := []map[string]interface{}{}
		for _, container := range pod.Status.ContainerStatuses {
			containerInfo := map[string]interface{}{
				"name":         container.Name,
				"image":        container.Image,
				"ready":        container.Ready,
				"restartCount": container.RestartCount,
			}
			containers = append(containers, containerInfo)
		}
		podInfo["containers"] = containers

		result = append(result, podInfo)
	}

	return result, nil
}

// scaleDeployment 扩缩容Deployment
func (h *WorkloadHandler) scaleDeployment(ctx context.Context, k8sClient *services.K8sClient, namespace, name string, replicas int32) error {
	deployment, err := k8sClient.GetClientset().AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return err
	}

	deployment.Spec.Replicas = &replicas
	_, err = k8sClient.GetClientset().AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	return err
}

// scaleStatefulSet 扩缩容StatefulSet
func (h *WorkloadHandler) scaleStatefulSet(ctx context.Context, k8sClient *services.K8sClient, namespace, name string, replicas int32) error {
	statefulSet, err := k8sClient.GetClientset().AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return err
	}

	statefulSet.Spec.Replicas = &replicas
	_, err = k8sClient.GetClientset().AppsV1().StatefulSets(namespace).Update(ctx, statefulSet, metav1.UpdateOptions{})
	return err
}
