# Tasks
- [x] Task 1: 准备测试环境：确保当前位于 `feature/add-phpwc-payment-channel` 分支，更新依赖并启动本地服务器。
- [x] Task 2: 注入测试配置：利用接口或数据库语句将 PHPWC 的测试 PID (199) 和测试 Key (`iyNMRtjaYUJxL4DvuXemd2kV3EO8TWFs`) 注入系统配置。
- [x] Task 3: 自动化测试订单创建：编写 Node.js 脚本，模拟前端用户创建一个 PHPWC 测试订单，检查其返回的支付 URL 和参数（特别是 `money` 是否为 `0.1` 且签名 `sign` 验证通过）。
- [x] Task 4: 自动化测试异步回调：编写 Node.js 脚本，根据刚创建的订单号，计算一个合法的 PHPWC 回调签名（MD5），并向 `/api/orders/phpwc/callback` 接口发起 POST 请求。
- [x] Task 5: 验证订单状态：查询数据库，验证经过回调处理后，该订单的状态是否已正确更新为 `paid`。
- [x] Task 6: 清理测试脚手架并暴露预览链接：清理临时测试脚本，然后使用 `OpenPreview` 工具向用户暴露一个可供浏览器访问的本地预览 URL，以便用户进行可视化的页面测试和确认。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 5
