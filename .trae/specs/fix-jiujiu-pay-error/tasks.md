# Tasks
- [x] Task 1: Fix JiuJiu Pay Gateway Error Handling in `wechatPay.ts`
  - [x] SubTask 1.1: Locate `JSON.parse(text)` in `createWechatOrder` function of `src/services/wechatPay.ts`.
  - [x] SubTask 1.2: If `finalUrl` is not found after successfully parsing JSON, return `{ success: false, error: json.msg || json.message || '九久支付网关未返回支付链接，请检查通道编码是否正确' }`.
- [x] Task 2: Allow testing specific `channelCode` in the Admin Dashboard
  - [x] SubTask 2.1: Update `POST /api/settings/test-jiujiu` in `server.ts` to extract `channelCode` from `req.body`.
  - [x] SubTask 2.2: Pass `channelCode` to `createWechatOrder({ ... channelCode })` during the test order creation so the admin can catch wrong codes early.
- [x] Task 3: Inform the user
  - [x] SubTask 3.1: Explain to the user that the "AvailablePassageVO" message is an error from the Jiujiu Pay system due to an invalid/unopened channel code, and the new changes will properly catch and show this error.