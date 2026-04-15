# 新增支付通道费率与三级分润扣减 Spec

## Why
目前系统的支付通道（如九久支付微信原生、SuperPay等）在动态配置中缺少“通道费率（feeRate）”字段。导致支付成功后，系统的三级分润计算是按照订单的“总金额”来计算的。但在实际业务中，网关会扣除一定比例的通道费（例如 18.8%），因此商户后台入账的实际金额低于订单总金额。这会导致系统算出的分润金额大于实际到手利润，最终导致财务对不上账。
此外，之前的批量手动补单脚本仅更新了订单状态，未触发三级分润逻辑，需要一并修复。

## What Changes
- 在支付通道类型 `PaymentChannel` 中新增 `feeRate` (通道费率，百分比或千分比数值) 字段。
- 在后台“动态通道管理” (`PaymentChannelsModal`) 的配置表单中新增“通道费率(%)”的输入框。
- 修改 `server.ts` 中的各个支付网关回调处理逻辑（SuperPay、九久、易支付）：
  1. 在接收到回调并查询订单后，根据 `order.pay_type` (即 channelCode) 去读取 `system_configs` 中的 `payment_channels` 配置，找到对应的通道。
  2. 提取出该通道配置的 `feeRate`。
  3. 计算实际入账金额：`actualAmount = orderAmount * (1 - feeRate / 100)`。
  4. 将扣除通道费后的 `actualAmount` 传入 `distributeRevenue` 进行三级利润分配。
- 更新批量手动补单脚本，使其在补单时能够正确扣除通道费率并调用 `distributeRevenue` 分发利润给对应员工及其上级。

## Impact
- Affected specs: 支付动态配置、支付回调、三级分润计算、批量补单脚本
- Affected code: `src/types/index.ts`, `src/pages/H5ProductPage.tsx`, `src/pages/SettingsPage.tsx`, `server.ts`, `fix-orders.ts`

## MODIFIED Requirements
### Requirement: 动态通道配置管理
系统必须允许管理员为每个支付通道设置独立的“通道费率（feeRate）”，该费率以百分比表示（例如 18.8 表示扣除 18.8%）。

### Requirement: 支付回调与分润计算
支付回调成功后，系统在调用 `distributeRevenue` 时，不再传入订单全款，而是必须先从动态配置中查询该通道的费率，扣除通道费后，将“实际入账金额”作为初始资金池用于三级分润。

#### Scenario: Success case
- **WHEN** 用户使用费率为 18.8% 的通道支付了 30 元，网关回调成功。
- **THEN** 系统更新订单为 paid，计算出实际金额 `30 * (1 - 0.188) = 24.36`，并将 24.36 传入 `distributeRevenue`，底层员工及上级基于 24.36 元的资金池按比例进行利润分配。
