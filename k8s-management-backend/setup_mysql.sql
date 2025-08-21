-- 创建数据库
CREATE DATABASE IF NOT EXISTS k8s_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（如果需要）
-- CREATE USER 'k8s_user'@'localhost' IDENTIFIED BY 'k8s_password';
-- GRANT ALL PRIVILEGES ON k8s_management.* TO 'k8s_user'@'localhost';
-- FLUSH PRIVILEGES;

-- 使用数据库
USE k8s_management;

-- 显示当前数据库
SELECT DATABASE();