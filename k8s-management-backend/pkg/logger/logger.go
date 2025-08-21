package logger

import (
	"fmt"
	"log"
	"os"
	"strings"

	"k8s.io/klog/v2"
)

// LogLevel 日志级别
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

var currentLevel LogLevel = INFO

// Init 初始化日志系统
func Init(level string) {
	// 设置日志级别
	switch strings.ToLower(level) {
	case "debug":
		currentLevel = DEBUG
	case "info":
		currentLevel = INFO
	case "warn":
		currentLevel = WARN
	case "error":
		currentLevel = ERROR
	default:
		currentLevel = INFO
	}

	// 配置 klog
	klog.InitFlags(nil)
	klog.SetOutput(os.Stdout)
	
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	
	Info("日志系统初始化完成，级别: %s", level)
}

// Debug 调试日志
func Debug(format string, args ...interface{}) {
	if currentLevel <= DEBUG {
		message := fmt.Sprintf("[DEBUG] "+format, args...)
		log.Output(2, message)
		klog.V(4).Info(message)
	}
}

// Info 信息日志
func Info(format string, args ...interface{}) {
	if currentLevel <= INFO {
		message := fmt.Sprintf("[INFO] "+format, args...)
		log.Output(2, message)
		klog.Info(message)
	}
}

// Warn 警告日志
func Warn(format string, args ...interface{}) {
	if currentLevel <= WARN {
		message := fmt.Sprintf("[WARN] "+format, args...)
		log.Output(2, message)
		klog.Warning(message)
	}
}

// Error 错误日志
func Error(format string, args ...interface{}) {
	if currentLevel <= ERROR {
		message := fmt.Sprintf("[ERROR] "+format, args...)
		log.Output(2, message)
		klog.Error(message)
	}
}

// Fatal 致命错误日志
func Fatal(format string, args ...interface{}) {
	message := fmt.Sprintf("[FATAL] "+format, args...)
	log.Output(2, message)
	klog.Fatal(message)
}