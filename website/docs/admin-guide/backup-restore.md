---
sidebar_position: 4
---

# 备份恢复

本文档介绍 KubePolaris 的数据备份和恢复策略。

## 备份内容

| 数据类型 | 重要性 | 备份频率 |
|---------|--------|---------|
| 数据库 | 高 | 每日 + 增量 |
| 配置文件 | 高 | 变更时 |
| 日志文件 | 中 | 归档 |
| 静态文件 | 低 | 可从镜像恢复 |

## 数据库备份

### 手动备份

```bash
# 全量备份
mysqldump -h mysql-host -u kubepolaris -p \
  --single-transaction \
  --routines \
  --triggers \
  kubepolaris > backup_$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
mysqldump -h mysql-host -u kubepolaris -p \
  --single-transaction \
  kubepolaris | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 自动备份脚本

```bash title="/opt/kubepolaris/scripts/backup.sh"
#!/bin/bash
set -e

# 配置
BACKUP_DIR="/data/backups/mysql"
MYSQL_HOST="mysql-host"
MYSQL_USER="kubepolaris"
MYSQL_PASS="your_password"
MYSQL_DB="kubepolaris"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 生成备份文件名
BACKUP_FILE="$BACKUP_DIR/kubepolaris_$(date +%Y%m%d_%H%M%S).sql.gz"

# 执行备份
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS \
  --single-transaction \
  --routines \
  --triggers \
  $MYSQL_DB | gzip > $BACKUP_FILE

# 验证备份
if [ -s "$BACKUP_FILE" ]; then
    echo "Backup successful: $BACKUP_FILE"
    
    # 上传到远程存储（可选）
    # aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
else
    echo "Backup failed!"
    exit 1
fi

# 清理旧备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Cleanup completed"
```

### 定时任务

```bash
# 添加 crontab
crontab -e

# 每天凌晨 2 点全量备份
0 2 * * * /opt/kubepolaris/scripts/backup.sh >> /var/log/backup.log 2>&1

# 每小时增量备份（使用 mysqlbinlog）
0 * * * * /opt/kubepolaris/scripts/backup-binlog.sh >> /var/log/backup.log 2>&1
```

### Docker 环境备份

```bash
# 备份 Docker MySQL 容器
docker exec kubepolaris-mysql mysqldump -u root -p kubepolaris > backup.sql

# 或使用 docker-compose
docker-compose exec mysql mysqldump -u root -p kubepolaris > backup.sql
```

### Kubernetes 环境备份

```bash
# 备份 Kubernetes 中的 MySQL
kubectl exec -n kubepolaris deployment/kubepolaris-mysql -- \
  mysqldump -u root -p kubepolaris > backup.sql

# 使用 CronJob 自动备份
kubectl apply -f backup-cronjob.yaml
```

```yaml title="backup-cronjob.yaml"
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
  namespace: kubepolaris
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mysql:8.0
            command:
            - /bin/sh
            - -c
            - |
              mysqldump -h kubepolaris-mysql -u root -p$MYSQL_PASSWORD kubepolaris | \
              gzip > /backups/kubepolaris_$(date +%Y%m%d_%H%M%S).sql.gz
            env:
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: kubepolaris-mysql
                  key: password
            volumeMounts:
            - name: backup-volume
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: mysql-backup-pvc
```

## 配置备份

### 配置文件

```bash
# 备份配置
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  /opt/kubepolaris/configs/

# 备份 Kubernetes Secrets
kubectl get secret -n kubepolaris kubepolaris-secrets -o yaml > secrets.yaml
```

### 加密备份

```bash
# 使用 GPG 加密
tar -cz /opt/kubepolaris/configs/ | \
  gpg --encrypt -r admin@example.com > config_backup.tar.gz.gpg

# 解密
gpg --decrypt config_backup.tar.gz.gpg | tar -xz
```

## 恢复

### 数据库恢复

```bash
# 解压并恢复
gunzip < backup_20260107.sql.gz | mysql -h mysql-host -u kubepolaris -p kubepolaris

# 或直接恢复
mysql -h mysql-host -u kubepolaris -p kubepolaris < backup.sql
```

### Docker 恢复

```bash
# 恢复到 Docker MySQL
cat backup.sql | docker exec -i kubepolaris-mysql mysql -u root -p kubepolaris
```

### Kubernetes 恢复

```bash
# 恢复到 Kubernetes MySQL
kubectl exec -i -n kubepolaris deployment/kubepolaris-mysql -- \
  mysql -u root -p kubepolaris < backup.sql
```

### 完整恢复流程

1. **停止应用**
   ```bash
   kubectl scale deployment kubepolaris-backend --replicas=0 -n kubepolaris
   ```

2. **恢复数据库**
   ```bash
   kubectl exec -i -n kubepolaris deployment/kubepolaris-mysql -- \
     mysql -u root -p kubepolaris < backup.sql
   ```

3. **恢复配置**
   ```bash
   kubectl apply -f secrets.yaml
   ```

4. **启动应用**
   ```bash
   kubectl scale deployment kubepolaris-backend --replicas=3 -n kubepolaris
   ```

5. **验证**
   ```bash
   curl https://kubepolaris.example.com/api/health
   ```

## 远程存储

### AWS S3

```bash
# 上传到 S3
aws s3 cp backup.sql.gz s3://your-bucket/backups/kubepolaris/

# 下载备份
aws s3 cp s3://your-bucket/backups/kubepolaris/backup.sql.gz ./
```

### 阿里云 OSS

```bash
# 上传到 OSS
ossutil cp backup.sql.gz oss://your-bucket/backups/kubepolaris/

# 下载备份
ossutil cp oss://your-bucket/backups/kubepolaris/backup.sql.gz ./
```

## 备份验证

### 自动验证

```bash title="/opt/kubepolaris/scripts/verify-backup.sh"
#!/bin/bash
set -e

BACKUP_FILE=$1
TEST_DB="kubepolaris_test"

# 创建测试数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS $TEST_DB"

# 恢复到测试数据库
gunzip < $BACKUP_FILE | mysql -u root -p $TEST_DB

# 验证表数量
TABLE_COUNT=$(mysql -u root -p -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB'")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "Backup verification passed: $TABLE_COUNT tables"
else
    echo "Backup verification failed!"
    exit 1
fi

# 清理测试数据库
mysql -u root -p -e "DROP DATABASE $TEST_DB"
```

### 定期恢复演练

建议每季度进行一次完整恢复演练：

1. 准备测试环境
2. 执行恢复
3. 验证数据完整性
4. 验证功能正常
5. 记录恢复时间

## 备份策略

### 推荐配置

| 级别 | 频率 | 保留时间 | 存储位置 |
|------|------|---------|---------|
| 全量 | 每日 | 30 天 | 本地 + 远程 |
| 增量 | 每小时 | 7 天 | 本地 |
| 配置 | 变更时 | 90 天 | 远程 |

### RPO/RTO

| 场景 | RPO | RTO |
|------|-----|-----|
| 正常恢复 | 1 小时 | 30 分钟 |
| 灾难恢复 | 24 小时 | 4 小时 |

## 最佳实践

1. **3-2-1 原则**
   - 3 份备份副本
   - 2 种存储介质
   - 1 份异地存储

2. **加密存储**
   - 敏感数据加密
   - 传输加密

3. **定期验证**
   - 自动验证备份完整性
   - 定期恢复演练

4. **监控告警**
   - 备份任务监控
   - 失败告警

## 下一步

- [故障排查](./troubleshooting) - 问题诊断
- [高可用部署](./high-availability) - HA 配置

