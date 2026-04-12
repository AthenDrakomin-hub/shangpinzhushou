# 修复收益记录与商品页支付通道显示规范 (Fix Earnings and Channel Display)

## Why
1. 收益记录页面在访问时报错 `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`，是因为后端缺少对应的 `/api/earnings` 接口及数据表来支撑资金流水的展示。
2. 商品下单页（H5 和 PC 收银台）的支付通道名称与 Logo 匹配逻辑不够智能。用户期望无论通道原名多长，只要是微信/支付宝通道，就固定显示官方的 Logo 和名称（微信支付/支付宝）。
3. 移动端访问有多个支付通道的商品页面时，底部的支付选项被固定在下方的支付按钮区域遮挡，无法滑动查看全部通道。
4. 用户在动态通道配置中填写的“通道编码”在正式下单时被支付网关拒绝，而“测试通道”却能通过。原因是测试通道硬编码了默认通道代码（如 SuperPay 固定测试 824 支付宝），导致配置错误的通道在测试时未被拦截。此为逻辑说明，无需大规模代码变更，但需引导用户正确配置。

## What Changes
- **新增数据库表 `public.earnings`**：用于记录每笔订单的分润明细（分润金额、订单号、商品名称、收益类型、归属用户）。
- **新增接口 `GET /api/earnings`**：返回当前用户的收益流水记录，解决前端的 `404 -> index.html -> JSON Parse Error` 问题。
- **修改分润逻辑**：在订单回调处理分润（`processOrderProfitShare` 等）时，同步将每级用户的分润明细写入 `earnings` 表中。
- **修改商品页 UI (`H5ProductPage.tsx`, `ProductCheckoutPage.tsx`)**：
  - 更新 `getChannelIcon` 和 `getChannelDisplayName` 函数：通过分析 `channelCode`、`gateway` 及 `name` 精准识别微信或支付宝，并强制返回官方 SVG 徽标与固定文字（微信支付/支付宝）。
  - 增加主内容区域的底部内边距（如从 `pb-20` 加大至 `pb-32`），确保多个支付通道完整露出，避免被底部固定栏遮挡。

## Impact
- Affected specs: 收益记录查看、商品下单页支付通道展示、回调分润处理。
- Affected code: `server.ts`, `src/pages/H5ProductPage.tsx`, `src/pages/ProductCheckoutPage.tsx`.

## ADDED Requirements
### Requirement: 收益明细记录与查询
系统必须在订单支付成功并执行分润时，将具体的收益金额和来源订单信息写入独立的收益记录表，并允许用户在前端查看。
#### Scenario: 成功加载收益列表
- **WHEN** 用户点击“收益记录”菜单
- **THEN** 页面成功请求 `/api/earnings` 并渲染收益列表，不再报错 502/HTML 解析错误。

## MODIFIED Requirements
### Requirement: 统一支付通道展示UI
在商品页，无论商家为支付通道设置了多长的名称（如“网程PAY备用通道微信”），系统都应识别并统一显示。
#### Scenario: 展示微信与支付宝通道
- **WHEN** 用户进入商品下单页查看可选支付方式
- **THEN** 微信相关的通道固定显示绿色微信Logo和“微信支付”文字；支付宝通道固定显示蓝色支付宝Logo和“支付宝”文字，且列表底部不会被支付按钮遮挡。
