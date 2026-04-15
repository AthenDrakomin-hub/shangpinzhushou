# Tasks
- [ ] Task 1: 定义通道费率千分率口径与兼容规则
  - [ ] 提供 `feePermille` 优先、`feeRate` 兼容（>100 当 ‰，<=100 当 %）与 `[0,1000]` 钳制的统一函数
  - [ ] 实现金额到分计算（净额、手续费、支付净额写入）公共函数
- [ ] Task 2: 新增管理员补单回填接口
  - [ ] 新增 `POST /api/admin/orders/backfill`，仅允许 `manager/admin/chief_engineer`
  - [ ] Request body: `{ orderIds: string[], dryRun?: boolean }`
  - [ ] Response: 返回每个订单的处理结果（不存在/已存在收益/已更新paid/写入收益/净额等）
- [ ] Task 3: 回填事务与幂等处理
  - [ ] 每笔订单使用事务 + `FOR UPDATE`
  - [ ] 若 `earnings` 已存在该 `order_id` 任意记录则跳过分润写入
  - [ ] 确保 `wallets` 存在（不存在则创建）
  - [ ] 写入 `earnings` 时满足字段精度：`order_amount/earnings_amount` 两位小数，`rate` 四位小数
- [ ] Task 4: 回归验证
  - [ ] 使用一组订单号在 `dryRun` 模式验证净额计算与费率读取
  - [ ] 执行一次真实回填后确认：`orders.payment_amount` 为正数且与费率匹配；`earnings` 产生记录；重复执行不重复入账

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 3
