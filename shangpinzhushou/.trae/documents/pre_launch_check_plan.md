# 上线前项目检测与修复计划

## 1. 发现的问题总结 (Current State Analysis)

经过对项目源码的全面审查，发现项目在核心业务逻辑、并发处理、支付回调和安全性方面存在几个阻碍正式上线的**高危/严重问题**：

### 🚨 严重业务漏洞 (并发与幂等性)
1. **提现并发漏洞 (TOCTOU)**: `POST /api/withdrawals` 接口中，余额校验和扣款是分离的，没有事务行锁和条件限制。并发请求会导致用户余额扣成负数。
2. **支付回调重复记账 (幂等性缺失)**: `POST /api/orders/callback` 接口在收到支付成功通知后，没有检查订单是否已支付，直接增加钱包余额和商品销量。如果支付网关因网络重发多次回调，会导致资金被**重复入账**。
3. **管理员提现处理重复操作**: `PUT /api/withdrawals/:id` 处理提现请求时，没有检查提现记录当前状态是否还是 `pending`。并发操作可能导致同一笔提现被处理多次，造成资金损失。

### ⚠️ 功能缺失
1. **微信支付(九久支付)无回调处理**: 代码中封装了 `createWechatOrder` 并生成了支付请求，但在 `server.ts` 中**没有针对九久支付的回调路由**。原有的 `/api/orders/callback` 只处理了 SuperPay（支付宝）的参数格式，微信支付成功的订单状态将永远不会变成 `paid`。

### 🛡️ 安全隐患
1. **部署脚本凭证泄露**: `deploy.sh` 中明文硬编码了生产服务器的 SSH IP、Root 账号和密码。
2. **JWT 密钥回退机制危险**: `server.ts` 中的 `JWT_SECRET` 配置了回退值 `'dev-secret-key'`。如果生产环境漏配了该环境变量，任何人都可以使用此默认密钥伪造登录凭证。

---

## 2. 修复计划 (Proposed Changes)

我将主要修改 `server.ts` 文件来修复上述问题。

### 步骤 1: 修复高危并发与幂等性漏洞 (server.ts)
- **支付回调幂等性**: 修改 `POST /api/orders/callback`，在查出订单后，增加 `if (order.status === 'paid' || order.status === 'failed') { return res.send('success'); }` 校验，防止重复加钱。
- **提现并发修复**: 修改 `POST /api/withdrawals` 的扣款 SQL，增加 `AND balance >= $1` 条件，并通过 `RETURNING` 或 `rowCount` 判断是否扣款成功，避免并发提现漏洞。
- **后台审核幂等性**: 修改 `PUT /api/withdrawals/:id`，在处理前检查 `if (withdrawal.status !== 'pending') return res.status(400).json({ error: '该提现已被处理' });`。

### 步骤 2: 补充微信支付(九久支付)回调处理 (server.ts)
- 引入 `verifyCallbackSign` 方法（从 `src/services/wechatPay.ts`）。
- 新增独立的微信支付回调接口 `POST /api/orders/wechat/callback`。
- 获取回调中的商户单号（如 `outTradeNo`）、金额、支付状态等。
- 验证签名并实现与支付宝相同的订单状态更新、销量更新和钱包余额增加逻辑。
- 修改 `/api/orders` 中九久支付传入的 `notifyUrl` 指向新的微信回调路由。

### 步骤 3: 修复安全隐患
- **JWT 密钥安全**: 修改 `server.ts` 的 `config` 初始化，如果 `NODE_ENV === 'production'` 且未配置 JWT 密钥，抛出明确错误终止启动，而不是使用默认密钥。
- **部署脚本建议**: 清理 `deploy.sh` 中的敏感密码，改为要求通过环境变量 `$SSH_PASS` 传入。

---

## 3. 假设与决策 (Assumptions & Decisions)
- **决定不修改的内容**: 暂不修改前端业务逻辑，前端目前的功能看起来比较完整。暂不增加 `express-rate-limit`，避免给当前的 Nginx/PM2 部署带来额外的内存存储复杂性，后续可交由 Nginx 处理限流。
- **微信回调接口定义**: 假设微信回调内容通过 `req.body` 或 `req.query` 传递，并采用常规的九久支付回调字段。

## 4. 验证步骤 (Verification steps)
1. 检查提现并发处理代码逻辑是否闭环。
2. 模拟多次发送支付成功的 Callback 请求，确保钱包余额只增加一次。
3. 检查微信支付的 Callback 路由是否正确加载了签名校验。