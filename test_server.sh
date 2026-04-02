#!/bin/bash
echo "=== Checking PM2 Status ==="
pm2 status
echo ""
echo "=== Checking PM2 Logs (last 30 lines) ==="
pm2 logs --lines 30 --nostream
echo ""
echo "=== Checking API Health ==="
curl -s http://localhost:5000/api/health || echo "API is not responding"
