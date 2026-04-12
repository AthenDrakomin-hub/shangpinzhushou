# 修复九久支付正式通道报错问题 Spec

## Why
用户在正式商品页面使用“九久支付”下单时，页面跳转后显示了乱码 JSON：`{"msg":"org.xxpay.core.common.domain.AvailablePassageVO@4759ed90","code":"0"}`。而在后台的“测试通道”却可以正常通过。
这是因为用户在动态通道管理中配置了特定通道编码（如 `alipay` 或其它字符串），而该商户账号在九久支付官方并没有开通这个通道。九久支付官方网关触发了 Java 后端异常，返回了上述不规范的 JSON 错误信息。我们原有的逻辑没有拦截这种“伪成功”的 JSON 响应，直接将其作为 HTML 返回给了前端。

## What Changes
- 修改 `src/services/wechatPay.ts` 中对九久支付响应结果的解析逻辑。
- 当 `JSON.parse` 成功但未找到任何支付链接（如 `pay_url` 等）时，主动拦截并返回 `success: false` 以及友好的错误提示（如：“九久支付网关异常或未返回链接，请检查通道编码是否正确”），而不是将错误 JSON 作为 HTML 渲染。
- 修改 `server.ts` 中的 `test-jiujiu` 测试接口，允许接收并传递 `channelCode`，让测试接口能真实反映用户填写的通道是否可用，避免“测试通过，正式挂掉”的误导。

## Impact
- Affected specs: 九久支付下单流程、管理员后台测试通道连通性。
- Affected code: `src/services/wechatPay.ts`, `server.ts`.

## ADDED Requirements
### Requirement: 九久支付响应异常拦截
当九久支付网关返回有效的 JSON，但其中不包含支付链接时，系统必须将其识别为下单失败，并向用户展示 JSON 中的 `msg` 字段或统一的错误提示，以防止前端渲染乱码文本。

#### Scenario: 通道编码错误导致网关异常
- **WHEN** 用户使用错误的通道编码下单，网关返回异常 JSON（例如包含 `AvailablePassageVO`）
- **THEN** 后端返回创建订单失败，前端弹出错误提示“网关未返回支付链接，请检查通道编码是否正确”，而不是跳转到一个显示乱码的白屏。

## MODIFIED Requirements
### Requirement: 测试接口真实模拟
后台九久支付测试功能必须支持传递管理员填写的通道编码，以保证测试环境与正式环境行为一致。

#### Scenario: 管理员测试通道连通性
- **WHEN** 管理员点击测试通道并填写了一个未开通的通道编码
- **THEN** 测试接口调用时传入该编码，并能直接返回“测试失败：网关未返回支付链接...”，从而让管理员及时发现配置错误。