package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"kubepolaris/internal/models"
	"kubepolaris/internal/services"
	"kubepolaris/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// PodTerminalHandler Pod终端WebSocket处理器
type PodTerminalHandler struct {
	clusterService *services.ClusterService
	upgrader       websocket.Upgrader
	sessions       map[string]*PodTerminalSession
	sessionsMutex  sync.RWMutex
}

// PodTerminalSession Pod终端会话
type PodTerminalSession struct {
	ID        string
	ClusterID string
	Namespace string
	PodName   string
	Container string
	Conn      *websocket.Conn
	Cmd       *exec.Cmd
	StdinPipe io.WriteCloser
	Context   context.Context
	Cancel    context.CancelFunc
	Mutex     sync.Mutex
}

// PodTerminalMessage Pod终端消息
type PodTerminalMessage struct {
	Type string `json:"type"`
	Data string `json:"data"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
}

// NewPodTerminalHandler 创建Pod终端处理器
func NewPodTerminalHandler(clusterService *services.ClusterService) *PodTerminalHandler {
	return &PodTerminalHandler{
		clusterService: clusterService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 在生产环境中应该检查Origin
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
		sessions:      make(map[string]*PodTerminalSession),
		sessionsMutex: sync.RWMutex{},
	}
}

// HandlePodTerminal 处理Pod终端WebSocket连接
func (h *PodTerminalHandler) HandlePodTerminal(c *gin.Context) {
	clusterID := c.Param("clusterID")
	namespace := c.Param("namespace")
	podName := c.Param("name")
	container := c.DefaultQuery("container", "")

	// 获取集群信息
	cluster, err := h.clusterService.GetCluster(uint(mustParseUint(clusterID)))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "集群不存在"})
		return
	}

	// 升级到WebSocket连接
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("升级WebSocket连接失败", "error", err)
		return
	}
	defer conn.Close()

	// 创建会话
	sessionID := fmt.Sprintf("%s-%s-%s-%d", clusterID, namespace, podName, time.Now().Unix())
	ctx, cancel := context.WithCancel(context.Background())

	session := &PodTerminalSession{
		ID:        sessionID,
		ClusterID: clusterID,
		Namespace: namespace,
		PodName:   podName,
		Container: container,
		Conn:      conn,
		Context:   ctx,
		Cancel:    cancel,
	}

	// 注册会话
	h.sessionsMutex.Lock()
	h.sessions[sessionID] = session
	h.sessionsMutex.Unlock()

	// 清理会话
	defer func() {
		h.sessionsMutex.Lock()
		delete(h.sessions, sessionID)
		h.sessionsMutex.Unlock()
		cancel()
		if session.Cmd != nil && session.Cmd.Process != nil {
			session.Cmd.Process.Kill()
		}
		if session.StdinPipe != nil {
			session.StdinPipe.Close()
		}
	}()

	// 创建临时kubeconfig文件
	kubeconfigPath, err := h.createTempKubeconfig(cluster)
	if err != nil {
		h.sendMessage(conn, "error", fmt.Sprintf("创建kubeconfig失败: %v", err))
		return
	}
	defer os.Remove(kubeconfigPath)

	// 启动Pod终端连接
	if err := h.startPodTerminal(session, kubeconfigPath); err != nil {
		h.sendMessage(conn, "error", fmt.Sprintf("启动Pod终端失败: %v", err))
		return
	}

	// 发送连接成功消息
	h.sendMessage(conn, "connected", fmt.Sprintf("Connected to pod %s/%s", namespace, podName))

	// 处理WebSocket消息
	for {
		var msg PodTerminalMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			logger.Error("读取WebSocket消息失败", "error", err)
			break
		}

		switch msg.Type {
		case "input":
			h.handleInput(session, msg.Data)
		case "resize":
			h.handleResize(session, msg.Cols, msg.Rows)
		}
	}
}

// startPodTerminal 启动Pod终端连接
func (h *PodTerminalHandler) startPodTerminal(session *PodTerminalSession, kubeconfigPath string) error {
	// 构建kubectl exec命令
	args := []string{
		"--kubeconfig", kubeconfigPath,
		"exec", "-it",
		"-n", session.Namespace,
	}

	// 如果指定了容器，添加容器参数
	if session.Container != "" {
		args = append(args, "-c", session.Container)
	}

	// 添加Pod名称和shell命令
	args = append(args, session.PodName, "--", "/bin/bash")

	// 如果bash不存在，尝试sh
	cmd := exec.CommandContext(session.Context, "kubectl", args...)

	// 设置环境变量
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("KUBECONFIG=%s", kubeconfigPath),
		"TERM=xterm-256color",
	)

	// 创建管道
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("创建stdin管道失败: %v", err)
	}
	session.StdinPipe = stdin

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("创建stdout管道失败: %v", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("创建stderr管道失败: %v", err)
	}

	// 启动命令
	if err := cmd.Start(); err != nil {
		// 如果bash失败，尝试sh
		if strings.Contains(err.Error(), "executable file not found") ||
			strings.Contains(err.Error(), "not found") {
			return h.startPodTerminalWithSh(session, kubeconfigPath)
		}
		return fmt.Errorf("启动kubectl exec失败: %v", err)
	}

	session.Cmd = cmd

	// 启动输出读取协程
	go h.readOutput(session, stdout, "stdout")
	go h.readOutput(session, stderr, "stderr")

	// 监控命令状态
	go func() {
		err := cmd.Wait()
		if err != nil && session.Context.Err() != context.Canceled {
			h.sendMessage(session.Conn, "error", fmt.Sprintf("Pod终端连接断开: %v", err))
		}
		h.sendMessage(session.Conn, "disconnected", "Pod终端连接已断开")
	}()

	return nil
}

// startPodTerminalWithSh 使用sh启动Pod终端
func (h *PodTerminalHandler) startPodTerminalWithSh(session *PodTerminalSession, kubeconfigPath string) error {
	// 构建kubectl exec命令，使用sh
	args := []string{
		"--kubeconfig", kubeconfigPath,
		"exec", "-it",
		"-n", session.Namespace,
	}

	// 如果指定了容器，添加容器参数
	if session.Container != "" {
		args = append(args, "-c", session.Container)
	}

	// 添加Pod名称和shell命令
	args = append(args, session.PodName, "--", "/bin/sh")

	cmd := exec.CommandContext(session.Context, "kubectl", args...)

	// 设置环境变量
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("KUBECONFIG=%s", kubeconfigPath),
		"TERM=xterm-256color",
	)

	// 创建管道
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("创建stdin管道失败: %v", err)
	}
	session.StdinPipe = stdin

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("创建stdout管道失败: %v", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("创建stderr管道失败: %v", err)
	}

	// 启动命令
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("启动kubectl exec (sh)失败: %v", err)
	}

	session.Cmd = cmd

	// 启动输出读取协程
	go h.readOutput(session, stdout, "stdout")
	go h.readOutput(session, stderr, "stderr")

	// 监控命令状态
	go func() {
		err := cmd.Wait()
		if err != nil && session.Context.Err() != context.Canceled {
			h.sendMessage(session.Conn, "error", fmt.Sprintf("Pod终端连接断开: %v", err))
		}
		h.sendMessage(session.Conn, "disconnected", "Pod终端连接已断开")
	}()

	return nil
}

// handleInput 处理用户输入
func (h *PodTerminalHandler) handleInput(session *PodTerminalSession, input string) {
	session.Mutex.Lock()
	defer session.Mutex.Unlock()

	if session.StdinPipe != nil {
		_, err := session.StdinPipe.Write([]byte(input))
		if err != nil {
			logger.Error("写入Pod终端输入失败", "error", err)
			h.sendMessage(session.Conn, "error", "写入输入失败")
		}
	}
}

// handleResize 处理终端大小调整
func (h *PodTerminalHandler) handleResize(session *PodTerminalSession, cols, rows int) {
	// kubectl exec 不直接支持动态调整终端大小
	// 这里可以记录日志或者尝试其他方法
	logger.Info("Pod终端大小调整请求", "cols", cols, "rows", rows)
}

// readOutput 读取命令输出
func (h *PodTerminalHandler) readOutput(session *PodTerminalSession, reader io.Reader, outputType string) {
	buffer := make([]byte, 1024)
	for {
		n, err := reader.Read(buffer)
		if err != nil {
			if err != io.EOF {
				logger.Error("读取Pod终端输出失败", "type", outputType, "error", err)
			}
			break
		}

		if n > 0 {
			var msgType string
			if outputType == "stderr" {
				msgType = "error"
			} else {
				msgType = "data"
			}

			h.sendMessage(session.Conn, msgType, string(buffer[:n]))
		}
	}
}

// createTempKubeconfig 创建临时kubeconfig文件
func (h *PodTerminalHandler) createTempKubeconfig(cluster *models.Cluster) (string, error) {
	// 创建临时文件
	tmpFile, err := os.CreateTemp("", "kubeconfig-*.yaml")
	if err != nil {
		return "", fmt.Errorf("创建临时文件失败: %v", err)
	}
	defer tmpFile.Close()

	// 写入kubeconfig内容
	var kubeconfigContent string
	if cluster.KubeconfigEnc != "" {
		kubeconfigContent = cluster.KubeconfigEnc
	} else if cluster.SATokenEnc != "" {
		// 从Token创建kubeconfig
		kubeconfigContent = services.CreateKubeconfigFromToken(
			cluster.Name,
			cluster.APIServer,
			cluster.SATokenEnc,
			cluster.CAEnc,
		)
	} else {
		return "", fmt.Errorf("集群缺少认证信息")
	}

	_, err = tmpFile.WriteString(kubeconfigContent)
	if err != nil {
		return "", fmt.Errorf("写入kubeconfig失败: %v", err)
	}

	return tmpFile.Name(), nil
}

// sendMessage 发送WebSocket消息
func (h *PodTerminalHandler) sendMessage(conn *websocket.Conn, msgType, data string) {
	msg := PodTerminalMessage{
		Type: msgType,
		Data: data,
	}

	if err := conn.WriteJSON(msg); err != nil {
		logger.Error("发送WebSocket消息失败", "error", err)
	}
}
