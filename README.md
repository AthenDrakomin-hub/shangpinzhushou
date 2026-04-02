# 商品页助手 (PayForMe Helper)

一个面向个人商户/小微商家的商品展示页生成工具，帮助用户快速创建商品分享页面，支持多商户微信支付、商品管理、实时订单管理和资金提现。

## 功能特性

- **商品管理**: 创建、编辑、分享商品页面
- **订单管理**: 实时订单跟踪和状态管理
- **支付集成**: SuperPay (支付宝) + 九久支付 (微信)
- **用户权限**: 经理、主管、员工三级权限体系
- **资金管理**: 钱包余额、提现申请、审核流程
- **海报生成**: 8种品牌风格模板，一键生成分享海报

## 海报模板

支持以下品牌风格的海报模板：

| 模板 | 风格 | 主题色 |
|------|------|--------|
| `default` | 酸性渐变 | 紫粉渐变 |
| `meituan` | 美团风格 | 黄色 #FFD100 |
| `jd` | 京东风格 | 红色 #E1251B |
| `eleme` | 饿了么风格 | 蓝色 #0097FF |
| `douyin` | 抖音风格 | 黑色 #161823 |
| `ctrip` | 携程风格 | 蓝色 #2577E3 |
| `kuaishou` | 快手风格 | 橙色 #FF4906 |
| `daifu` | 代付风格 | 绿色 #07C160 |

## 技术栈

### 前端
- React 19.2.3 + TypeScript 5.9.3
- Vite 7.2.4
- Tailwind CSS 4.1.17
- Motion (Framer Motion)
- Lucide React
- Recharts

### 后端
- Express 4.18.2 + TypeScript
- tsx 4.7.0 (直接运行 TypeScript)
- PostgreSQL (pg 8.11.3)
- JWT + bcryptjs
- node-canvas 3.2.3 + sharp 0.34.5 (海报生成)

### 支付网关
- SuperPay (支付宝收款)
- 九久支付 (微信收款)

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动后端服务 + 热重载
pnpm run dev

# 前端单独开发 (Vite 开发服务器)
pnpm run dev:frontend
```

### 构建

```bash
pnpm run build
```

### 生产模式

```bash
pnpm run start
```

## 环境变量

创建 `.env` 文件：

```env
# 数据库
PGDATABASE_URL=postgresql://user:password@localhost:5432/payforme

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

# 平台域名
COZE_PROJECT_DOMAIN_DEFAULT=https://your-domain.com
```

## 用户角色权限

| 角色 | 别名 | 权限说明 |
|------|------|----------|
| 经理 (manager) | admin | 系统最高权限，管理所有用户、审核商户申请 |
| 主管 (supervisor) | director | 商户管理员，管理员工、查看订单、配置支付 |
| 员工 (staff/employee) | 用户 | 普通用户，创建商品、查看自己的订单 |

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册
- `GET /api/auth/me` - 获取当前用户

### 商品
- `GET /api/products` - 商品列表
- `POST /api/products` - 创建商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

### 订单
- `POST /api/orders` - 创建订单
- `POST /api/orders/callback` - 支付回调
- `GET /api/orders/:id` - 订单详情

### 海报生成
- `POST /api/poster/generate` - 生成商品分享海报
  - 参数: `productId` (商品ID), `template` (模板类型)
  - 返回: PNG 图片

## 项目结构

```
payforme-helper/
├── server.ts                 # 后端服务入口
├── src/
│   ├── App.tsx               # 前端主应用
│   ├── pages/                # 页面组件
│   ├── services/             # 业务服务层
│   │   └── posterService/    # 海报生成服务
│   ├── utils/                # 工具函数
│   └── components/           # 可复用组件
├── public/
│   └── logos/                # 品牌Logo
├── dist/                     # 构建输出
└── specs/                    # 项目文档
```

## 部署

详细部署配置请查看 [`specs/部署配置.md`](specs/部署配置.md)

## 文档

| 文档 | 说明 |
|------|------|
| [AGENTS.md](AGENTS.md) | 项目开发指南 |
| [specs/产品概述.md](specs/产品概述.md) | 产品定位与核心功能 |
| [specs/技术栈.md](specs/技术栈.md) | 前后端技术选型 |
| [specs/开发路线图.md](specs/开发路线图.md) | 版本规划与进度 |
| [docs/功能使用说明.md](docs/功能使用说明.md) | 详细功能与API说明 |

## 访问地址

- **正式环境**: https://goodspage.cn
- **API 端点**: https://goodspage.cn/api/

## License

MIT
