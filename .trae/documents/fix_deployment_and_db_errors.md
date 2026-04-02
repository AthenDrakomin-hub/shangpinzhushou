# 计划任务: 解决 GitHub Actions 部署失败与后端报错问题

## 一、当前状态分析

根据提供的报错日志，我们可以发现两个主要问题：
1.  **数据库列缺失导致的服务崩溃 (`server.ts` 报错)**：
    *   在多次请求中，出现了 `error: column p.image_url does not exist at character 65` 的错误。由于之前已经重构将 `image_url` 改为 `image`，此错误是由旧版本服务（可能存在缓存或旧进程未停止）引起。
    *   另外，出现了大量的 `error: foreign key constraint "users_created_by_fkey" cannot be implemented` 错误，这是因为 `users` 表的 `created_by` 外键在 PostgreSQL 中试图指向类型不匹配的列，导致无法创建。同时，也有 `column "created_by" does not exist` 的错误，这直接导致了获取员工列表时崩溃。

2.  **GitHub Actions 部署超时失败 (`18秒失败`)**：
    *   部署超时，并且 UFW 检查显示 `22/tcp ALLOW Anywhere`。由于 UFW 防火墙没有拦截 SSH，超时（Timeout）的原因极有可能是 GitHub Actions Runner 所在的 IP 仍然在某些云服务商级别（Vultr 面板安全组）被拦截，或者（更常见的）是 SSH 密钥认证环节本身因格式等问题瞬间失败并卡死连接。为了快速且稳定地恢复自动化部署，用户同意切换至**基于密码的 SSH 认证方式**。

## 二、目标与成功标准

*   **修复数据库崩溃**：彻底解决 `created_by` 和 `image_url` 报错，使后端服务能够稳定启动并处理请求。
*   **修复自动化部署**：更新 `.github/workflows/deploy.yml`，改用更直接的 `password` 认证方式（使用 `${{ secrets.VULTR_PASSWORD }}`），使代码能成功部署到 Vultr。
*   **清理冗余路由**：移除 `server.ts` 中废弃或冲突的提现审核旧路由（例如旧的 `PUT /api/withdrawals/:id` 等），保持后端代码整洁。

## 三、具体实施步骤

### 1. 修改 `.github/workflows/deploy.yml` (切换为密码认证)
*   **文件路径**：`.github/workflows/deploy.yml`
*   **修改内容**：
    *   在 `appleboy/ssh-action` 步骤中，移除 `key: ${{ secrets.VULTR_SSH_KEY }}`。
    *   添加 `password: ${{ secrets.VULTR_PASSWORD }}`。
    *   为了防止 pm2 重启时遇到旧进程幽灵（这可能导致 `image_url` 报错持续），将部署脚本中的 `pm2 restart payforme` 改进为 `pm2 reload payforme` 或添加相关的清理步骤。

### 2. 修复 `server.ts` 数据库初始化逻辑
*   **文件路径**：`server.ts`
*   **修改内容**：
    *   **修复 `created_by` 错误**：在 `initDatabase` 函数中，检查 `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by UUID ...` 这一行。由于 `users.id` 的类型是 `VARCHAR(255)`（在原表中），而 `created_by` 被定义为 `UUID`，类型不兼容导致外键创建失败。需要将 `created_by` 的类型修改为 `VARCHAR(255)`。
        *   修改前：`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL`
        *   修改后：`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) REFERENCES public.users(id) ON DELETE SET NULL`
    *   **清理旧路由**：搜索并删除废弃的提现审核路由，例如 `PUT /api/withdrawals/:id`（因为前台实际调用的是 `POST /api/merchant/withdraw/${id}/approve` 等新版路由）。

### 3. 验证与提交
*   运行 `npx tsc --noEmit` 检查 TypeScript 语法。
*   使用 `git commit` 和 `git push` 将修改提交到远程仓库，触发新一轮的 GitHub Actions 部署。

## 四、假设与风险
*   **假设**：用户将在 GitHub 仓库的 Secrets 中配置好 `VULTR_PASSWORD`（值为 `9-Tr[7RnYS{45=}%`）。
*   **风险**：如果 Vultr 面板层面（非系统内的 UFW）存在严格的 IP 白名单安全组，即使使用密码认证依然会超时。此时需提醒用户登录 Vultr 控制台放行 22 端口。

## 五、完成通知
*   在完成代码修改并推送到远程后，通知用户配置 Secret，并告知后续的检查步骤。