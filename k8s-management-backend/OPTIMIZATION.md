# Kubernetes 管理系统待优化事项

## 终端功能优化

### 1. 流式命令处理问题

**问题描述：**
- `kubectl logs -f` 命令无法正确显示实时输出
- `kubectl exec -it pod bash` 等交互式命令无法正常工作
- Ctrl+C 无法有效中断正在执行的命令

**原因分析：**
- 当前实现使用 `cmd.CombinedOutput()` 方法阻塞等待命令完成，不适合流式输出
- 中断处理机制不完善，无法及时传递中断信号到子进程
- 交互式命令需要双向管道支持，当前实现缺乏这一功能

**优化方向：**
- 重构命令执行逻辑，使用 `StdinPipe`, `StdoutPipe`, `StderrPipe` 创建双向通信管道
- 实现真正的 PTY (伪终端) 支持，特别是对于 `exec -it` 这样的交互式命令
- 改进中断信号处理，确保信号能够正确传递到子进程
- 考虑使用专门的终端库，如 [go-term](https://github.com/buildkite/terminal) 或 [xterm-js](https://github.com/xtermjs/xterm.js) 的服务端配套

### 2. 前端终端优化

**问题描述：**
- 粘贴功能可能导致内容重复
- 终端输入没有回显
- 特殊按键（如方向键、Tab键）支持不完善

**优化方向：**
- 改进前端终端实现，确保正确处理用户输入和命令输出
- 完善特殊按键支持
- 优化粘贴功能，避免内容重复

## 后续计划

1. 研究并实现基于 WebSocket 的真正 PTY 终端
2. 参考其他开源项目如 [ttyd](https://github.com/tsl0922/ttyd) 或 [gotty](https://github.com/yudai/gotty) 的实现
3. 考虑使用 [kubernetes/client-go](https://github.com/kubernetes/client-go) 的 `remotecommand` 包直接处理 kubectl 命令

## 参考资源

- [Kubernetes API 文档 - 容器执行](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.20/#connect-post-containerexec-v1-core)
- [client-go remotecommand 包](https://pkg.go.dev/k8s.io/client-go/tools/remotecommand)
- [xterm.js 文档](https://xtermjs.org/docs/)