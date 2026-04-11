# 商品页助手 (PayForMe) v2.2.0

一个专为个人商户、团队打造的**商品与支付聚合管理平台**。提供从商品发布、自动生成精美海报、多级团队权限分润、独立员工收益计算到自动化提现审核的一站式私有化解决方案。

## 🎯 核心功能 (基于真实代码)

### 💳 聚合支付系统 (核心亮点)
- **多网关动态集成**：系统内置并深度集成了市面主流的三大支付网关规范：
  - **SuperPay 支付宝**：直连支付宝付款，支持高并发并发回调。
  - **九久支付 微信扫码**：自动生成前端微信支付二维码或收银台 HTML。
  - **PHPWC (易支付标准)**：支持市面上绝大多数易支付系统的无缝对接，**API 接口域名动态可配**，支持测试账号 (PID: 199) 小额连通性测试。
- **一键测试通道**：管理后台所有支付配置均带有一键连通性测试按钮，填入参数秒级拉起真实支付环境验证。
- **动态通道分发**：可在后台灵活创建多个支付通道（限额控制 0-20000），为不同商品灵活打勾配置独立可用的收款通道。

### 🎨 营销海报自动生成引擎
基于底层的 `canvas` 与 `sharp` 图像处理引擎，一键为商品生成带专属分销二维码的高级营销海报，内置 **7 款互联网大厂级模板**：
- 携程风 (Ctrip) / 美团风 (Meituan)
- 抖音风 (Douyin) / 快手风 (Kuaishou)
- 饿了么风 (Eleme) / 京东风 (JD) / 代付风 (Daifu)

### 👨‍💼 严密的三级分润与四级权限体系 (RBAC)
- **首席工程师 (Chief Engineer)**: 拥有上帝视角，支持网页端直连执行底层 SQL 进行维护，可修改系统全局数据字典。
- **经理 (Manager)**: 统筹全盘，可管理主管与员工，配置全局支付通道参数，审批提现打款。
- **主管 (Supervisor)**: 团队中层，可创建下级员工，设置专属分成比例，查看团队业绩。
- **员工 (Employee)**: 基础业务员，发布专属商品与订单，系统自动结算收益，发起 USDT (TRC20) 提现申请。

## 🛠️ 技术栈

- **前端**: React 18 + Vite + Tailwind CSS + Lucide Icons
- **后端**: Node.js + Express (TypeScript 强类型)
- **数据库**: PostgreSQL (`pg` 模块直连池化管理)
- **图像处理**: Canvas + Sharp
- **认证安全**: JWT (JSON Web Token) 鉴权 + bcryptjs 密码加盐哈希
- **自动化部署**: PM2 进程守护 + GitHub Actions CI/CD 自动化流水线

## 🚀 快速开始

### 1. 环境要求
- Node.js (v18 或 v20+)
- PostgreSQL 数据库 (v12+)
- Ubuntu/Debian 服务器环境 (需安装 `build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libvips-dev` 以支持海报生成)

### 2. 克隆与安装
```bash
git clone https://github.com/AthenDrakomin-hub/shangpinzhushou.git
cd shangpinzhushou

# 清理旧包并使用 npm 安装（避免 pnpm 幽灵依赖导致 c++ 扩展编译失败）
rm -rf node_modules package-lock.json
npm install
npm rebuild canvas sharp --build-from-source
```

### 3. 环境配置
在项目根目录创建 `.env` 文件，并填入以下内容：
```env
PORT=5000
DATABASE_URL=postgresql://用户名:密码@localhost:5432/payforme
JWT_SECRET=your_jwt_secret_key_here
```

### 4. 运行项目
```bash
# 启动开发环境
npm run dev

# 编译与生产环境运行
npm run build
pm2 start server.ts --name payforme --interpreter ./node_modules/.bin/tsx
```

## 🌐 交付说明
本项目使用 GitHub Actions 自动监听 `main` 分支的提交，触发 Vultr 服务器的自动化部署流水线。每次推送均会自动重构前端页面并平滑重启后端 Node 进程。