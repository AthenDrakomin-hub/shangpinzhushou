# API Cache Busting Spec

## Why
用户反馈在修改商品状态（如设置共享开关）后，点击查看列表或再次打开编辑弹窗时，状态仍未改变。
经过排查，由于部分移动端浏览器或本地环境（如微信/Safari）对 `fetch` 的 GET 请求存在激进的缓存策略，导致 `fetchProducts` 等接口返回的依然是旧数据。这使得用户认为更新没有生效，界面状态也没有更新。

## What Changes
- 修改前端的全局 API 请求封装 `src/utils/apiClient.ts`。
- 对于所有的 `GET` 请求，自动在 URL 尾部追加一个时间戳参数（如 `_t=123456789`），强制绕过浏览器缓存机制。
- 或者通过增加 `Cache-Control: no-cache` 头部，确保每次获取商品列表、订单等数据都是实时的数据库最新状态。

## Impact
- Affected specs: 全局 API 请求机制
- Affected code: `src/utils/apiClient.ts`

## ADDED Requirements
### Requirement: 强制刷新 API 数据
系统 SHALL 保证所有的 GET 请求获取到的都是实时数据，避免由于浏览器缓存导致的旧状态残留。

#### Scenario: Success case
- **WHEN** 用户保存了一个商品状态并触发重新加载列表
- **THEN** 浏览器向后端发送带有最新时间戳或无缓存头部的 GET 请求，获取包含最新 `is_shared` 状态的商品数据。

## MODIFIED Requirements
无。

## REMOVED Requirements
无。
