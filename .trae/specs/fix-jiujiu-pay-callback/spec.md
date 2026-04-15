# 修复九久支付（微信收款）回调 Spec

## Why
目前生产环境中的九久支付 webhook 回调（`/api/orders/wechat/callback`）失败。网关将其生成的流水号放在了 `orderid` 字段中（例如 `O...`），而将我们系统原本发过去的订单号（例如 `LB...`）放在了 `transaction_id` 字段中。当前系统错误地优先使用了 `params.orderid` 查询数据库，导致找不到订单（报错 `Wechat Order not found`），并返回给网关 `fail`。

## What Changes
- 更新 `server.ts` 中九久支付回调的订单号提取逻辑，优先使用 `params.transaction_id`。

## Impact
- Affected specs: 支付回调与订单状态更新
- Affected code: `server.ts`

## MODIFIED Requirements
### Requirement: 现有功能（九久支付回调处理）
系统必须通过正确提取回调报文中的 `transaction_id` 来定位本地订单，因为九久支付将商户传入的 `pay_orderid` 映射到了回调的 `transaction_id` 字段。

#### Scenario: Success case
- **WHEN** 九久支付网关发送回调，且包含 `returncode=00` 与正确的 `transaction_id`（本地订单号）。
- **THEN** 系统提取出 `transaction_id`，查询到对应的订单记录，成功将订单状态更新为 `paid` 并触发后续分润等逻辑，最后向网关响应 `OK`。
