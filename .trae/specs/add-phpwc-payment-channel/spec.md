# 新增 PHPWC 三方支付通道 Spec

## Why
为了提供更多元化的支付方式，需要接入 PHPWC 第三方支付平台（pay.phpwc.com），允许用户在前台直接发起支付，并支持表单跳转或 URL 拼接跳转。这符合企业标准模式的扩展需求。

## What Changes
- 新增 `PhpwcPay` 支付服务实现类，封装与 `pay.phpwc.com` 的交互。
- 增加支付参数构建逻辑（MD5签名，`pid`, `type`, `out_trade_no`, `notify_url`, `return_url`, `name`, `money` 等）。
- 增加支付异步通知和同步跳转回调处理。
- 在支付配置体系中增加对 PHPWC 支付通道的支持，并支持区分测试模式和正式模式参数。
- 新建开发分支进行开发和测试，测试完成后再合并至主分支。

## Impact
- Affected specs: 支付网关路由、订单支付状态流转、支付配置管理。
- Affected code: 支付服务相关目录（如支付实现层代码）、订单回调 API 接口。

## ADDED Requirements
### Requirement: 新增 PHPWC 支付通道
系统 SHALL 支持通过配置 PHPWC 的 PID 和密钥，发起前台支付请求，并正确处理支付结果回调。

#### Scenario: 发起支付并回调成功
- **WHEN** 用户在结算页选择 PHPWC 对应的支付方式并点击支付
- **THEN** 系统生成正确的带 MD5 签名的支付 URL 或表单，用户跳转至 PHPWC 完成支付
- **WHEN** PHPWC 异步通知 `notify_url`
- **THEN** 系统验证签名通过后，将对应订单状态更新为已支付

#### Scenario: 区分测试和正式环境
- **WHEN** 在测试环境（或使用测试配置）时
- **THEN** 系统使用 PID: 199, Key: iyNMRtjaYUJxL4DvuXemd2kV3EO8TWFs
- **WHEN** 在正式环境（或使用正式配置）时
- **THEN** 系统使用 PID: 637, Key: 3q6kWs7zBNt0rog5MAfJcY2S4DKwjpxQ 进行真实的交易
