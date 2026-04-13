- [ ] `/payment/result` 成功页已改为收据风格布局，并与截图结构一致（顶部金额区、交易信息区、说明区）。
- [ ] 成功页文案可根据 `template` 动态切换；未知模板安全回退 `default`。
- [ ] `POST /api/orders` 支持透传 `template` 并将其拼接到 `returnUrl`，确保回跳不丢模板。
- [ ] `GET /api/orders/:id/status` 返回 `product_name`、`buyer_name`、`pay_type` 等字段，且不破坏原有字段与轮询。
- [ ] 移动端微信内验证通过：拍照/返回/刷新不会造成样式错乱或状态错误。

