# 商品助手 (PayForMe)

一个专为商户、团队打造的**商品与支付管理平台**。提供从商品发布、自动生成海报、多级团队权限管理、独立员工收益计算到自动化提现审核的一站式解决方案。

## 🎯 核心功能 (基于真实代码)

- **👨‍💼 严密的四级权限体系 (RBAC)**
  - **首席工程师 (Chief Engineer)**: 拥有上帝视角，可全量管理账号，支持网页端直连执行底层 SQL，可修改系统全局配置。
  - **经理 (Manager)**: 统筹团队，可管理主管与员工，查看团队订单流水，审批提现。
  - **主管 (Supervisor)**: 团队中层管理，可创建下级员工，查看自己和下级的订单与业绩。
  - **员工 (Employee)**: 基础业务员，管理自己的商品与订单，发起提现申请。
- **🛍️ 商品与订单管理**
  - 商品支持上传封面图，设置原价与售价。
  - 基于 Canvas/Sharp 动态生成带支付二维码的精美商品海报。
  - 支持对接 Webhook，实现支付回调的自动化订单对账。
- **💰 收益与提现系统**
  - 根据为员工设置的“收益比例”自动计算提成。
  - 员工发起提现申请 -> 经理后台可视化审核打款 -> 账单流水自动记录。
- **⚙️ 高级配置**
  - 支付配置：支持在前端动态配置收款网关参数。
  - 数据库操作：提供前端 SQL 执行器，内置增删改查模板。

## 🛠️ 技术栈

- **前端**: React 18 + Vite + Tailwind CSS + Lucide Icons
- **后端**: Node.js + Express
- **数据库**: PostgreSQL (`pg` 模块连接)
- **图像处理**: Canvas + Sharp (用于海报合成与二维码生成)
- **认证**: JWT (JSON Web Token) + bcryptjs 密码加密
- **部署**: PM2 + GitHub Actions 自动化流水线

## 🚀 快速开始

### 1. 环境要求
- Node.js (v18 或 v20+)
- PostgreSQL 数据库
- Git

### 2. 克隆与安装
```bash
git clone https://github.com/AthenDrakomin-hub/shangpinzhushou.git
cd shangpinzhushou
npm install
```

### 3. 环境配置
在项目根目录创建 `.env` 文件，并填入以下内容：
```env
PORT=5000
DATABASE_URL=postgresql://用户名:密码@localhost:5432/payforme
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key_32_bytes_long
```

### 4. 运行项目
```bash
# 启动开发环境
npm run dev

# 编译与生产环境运行
npm run build
pm2 start server.ts --name payforme --interpreter ./node_modules/.bin/tsx
```

## 🌐 在线交付文档
关于详细的操作指南与系统截图，请访问独立托管的 [系统交付说明书](https://athendrakomin-hub.github.io/shangpinzhushou/)。