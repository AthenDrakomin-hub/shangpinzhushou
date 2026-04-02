#!/bin/bash
echo "Fixing node_modules..."
rm -rf node_modules
pnpm install
npm install canvas sharp --build-from-source --foreground-scripts
echo "Restarting PM2..."
pm2 restart payforme
