# AGENTS.md - 商品页助手项目指南

## 项目概述

**商品页助手 (payforme-helper)** 是一个面向个人商户/小微商家的商品展示页生成工具，帮助用户快速创建商品分享页面，支持多商户微信支付、商品管理、实时订单管理和资金提现。

### 核心功能
- 商品管理：创建、编辑、分享商品页面
- 订单管理：实时订单跟踪和状态管理
- 支付集成：SuperPay (支付宝) + 九久支付 (微信)
- 用户权限：经理、主管、员工三级权限体系
- 资金管理：钱包余额、提现申请、审核流程

### 用户管理机制
⚠️ **重要变更（v2.2.0）**：前端已移除注册功能，员工账号由管理员（经理/主管）统一创建。

## 技术栈

### 前端
- **框架**: React 19.2.3 + TypeScript 5.9.3
- **构建工具**: Vite 7.2.4
- **样式**: Tailwind CSS 4.1.17
- **动画**: Motion (Framer Motion)
- **图标**: Lucide React
- **图表**: Recharts

### 后端
- **框架**: Express 4.18.2 + TypeScript
- **运行时**: tsx 4.7.0 (直接运行 TypeScript)
- **数据库**: PostgreSQL (pg 8.11.3)
- **认证**: JWT + bcryptjs
- **图片处理**: node-canvas 3.2.3, sharp 0.34.5

### 支付网关
- **支付宝收款**: SuperPay
- **微信收款**: 九久支付

## 项目结构

详细目录结构请查看 [`项目结构.md`](项目结构.md)。核心目录：

```
payforme-helper/
├── server.ts                 # 后端服务入口 (Express)
├── src/                      # 前端源码
│   ├── App.tsx               # 前端主应用
│   ├── components/           # 可复用组件
│   ├── pages/                # 页面组件
│   ├── services/             # 业务服务层
│   └── utils/                # 工具函数
├── specs/                    # 项目文档
├── public/                   # 静态资源
└── migrations/               # 数据库迁移
```

## 架构模式

### 单体架构
- 前后端代码在同一项目中
- 后端使用 `tsx` 直接运行 TypeScript
- 前端通过 Vite 构建为**单文件输出** (`dist/index.html`)
- Express 服务静态文件并提供 API

### 数据库设计
- 使用 PostgreSQL
- 核心表：users, products, orders, wallets, withdrawals
- 支付配置从环境变量读取（不再区分系统级/商户级）

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式 (启动后端服务 + 热重载)
pnpm run dev

# 前端单独开发 (Vite 开发服务器)
pnpm run dev:frontend

# 构建
pnpm run build

# 生产模式
pnpm run start

# 数据库迁移
pnpm run db:migrate

# 类型检查
pnpm run typecheck

# 代码检查
pnpm run lint
```

## 环境变量

```env
# 数据库
PGDATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# 管理员
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# SuperPay (支付宝)
SUPERPAY_BASE_URL=https://hixrs.ibpee.com:13758
SUPERPAY_MERCHANT_ON=your-merchant-on
SUPERPAY_MERCHANT_KEY=your-merchant-key

# 九久支付 (微信)
JIUJIU_API_URL=http://bayq.hanyin.9jiupay.com
JIUJIU_MCH_ID=your-mch-id
JIUJIU_APP_SECRET=your-secret

# 平台域名 (运行时自动注入)
COZE_PROJECT_DOMAIN_DEFAULT=https://xxx.dev.coze.site
```

## 用户角色权限

| 角色 | 别名 | 权限说明 |
|------|------|----------|
| 经理 (manager) | admin | 系统最高权限，管理所有用户、审核商户申请 |
| 主管 (supervisor) | director | 商户管理员，管理员工、查看订单、配置支付 |
| 员工 (staff/employee) | 用户 | 普通用户，创建商品、查看自己的订单 |

> **注意**: `admin` 角色等同于 `manager`，`director` 等同于 `supervisor`

## API 路由

### 认证相关
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册
- `GET /api/auth/me` - 获取当前用户

### 商品相关
- `GET /api/products` - 商品列表
- `POST /api/products` - 创建商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

### 订单相关
- `POST /api/orders` - 创建订单
- `POST /api/orders/callback` - 支付回调
- `GET /api/orders/:id` - 订单详情

### 用户管理 (管理员)
- `GET /api/users` - 用户列表
- `PUT /api/users/:id/status` - 更新用户状态

### 海报生成
- `POST /api/poster/generate` - 生成商品分享海报
  - 参数: `productId` (商品ID), `template` (模板类型)
  - 支持模板: `default`, `meituan`, `jd`, `eleme`, `douyin`, `ctrip`, `kuaishou`, `daifu`
  - 返回: PNG 图片二进制数据

## 注意事项

### 编码规范
- 使用 Airbnb 编码规范
- 所有 TypeScript 文件使用 ES Module (`type: module`)
- React 组件使用函数式组件 + Hooks

### 支付配置
- 支付宝和微信支付配置**统一从环境变量读取**
- 不再区分系统级和商户级配置
- 已删除前端支付配置页面

### 单文件构建
- Vite 配置为单文件输出 (`build.rollupOptions.output.file`)
- 所有 JS/CSS 内联到 `dist/index.html`
- 便于部署和分发

## 访问地址

- **正式环境**: https://goodspage.cn
- **API 端点**: https://goodspage.cn/api/

## 服务器部署

详细部署配置请查看 [`部署配置.md`](部署配置.md)

### 快速信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | `167.179.87.106` |
| SSH 用户 | `root` |
| 项目目录 | `/root/payforme/` |
| 进程管理 | PM2 (进程名: `payforme`) |
| 域名 | `goodspage.cn` (HTTPS 已启用) |

### 常用命令

```bash
# SSH 连接
ssh root@167.179.87.106

# 查看服务状态
pm2 list

# 重启服务
pm2 restart payforme

# 查看日志
pm2 logs payforme --lines 50
```

## 文档索引

| 文档 | 位置 | 说明 |
|------|------|------|
| 产品概述 | `产品概述.md` | 产品定位与核心功能 |
| 技术栈 | `技术栈.md` | 前后端技术选型 |
| 项目结构 | `项目结构.md` | 目录结构与文件说明 |
| 开发规范 | `开发规范.md` | 编码规范与最佳实践 |
| 开发路线图 | `开发路线图.md` | 版本规划与进度 |
| 部署配置 | `部署配置.md` | 服务器部署与运维 |
| 开发习惯记录 | `MEMORY.md` | 开发习惯与偏好 |
| 功能使用说明 | `功能使用说明.md` | 详细功能与API说明 |

## 更新历史

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-04-02 | 代码清理 | 移除App.tsx中所有内联组件定义，迁移到独立文件：SuperPayWaitingPage、WechatPayQrCode、PaymentResultPage、ProductCheckoutPage、EmailVerificationBanner |
| 2026-04-02 | 海报优化 | 集成真实品牌logo到所有模板，修复美团模板UI问题（价格重叠、二维码遮挡） |
| 2026-04-02 | Logo集成 | 下载8个品牌logo到public/logos/，优化海报生成服务 |
| 2026-04-01 | 页面迁移 | 迁移5个页面到新布局：商品管理、订单管理、钱包、用户管理、设置 |
| 2026-04-01 | 验证上线 | 验证项目无误，所有API接口正常，准备v2.2.0上线 |
| 2026-04-01 | 部署更新 | 同步本地代码到服务器，重新构建部署 |
| 2026-04-01 | 文档整合 | 将部署文档整合到 specs 目录 |

## 常见问题

### 服务启动失败
