# Tasks
- [x] Task 1: 修复九久支付回调的订单号提取逻辑
  - 修改 `server.ts` 文件中 `/api/orders/wechat/callback` 路由下的逻辑，在提取 `orderId` 时优先取 `params.transaction_id`。