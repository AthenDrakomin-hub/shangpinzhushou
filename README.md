# 商品分享助手 (PayForMe Helper)

一个面向个人商户/小微商家的商品展示页生成工具，帮助用户快速创建商品分享页面，支持多场景海报生成、商品分润共享、实时订单追踪和资金提现（USDT）。

## 🌟 核心功能亮点

- **极速商品建站**: 支持上传图片、设置原价/现价及商品描述，一键生成独立的 H5 商品购买页。
- **全自动分润机制**: 
  - 支持设置商品为“共享”模式。
  - 管理员可为每位员工设置专属的“收益分配比例”。
  - 员工分享他人的商品产生订单后，系统自动计算分成并实时发放到该员工钱包，商品原作者不抽成。
- **场景化海报引擎**: 内置 8 种大厂风格模板（美团、京东、抖音、携程等），一键生成带专属二维码的高清营销海报。
- **动态支付网关**: 
  - 深度集成 SuperPay (支付宝) + 九久支付 (微信)。
  - **动态配置**: 管理员可在后台动态配置支付通道商户号及秘钥，修改后**即刻生效**，无需重启服务器。
- **严密的财务与权限体系**:
  - 经理 (manager/admin)：系统最高权限，统管全局数据、配置支付网关、审核提现。
  - 主管 (supervisor)：管理员工账号及基础数据。
  - 员工 (employee)：创建/分享商品，查看个人业绩，发起 USDT 提现。
- **安全加固**: 采用基于 JWT 的身份认证，且实现了无需绑定邮箱的**密保问题找回密码**机制。

## 🎨 海报模板引擎

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
npm install
```

### 开发模式

```bash
# 启动后端服务 + 热重载
npm run dev

# 前端单独开发 (Vite 开发服务器)
npm run dev:frontend
```

### 构建

```bash
npm run build
```

### 生产模式

```bash
npm run start
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

# 支付网关底层配置 (一般无需修改)
SUPERPAY_BASE_URL=https://hixrs.ibpee.com:13758
JIUJIU_API_URL=http://bayq.hanyin.9jiupay.com

# 项目域名 (核心：用于拼接回调地址和海报二维码)
COZE_PROJECT_DOMAIN_DEFAULT=https://your-domain.com
```

> **注意**：商户号（`MCH_ID`）和通信秘钥（`APP_SECRET`）无需写入 `.env` 文件。系统初始化启动后，请使用超级管理员账号登录，在「系统设置 -> 支付通道配置」中动态填写并保存。

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
