#!/bin/bash

# 只查看生产服务器最新日志

SSH_HOST="167.179.87.106"
SSH_USER="root"
SSH_PASS="9-Tr[7RnYS{45=}%"

echo "正在查看生产服务器最新输出日志..."
echo "====================================="

# 只查看 out.log 的最后20行
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
  echo "=== PM2 进程状态 ==="
  pm2 list
  
  echo ""
  echo "=== 最新输出日志 (最后20行) ==="
  tail -n 20 /root/.pm2/logs/payforme-out.log
EOF