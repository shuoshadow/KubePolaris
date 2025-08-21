import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Select, Space, message, Alert, Input, Tooltip } from 'antd';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import 'xterm/css/xterm.css';
import {
  PlayCircleOutlined,
  StopOutlined,
  ClearOutlined,
  FullscreenOutlined,
  SendOutlined,
  CopyOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';

const { Option } = Select;

interface KubectlTerminalProps {
  clusterId: string;
  namespace?: string;
}

const KubectlTerminal: React.FC<KubectlTerminalProps> = ({
  clusterId,
  namespace = 'default',
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const websocket = useRef<WebSocket | null>(null);
  
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState(namespace);
  const [command, setCommand] = useState('');
  const [namespaces, setNamespaces] = useState<string[]>(['default', 'kube-system']);
  
  // 使用 ref 来保存连接状态，避免闭包问题
  const connectedRef = useRef(false);
  const currentLineRef = useRef('');

  // 初始化终端
  useEffect(() => {
    const initTerminal = () => {
      if (terminalRef.current && !terminal.current) {
        try {
          terminal.current = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            theme: {
              background: '#1e1e1e',
              foreground: '#d4d4d4',
              cursor: '#ffffff',
              selectionBackground: '#264f78',
            },
            cols: 80,
            rows: 24,
            allowTransparency: true,
            rightClickSelectsWord: true, // 右键点击选择单词
            // copyOnSelect 不是 ITerminalOptions 中的有效属性，已移除
          });

          // 添加插件
          fitAddon.current = new FitAddon();
          terminal.current.loadAddon(fitAddon.current);
          terminal.current.loadAddon(new WebLinksAddon());
          
          // 添加剪贴板支持
          const clipboardAddon = new ClipboardAddon();
          terminal.current.loadAddon(clipboardAddon);

          terminal.current.open(terminalRef.current);
          
          // 等待 DOM 完全渲染后再 fit
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (fitAddon.current && terminal.current && terminalRef.current) {
                try {
                  fitAddon.current.fit();
                } catch (e) {
                  console.warn('Fit addon error:', e);
                }
              }
            }, 300);
          });

          // 显示欢迎信息
          setTimeout(() => {
            showWelcomeMessage();
          }, 500);

          // 设置终端输入处理
          terminal.current.onData((data) => {
            handleTerminalInput(data);
          });

          // 添加键盘快捷键支持
          terminal.current.attachCustomKeyEventHandler((event) => {
            // 处理复制粘贴快捷键
            if (event.type === 'keydown') {
              // Ctrl+C 复制
              if (event.ctrlKey && event.key === 'c' && terminal.current?.hasSelection()) {
                const selection = terminal.current.getSelection();
                if (selection) {
                  navigator.clipboard.writeText(selection);
                }
                return false; // 阻止默认行为
              }
              
              // Ctrl+V 粘贴
              if (event.ctrlKey && event.key === 'v') {
                // 调用粘贴函数，避免重复实现
                pasteFromClipboard();
                return false; // 阻止默认行为
              }
            }
            return true;
          });

          // 监听窗口大小变化
          const handleResize = () => {
            if (fitAddon.current && terminal.current && terminalRef.current) {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  try {
                    fitAddon.current?.fit();
                  } catch (e) {
                    console.warn('Resize fit error:', e);
                  }
                }, 100);
              });
            }
          };
          window.addEventListener('resize', handleResize);

          return () => {
            window.removeEventListener('resize', handleResize);
            if (terminal.current) {
              terminal.current.dispose();
              terminal.current = null;
            }
          };
        } catch (error) {
          console.error('Failed to initialize terminal:', error);
        }
      }
    };

    // 延迟初始化以确保组件完全挂载
    const timer = setTimeout(initTerminal, 100);
    return () => clearTimeout(timer);
  }, []);

  // 显示欢迎信息
  const showWelcomeMessage = () => {
    if (!terminal.current) return;
    
    terminal.current.clear();
    terminal.current.writeln('Welcome to Kubectl Terminal');
    terminal.current.writeln('Execute kubectl commands');
    terminal.current.writeln('Enter kubectl commands below or use the quick command input.');
    terminal.current.writeln('');
  };

  // 连接到后端 WebSocket
  const connectWebSocket = () => {
    setConnecting(true);
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 修复 WebSocket URL，确保与后端路由匹配
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8080/api/v1/clusters/${clusterId}/kubectl-terminal`;
    const params = new URLSearchParams({
      namespace: selectedNamespace,
    });

    console.log('Connecting to WebSocket:', `${wsUrl}?${params}`);

    try {
      websocket.current = new WebSocket(`${wsUrl}?${params}`);

      websocket.current.onopen = () => {
        setConnected(true);
        connectedRef.current = true;
        setConnecting(false);
        terminal.current?.clear();
        message.success('终端连接成功');
      };

      websocket.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          // 如果不是JSON格式，直接显示
          terminal.current?.write(event.data);
        }
      };

      websocket.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        message.error('终端连接出错');
        setConnected(false);
        connectedRef.current = false;
        setConnecting(false);
      };

      websocket.current.onclose = () => {
        setConnected(false);
        connectedRef.current = false;
        setConnecting(false);
        terminal.current?.writeln('\r\n\x1b[33mConnection closed\x1b[0m\r\n');
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      message.error('无法创建终端连接');
      setConnecting(false);
    }
  };

  // 执行快速命令
  const executeQuickCommand = () => {
    if (!command.trim()) {
      message.error('请输入命令');
      return;
    }

    if (!connected) {
      message.error('请先连接终端');
      return;
    }

    // 发送命令到后端执行
    executeCommand(command);
    setCommand('');
  };

  // 终端输入处理
  const [currentLine, setCurrentLine] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleTerminalInput = (data: string) => {
    if (!terminal.current) return;
    
    // 如果未连接，只显示提示信息
    if (!connectedRef.current) {
      terminal.current.write('\r\nPlease connect first\r\n');
      return;
    }

    // 检查 WebSocket 连接状态
    if (!websocket.current || websocket.current.readyState !== WebSocket.OPEN) {
      terminal.current.write('\r\nConnection lost. Please reconnect.\r\n');
      return;
    }

    const code = data.charCodeAt(0);
    
    // 处理回车键
    if (code === 13) {
      // 先在终端显示换行
      terminal.current.write('\r\n');
      
      // 发送回车到后端
      websocket.current.send(JSON.stringify({
        type: 'command',
        data: currentLineRef.current.trim(),
      }));
      
      if (currentLineRef.current.trim()) {
        setCommandHistory(prev => [...prev, currentLineRef.current.trim()]);
        setHistoryIndex(-1);
      }
      
      currentLineRef.current = '';
      setCurrentLine('');
      return;
    }
    
    // 处理退格键
    if (code === 127) {
      if (currentLineRef.current.length > 0) {
        currentLineRef.current = currentLineRef.current.slice(0, -1);
        setCurrentLine(currentLineRef.current);
        
        // 发送退格到后端
        websocket.current.send(JSON.stringify({
          type: 'input',
          data: '\u007f',
        }));
      }
      return;
    }
    
    // 处理 Ctrl+C (中断)
    if (code === 3) {
      // 发送中断信号到后端
      if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
        websocket.current.send(JSON.stringify({
          type: 'interrupt',
          data: '',
        }));
        // 在终端显示中断符号
        terminal.current.write('^C\r\n');
        currentLineRef.current = '';
        setCurrentLine('');
      }
      return;
    }
    
    // 处理上下箭头键（命令历史）
    if (code === 27) {
      // ESC序列，可能是箭头键 - 暂时忽略
      return;
    }
    
    // 处理普通字符
    if (code >= 32 && code <= 126) {
      currentLineRef.current += data;
      setCurrentLine(currentLineRef.current);
      
      // 发送字符到后端
      websocket.current.send(JSON.stringify({
        type: 'input',
        data: data,
      }));
    }
  };

  // 处理 WebSocket 消息
  const handleWebSocketMessage = (message: any) => {
    if (!terminal.current) return;

    switch (message.type) {
      case 'output':
        // 确保正确处理换行符
        const outputText = message.data;
        if (outputText.includes('\n')) {
          // 如果包含换行符，使用 writeln 处理每一行
          const lines = outputText.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (i < lines.length - 1 || outputText.endsWith('\n')) {
              terminal.current.writeln(lines[i]);
            } else {
              terminal.current.write(lines[i]);
            }
          }
        } else {
          terminal.current.write(outputText);
        }
        break;
      case 'error':
        terminal.current.writeln(`\r\n\x1b[31m${message.data}\x1b[0m`);
        break;
      case 'command_result':
        terminal.current.write('$ ');
        break;
      case 'clear':
        terminal.current.clear();
        break;
      case 'namespace_changed':
        setSelectedNamespace(message.data);
        terminal.current.writeln(`\r\nNamespace changed to: ${message.data}\r\n`);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const executeCommand = (command: string) => {
    if (!websocket.current || websocket.current.readyState !== WebSocket.OPEN) {
      terminal.current?.writeln('\r\nConnection lost. Please reconnect.\r\n');
      return;
    }

    // 发送命令到后端
    websocket.current.send(JSON.stringify({
      type: 'command',
      data: command,
    }));
  };

  // 断开连接
  const disconnect = () => {
    if (websocket.current) {
      websocket.current.close();
    }
    setConnected(false);
    connectedRef.current = false;
    currentLineRef.current = '';
    setCurrentLine('');
    terminal.current?.clear();
    showWelcomeMessage();
  };

  // 清屏
  const clearTerminal = () => {
    terminal.current?.clear();
  };

  // 全屏切换
  const toggleFullscreen = () => {
    const terminalContainer = terminalRef.current?.parentElement;
    if (terminalContainer) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        terminalContainer.requestFullscreen();
      }
    }
  };

  // 获取命名空间数据
  const fetchNamespaces = async () => {
    setNamespaces(['default', 'kube-system', 'kube-public', 'monitoring']);
  };

  // 事件处理
  const handleNamespaceChange = (value: string) => {
    setSelectedNamespace(value);
    
    // 如果已连接，发送命名空间切换命令到后端
    if (connected && websocket.current && websocket.current.readyState === WebSocket.OPEN) {
      websocket.current.send(JSON.stringify({
        type: 'change_namespace',
        data: value
      }));
    }
  };

  useEffect(() => {
    fetchNamespaces();
  }, []);

  useEffect(() => {
    showWelcomeMessage();
  }, []);

  // 复制选中的文本
  const copySelectedText = () => {
    if (terminal.current?.hasSelection()) {
      const selection = terminal.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection)
          .then(() => {
            message.success('已复制到剪贴板');
          })
          .catch((err) => {
            console.error('复制失败:', err);
            message.error('复制失败');
          });
      }
    } else {
      message.info('请先选择要复制的文本');
    }
  };

  // 粘贴剪贴板内容
  const pasteFromClipboard = () => {
    if (!connected) {
      message.error('请先连接终端');
      return;
    }
    
    navigator.clipboard.readText()
      .then((text) => {
        if (text && websocket.current && websocket.current.readyState === WebSocket.OPEN) {
          // 发送整个文本作为一个命令，而不是逐字符发送
          websocket.current.send(JSON.stringify({
            type: 'quick_command',
            data: text
          }));
          
          // 清空当前行，因为quick_command会直接执行
          currentLineRef.current = '';
          setCurrentLine('');
        }
      })
      .catch((err) => {
        console.error('粘贴失败:', err);
        message.error('粘贴失败，请检查浏览器权限');
      });
  };

  return (
    <Card
      title="Kubectl 终端"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={connectWebSocket}
            loading={connecting}
            disabled={connected}
          >
            连接
          </Button>
          <Button
            icon={<StopOutlined />}
            onClick={disconnect}
            disabled={!connected}
          >
            断开
          </Button>
          <Button icon={<ClearOutlined />} onClick={clearTerminal}>
            清屏
          </Button>
          <Button icon={<FullscreenOutlined />} onClick={toggleFullscreen}>
            全屏
          </Button>
        </Space>
      }
    >

      {/* 连接状态提示 */}
      {connected && (
        <Alert
          message={`已连接到集群 ${clusterId} (kubectl模式)`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 终端容器 */}
      <div
        ref={terminalRef}
        style={{
          height: '400px',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          backgroundColor: '#1e1e1e',
        }}
      />

      {/* 使用说明 */}
      <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
        <p>提示：输入 <code>help</code> 或 <code>?</code> 查看帮助信息</p>
      </div>
    </Card>
  );
};

export default KubectlTerminal;