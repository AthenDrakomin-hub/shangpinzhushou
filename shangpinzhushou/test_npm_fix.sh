#!/bin/bash
cd /root/payforme
rm -rf node_modules package-lock.json pnpm-lock.yaml
npm install
pm2 delete payforme || true
pm2 start server.ts --name payforme --interpreter ./node_modules/.bin/tsx
