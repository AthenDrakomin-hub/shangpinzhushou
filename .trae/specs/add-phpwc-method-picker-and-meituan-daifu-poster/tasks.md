# Tasks

- [ ] Task 1: 定义易支付支付方式字典（前后端共享语义）
  - [ ] SubTask 1.1: 确定内置列表（最少：`wxpay`、`alipay`、`qqpay`、`bank`、`usdt`、`custom`）。
  - [ ] SubTask 1.2: 约定展示名称（如：微信支付/支付宝/QQ钱包/网银/USDT/自定义）。
  - [ ] SubTask 1.3: 约定存储值仍复用 `channelCode` 字段（避免数据库结构改动）。

- [ ] Task 2: 动态通道管理 UI 增强（PHPWC 专用）
  - [ ] SubTask 2.1: 在 `gateway=phpwc` 时，将“通道代码”改为“支付方式(type)”下拉列表，并提供“自定义”输入。
  - [ ] SubTask 2.2: 在 `gateway=superpay` 时保持“通道代码(channelCode)”为文本输入，并保留现有占位提示。
  - [ ] SubTask 2.3: 列表页展示时，对 phpwc 的 `channelCode` 以“支付方式：xxx”方式展示，降低误解。

- [ ] Task 3: 易支付测试通道支持选择支付方式
  - [ ] SubTask 3.1: 前端测试按钮增加“测试支付方式”选择（默认 `wxpay`）。
  - [ ] SubTask 3.2: 后端 `/api/settings/test-phpwc` 接收可选 `type`，缺省为 `wxpay`，并对空值做兜底。
  - [ ] SubTask 3.3: 保持返回字段不变（`pay_url`），确保既有前端逻辑兼容。

- [ ] Task 4: 新增海报模板 `meituan_daifu`
  - [ ] SubTask 4.1: 新增模板文件 `src/services/posterService/templates/meituan_daifu.ts`，按现有 Canvas 工具函数绘制圆角块/文本/二维码。
  - [ ] SubTask 4.2: 更新 `PosterTemplate` 联合类型、`TEMPLATE_CONFIG` 与 `generatePoster` 的分发逻辑，加入新模板与尺寸（建议 640×900）。
  - [ ] SubTask 4.3: 在模板列表 API/前端可选模板中展示新模板名称（如“美团代付卡片”）。

- [ ] Task 5: 验证与回归
  - [ ] SubTask 5.1: 动态通道：创建 phpwc 通道时可选 `wxpay` 并保存成功，点击测试能返回 `pay_url`。
  - [ ] SubTask 5.2: 下单：选择 phpwc + `wxpay` 动态通道能正常生成 payUrl（若网关侧配置正确）。
  - [ ] SubTask 5.3: 海报：生成 `meituan_daifu` 海报，二维码清晰、布局对齐、无崩溃。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 independent（但推荐与 Task 1 并行推进）

