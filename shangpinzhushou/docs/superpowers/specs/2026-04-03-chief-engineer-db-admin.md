# 首席工程师数据库可视化管理设计文档 (Chief Engineer Database Visualization Management)

## 1. 目标
为“首席工程师”在系统内部开发一个自定义的“数据库管理大盘（Database Admin Page）”。该页面可直接获取和展示底层 PostgreSQL 的数据表、字段结构，并提供简单的数据查询（读）操作，方便维护人员监控和调试数据，而无需安装额外的第三方客户端（如 pgAdmin）。

## 2. 架构设计
### 2.1 后端接口 (Backend API)
将在 `server.ts` 中新增针对 `chief_engineer` 的专属 API（通过 `chiefEngineerMiddleware` 中间件保护）：

- `GET /api/system/db/tables`：获取公共 schema 下的所有数据表列表，以及各表的总记录数。
- `GET /api/system/db/tables/:tableName`：获取指定表的数据字典（列名、数据类型）和前 N 条（如 50 条）预览数据。
- `POST /api/system/db/query`（可选）：执行自定义只读 SQL 查询并返回结果（为了安全起见，初期版本可先限制仅允许 SELECT 语句，或只开放内置的表浏览功能）。本期我们采用安全的做法，只开放“查看指定表的元数据和数据内容”的功能。

### 2.2 前端页面 (Frontend UI)
- 新增 `src/pages/DatabaseAdminPage.tsx` 页面。
- 将页面入口集成到 `AppLayout.tsx` 的侧边栏导航中，仅 `chief_engineer` 可见。
- **UI 布局**：
  - **左侧侧边栏**：显示所有的表名列表（如 `users`, `wallets`, `products`, `orders`, `withdrawals`）。
  - **右侧主内容区**：选中某个表后，上方显示该表的元数据（列信息），下方用一个动态数据表格（Data Grid）展示该表的内容。
  - **操作**：提供刷新按钮、分页控制等。

## 3. 安全性与约束
- 所有的 DB 操作均严格绑定 `chief_engineer` 身份验证（`chiefEngineerMiddleware`）。
- 为了防止恶意破坏，初期前端接口仅提供**只读**操作（SELECT）。如需后续编辑数据，将考虑增加更复杂的字段级验证或明确的 Update 接口。

## 4. 实施步骤
1. 后端：在 `server.ts` 中实现 `/api/system/db/tables` 及其相关数据读取路由。
2. 前端：添加并注册 `DatabaseAdminPage.tsx` 页面。
3. 前端：在 `AppLayout.tsx` 导航菜单中添加“数据库管理”的入口。
4. 前后端联调，确保在首席工程师登录后正常获取所有表名及内容。