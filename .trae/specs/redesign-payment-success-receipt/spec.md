# 支付成功页（收据风格 + 按模板文案）Spec

## Why
用户支付完成后进入的成功页目前是通用“对勾 + 卡片”样式（见 [PaymentResultPage.tsx](file:///workspace/src/pages/PaymentResultPage.tsx)），与业务海报模板风格不一致，且缺少“帮我付/平台交易”类收据体验，用户希望按截图的“收据卡片”模板呈现，并且文案随海报模板而变化。

## What Changes
- 支付成功页改版：将 `/payment/result` 对应的成功页 UI 改为“收据卡片”布局（橙色顶部金额区 + 交易信息区 + 帮我付说明区），对齐用户提供的截图风格。
- 按模板变更文案：根据海报模板（`template`）动态切换标题、副标题、交易文案、说明文案、主题配色（可选）。
- 订单状态接口补充字段：扩展 `GET /api/orders/:id/status` 返回字段，至少包含 `product_name`、`buyer_name`、`pay_type`（用于渲染交易信息），并保持对既有调用兼容。
- 模板参数透传：在创建订单与支付网关回跳 `returnUrl` 中透传 `template`（来源为 H5/分享链接中的 `template`），保证用户回跳到 `/payment/result` 时仍能得知本次订单的模板。

## Impact
- Affected specs: H5 下单与支付回跳、支付成功页 UI、按海报模板驱动的文案体系。
- Affected code:
  - 前端：`src/pages/PaymentResultPage.tsx`、`src/App.tsx`（读取并传递 `template`，或页面内读取 query）、`src/pages/H5ProductPage.tsx`（下单时携带模板）、`src/pages/ProductCheckoutPage.tsx`（如也走同一创建订单接口需同步）。
  - 后端：`server.ts`（`POST /api/orders` 增加可选 `template` 入参并拼接到 returnUrl；`GET /api/orders/:id/status` 扩展返回字段）。

## ADDED Requirements
### Requirement: 收据风格支付成功页
系统 SHALL 在支付成功后展示一张收据风格的结果页，包含金额、订单状态、交易信息与说明条款。

#### Scenario: 支付成功回跳
- **WHEN** 用户完成支付并回跳到 `/payment/result?orderId=...`
- **THEN** 页面以收据风格展示金额、支付状态、订单号、支付时间，并展示交易信息块（如商品名/店铺名等）。

### Requirement: 按模板动态文案
系统 SHALL 根据本次订单使用的海报模板（`template`）动态切换成功页文案（包括标题/副标题/交易描述/说明文本）。

#### Scenario: 代付模板
- **WHEN** 回跳 URL 携带 `template=daifu`
- **THEN** 成功页显示“帮我付订单信息/已帮你付款”类文案与对应说明条款。

#### Scenario: 默认模板
- **WHEN** 未提供 `template` 或模板未知
- **THEN** 系统使用 `default` 模板的通用文案，保证页面可用且不报错。

## MODIFIED Requirements
### Requirement: 订单状态接口返回信息完整
订单状态接口 SHALL 额外返回 `product_name`、`buyer_name`、`pay_type` 以支持成功页信息展示；保留原字段（`id/status/amount/paid_at`）以兼容现有轮询逻辑。

## REMOVED Requirements
无。

