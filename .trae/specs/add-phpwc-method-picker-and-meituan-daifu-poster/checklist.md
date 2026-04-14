- [ ] 动态通道管理：当 gateway=phpwc 时，出现“支付方式(type)”下拉列表且可保存；当 gateway=superpay 时，仍为“通道代码(channelCode)”文本输入。
- [ ] 易支付测试：测试按钮默认 `wxpay`，且支持切换到其它方式（如 `qqpay`）；错误提示清晰，不再出现“class not exists”这类迷惑信息（除非网关自身返回）。
- [ ] 下单链路：phpwc 动态通道的 `channelCode` 会作为 `type` 传给易支付下单接口。
- [ ] 海报模板：新增 `meituan_daifu` 模板可生成 PNG，尺寸正确、元素对齐、二维码清晰。
- [ ] 模板列表：前端可选择新模板并用于生成海报与分享链接（未知模板安全回退）。

