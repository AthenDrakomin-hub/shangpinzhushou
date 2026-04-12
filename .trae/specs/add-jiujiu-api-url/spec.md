# 动态配置九久支付网关地址 Spec

## Why
目前系统中九久支付的网关地址 `jiujiuApiUrl` 是硬编码的（默认为 `http://bayq.hanyin.9jiupay.com`）。用户希望像 PHPWC 一样，能够在管理员后台的“动态配置”页面中自由修改这个网关地址，以适应不同商户或备用网关。

## What Changes
- **数据库**：在 `public.users` 表中增加 `jiujiu_api_url` 字段。
- **后端配置读取与保存 (`server.ts`)**：
  - 在启动初始化时执行 `ALTER TABLE` 补充 `jiujiu_api_url` 列。
  - 在 `GET /api/settings/config` 接口中返回 `jiujiuApiUrl`。
  - 在 `POST /api/settings/config` 接口中接收并保存 `jiujiuApiUrl`。
  - 在全局配置加载逻辑中，将查出的 `jiujiu_api_url` 覆盖到 `config.jiujiuApiUrl`。
  - 在 `POST /api/settings/test-jiujiu` 测试接口中，支持传递并临时应用自定义的 `apiUrl`。
- **九久支付核心服务 (`src/services/wechatPay.ts`)**：
  - 更新 `getJiujiuConfig()`，读取并返回 `config.jiujiuApiUrl`，如果为空再使用默认地址。
- **前端配置页 (`src/pages/SettingsPage.tsx`)**：
  - 在界面表单中增加“网关地址”输入框。
  - 提交保存和测试通道时携带该字段。

## Impact
- Affected specs: 管理员后台的九久支付配置模块、下单请求和回调网关。
- Affected code: `server.ts`, `src/services/wechatPay.ts`, `src/pages/SettingsPage.tsx`.

## ADDED Requirements
### Requirement: 动态修改九久支付网关
系统允许管理员随时修改九久支付的网关地址，并在修改后立即在测试和真实订单中生效。

#### Scenario: 成功保存自定义网关
- **WHEN** 管理员在后台输入新的网关地址并点击保存
- **THEN** 数据保存入库，下一次创建微信订单时，系统将请求该新的网关地址。