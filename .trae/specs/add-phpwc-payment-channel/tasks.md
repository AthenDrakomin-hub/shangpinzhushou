# Tasks
- [x] Task 1: 创建标准开发分支：创建并切换至新的开发分支 `feature/add-phpwc-payment-channel`。
- [x] Task 2: 添加 PHPWC 支付配置项：在数据库/环境配置中添加对 PHPWC 支付通道的支持（支持动态配置 PID 和 Key）。
- [x] Task 3: 实现 PHPWC 支付服务核心逻辑
  - [x] SubTask 3.1: 编写 MD5 签名算法（`pid={商户ID}&type={支付方式}&out_trade_no={请求单号}&notify_url={服务器异步通知地址}&return_url={页面跳转通知地址}&name={商品名称}&money={金额}&sign={签名字符串}&sign_type=MD5`）。
  - [x] SubTask 3.2: 编写发起支付接口逻辑（拼接 URL 或返回 form 数据）。
  - [x] SubTask 3.3: 编写异步通知（`notify_url`）和同步跳转（`return_url`）回调验证与订单更新逻辑。
- [x] Task 4: 注册并打通支付路由：将 PHPWC 支付服务注册到现有的支付工厂/路由中，使其可在前台被选择和调用。
- [x] Task 5: 增加测试与正式双重配置支持：确保支持测试环境（PID:199, Key:iyNMRtjaYUJxL4DvuXemd2kV3EO8TWFs）和正式环境（PID:637, Key:3q6kWs7zBNt0rog5MAfJcY2S4DKwjpxQ）的动态切换与调用。
- [ ] Task 6: 推送开发分支至远程仓库：将代码提交并推送到远端 `feature/add-phpwc-payment-channel` 供测试，并在测试无误后由主分支合并。

# Task Dependencies
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 6 depends on Task 1, 2, 3, 4, 5
