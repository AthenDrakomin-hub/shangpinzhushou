#!/bin/bash

# 部署脚本 - 将代码同步到生产服务器

SSH_HOST="167.179.87.106"
SSH_USER="root"
SSH_PASS="9-Tr[7RnYS{45=}%"
REMOTE_DIR="/root/payforme"
LOCAL_DIR="/workspace/projects"

# 使用 sshpass 和 rsync 同步文件
echo "开始同步代码到生产服务器..."
sshpass -p "$SSH_PASS" rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'uploads' \
  --exclude 'dist' \
  --exclude '.coze' \
  --exclude '.cozeproj' \
  --exclude 'specs' \
  "$LOCAL_DIR/" \
  "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
  echo "✅ 代码同步成功"
  
  # 在服务器上执行部署命令
  echo "开始在服务器上执行部署..."
  sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
    cd /root/payforme
    
    echo "1. 安装依赖..."
    pnpm install
    
    echo "2. 构建前端..."
    pnpm build
    
    echo "3. 重启 PM2 服务..."
    pm2 restart payforme
    
    echo "4. 检查服务状态..."
    pm2 list
    
    echo "✅ 部署完成！"
EOF
  
else
  echo "❌ 代码同步失败"
  exit 1
fi