# 补单回填接口与通道费率千分制 Spec

## Why
当前通过脚本在服务器上执行补单时，常出现依赖解析/模块缺失（如 `pg`）导致无法运行，影响历史订单回填与对账进度。需要提供一个不依赖服务器脚本运行环境、可复用且可审计的补单能力，并统一通道费率的计量口径为千分率（‰），保证“实际到账金额（净额）”与分润一致。

## What Changes
- 新增管理员接口 `POST /api/admin/orders/backfill`，在后端服务内部完成订单补单与分润回填，避免依赖外部脚本环境。
- 支付通道动态配置新增/使用 `feePermille` 字段（千分率，‰）；兼容历史字段 `feeRate`：
  - 若存在 `feePermille` 则优先使用
  - 若仅存在 `feeRate`：
    - `feeRate > 100` 视为千分率（‰）
    - `feeRate <= 100` 视为百分率（%），自动换算为 `feePermille = feeRate * 10`
  - 费率统一钳制在 `[0, 1000]` 之间
- 净额与分润统一采用“到分（两位小数）”的计算与入库规则：
  - `amountFen = round(amountYuan * 100)`
  - `feeFen = round(amountFen * feePermille / 1000)`
  - `netFen = amountFen - feeFen`
  - `payment_amount = netFen / 100`
- 订单回填流程（每笔订单事务内处理）：
  - `FOR UPDATE` 锁定订单
  - 计算净额并写入 `orders.payment_amount`
  - 若订单未 `paid`，更新 `status='paid'`、`paid_at=NOW()`
  - 幂等：若该订单已存在任意 `earnings` 记录，则跳过分润写入
  - 确保 `wallets` 存在（不存在则创建）
  - 执行三级链路分润并写入 `earnings`（字段对齐现有表结构：`order_amount numeric(12,2)`、`earnings_amount numeric(12,2)`、`rate numeric(5,4)`）

## Impact
- Affected specs: 支付通道动态配置、支付回调扣费、历史订单补单、分润与收益落账
- Affected code: `server.ts`（新增接口/复用回填逻辑）、支付回调计算逻辑、（可选）后台管理页面通道费率字段文案

## ADDED Requirements
### Requirement: 管理员补单回填接口
系统 SHALL 提供管理员接口用于对指定订单列表执行“补单 + 分润回填”，且该流程不依赖外部脚本环境。

#### Scenario: 回填成功
- **WHEN** 管理员提交待回填订单号列表
- **THEN** 系统为每个存在的订单计算净额（按通道千分率），更新订单为 `paid`（如未支付），写入 `payment_amount`，并在未存在收益记录时写入 `earnings` 与更新 `wallets`

#### Scenario: 幂等不重复分润
- **WHEN** 管理员对同一批订单重复调用回填接口
- **THEN** 不产生重复的 `earnings` 记录与重复的钱包入账

#### Scenario: 权限控制
- **WHEN** 非管理员角色调用该接口
- **THEN** 返回 403

## MODIFIED Requirements
### Requirement: 通道费率口径统一为千分率（‰）
系统在进行“净额计算、分润资金池计算、订单 `payment_amount` 写入”时 SHALL 使用千分率（‰）作为统一费率口径，并按“到分”精度入库与展示。

#### Scenario: 188‰ 计算示例
- **WHEN** 订单金额为 30 元，通道费率为 188‰
- **THEN** 手续费为 5.64 元，净额为 24.36 元，`orders.payment_amount=24.36`，分润以 24.36 作为资金池

