#!/bin/bash

# 查看生产服务器日志脚本

SSH_HOST="167.179.87.106"
SSH_USER="root"
SSH_PASS="9-Tr[7RnYS{45=}%"

echo "正在连接生产服务器查看日志..."
echo "====================================="

# 查看 PM2 日志（最后50行）
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
  echo "=== PM2 进程状态 ==="
  pm2 list
  
  echo ""
  echo "=== PM2 最新日志 (最后50行) ==="
  pm2 logs payforme --lines 50 --nostream
  
  echo ""
  echo "=== PM2 监控信息 ==="
  pm2 show payforme
EOF