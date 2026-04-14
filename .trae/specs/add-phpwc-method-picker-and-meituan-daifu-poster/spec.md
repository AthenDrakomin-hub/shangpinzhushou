# 易支付支付方式列表 + 新增美团代付海报模板 Spec

## Why
当前「动态通道管理」里 PHPWC（易支付）通道的 `通道代码` 需要人工填写（例如 `wxpay/alipay/qqpay`），容易填错并导致三方网关报错；同时需要新增一个与项目现有海报生成方式一致的「美团代付」新模板，以便更贴近真实分享卡片的视觉风格。

## What Changes
- 易支付（PHPWC）通道专用「支付方式列表」：在动态通道管理中，当网关为 `PHPWC (易支付)` 时，将 `通道代码` 输入框升级为下拉选择 + 可选自定义输入。
- 统一的易支付支付方式字典：提供一份项目内置的支付方式列表（如 `wxpay/wechat`、`alipay`、`qqpay`、`bank` 等），用于 UI 展示与后端校验；后续新增方式只需追加字典即可。
- 测试通道按钮适配：易支付测试接口允许选择测试支付方式，默认使用 `wxpay`，避免用户仅做微信通道时点击测试出现报错。
- 新增海报模板：新增一个与现有 `posterService` 的 Canvas 渲染一致的「美团代付分享卡」模板（参考用户提供的截图），并加入模板枚举与模板配置。

## Impact
- Affected specs: 动态通道管理、支付通道测试、海报模板体系。
- Affected code:
  - 前端：`src/pages/SettingsPage.tsx`（动态通道管理 UI、易支付测试 UI）
  - 后端：`server.ts`（`/api/settings/test-phpwc` 接口扩展可选 `type`，并做轻量校验）
  - 海报：`src/services/posterService/index.ts`、`src/services/posterService/types.ts`、`src/services/posterService/templates/*`

## ADDED Requirements
### Requirement: 易支付支付方式列表（动态通道管理）
系统 SHALL 在「动态通道管理」编辑/新增通道时，当选择网关为 `PHPWC (易支付)`，提供一个「支付方式」下拉列表，取代手填 `通道代码`。

#### Scenario: 选择微信支付方式（推荐默认）
- **WHEN** 管理员新增/编辑动态通道，选择网关为 `PHPWC (易支付)` 并选择支付方式为 `wxpay`
- **THEN** 通道保存时写入 `channelCode = "wxpay"`，下单创建订单时会将 `type=wxpay` 发送至易支付网关。

#### Scenario: 选择自定义支付方式
- **WHEN** 管理员选择「自定义」并输入一个支付方式代码（如 `alipay_auto`）
- **THEN** 系统允许保存该值（不阻塞），但在 UI 上明确提示“该值需与网关后台的通道编码一致”。

### Requirement: 易支付测试通道可选择支付方式
系统 SHALL 允许管理员在「支付通道配置」中对易支付测试请求选择支付方式，默认使用 `wxpay`。

#### Scenario: 点击测试（微信）
- **WHEN** 管理员点击易支付测试按钮且未选择方式
- **THEN** 系统默认以 `wxpay` 进行测试下单，并返回可跳转的 `pay_url`（若网关支持）。

### Requirement: 新增美团代付分享卡海报模板
系统 SHALL 新增一个海报模板（命名建议：`meituan_daifu`），并使用现有 Canvas 渲染方式生成 PNG。

#### Scenario: 生成海报（美团代付）
- **WHEN** 生成海报时 `template = "meituan_daifu"`
- **THEN** 输出尺寸与现有分享卡一致（建议 640×900），布局包含：
  - 顶部导航栏（美团圆形 logo + 文案 + 绿色“交易保障”）
  - 大标题 “Hi~ 快来帮我支付这笔订单吧～”
  - 中部大黄底圆角块（左文案“来帮我代付吧～” + 右侧人物插画占位）
  - 中间白色卡片：二维码居中 + 底部黄色按钮“查看详情”

## MODIFIED Requirements
### Requirement: 动态通道字段含义更明确
系统 SHALL 将动态通道的 `channelCode` 在 PHPWC 网关场景下解释为“支付方式 type”，在 SuperPay 场景下解释为“渠道编码 channelCode”，并在 UI 中提供对应提示，避免误填。

## REMOVED Requirements
无。

