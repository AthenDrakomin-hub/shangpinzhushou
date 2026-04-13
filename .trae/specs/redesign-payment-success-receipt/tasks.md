# Tasks

- [x] Task 1: 梳理模板来源与透传策略
  - [x] SubTask 1.1: 确认 H5/分享链路中的 `template` 参数来源（分享链接 `?template=...`）。
  - [x] SubTask 1.2: 在前端创建订单请求中增加 `template` 字段（缺省回退 `default`）。
  - [x] SubTask 1.3: 后端 `POST /api/orders` 接收 `template` 并拼接到支付回跳 `returnUrl`（`/payment/result?orderId=...&template=...`）。

- [x] Task 2: 扩展订单状态接口返回字段
  - [x] SubTask 2.1: 修改 `GET /api/orders/:id/status` 查询语句，返回 `product_name`、`buyer_name`、`pay_type`、`paid_at` 等字段。
  - [x] SubTask 2.2: 确保老页面/轮询逻辑不受影响（字段新增不破坏旧字段）。

- [x] Task 3: 设计“收据风格”支付成功页 UI（按模板文案）
  - [x] SubTask 3.1: 基于现有 PaymentResultPage.tsx 重构布局，改成“橙色顶部金额区 + 交易信息区 + 说明条款区”的结构。
  - [x] SubTask 3.2: 增加模板文案映射表（至少覆盖：`default`、`daifu`、`meituan`、`eleme`、`jd`、`ctrip`、`douyin`、`kuaishou`），未知模板回退到 `default`。
  - [x] SubTask 3.3: 页面读取 `template`（从 URL query 或从 App 透传），并使用对应文案包渲染。
  - [x] SubTask 3.4: 成功态与等待态都采用同一布局，等待态文案按模板给出友好提示。

- [ ] Task 4: 验证与回归
  - [ ] SubTask 4.1: 模拟回跳：打开 `/payment/result?orderId=xxx&template=daifu`，确认 UI 与文案正确。
  - [ ] SubTask 4.2: 在移动端微信浏览器验证：支付后回跳页面不丢模板、文案不串、可正常返回。

# Task Dependencies
- Task 3 depends on Task 2（页面需要订单信息字段）
- Task 1 is recommended before Task 3（否则无法按模板渲染）

