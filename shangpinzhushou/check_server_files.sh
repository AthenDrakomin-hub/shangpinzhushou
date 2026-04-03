#!/bin/bash

# 检查服务器上的文件是否更新

SSH_HOST="167.179.87.106"
SSH_USER="root"
SSH_PASS="9-Tr[7RnYS{45=}%"

echo "检查生产服务器上的 App.tsx 文件..."
echo "============================================="

# 检查服务器上的文件
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
  echo "=== 服务器上的 App.tsx 文件内容 ==="
  echo "文件路径: /root/payforme/src/App.tsx"
  echo ""
  echo "=== isAuthenticatedPages 行 ==="
  grep -n "isAuthenticatedPages" /root/payforme/src/App.tsx
  echo ""
  echo "=== 最近5次部署时间 ==="
  ls -la /root/payforme/dist/index.html
  echo ""
  echo "=== PM2 状态 ==="
  pm2 list
EOF