/**
 * 商品页助手 - 后端服务
 * 基于 Express + PostgreSQL + JWT
 */
import 'dotenv/config';  // 👈 加载环境变量配置

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { generatePoster, type PosterTemplate } from './src/services/posterService';
import fs from 'fs';
import multer from 'multer';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置 ====================
const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'dev-secret-key',
  jwtExpiresIn: '7d' as string | number,
  databaseUrl: process.env.PGDATABASE_URL || process.env.DATABASE_URL,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  adminName: process.env.ADMIN_NAME || '经理',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  // SuperPay 支付宝收款配置
  superpayBaseUrl: process.env.SUPERPAY_BASE_URL || 'https://hixrs.ibpee.com:13758',
  superpayMerchantOn: process.env.SUPERPAY_MERCHANT_ON || '',
  superpayMerchantKey: process.env.SUPERPAY_MERCHANT_KEY || '',
  superpayTestAmount: process.env.SUPERPAY_TEST_AMOUNT || '100.00',
  // 九久支付微信收款配置
  jiujiuApiUrl: process.env.JIUJIU_API_URL || 'http://bayq.hanyin.9jiupay.com',
  jiujiuMchId: process.env.JIUJIU_MCH_ID || '',
  jiujiuAppSecret: process.env.JIUJIU_APP_SECRET || '',
  jiujiuTestAmount: process.env.JIUJIU_TEST_AMOUNT || '1.00',
  // PHPWC配置
  phpwcPid: process.env.PHPWC_PID || '',
  phpwcSecretKey: process.env.PHPWC_SECRET_KEY || '',
  phpwcApiUrl: process.env.PHPWC_API_URL || '',
  phpwcTestAmount: process.env.PHPWC_TEST_AMOUNT || '1.00',
};

// ==================== 文件上传配置 ====================
// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 存储配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // 生成唯一文件名，并强制根据 mimetype 重新分配扩展名，防止 XSS 和任意文件上传
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    let safeExt = '.jpg';
    if (file.mimetype === 'image/png') safeExt = '.png';
    if (file.mimetype === 'image/gif') safeExt = '.gif';
    if (file.mimetype === 'image/webp') safeExt = '.webp';
    if (file.mimetype === 'image/heic') safeExt = '.heic';
    if (file.mimetype === 'image/heif') safeExt = '.heif';
    if (file.mimetype === 'image/svg+xml') safeExt = '.svg';
    
    // 如果没有匹配到 mimetype，尝试使用原文件扩展名（兼容手机端可能缺少 mimetype 的情况）
    const originalExt = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.webp'].includes(originalExt)) {
      safeExt = originalExt;
    }
    
    cb(null, `${uniqueSuffix}${safeExt}`);
  }
});

// 文件过滤器
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许所有图片格式，防止手机原图（如 heic）或特殊格式报错
  if (file.mimetype.startsWith('image/') || file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif|heic|heif|webp)$/)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的格式：仅允许上传图片文件'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 放宽限制到 20MB，支持高清手机原图
  }
});

// ==================== 数据库连接 ====================
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 数据库初始化
async function initDatabase() {
  const client = await pool.connect();
  try {
    // 检查 public.users 表是否存在
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // 创建用户表
      await client.query(`
        CREATE TABLE public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          encrypted_password VARCHAR(255) NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          role VARCHAR(20) DEFAULT 'supervisor',
          status VARCHAR(20) DEFAULT 'active',
          merchant_on VARCHAR(50),
          secret_key VARCHAR(100),
          whitelist_ip TEXT,
          earnings_rate DECIMAL(5,2) DEFAULT 0,
          security_question VARCHAR(255),
          security_answer VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    } else {
      // 添加缺失的列
      try {
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS encrypted_password VARCHAR(255)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'supervisor'`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS merchant_on VARCHAR(50)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS secret_key VARCHAR(100)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whitelist_ip TEXT`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS earnings_rate DECIMAL(5,2) DEFAULT 0`);
        await client.query(`ALTER TABLE public.users ALTER COLUMN earnings_rate TYPE DECIMAL(5,2)`);
        // 修复 created_by 的类型以兼容原本的 id 类型
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) REFERENCES public.users(id) ON DELETE SET NULL`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS superpay_merchant_on VARCHAR(100)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS superpay_merchant_key VARCHAR(200)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS superpay_test_amount VARCHAR(20)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS jiujiu_mch_id VARCHAR(100)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS jiujiu_secret_key VARCHAR(200)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS jiujiu_test_amount VARCHAR(20)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS jiujiu_api_url VARCHAR(255)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phpwc_pid VARCHAR(100)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phpwc_secret_key VARCHAR(200)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phpwc_api_url VARCHAR(255)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phpwc_test_amount VARCHAR(20)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS security_question VARCHAR(255)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS security_answer VARCHAR(255)`);
      } catch (alterError) {
        console.log('添加列警告:', (alterError as Error).message);
      }
    }

    // 创建系统配置表
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.system_configs (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // 创建商品表
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.products (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        original_price DECIMAL(12,2),
        description TEXT,
        image TEXT,
        sales INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 0,
        template_id VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        is_shared BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 为已有的商品表添加可能缺失的字段
    try {
      await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false`);
    } catch (e) {
      console.log('添加商品列警告:', (e as Error).message);
    }

    // 创建订单表
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        product_id VARCHAR(50) REFERENCES public.products(id),
        product_name VARCHAR(255),
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        buyer_name VARCHAR(100),
        buyer_phone VARCHAR(20),
        pay_type VARCHAR(50),
        pay_url TEXT,
        transaction_id VARCHAR(100),
        paid_at TIMESTAMP WITH TIME ZONE,
        expired_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建钱包表
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
        balance DECIMAL(12,2) NOT NULL DEFAULT 0,
        frozen_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建提现表
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.withdrawals (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(20) NOT NULL,
        usdt_network VARCHAR(20),
        payment_account VARCHAR(100) NOT NULL,
        payment_name VARCHAR(50) NOT NULL,
        bank_code VARCHAR(20),
        bank_name VARCHAR(50),
        reject_reason TEXT,
        transaction_id VARCHAR(100),
        pay_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 创建收益表
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.earnings (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES public.users(id),
        order_id VARCHAR(50),
        product_name VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        type VARCHAR(20) DEFAULT 'sale',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 创建索引
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id)`);

    console.log('✅ 数据库表初始化完成');

    // 创建管理员账号
    await createAdminUser(client);
  } finally {
    client.release();
  }
}

// 创建管理员账号
async function createAdminUser(client: any) {
  const existingAdmin = await client.query('SELECT id FROM public.users WHERE email = $1', [config.adminEmail]);
  
  if (existingAdmin.rows.length === 0) {
    const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
    const merchantOn = `SP${Date.now().toString().slice(-6)}`;
    const secretKey = crypto.randomBytes(16).toString('hex');
    const userId = crypto.randomUUID();

    await client.query(`
      INSERT INTO public.users (id, email, encrypted_password, display_name, role, status, merchant_on, secret_key)
      VALUES ($1, $2, $3, $4, 'manager', 'active', $5, $6)
    `, [userId, config.adminEmail, hashedPassword, config.adminName, merchantOn, secretKey]);

    // 创建钱包（初始余额为0）
    await client.query(`
      INSERT INTO public.wallets (user_id, balance, total_earnings)
      VALUES ($1, 0.00, 0.00)
    `, [userId]);

    console.log('✅ 管理员账号创建成功');
  } else {
    console.log('✅ 管理员账号已存在');
  }
}

// ==================== Express 应用 ====================
const app = express();

// 中间件
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((_req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${res.req.method} ${res.req.path}`);
  next();
});

// ==================== JWT 中间件 ====================
interface AuthRequest extends Request {
  user?: any;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} - Auth: ${token ? 'token-present' : 'no-token'}`);
    
    if (!token) {
      return res.status(401).json({ error: '未登录' });
    }

    if (!config.jwtSecret) {
      return res.status(500).json({ error: 'JWT 配置错误' });
    }
    const decoded = jwt.verify(token, config.jwtSecret as string) as { userId: string };
    const result = await pool.query('SELECT *, display_name as name FROM public.users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '用户不存在' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: '登录已过期' });
  }
};

// 主管权限中间件（支持 admin, manager, supervisor, chief_engineer 角色）
const supervisorMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'manager' && role !== 'admin' && role !== 'supervisor' && role !== 'chief_engineer') {
    return res.status(403).json({ error: '需要主管或以上权限' });
  }
  next();
};

// 管理员权限中间件（支持 admin, manager, chief_engineer 角色）
const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'manager' && role !== 'admin' && role !== 'chief_engineer') {
    return res.status(403).json({ error: '需要经理权限' });
  }
  next();
};

// 首席工程师中间件
const chiefEngineerMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'chief_engineer' && role !== 'admin') {
    return res.status(403).json({ error: '需要首席工程师权限' });
  }
  next();
};

// 递归计算三级分润 (经理 -> 主管 -> 员工)
async function distributeRevenue(orderUserId: string, merchantId: string, totalAmount: number, dbClient: any, orderId: string, productName: string) {
  try {
    const amount = parseFloat(totalAmount as any);
    if (isNaN(amount) || amount <= 0) return;

    // 1. 获取员工及其上级链路 (最多查3层)
    const userRes = await dbClient.query(`
      SELECT id, role, earnings_rate, created_by 
      FROM public.users WHERE id = $1
    `, [orderUserId]);
    
    if (userRes.rows.length === 0) return;
    
    const user = userRes.rows[0];
    const chain = [user];
    
    let currentUserId = user.created_by;
    for (let i = 0; i < 3; i++) {
      if (!currentUserId) break;
      const parentRes = await dbClient.query(`
        SELECT id, role, earnings_rate, created_by 
        FROM public.users WHERE id = $1
      `, [currentUserId]);
      if (parentRes.rows.length === 0) break;
      chain.push(parentRes.rows[0]);
      currentUserId = parentRes.rows[0].created_by;
    }

    // 2. 找到顶级经理 (链路最顶端且角色为 manager 或 admin 的人)
    // 如果链路中没有经理，说明数据异常，安全起见把钱给最终节点
    let managerIndex = chain.findIndex((u: any) => u.role === 'manager' || u.role === 'admin');
    if (managerIndex === -1) managerIndex = chain.length - 1; // 兜底
    
    const validChain = chain.slice(0, managerIndex + 1);
    
    // 3. 从顶向下计算每个人的分润金额 (链式一对一分配，支持 a=0 的越级抽取)
    // validChain 顺序是 [底层, ..., 顶层]，例如 [员工, 主管, 经理]
    
    let currentPool = amount;
    let poolOwnerIndex = validChain.length - 1; // 初始池子归属最顶层
    const payouts = new Array(validChain.length).fill(0);

    for (let i = validChain.length - 2; i >= 0; i--) {
      const node = validChain[i];
      // node 的 earnings_rate 是它的直接上级给它设置的分成比例
      const passDownRate = parseFloat(node.earnings_rate) || 0; 
      const r = Math.max(0, Math.min(100, passDownRate)) / 100;
      
      if (r > 0) {
        // 当前池子主人保留剩下的部分
        payouts[poolOwnerIndex] += currentPool * (1 - r);
        // 传递给下级的池子变小
        currentPool = currentPool * r;
        // 池子主人变更为当前下级
        poolOwnerIndex = i;
      } else {
        // r == 0: 越级抽取
        // 当前节点（比如主管）拿到 0，但池子不缩水，直接穿透给再下一级
        // 且池子主人不变（仍是上一级），这意味着下一级会直接从上一级的池子中按比例抽成
        payouts[i] += 0;
      }
    }

    // 循环结束后，最后一个池子主人拿走剩下的所有钱（通常是最底层员工，或者是被截断的上级）
    payouts[poolOwnerIndex] += currentPool;

    // 4. 执行资金分配
    for (let i = 0; i < validChain.length; i++) {
      const amountToPay = payouts[i];
      const userId = validChain[i].id;
      
      if (amountToPay <= 0) continue;
      
      // 更新钱包
      await dbClient.query(`
        UPDATE public.wallets SET 
          balance = balance + $1,
          total_earnings = total_earnings + $1,
          updated_at = NOW()
        WHERE user_id = $2
      `, [amountToPay, userId]);
      
      // 插入收益记录
      await dbClient.query(`
        INSERT INTO public.earnings (user_id, merchant_id, order_id, order_amount, earnings_amount, rate, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, merchantId, orderId, amount, amountToPay, (amountToPay / amount) * 100, 'success']);
      
      console.log(`[链式分润] 订单 ${orderId}(${productName}) 用户 ${userId} 获得分润: ¥${amountToPay.toFixed(2)}`);
    }

  } catch (error) {
    console.error('Distribute revenue error:', error);
    throw error; // 让上层事务回滚
  }
}

// ==================== API 路由 ====================

// 健康检查
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 数据库健康检查
app.get('/api/health/db', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'Database connection OK' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ---------- 认证 API ----------
// 登录
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    const result = await pool.query('SELECT *, display_name as name FROM public.users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const user = result.rows[0];
    
    // 检查用户状态
    if (user.status === 'inactive') {
      return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
    }
    
    const isValid = await bcrypt.compare(password, user.encrypted_password);

    if (!isValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 更新最后登录时间
    await pool.query('UPDATE public.users SET updated_at = NOW() WHERE id = $1', [user.id]);

    // 生成 JWT
    if (!config.jwtSecret) {
      throw new Error('JWT 秘钥未配置');
    }
    const token = jwt.sign(
      { userId: user.id }, 
      config.jwtSecret, 
      { expiresIn: '7d' }
    );

    // 获取钱包信息
    const walletResult = await pool.query('SELECT * FROM public.wallets WHERE user_id = $1', [user.id]);
    const wallet = walletResult.rows[0] || { balance: 0, frozen_balance: 0, total_earnings: 0, total_withdrawn: 0 };

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.id,  // 前端需要的 uid 字段
        email: user.email,
        name: user.name || user.display_name,
        displayName: user.name || user.display_name,  // 前端需要的 displayName 字段
        role: user.role,
        status: user.status,
        merchantOn: user.merchant_on,
        secretKey: user.secret_key,
        whitelistIp: user.whitelist_ip,
        balance: wallet.balance,
        receiptBalance: wallet.total_earnings,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// Helper: 获取当前用户可见的所有用户ID（用于数据隔离）
async function getVisibleUserIds(userId: string, role: string): Promise<string[] | null> {
  // admin 和 chief_engineer 看全库，返回 null 代表无过滤限制
  if (role === 'admin' || role === 'chief_engineer') return null;

  if (role === 'manager' || role === 'supervisor') {
    const visibleUsersRes = await pool.query(`
      WITH RECURSIVE subordinates AS (
        SELECT id FROM public.users WHERE id = $1
        UNION
        SELECT u.id FROM public.users u
        INNER JOIN subordinates s ON u.created_by = s.id
      )
      SELECT id FROM subordinates;
    `, [userId]);
    return visibleUsersRes.rows.map(r => r.id);
  }

  return [userId];
}

// 获取当前用户所属的“部门”（即最高级 manager 的整个树的所有 user_id）
async function getDepartmentUserIds(userId: string): Promise<string[]> {
  // 1. 向上找寻当前用户的最高 manager
  const managerRes = await pool.query(`
    WITH RECURSIVE superiors AS (
      SELECT id, created_by, role FROM public.users WHERE id = $1
      UNION
      SELECT u.id, u.created_by, u.role FROM public.users u
      INNER JOIN superiors s ON s.created_by = u.id
    )
    SELECT id FROM superiors WHERE role = 'manager' OR role = 'admin' LIMIT 1;
  `, [userId]);

  const rootId = managerRes.rows.length > 0 ? managerRes.rows[0].id : userId;

  // 2. 向下获取该 rootId 的所有子节点
  const deptUsersRes = await pool.query(`
    WITH RECURSIVE subordinates AS (
      SELECT id FROM public.users WHERE id = $1
      UNION
      SELECT u.id FROM public.users u
      INNER JOIN subordinates s ON u.created_by = s.id
    )
    SELECT id FROM subordinates;
  `, [rootId]);
  
  return deptUsersRes.rows.map(r => r.id);
}

// 获取当前用户信息
app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const walletResult = await pool.query('SELECT * FROM public.wallets WHERE user_id = $1', [req.user.id]);
    const wallet = walletResult.rows[0] || { balance: 0, frozen_balance: 0, total_earnings: 0, total_withdrawn: 0 };

    res.json({
      id: req.user.id,
      uid: req.user.id,  // 前端需要的 uid 字段
      email: req.user.email,
      name: req.user.name || req.user.display_name,
      displayName: req.user.name || req.user.display_name,  // 前端需要的 displayName 字段
      role: req.user.role,
      status: req.user.status,
      merchantOn: req.user.merchant_on,
      secretKey: req.user.secret_key,
      whitelistIp: req.user.whitelist_ip,
      balance: wallet.balance,
      receiptBalance: wallet.total_earnings,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取密保问题
app.post('/api/auth/get-security-question', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: '请提供邮箱' });

    const result = await pool.query('SELECT security_question FROM public.users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const question = result.rows[0].security_question;
    if (!question) {
      return res.status(400).json({ error: '该账号未设置密保问题，请联系管理员重置密码' });
    }

    res.json({ question });
  } catch (error) {
    res.status(500).json({ error: '获取密保问题失败' });
  }
});

// 通过密保重置密码
app.post('/api/auth/reset-password-by-security', async (req: Request, res: Response) => {
  try {
    const { email, answer, newPassword } = req.body;
    if (!email || !answer || !newPassword) {
      return res.status(400).json({ error: '信息不完整' });
    }

    const result = await pool.query('SELECT id, security_answer FROM public.users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 兼容处理：检查是否已经是 hash 值（以 $2a$ 或 $2b$ 开头）
    const storedAnswer = result.rows[0].security_answer;
    let isAnswerValid = false;

    if (storedAnswer.startsWith('$2a$') || storedAnswer.startsWith('$2b$')) {
      // 已加密的答案，使用 bcrypt.compare
      isAnswerValid = await bcrypt.compare(answer, storedAnswer);
    } else {
      // 未加密的旧答案，直接对比（为了平滑过渡旧数据）
      isAnswerValid = (storedAnswer === answer);
      // 可以在此处静默将旧的明文答案升级为 hash
      if (isAnswerValid) {
        const hashedAnswer = await bcrypt.hash(answer, 10);
        await pool.query('UPDATE public.users SET security_answer = $1 WHERE id = $2', [hashedAnswer, result.rows[0].id]);
      }
    }

    if (!isAnswerValid) {
      return res.status(400).json({ error: '密保问题答案错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE public.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, result.rows[0].id]);

    res.json({ message: '密码重置成功，请重新登录' });
  } catch (error) {
    res.status(500).json({ error: '密码重置失败' });
  }
});

// 设置密保问题
app.post('/api/auth/security-question', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { question, answer, password } = req.body;

    if (!question || !answer || !password) {
      return res.status(400).json({ error: '请填写密保问题、答案和当前密码' });
    }

    const isValid = await bcrypt.compare(password, req.user.encrypted_password);
    if (!isValid) {
      return res.status(400).json({ error: '当前密码错误' });
    }

    // 增强安全：将密保答案加密存储，防止数据库拖库导致所有用户被重置密码
    const hashedAnswer = await bcrypt.hash(answer, 10);

    await pool.query(`
      UPDATE public.users 
      SET security_question = $1, security_answer = $2, updated_at = NOW() 
      WHERE id = $3
    `, [question, hashedAnswer, req.user.id]);

    res.json({ message: '密保问题设置成功' });
  } catch (error) {
    console.error('Set security question error:', error);
    res.status(500).json({ error: '密保问题设置失败' });
  }
});
app.post('/api/auth/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' });
    }

    const isValid = await bcrypt.compare(oldPassword, req.user.encrypted_password);
    if (!isValid) {
      return res.status(400).json({ error: '旧密码错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE public.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// ---------- 图片上传 API ----------
// 上传商品图片
app.post('/api/upload/image', authMiddleware, upload.single('image'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    // 返回图片访问 URL
    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: '上传图片失败' });
  }
});

// 静态文件服务 - 访问上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', // 缓存 7 天
}));

// ---------- 商品 API ----------
// 获取商品列表
app.get('/api/products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);
    const departmentUserIds = await getDepartmentUserIds(req.user.id);

    let query = `
      SELECT
        id, user_id, name, image, price, original_price,
        description, category, template_id, is_shared,
        supported_pay_methods,
        views, stock, sales, status, created_at, updated_at
      FROM public.products
      WHERE (is_shared = true AND user_id = ANY($1))
    `;
    let params: any[] = [departmentUserIds];

    if (visibleUserIds === null) {
      // admin看全库
      query = `
        SELECT
          id, user_id, name, image, price, original_price,
          description, category, template_id, is_shared,
          supported_pay_methods,
          views, stock, sales, status, created_at, updated_at
        FROM public.products
      `;
      params = [];
    } else {
      query += ` OR user_id = ANY($2)`;
      params.push(visibleUserIds);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 获取单个商品
app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, user_id, name, image, price, original_price,
        description, category, template_id, is_shared,
        supported_pay_methods,
        views, stock, sales, status, created_at, updated_at
      FROM public.products WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '商品不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: '获取商品失败' });
  }
});

// 获取公共支付通道配置
app.get('/api/payment-channels', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1
    `);
    
    let channels = [];
    if (result.rows.length > 0) {
      try {
        channels = JSON.parse(result.rows[0].value);
      } catch (e) {
        console.error('Failed to parse payment channels', e);
      }
    }
    
    // 只返回启用的通道（如果通道有状态的话，这里假设返回全部，前端过滤，或者如果有 status 字段可以过滤）
    res.json(channels);
  } catch (error) {
    console.error('Get public payment channels error:', error);
    res.status(500).json({ error: '获取支付通道失败' });
  }
});

// 创建商品
app.post('/api/products', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, original_price, description, image, stock, template_id, category, supported_pay_methods, is_shared } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: '商品名称和价格不能为空' });
    }

    const id = `p${Date.now().toString().slice(-8)}`;
    
    const result = await pool.query(`
      INSERT INTO public.products (id, user_id, name, price, original_price, description, image, stock, template_id, category, supported_pay_methods, status, is_shared)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12)
      RETURNING id, user_id, name, image, price, original_price,
        description, category, template_id, is_shared,
        supported_pay_methods,
        views, stock, sales, status, created_at
    `, [id, req.user.id, name, price, original_price || price, description, image, stock || 0, template_id, category, supported_pay_methods, is_shared || false]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: '创建商品失败' });
  }
});

// 更新商品
app.put('/api/products/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, original_price, description, image, stock, status, is_shared, category, template_id, supported_pay_methods } = req.body;

    const existingResult = await pool.query('SELECT * FROM public.products WHERE id = $1', [req.params.id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '商品不存在' });
    }

    // 权限检查（支持 admin 和 manager）
    if (req.user.role !== 'manager' && req.user.role !== 'admin' && existingResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '无权修改此商品' });
    }

    const result = await pool.query(`
      UPDATE public.products SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        original_price = COALESCE($3, original_price),
        description = COALESCE($4, description),
        image = COALESCE($5, image),
        stock = COALESCE($6, stock),
        status = COALESCE($7, status),
        is_shared = COALESCE($8, is_shared),
        category = COALESCE($9, category),
        template_id = COALESCE($10, template_id),
        supported_pay_methods = COALESCE($11, supported_pay_methods),
        updated_at = NOW()
      WHERE id = $12
      RETURNING id, user_id, name, image, price, original_price,
        description, category, template_id, is_shared,
        supported_pay_methods,
        views, stock, sales, status, created_at, updated_at
    `, [name, price, original_price, description, image, stock, status, is_shared, category, template_id, supported_pay_methods, req.params.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 删除商品
app.delete('/api/products/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const existingResult = await pool.query('SELECT * FROM public.products WHERE id = $1', [req.params.id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '商品不存在' });
    }

    if (req.user.role !== 'manager' && req.user.role !== 'admin' && existingResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '无权删除此商品' });
    }

    // 开启事务，解除关联的订单
    await pool.query('BEGIN');
    await pool.query('UPDATE public.orders SET product_id = NULL WHERE product_id = $1', [req.params.id]);
    await pool.query('DELETE FROM public.products WHERE id = $1', [req.params.id]);
    await pool.query('COMMIT');
    
    res.json({ message: '删除成功' });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Delete product error:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});

// ---------- 订单 API ----------
// 获取订单列表
app.get('/api/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);

    let userFilter = '1=1'; // admin
    let userParams: any[] = [];
    if (visibleUserIds !== null) {
      userFilter = `o.user_id = ANY($1)`;
      userParams = [visibleUserIds];
    }

    let query = `
      SELECT 
        o.id, o.user_id, o.product_id, 
        p.name as product_name,
        o.amount, o.payment_amount, o.status, 
        o.payer_info,
        o.pay_method, o.channel_code,
        o.out_trade_no, o.order_id,
        o.expires_at,
        o.created_at, o.paid_at
      FROM public.orders o
      LEFT JOIN public.products p ON o.product_id = p.id
      WHERE ${userFilter}
    `;
    
    let params: any[] = [...userParams];
    let paramIndex = params.length + 1;

    if (status && status !== 'all') {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (o.order_id ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR o.payer_info ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // 获取总数
    let countQuery = `
      SELECT COUNT(*) 
      FROM public.orders o
      LEFT JOIN public.products p ON o.product_id = p.id
      WHERE ${userFilter}
    `;
    let countParams: any[] = [...userParams];
    let countParamIndex = countParams.length + 1;

    if (status && status !== 'all') {
      countQuery += ` AND o.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (search) {
      countQuery += ` AND (o.order_id ILIKE $${countParamIndex} OR p.name ILIKE $${countParamIndex} OR o.payer_info ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    
    // 解析 buyer_name 和 buyer_phone
    const orders = result.rows.map(row => {
      let buyer_name = '';
      let buyer_phone = '';
      try {
        if (row.payer_info) {
          const info = JSON.parse(row.payer_info);
          buyer_name = info.name || info.buyer_name || '';
          buyer_phone = info.phone || info.buyer_phone || '';
        }
      } catch (e) {}
      
      return {
        ...row,
        buyer_name,
        buyer_phone
      };
    });

    res.json({
      orders: orders,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 获取订单统计
app.get('/api/orders/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 总销售额
    const salesResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_sales
      FROM public.orders 
      WHERE (user_id = $1 OR $2 = 'manager') AND status = 'paid'
    `, [req.user.id, req.user.role]);

    // 订单总数
    const ordersResult = await pool.query(`
      SELECT COUNT(*) as total_orders,
             COUNT(*) FILTER (WHERE status = 'paid') as paid_orders,
             COUNT(*) FILTER (WHERE status = 'pending') as pending_orders
      FROM public.orders 
      WHERE user_id = $1 OR $2 = 'manager'
    `, [req.user.id, req.user.role]);

    // 支付成功率
    const paidOrders = parseInt(ordersResult.rows[0].paid_orders) || 0;
    const totalOrders = parseInt(ordersResult.rows[0].total_orders) || 0;
    const successRate = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0;

    // 最近7天销售数据
    const chartResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(amount) as sales,
        COUNT(*) as orders
      FROM public.orders
      WHERE (user_id = $1 OR $2 = 'manager') 
        AND status = 'paid'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [req.user.id, req.user.role]);

    // 支付方式占比
    const payTypeResult = await pool.query(`
      SELECT pay_method as pay_type, COUNT(*) as count
      FROM public.orders
      WHERE (user_id = $1 OR $2 = 'manager') AND status = 'paid'
      GROUP BY pay_method
    `, [req.user.id, req.user.role]);

    res.json({
      totalSales: parseFloat(salesResult.rows[0].total_sales),
      totalOrders: parseInt(ordersResult.rows[0].total_orders),
      successRate,
      salesChart: chartResult.rows,
      payTypeStats: payTypeResult.rows,
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: '获取订单统计失败' });
  }
});

// Dashboard 统计数据
app.get('/api/dashboard/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    // 获取可见的用户ID列表
    const visibleUserIds = await getVisibleUserIds(userId, role);

    const departmentUserIds = await getDepartmentUserIds(userId);

    // 构造通用过滤条件
    const productFilter = visibleUserIds === null ? '1=1' : `(user_id = ANY($1) OR (is_shared = true AND user_id = ANY($2)))`;
    const productParams = visibleUserIds === null ? [] : [visibleUserIds, departmentUserIds];
    const orderFilter = visibleUserIds === null ? '1=1' : `o.user_id = ANY($1)`;
    const orderParams = visibleUserIds === null ? [] : [visibleUserIds];

    // 商品数量
    const productsResult = await pool.query(`
      SELECT COUNT(*) as count FROM public.products
      WHERE ${productFilter}
    `, productParams);

    // 订单统计
    const ordersResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'paid') as paid,
             COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as revenue
      FROM public.orders o
      WHERE ${orderFilter}
    `, orderParams);

    // 钱包余额 (只看自己的)
    const walletResult = await pool.query(`
      SELECT balance, total_earnings
      FROM public.wallets
      WHERE user_id = $1
    `, [userId]);

    // 最近7天销售数据
    const chartResult = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as sales,
        COUNT(*) as orders
      FROM public.orders o
      WHERE status = 'paid'
        AND created_at >= NOW() - INTERVAL '7 days'
        AND ${orderFilter}
      GROUP BY DATE(created_at)
      ORDER BY date
    `, orderParams);

    // 最近订单
    const recentOrdersResult = await pool.query(`
      SELECT o.id, o.order_id, p.name as product_name, o.amount, o.status, o.created_at, o.payer_info
      FROM public.orders o
      LEFT JOIN public.products p ON o.product_id = p.id
      WHERE ${orderFilter}
      ORDER BY o.created_at DESC
      LIMIT 5
    `, orderParams);

    // 热销商品（通过订单数计算销量）
    let topProductsResult = { rows: [] };
    try {
      topProductsResult = await pool.query(`
        SELECT p.id, p.name, p.price,
               COALESCE(p.image, '') as image,
               COALESCE(SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END), 0) as sales
        FROM public.products p
        LEFT JOIN public.orders o ON o.product_id = p.id
        WHERE ${productFilter.replace(/user_id/g, 'p.user_id').replace(/is_shared/g, 'p.is_shared')}
        GROUP BY p.id, p.name, p.price, p.image
        ORDER BY sales DESC
        LIMIT 5
      `, productParams);
    } catch (e) {
      console.error('Top products query error:', e);
    }

    // 用户总数（管理员看全库，经理看自己组织内）
    let usersCount = 0;
    if (visibleUserIds === null) {
      const usersCountRes = await pool.query(`SELECT COUNT(*) FROM public.users`);
      usersCount = parseInt(usersCountRes.rows[0].count);
    } else {
      usersCount = visibleUserIds.length;
    }

    const wallet = walletResult.rows[0] || { balance: 0, total_earnings: 0 };

    res.json({
      // 核心指标
      totalProducts: parseInt(productsResult.rows[0].count),
      totalOrders: parseInt(ordersResult.rows[0].total),
      paidOrders: parseInt(ordersResult.rows[0].paid),
      totalRevenue: parseFloat(ordersResult.rows[0].revenue),
      walletBalance: parseFloat(wallet.balance),
      totalEarnings: parseFloat(wallet.total_earnings),
      // 管理员专属
      totalUsers: usersCount,
      // 图表数据
      salesChart: chartResult.rows.map((row: any) => ({
        date: row.date,
        sales: parseFloat(row.sales),
        orders: parseInt(row.orders)
      })),
      // 最近订单
      recentOrders: recentOrdersResult.rows.map((row: any) => {
        let buyerName = '';
        try {
          const payerInfo = row.payer_info ? JSON.parse(row.payer_info) : null;
          buyerName = payerInfo?.name || payerInfo?.phone || '匿名买家';
        } catch {
          buyerName = '匿名买家';
        }
        return {
          id: row.id,
          productName: row.product_name || '未知商品',
          amount: parseFloat(row.amount),
          status: row.status,
          createdAt: row.created_at,
          buyerName
        };
      }),
      // 热销商品
      topProducts: topProductsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        image: row.image,
        sales: row.sales
      }))
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: '获取仪表盘数据失败' });
  }
});

// 创建订单（H5页面调用）
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { productId, payType, buyerName, buyerPhone, shareUid, template } = req.body;

    if (!productId || !payType) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 获取商品信息
    const productResult = await pool.query(`
      SELECT p.*, u.id as user_id
      FROM products p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = $1 AND p.status = 'active'
    `, [productId]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: '商品不存在或已下架' });
    }

    const product = productResult.rows[0];
    
    // 如果传入了 shareUid，并且商品是共享的，则订单归属分享者
    let orderUserId = product.user_id;
    if (shareUid && product.is_shared) {
      const shareUserCheck = await pool.query('SELECT id FROM users WHERE id = $1', [shareUid]);
      if (shareUserCheck.rows.length > 0) {
        orderUserId = shareUid;
      }
    }

    const orderId = `O${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // 获取支付通道配置
    const channelsResult = await pool.query(`
      SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1
    `);
    
    let channels = [];
    if (channelsResult.rows.length > 0) {
      try {
        channels = JSON.parse(channelsResult.rows[0].value);
      } catch (e) {
        console.error('Failed to parse payment channels', e);
      }
    }
    
    const channel = channels.find((c: any) => c.id === payType);
    if (!channel) {
      return res.status(400).json({ error: '支付通道不存在或已关闭' });
    }

    const orderAmount = parseFloat(product.price);
    
    // 检查金额范围
    if (channel.minAmount && orderAmount < parseFloat(channel.minAmount)) {
      return res.status(400).json({ error: `该通道最小支付金额为 ${channel.minAmount} 元` });
    }
    if (channel.maxAmount && orderAmount > parseFloat(channel.maxAmount)) {
      return res.status(400).json({ error: `该通道最大支付金额为 ${channel.maxAmount} 元` });
    }

    // 判断支付网关类型
    const isSuperPay = channel.gateway === 'superpay';
    const isJiuJiu = channel.gateway === 'jiujiu';
    const isPhpwc = channel.gateway === 'phpwc'; // 使用 PHPWC
    
    let payUrl = '';
    let formHtml = '';
    const projectDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:${config.port}`;
    const notifyUrl = `${projectDomain}/api/orders/callback`;
    const returnUrl = `${projectDomain}/payment/result?orderId=${orderId}${template ? `&template=${template}` : ''}`;
    
    if (isSuperPay) {
      // ========== 使用 SuperPay（支付宝收款）==========
      const { createSuperPayOrder } = await import('./src/services/superPay.js');
      const merchantOn = config.superpayMerchantOn;
      const merchantKey = config.superpayMerchantKey;
      
      console.log('[订单创建] 使用 SuperPay 支付宝:', { merchantOn, hasKey: !!merchantKey });
      
      if (!merchantOn || !merchantKey) {
        return res.status(400).json({ error: 'SuperPay 支付配置未设置，请检查环境变量' });
      }
      
      const channelCode = channel.channelCode || '824'; // 默认使用正式通道

      console.log('[SuperPay] 使用渠道编码:', channelCode);
      
      const payResult = await createSuperPayOrder({
        merchantOn,
        merchantKey,
        amount: product.price.toString(),
        orderSn: orderId,
        notifyUrl,
        channelCode,
        returnUrl,
      }, config.superpayBaseUrl);
      
      if (!payResult.success) {
        console.error('[SuperPay] 创建订单失败:', payResult.error);
        return res.status(400).json({ error: payResult.error || '创建支付宝订单失败' });
      }
      
      payUrl = payResult.jumpUrl || '';
      console.log('[SuperPay] 订单创建成功:', { orderId, payUrl: payUrl ? payUrl.substring(0, 50) + '...' : 'N/A' });
      
    } else if (isJiuJiu) {
      // ========== 使用九久支付（微信支付）==========
      const { createWechatOrder } = await import('./src/services/wechatPay.js') as { createWechatOrder: (params: any) => Promise<any> };

      console.log('[订单创建] 使用九久支付微信');
      
      const wechatNotifyUrl = `${projectDomain}/api/orders/wechat/callback`;
      
      const payResult = await createWechatOrder({
        orderId,
        amount: Number(product.price), // 确保传递数值类型
        productName: product.name,
        notifyUrl: wechatNotifyUrl,
        callbackUrl: returnUrl,
        channelCode: channel.channelCode,
      });
      
      if (!payResult.success) {
        console.error('[九久支付] 创建订单失败:', payResult.error);
        return res.status(400).json({ error: payResult.error || '创建微信订单失败' });
      }
      
      payUrl = payResult.payUrl || '';
      formHtml = payResult.formHtml || '';
      console.log('[九久支付] 订单创建成功:', { orderId, payUrl: payUrl ? payUrl.substring(0, 50) + '...' : 'N/A' });
      
    } else if (isPhpwc) {
      // ========== 使用 PHPWC (易支付兼容) ==========
      const { createPhpwcOrder } = await import('./src/services/phpwcPay.js');
      
      console.log('[订单创建] 使用 PHPWC 支付');
      
      const pid = config.phpwcPid;
      const secretKey = config.phpwcSecretKey;
      const apiUrl = config.phpwcApiUrl;

      if (!pid || !secretKey) {
        return res.status(400).json({ error: 'PHPWC 支付配置未设置，请检查管理员配置' });
      }

      // PHPWC 测试环境特判
      let finalMoney = product.price.toString();
      if (pid === '199') {
        finalMoney = '0.1';
        console.log('[PHPWC] 命中测试账号(PID: 199)，金额强制设置为 0.1 元');
      }

      const phpwcNotifyUrl = `${projectDomain}/api/orders/phpwc/callback`;

      const payResult = await createPhpwcOrder({
        pid,
        secretKey,
        apiUrl,
        type: channel.channelCode || 'alipay', // 优先使用管理员配置的通道代码（如 alipay/wxpay）
        outTradeNo: orderId,
        notifyUrl: phpwcNotifyUrl,
        returnUrl,
        name: product.name,
        money: finalMoney
      });
      
      if (!payResult.success) {
        console.error('[PHPWC] 创建订单失败:', payResult.error);
        return res.status(400).json({ error: payResult.error || '创建 PHPWC 订单失败' });
      }
      
      payUrl = payResult.payUrl || '';
      console.log('[PHPWC] 订单创建成功:', { orderId, payUrl: payUrl ? payUrl.substring(0, 50) + '...' : 'N/A' });

    } else {
      return res.status(400).json({ error: '不支持的支付网关' });
    }

    const finalBuyerName = buyerName || '匿名买家';
    const finalBuyerPhone = buyerPhone || '';

    // 创建本地订单记录（注意：服务器表有 order_id 字段）
    await pool.query(`
      INSERT INTO public.orders (id, order_id, user_id, product_id, product_name, amount, status, buyer_name, buyer_phone, pay_type, pay_url, expired_at)
      VALUES ($1, $1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, NOW() + INTERVAL '30 minutes')
    `, [orderId, orderUserId, productId, product.name, product.price, finalBuyerName, finalBuyerPhone, payType, payUrl]);

    res.status(201).json({
      orderId,
      payUrl: payUrl,
      formHtml: formHtml,
      amount: product.price,
    });
  } catch (error) {
    console.error('[订单创建] 异常:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 订单回调
app.post('/api/orders/callback', async (req: Request, res: Response) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    console.log('SuperPay Callback:', JSON.stringify(params));

    const { generateSuperPaySign } = await import('./src/services/superPay.js');

    // 获取动态全局支付配置（从经理账号读取）
    const configResult = await pool.query(`
      SELECT superpay_merchant_key FROM public.users WHERE role = 'manager' LIMIT 1
    `);
    const dynamicKey = configResult.rows[0]?.superpay_merchant_key || config.superpayMerchantKey;

    // 验证签名
    const sign = params.sign;
    if (!sign) {
      console.error('No signature provided in callback');
      return res.status(400).send('fail');
    }

    if (!dynamicKey) {
      console.error('SuperPay merchant key not configured');
      return res.status(500).send('fail');
    }

    const calculatedSign = generateSuperPaySign(params, dynamicKey);
    if (calculatedSign !== sign) {
      console.error('SuperPay signature verification failed');
      return res.status(400).send('fail');
    }

    // SuperPay 回调参数
    const { order_sn, state, amount, payment_date } = params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 根据 order_sn (商户单号) 查询订单并加排他锁 (FOR UPDATE)
      const orderResult = await client.query('SELECT * FROM public.orders WHERE id = $1 FOR UPDATE', [order_sn]);

      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Order not found:', order_sn);
        return res.status(404).send('fail');
      }

      const order = orderResult.rows[0];

      // 幂等性校验：如果订单已被处理，直接返回成功，防止重复加钱
      if (order.status === 'paid' || order.status === 'failed') {
        await client.query('ROLLBACK');
        console.log('Order already processed:', order_sn, 'Current status:', order.status);
        return res.send('success');
      }

      // state: 0-待支付, 1-已失败, 2-已超时, 3-已支付
      if (state === 3) {
        // 金额校验 (防止用户通过抓包修改金额)
        const callbackAmount = parseFloat(amount);
        const expectedAmount = parseFloat(order.amount);
        if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
          console.error(`Amount mismatch for ${order_sn}: expected ${expectedAmount}, got ${callbackAmount}`);
          await client.query('ROLLBACK');
          return res.status(400).send('fail');
        }

        // 支付成功
        await client.query(`
          UPDATE public.orders SET
            status = 'paid',
            pay_url = NULL,
            paid_at = $1
          WHERE id = $2
        `, [payment_date || new Date(), order_sn]);

        // 更新商品销量
        await client.query(`
          UPDATE products SET sales = sales + 1 WHERE id = $1
        `, [order.product_id]);

        // 获取通道费率并计算实际分润金额
        const channelsResult = await client.query(`SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1`);
        let feeRate = 0;
        if (channelsResult.rows.length > 0) {
          try {
            const channels = JSON.parse(channelsResult.rows[0].value);
            const channel = channels.find((c: any) => c.id === order.pay_type);
            if (channel && channel.feeRate) {
              feeRate = parseFloat(channel.feeRate);
            }
          } catch (e) {
            console.error('Failed to parse payment channels in callback', e);
          }
        }
        
        const actualAmount = expectedAmount * (1 - feeRate / 100);
        console.log(`Order ${order_sn} amount: ${expectedAmount}, feeRate: ${feeRate}%, actualAmount: ${actualAmount}`);

        const merchantId = order.creator_uid || order.user_id;
        await distributeRevenue(order.user_id, merchantId, actualAmount, client, order.id, order.product_name);

        await client.query('COMMIT');
        console.log('Order paid successfully:', order_sn);
      } else if (state === 1 || state === 2) {
        // 失败或超时
        await client.query(`UPDATE public.orders SET status = 'failed' WHERE id = $1`, [order_sn]);
        await client.query('COMMIT');
        console.log('Order failed:', order_sn, 'state:', state);
      } else {
        await client.query('ROLLBACK');
      }

      // 返回 success 表示处理成功
      res.send('success');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Order callback error:', error);
    res.status(500).send('fail');
  }
});

// 微信支付（九久支付）回调
app.post('/api/orders/wechat/callback', async (req: Request, res: Response) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    console.log('JiuJiu Pay Callback:', JSON.stringify(params));

    const { verifyCallbackSign } = await import('./src/services/wechatPay.js');
    
    // 提取签名
    const sign = params.sign;
    if (!sign) {
      console.error('No signature provided in callback');
      return res.status(400).send('fail');
    }

    // 剔除 sign 字段后验签
    const signParams = { ...params };
    delete signParams.sign;
    
    if (!verifyCallbackSign(signParams, sign)) {
      console.error('JiuJiu Pay signature verification failed');
      return res.status(400).send('fail');
    }

    // 获取订单号 (优先尝试从自定义参数提取系统单号)
      const orderId = params.transaction_id || params.orderid || params.outTradeNo || params.order_sn || params.out_trade_no;
      if (!orderId) {
        console.error('No order ID found in callback');
        return res.status(400).send('fail');
      }

      // 判断状态：文档明确说明 returncode 为 "00" 代表成功
      const returnCode = params.returncode;
      const status = params.status || params.tradeStatus || params.trade_status || params.state;
      
      const isSuccess = returnCode === '00' || (status ? (String(status).toUpperCase() === 'SUCCESS' || String(status) === '1' || String(status) === '3') : true);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query('SELECT * FROM public.orders WHERE id = $1 FOR UPDATE', [orderId]);
      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Wechat Order not found:', orderId);
        return res.status(404).send('fail');
      }

      const order = orderResult.rows[0];

      // 幂等性校验
        if (order.status === 'paid' || order.status === 'failed') {
          await client.query('ROLLBACK');
          console.log('Wechat Order already processed:', orderId, 'Current status:', order.status);
          return res.send('OK');
        }

      if (isSuccess) {
        // 金额校验 (九久回调的金额通常是以元为单位)
        if (params.amount) {
          const callbackAmount = parseFloat(params.amount);
          const expectedAmount = parseFloat(order.amount);
          if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
            console.error(`Amount mismatch for Wechat ${orderId}: expected ${expectedAmount}, got ${callbackAmount}`);
            await client.query('ROLLBACK');
            return res.status(400).send('fail');
          }
        }

        await client.query(`
          UPDATE public.orders SET
            status = 'paid',
            pay_url = NULL,
            paid_at = NOW()
          WHERE id = $1
        `, [orderId]);

        await client.query(`
          UPDATE products SET sales = sales + 1 WHERE id = $1
        `, [order.product_id]);

        // 获取通道费率并计算实际分润金额
        const channelsResult = await client.query(`SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1`);
        let feeRate = 0;
        if (channelsResult.rows.length > 0) {
          try {
            const channels = JSON.parse(channelsResult.rows[0].value);
            const channel = channels.find((c: any) => c.id === order.pay_type);
            if (channel && channel.feeRate) {
              feeRate = parseFloat(channel.feeRate);
            }
          } catch (e) {
            console.error('Failed to parse payment channels in Wechat callback', e);
          }
        }
        
        const expectedAmount = parseFloat(order.amount);
        const actualAmount = expectedAmount * (1 - feeRate / 100);
        console.log(`Wechat Order ${orderId} amount: ${expectedAmount}, feeRate: ${feeRate}%, actualAmount: ${actualAmount}`);

        const merchantId = order.creator_uid || order.user_id;
        await distributeRevenue(order.user_id, merchantId, actualAmount, client, order.id, order.product_name);

        await client.query('COMMIT');
        console.log('Wechat Order paid successfully:', orderId);
      } else {
        await client.query(`UPDATE public.orders SET status = 'failed' WHERE id = $1`, [orderId]);
        await client.query('COMMIT');
        console.log('Wechat Order failed:', orderId);
        }

        res.send('OK');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Wechat Order callback error:', error);
      res.status(500).send('fail');
    }
  });

// PHPWC 支付回调
app.post('/api/orders/phpwc/callback', async (req: Request, res: Response) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    console.log('PHPWC Pay Callback:', JSON.stringify(params));

    const { verifyPhpwcCallbackSign } = await import('./src/services/phpwcPay.js');
    
    // 获取全局配置的 secretKey
    const configResult = await pool.query(`
      SELECT phpwc_secret_key FROM public.users WHERE role = 'manager' LIMIT 1
    `);
    const dynamicKey = configResult.rows[0]?.phpwc_secret_key || config.phpwcSecretKey;

    if (!dynamicKey) {
      console.error('PHPWC secret key not configured');
      return res.status(500).send('fail');
    }

    if (!verifyPhpwcCallbackSign(params, dynamicKey)) {
      console.error('PHPWC Pay signature verification failed');
      return res.status(400).send('fail');
    }

    // 获取订单号
    const orderId = params.out_trade_no;
    if (!orderId) {
      console.error('No order ID found in callback');
      return res.status(400).send('fail');
    }

    // 状态 TRADE_SUCCESS 表示成功
    const tradeStatus = params.trade_status;
    const isSuccess = tradeStatus === 'TRADE_SUCCESS';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query('SELECT * FROM public.orders WHERE id = $1 FOR UPDATE', [orderId]);
      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('PHPWC Order not found:', orderId);
        return res.status(404).send('fail');
      }

      const order = orderResult.rows[0];

      // 幂等性校验
      if (order.status === 'paid' || order.status === 'failed') {
        await client.query('ROLLBACK');
        console.log('PHPWC Order already processed:', orderId, 'Current status:', order.status);
        return res.send('success');
      }

      if (isSuccess) {
        // 金额校验
        if (params.money) {
          const callbackAmount = parseFloat(params.money);
          const expectedAmount = parseFloat(order.amount);
          
          // 特判：如果当前是测试商户 PID(199) 并且支付了 0.1 元，则跳过严格金额校验
          const isTestAccount = params.pid === '199' && Math.abs(callbackAmount - 0.1) < 0.001;

          if (!isTestAccount && Math.abs(callbackAmount - expectedAmount) > 0.01) {
            console.error(`Amount mismatch for PHPWC ${orderId}: expected ${expectedAmount}, got ${callbackAmount}`);
            await client.query('ROLLBACK');
            return res.status(400).send('fail');
          }
        }

        await client.query(`
          UPDATE public.orders SET
            status = 'paid',
            pay_url = NULL,
            paid_at = NOW()
          WHERE id = $1
        `, [orderId]);

        await client.query(`
          UPDATE products SET sales = sales + 1 WHERE id = $1
        `, [order.product_id]);

        // 获取通道费率并计算实际分润金额
        const channelsResult = await client.query(`SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1`);
        let feeRate = 0;
        if (channelsResult.rows.length > 0) {
          try {
            const channels = JSON.parse(channelsResult.rows[0].value);
            const channel = channels.find((c: any) => c.id === order.pay_type);
            if (channel && channel.feeRate) {
              feeRate = parseFloat(channel.feeRate);
            }
          } catch (e) {
            console.error('Failed to parse payment channels in PHPWC callback', e);
          }
        }
        
        const expectedAmount = parseFloat(order.amount);
        const actualAmount = expectedAmount * (1 - feeRate / 100);
        console.log(`PHPWC Order ${orderId} amount: ${expectedAmount}, feeRate: ${feeRate}%, actualAmount: ${actualAmount}`);

        const merchantId = order.creator_uid || order.user_id;
        await distributeRevenue(order.user_id, merchantId, actualAmount, client, order.id, order.product_name);

        await client.query('COMMIT');
        console.log('PHPWC Order paid successfully:', orderId);
      } else {
        await client.query(`UPDATE public.orders SET status = 'failed' WHERE id = $1`, [orderId]);
        await client.query('COMMIT');
        console.log('PHPWC Order failed:', orderId);
      }

      res.send('success');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('PHPWC Order callback error:', error);
    res.status(500).send('fail');
  }
});

// 查询订单状态
app.get('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id, o.status, o.amount, o.paid_at, o.pay_type, o.buyer_name, o.payer_info,
        COALESCE(p.name, o.product_name) as product_name,
        p.template_id
      FROM public.orders o
      LEFT JOIN public.products p ON o.product_id = p.id
      WHERE o.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const row = result.rows[0];
    let finalBuyerName = row.buyer_name || '';
    try {
      if (row.payer_info) {
        const info = JSON.parse(row.payer_info);
        finalBuyerName = info.name || info.buyer_name || finalBuyerName;
      }
    } catch (e) {}

    res.json({
      id: row.id,
      status: row.status,
      amount: row.amount,
      paid_at: row.paid_at,
      pay_type: row.pay_type,
      product_name: row.product_name,
      buyer_name: finalBuyerName,
      template_id: row.template_id
    });
  } catch (error) {
    console.error('Get order status error:', error);
    res.status(500).json({ error: '查询订单状态失败' });
  }
});

// 管理员删除订单（仅管理员可操作，只删订单不删商品）
app.delete('/api/orders/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userRole = req.user.role;

    // 权限校验：仅管理员可删除（支持 admin 和 manager）
    if (userRole !== 'manager' && userRole !== 'admin') {
      return res.status(403).json({ error: '无权限，仅管理员可删除订单' });
    }

    console.log('[管理员删除订单] 开始删除:', { orderId, adminId: req.user.id });

    // ✅ 关键：只删除 orders 表，绝对不碰商品表！
    const result = await pool.query(
      'DELETE FROM public.orders WHERE id = $1 RETURNING id, product_id',
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    console.log('[管理员删除订单] 删除成功:', { orderId, productId: result.rows[0].product_id });

    res.json({ 
      success: true, 
      message: '订单已删除',
      data: { orderId }
    });
  } catch (error) {
    console.error('[管理员删除订单] 删除失败:', error);
    res.status(500).json({ error: '删除订单失败：' + (error as Error).message });
  }
});

// ---------- 钱包 API ----------
// 获取钱包信息
app.get('/api/wallet', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, user_id as "userId", balance, frozen_balance as "frozenBalance",
        total_earnings as "totalEarnings", total_withdrawn as "totalWithdrawn",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM public.wallets WHERE user_id = $1
    `, [req.user.id]);
    
    if (result.rows.length === 0) {
      // 创建钱包
      const createResult = await pool.query(`
        INSERT INTO public.wallets (user_id) VALUES ($1) 
        RETURNING id, user_id as "userId", balance, frozen_balance as "frozenBalance",
          total_earnings as "totalEarnings", total_withdrawn as "totalWithdrawn",
          created_at as "createdAt", updated_at as "updatedAt"
      `, [req.user.id]);
      return res.json(createResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: '获取钱包信息失败' });
  }
});

// ---------- 收益 API ----------
// 获取收益记录
app.get('/api/earnings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM public.earnings 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: '获取收益记录失败' });
  }
});

// ---------- 提现 API ----------
// 获取提现记录
app.get('/api/withdrawals', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM public.withdrawals 
      WHERE user_id = $1 OR $2 = 'manager'
      ORDER BY created_at DESC
    `, [req.user.id, req.user.role]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get public.withdrawals error:', error);
    res.status(500).json({ error: '获取提现记录失败' });
  }
});

// 申请提现
app.post('/api/withdraw', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, paymentMethod, paymentAccount, usdtNetwork } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: '请输入有效金额' });
    }

    if (paymentMethod !== 'USDT') {
      return res.status(400).json({ error: '目前仅支持 USDT 提现' });
    }

    // 检查余额
    const walletResult = await pool.query('SELECT * FROM public.wallets WHERE user_id = $1', [req.user.id]);
    const wallet = walletResult.rows[0];

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: '余额不足' });
    }

    const withdrawalId = `W${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 冻结余额并创建提现记录
    await pool.query('BEGIN');

    const updateResult = await pool.query(`
      UPDATE public.wallets SET 
        balance = balance - $1,
        frozen_balance = frozen_balance + $1,
        updated_at = NOW()
      WHERE user_id = $2 AND balance >= $1
      RETURNING id
    `, [amount, req.user.id]);

    if (updateResult.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: '余额不足或发生并发冲突' });
    }

    const result = await pool.query(`
      INSERT INTO public.withdrawals (id, user_id, amount, status, payment_method, usdt_network, payment_account, payment_name)
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7)
      RETURNING *
    `, [withdrawalId, req.user.id, amount, paymentMethod, usdtNetwork, paymentAccount, 'USDT提现']);

    await pool.query('COMMIT');

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: '申请提现失败' });
  }
});

app.put('/api/user/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { display_name } = req.body;
    const userId = req.user.id;

    if (!display_name) {
      return res.status(400).json({ error: '昵称不能为空' });
    }

    const result = await pool.query(`
      UPDATE public.users
      SET display_name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, display_name as name, role, status
    `, [display_name, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '更新个人资料失败' });
  }
});

// ---------- 用户管理 API (管理员) ----------

// 首席工程师：获取用户树形结构
app.get('/api/users/tree', authMiddleware, chiefEngineerMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, email, display_name as name, role, status, created_at, updated_at, created_by
      FROM public.users
      ORDER BY created_at ASC
    `);

    const users = result.rows;
    // 构建树形结构
    const map = new Map();
    const roots: any[] = [];

    users.forEach(user => {
      map.set(user.id, { ...user, children: [] });
    });

    users.forEach(user => {
      if (user.created_by && map.has(user.created_by)) {
        map.get(user.created_by).children.push(map.get(user.id));
      } else {
        roots.push(map.get(user.id));
      }
    });

    res.json({ tree: roots });
  } catch (error) {
    console.error('获取树形用户失败:', error);
    res.status(500).json({ error: '获取用户结构失败' });
  }
});

// 获取系统运行状态 (首席工程师专属)
app.get('/api/system/status', authMiddleware, chiefEngineerMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const dbSizeResult = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    const userCountResult = await pool.query("SELECT count(*) FROM public.users");
    const orderCountResult = await pool.query("SELECT count(*) FROM public.orders");
    
    res.json({
      uptime: process.uptime(),
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      systemMemory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      cpuLoad: os.loadavg(),
      db: {
        size: dbSizeResult.rows[0].size,
        userCount: parseInt(userCountResult.rows[0].count),
        orderCount: parseInt(orderCountResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('获取系统状态失败:', error);
    res.status(500).json({ error: '获取系统状态失败' });
  }
});

// ---------- 系统与数据库管理 API (首席工程师) ----------

// 获取数据库中所有的表
app.get('/api/system/db/tables', authMiddleware, chiefEngineerMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // 获取每个表的行数
    const tables = [];
    for (const row of result.rows) {
      const countRes = await pool.query(`SELECT COUNT(*) FROM public.${row.table_name}`);
      tables.push({
        name: row.table_name,
        rows: parseInt(countRes.rows[0].count)
      });
    }

    res.json({ tables });
  } catch (error) {
    console.error('获取数据库表失败:', error);
    res.status(500).json({ error: '获取数据库表失败' });
  }
});

// 获取指定表的列信息和数据
app.get('/api/system/db/tables/:tableName', authMiddleware, chiefEngineerMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tableName = req.params.tableName;
    // 简单的防止 SQL 注入：确保表名只包含字母下划线
    if (!/^[a-zA-Z_]+$/.test(tableName)) {
      return res.status(400).json({ error: '无效的表名' });
    }

    // 1. 获取列信息
    const columnsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
    `, [tableName]);

    // 2. 获取数据 (最多取 50 条)
    const dataRes = await pool.query(`SELECT * FROM public.${tableName} LIMIT 50`);

    res.json({
      columns: columnsRes.rows,
      data: dataRes.rows
    });
  } catch (error) {
    console.error(`获取表 ${req.params.tableName} 数据失败:`, error);
    res.status(500).json({ error: '获取表数据失败' });
  }
});

// 执行自定义 SQL
  app.post('/api/system/db/query', authMiddleware, chiefEngineerMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ error: 'SQL 不能为空' });
      }

      // 允许 SELECT, UPDATE, DELETE, INSERT 等
      const result = await pool.query(sql);

      // 根据操作类型返回适当的响应
      if (result.command === 'SELECT') {
        res.json({
          success: true,
          command: result.command,
          rowCount: result.rowCount,
          rows: result.rows,
          fields: result.fields.map(f => f.name)
        });
      } else {
        res.json({
          success: true,
          command: result.command,
          rowCount: result.rowCount,
          message: `执行成功，影响了 ${result.rowCount} 行数据`
        });
      }
    } catch (error: any) {
      console.error('SQL执行失败:', error);
      res.status(400).json({ error: error.message || 'SQL执行失败' });
    }
  });

  // 系统设置相关 API (仅首席工程师)
  app.get('/api/system/configs', authMiddleware, chiefEngineerMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM public.system_configs ORDER BY key');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: '获取系统配置失败' });
    }
  });

  app.post('/api/system/configs', authMiddleware, chiefEngineerMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { key, value, description } = req.body;
      const result = await pool.query(
        `INSERT INTO public.system_configs (key, value, description) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (key) DO UPDATE 
         SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW()
         RETURNING *`,
        [key, value, description]
      );
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: '保存系统配置失败' });
    }
  });

  app.delete('/api/system/configs/:key', authMiddleware, chiefEngineerMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.params;
      await pool.query('DELETE FROM public.system_configs WHERE key = $1', [key]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '删除系统配置失败' });
    }
  });

  // 获取用户列表
app.get('/api/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, email, display_name as name, role, status, created_at, updated_at
      FROM public.users 
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 创建用户
app.post('/api/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role, status } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    // 检查邮箱是否已存在
    const existingResult = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '邮箱已被使用' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const merchantOn = `SP${Date.now().toString().slice(-6)}`;
    const secretKey = crypto.randomBytes(16).toString('hex');
    const userId = crypto.randomUUID();

    const result = await pool.query(`
      INSERT INTO public.users (id, email, encrypted_password, display_name, role, status, merchant_on, secret_key, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, display_name as name, role, status, created_at
    `, [userId, email, hashedPassword, name, role || 'supervisor', status || 'active', merchantOn, secretKey, req.user.id]);

    // 创建钱包
    await pool.query(`INSERT INTO public.wallets (user_id) VALUES ($1)`, [userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// 更新用户
app.put('/api/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role, status, password } = req.body;
    const userId = req.params.id;

    // 检查用户是否存在
    const existingResult = await pool.query('SELECT * FROM public.users WHERE id = $1', [userId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 不能修改自己的角色
    if (userId === req.user.id && role && role !== req.user.role) {
      return res.status(400).json({ error: '不能修改自己的角色' });
    }

    let updateQuery = `
      UPDATE public.users SET
        email = COALESCE($1, email),
        display_name = COALESCE($2, display_name),
        role = COALESCE($3, role),
        status = COALESCE($4, status),
        updated_at = NOW()
    `;
    const params: any[] = [email, name, role, status];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, encrypted_password = $5`;
      params.push(hashedPassword);
      updateQuery += ` WHERE id = $6 RETURNING id, email, display_name as name, role, status, created_at`;
    } else {
      updateQuery += ` WHERE id = $5 RETURNING id, email, display_name as name, role, status, created_at`;
    }
    
    params.push(userId);

    const result = await pool.query(updateQuery, params);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

// 删除用户
app.delete('/api/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    // 不能删除自己
    if (userId === req.user.id) {
      return res.status(400).json({ error: '不能删除自己' });
    }

    // 检查用户是否存在
    const existingResult = await pool.query('SELECT * FROM public.users WHERE id = $1', [userId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await pool.query('DELETE FROM public.users WHERE id = $1', [userId]);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// ---------- 员工管理 API (商户) ----------
// 获取商户下的员工列表
app.get('/api/merchant/employees', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);
    
    let query = `
      SELECT 
        u.id, u.email, u.display_name as name, u.role, u.status, u.created_at, u.updated_at, u.earnings_rate as profit_share_rate,
        creator.display_name as creator_name
      FROM public.users u
      LEFT JOIN public.users creator ON u.created_by = creator.id
    `;
    let params: any[] = [];

    if (visibleUserIds === null) {
      // admin看全库，但排除自己，因为这是“员工管理”列表
      query += ` WHERE u.id != $1 `;
      params.push(req.user.id);
    } else {
      // 其他角色看自己的下级树
      query += ` WHERE u.id = ANY($1) AND u.id != $2 `;
      params.push(visibleUserIds, req.user.id);
    }
    
    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: '获取员工列表失败' });
  }
});

// 添加员工
app.post('/api/merchant/employees', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, display_name, role } = req.body;

    if (!email || !password || !display_name || !role) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    const myRole = req.user.role;
    if (myRole === 'supervisor' && role !== 'employee') {
      return res.status(403).json({ error: '主管只能创建员工' });
    }

    // 检查邮箱是否已存在
    const existingUser = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await pool.query(`
      INSERT INTO public.users (
        id, email, encrypted_password, display_name, role, status, created_by, earnings_rate, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', $6, 0, NOW(), NOW())
    `, [userId, email, hashedPassword, display_name, role, req.user.id]);

    res.status(201).json({ success: true, message: '员工创建成功', userId });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: '创建员工失败' });
  }
});

// 更新员工
app.put('/api/merchant/employees/:id', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.params.id;
    const { display_name, role, status, profit_share_rate, password } = req.body;

    // 检查是否有权限
    const targetUserResult = await pool.query('SELECT * FROM public.users WHERE id = $1', [employeeId]);
    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const targetUser = targetUserResult.rows[0];
    const myRole = req.user.role;

    if (myRole === 'manager' && (targetUser.role === 'manager' || targetUser.role === 'admin')) {
      return res.status(403).json({ error: '无权修改同级或上级账号' });
    }
    if (myRole === 'supervisor' && targetUser.role !== 'employee' && targetUser.role !== 'staff') {
      return res.status(403).json({ error: '主管只能修改员工账号' });
    }

    // 只能修改自己创建的员工，除非是管理员或者跨级（比如经理改员工）
    if (myRole !== 'admin' && myRole !== 'chief_engineer' && targetUser.created_by !== req.user.id) {
       // 检查是否是下级的下级
       const creatorResult = await pool.query('SELECT created_by FROM public.users WHERE id = $1', [targetUser.created_by]);
       if (creatorResult.rows.length === 0 || creatorResult.rows[0].created_by !== req.user.id) {
         if (myRole !== 'manager') { // 经理可以看所有人，但安全起见
           return res.status(403).json({ error: '无权修改此账号' });
         }
       }
    }

    let query = `
      UPDATE public.users
      SET display_name = COALESCE($1, display_name), role = COALESCE($2, role), status = COALESCE($3, status), earnings_rate = COALESCE($4, earnings_rate), updated_at = NOW()
    `;
    const params = [
      display_name !== undefined ? display_name : null,
      role !== undefined ? role : null,
      status !== undefined ? status : null,
      profit_share_rate !== undefined ? profit_share_rate : null
    ];
    let paramIndex = 5;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, encrypted_password = $${paramIndex}`;
      params.push(hashedPassword);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex}`;
    params.push(employeeId);

    await pool.query(query, params);

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: error.message || '更新失败' });
  }
});

// 删除员工
app.delete('/api/merchant/employees/:id', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.params.id;

    // 不能删除自己
    if (employeeId === req.user.id) {
      return res.status(400).json({ error: '不能删除自己' });
    }

    // 检查员工是否存在且是由当前商户创建的 (如果是 chief_engineer 则无需创建者限制)
    let existingResult;
    if (req.user.role === 'chief_engineer' || req.user.role === 'admin') {
      existingResult = await pool.query('SELECT * FROM public.users WHERE id = $1', [employeeId]);
    } else {
      existingResult = await pool.query(
        'SELECT * FROM public.users WHERE id = $1 AND created_by = $2',
        [employeeId, req.user.id]
      );
    }
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '员工不存在或无权删除' });
    }

    await pool.query('DELETE FROM public.users WHERE id = $1', [employeeId]);

    res.json({ success: true, message: '员工已删除' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: '删除员工失败' });
  }
});

// ---------- 提现审核 API (商户) ----------

// 获取下级提现统计
app.get('/api/merchant/withdrawals/stats', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);
    
    let query = `
      SELECT
        COUNT(*) FILTER (WHERE w.status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE w.status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE w.status = 'success' OR w.status = 'paid') as success_count,
        COALESCE(SUM(w.amount) FILTER (WHERE (w.status = 'success' OR w.status = 'paid') AND w.created_at >= CURRENT_DATE), 0) as today_amount
      FROM public.withdrawals w
      JOIN public.users u ON w.user_id = u.id
    `;
    let queryParams: any[] = [];
    
    if (visibleUserIds === null) {
      // admin / chief_engineer 看所有人
    } else if (visibleUserIds.length > 0) {
      query += ` WHERE w.user_id = ANY($1)`;
      queryParams.push(visibleUserIds);
    } else {
      // 如果没有下级
      return res.json({
        stats: {
          pendingCount: 0,
          processingCount: 0,
          successCount: 0,
          todayAmount: 0
        }
      });
    }

    const statsResult = await pool.query(query, queryParams);

    res.json({
      stats: {
        pendingCount: parseInt(statsResult.rows[0].pending_count) || 0,
        processingCount: parseInt(statsResult.rows[0].processing_count) || 0,
        successCount: parseInt(statsResult.rows[0].success_count) || 0,
        todayAmount: parseFloat(statsResult.rows[0].today_amount) || 0
      }
    });
  } catch (error) {
    console.error('Get withdrawal stats error:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取待审核提现记录
app.get('/api/merchant/withdrawals/pending', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);

    let query = `
      SELECT
        w.*, u.display_name as user_name, u.email as user_email
      FROM public.withdrawals w
      JOIN public.users u ON w.user_id = u.id
      WHERE w.status = 'pending'
    `;
    let queryParams: any[] = [];

    if (visibleUserIds === null) {
      // no filter
    } else if (visibleUserIds.length > 0) {
      query += ` AND w.user_id = ANY($1)`;
      queryParams.push(visibleUserIds);
    } else {
      return res.json({ withdrawals: [] });
    }

    query += ` ORDER BY w.created_at ASC`;
    const result = await pool.query(query, queryParams);

    res.json({ withdrawals: result.rows });
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({ error: '获取待审核列表失败' });
  }
});

// 获取所有下级提现记录
app.get('/api/merchant/withdrawals', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);

    let query = `
      SELECT
        w.*, u.display_name as user_name, u.email as user_email
      FROM public.withdrawals w
      JOIN public.users u ON w.user_id = u.id
    `;
    let queryParams: any[] = [];

    if (visibleUserIds === null) {
      // no filter
    } else if (visibleUserIds.length > 0) {
      query += ` WHERE w.user_id = ANY($1)`;
      queryParams.push(visibleUserIds);
    } else {
      return res.json({ withdrawals: [] });
    }

    query += ` ORDER BY w.created_at DESC`;
    const result = await pool.query(query, queryParams);

    res.json({ withdrawals: result.rows });
  } catch (error) {
    console.error('Get merchant withdrawals error:', error);
    res.status(500).json({ error: '获取提现列表失败' });
  }
});

// 审核通过
app.post('/api/merchant/withdraw/:id/approve', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const withdrawId = req.params.id;
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);

    // Verify it belongs to sub-user
    let checkQuery = `
      SELECT w.* FROM public.withdrawals w
      JOIN public.users u ON w.user_id = u.id
      WHERE w.id = $1
    `;
    let queryParams: any[] = [withdrawId];

    if (visibleUserIds === null) {
      // no filter
    } else if (visibleUserIds.length > 0) {
      checkQuery += ` AND w.user_id = ANY($2)`;
      queryParams.push(visibleUserIds);
    } else {
      return res.status(404).json({ error: '提现记录不存在或无权限' });
    }

    const checkRes = await pool.query(checkQuery, queryParams);
    if (checkRes.rows.length === 0) return res.status(404).json({ error: '提现记录不存在或无权限' });

    await pool.query(`UPDATE public.withdrawals SET status = 'approved', updated_at = NOW() WHERE id = $1`, [withdrawId]);
    res.json({ success: true, message: '已通过审核' });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

// 拒绝提现
app.post('/api/merchant/withdraw/:id/reject', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const withdrawId = req.params.id;
    // const { reason } = req.body; // Unused
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);

    await pool.query('BEGIN');
    
    let checkQuery = `
      SELECT w.* FROM public.withdrawals w
      JOIN public.users u ON w.user_id = u.id
      WHERE w.id = $1 AND w.status = 'pending' FOR UPDATE
    `;
    let queryParams: any[] = [withdrawId];

    if (visibleUserIds === null) {
      // no filter
    } else if (visibleUserIds.length > 0) {
      checkQuery += ` AND w.user_id = ANY($2)`;
      queryParams.push(visibleUserIds);
    } else {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: '提现记录不存在或状态已变更' });
    }

    const checkRes = await pool.query(checkQuery, queryParams);

    if (checkRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: '提现记录不存在或状态已变更' });
    }
    
    const record = checkRes.rows[0];

    // 退还余额
    await pool.query(`
      UPDATE public.wallets SET balance = balance + $1 WHERE user_id = $2
    `, [record.amount, record.user_id]);

    await pool.query(`
      UPDATE public.withdrawals SET status = 'rejected', updated_at = NOW() WHERE id = $1
    `, [withdrawId]);

    await pool.query('COMMIT');
    res.json({ success: true, message: '已拒绝并退还余额' });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: '操作失败' });
  }
});

// 标记为已打款
app.post('/api/merchant/withdraw/:id/pay', authMiddleware, supervisorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const withdrawId = req.params.id;
    const visibleUserIds = await getVisibleUserIds(req.user.id, req.user.role);

    let checkQuery = `
      SELECT w.* FROM public.withdrawals w
      JOIN public.users u ON w.user_id = u.id
      WHERE w.id = $1 AND (w.status = 'pending' OR w.status = 'approved')
    `;
    let queryParams: any[] = [withdrawId];

    if (visibleUserIds === null) {
      // no filter
    } else if (visibleUserIds.length > 0) {
      checkQuery += ` AND w.user_id = ANY($2)`;
      queryParams.push(visibleUserIds);
    } else {
      return res.status(404).json({ error: '提现记录不存在或状态不正确' });
    }

    const checkRes = await pool.query(checkQuery, queryParams);

    if (checkRes.rows.length === 0) return res.status(404).json({ error: '提现记录不存在或状态不正确' });

    await pool.query(`UPDATE public.withdrawals SET status = 'paid', updated_at = NOW() WHERE id = $1`, [withdrawId]);
    res.json({ success: true, message: '已标记为已打款' });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

// ---------- 设置 API ----------
// 获取商户设置
app.get('/api/admin/payment-config', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT superpay_merchant_on, superpay_merchant_key, superpay_test_amount, jiujiu_api_url, jiujiu_mch_id, jiujiu_secret_key, jiujiu_test_amount, phpwc_pid, phpwc_secret_key, phpwc_api_url, phpwc_test_amount FROM public.users WHERE role = 'manager' LIMIT 1
    `);

    res.json({
      superpayMerchantOn: result.rows[0]?.superpay_merchant_on || '',
      superpayMerchantKey: result.rows[0]?.superpay_merchant_key || '',
      superpayTestAmount: result.rows[0]?.superpay_test_amount || config.superpayTestAmount,
      jiujiuApiUrl: result.rows[0]?.jiujiu_api_url || config.jiujiuApiUrl,
      jiujiuMchId: result.rows[0]?.jiujiu_mch_id || '',
      jiujiuSecretKey: result.rows[0]?.jiujiu_secret_key || '',
      jiujiuTestAmount: result.rows[0]?.jiujiu_test_amount || config.jiujiuTestAmount,
      phpwcPid: result.rows[0]?.phpwc_pid || '',
      phpwcSecretKey: result.rows[0]?.phpwc_secret_key || '',
      phpwcApiUrl: result.rows[0]?.phpwc_api_url || '',
      phpwcTestAmount: result.rows[0]?.phpwc_test_amount || config.phpwcTestAmount
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({ error: '获取支付配置失败' });
  }
});

// 更新商户设置
app.put('/api/admin/payment-config', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { superpayMerchantOn, superpayMerchantKey, superpayTestAmount, jiujiuApiUrl, jiujiuMchId, jiujiuSecretKey, jiujiuTestAmount, phpwcPid, phpwcSecretKey, phpwcApiUrl, phpwcTestAmount } = req.body;

    // 将支付配置保存到经理账户上（全局配置）
    await pool.query(`
      UPDATE public.users SET
        superpay_merchant_on = $1,
        superpay_merchant_key = $2,
        superpay_test_amount = $3,
        jiujiu_api_url = $4,
        jiujiu_mch_id = $5,
        jiujiu_secret_key = $6,
        jiujiu_test_amount = $7,
        phpwc_pid = $8,
        phpwc_secret_key = $9,
        phpwc_api_url = $10,
        phpwc_test_amount = $11,
        updated_at = NOW()
      WHERE role = 'manager'
    `, [superpayMerchantOn, superpayMerchantKey, superpayTestAmount, jiujiuApiUrl, jiujiuMchId, jiujiuSecretKey, jiujiuTestAmount, phpwcPid, phpwcSecretKey, phpwcApiUrl, phpwcTestAmount]);

    // 同步更新运行时配置，使其立即生效
    if (superpayMerchantOn) config.superpayMerchantOn = superpayMerchantOn;
    if (superpayMerchantKey) config.superpayMerchantKey = superpayMerchantKey;
    if (superpayTestAmount !== undefined) config.superpayTestAmount = superpayTestAmount;
    if (jiujiuApiUrl) config.jiujiuApiUrl = jiujiuApiUrl;
    if (jiujiuMchId) config.jiujiuMchId = jiujiuMchId;
    if (jiujiuSecretKey) config.jiujiuAppSecret = jiujiuSecretKey;
    if (jiujiuTestAmount !== undefined) config.jiujiuTestAmount = jiujiuTestAmount;
    if (phpwcPid) config.phpwcPid = phpwcPid;
    if (phpwcSecretKey) config.phpwcSecretKey = phpwcSecretKey;
    if (phpwcApiUrl !== undefined) config.phpwcApiUrl = phpwcApiUrl;
    if (phpwcTestAmount !== undefined) config.phpwcTestAmount = phpwcTestAmount;

    // 注入到 global 供服务读取
    (global as any).paymentConfig = config;

    res.json({ message: '配置已更新并生效' });
  } catch (error) {
    console.error('Update payment config error:', error);
    res.status(500).json({ error: '更新支付配置失败' });
  }
});

// 获取支付通道列表
app.get('/api/admin/payment-channels', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT value FROM public.system_configs WHERE key = 'payment_channels' LIMIT 1
    `);
    
    let channels = [];
    if (result.rows.length > 0) {
      try {
        channels = JSON.parse(result.rows[0].value);
      } catch (e) {
        console.error('Failed to parse payment channels', e);
      }
    }
    res.json(channels);
  } catch (error) {
    console.error('Get payment channels error:', error);
    res.status(500).json({ error: '获取支付通道失败' });
  }
});

// 更新支付通道列表
app.put('/api/admin/payment-channels', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const channels = req.body;
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: '数据格式错误，应为数组' });
    }

    const value = JSON.stringify(channels);
    await pool.query(
      `INSERT INTO public.system_configs (key, value, description) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (key) DO UPDATE 
       SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW()`,
      ['payment_channels', value, '动态支付通道配置']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update payment channels error:', error);
    res.status(500).json({ error: '更新支付通道失败' });
  }
});

// 重新生成密钥
app.post('/api/settings/regenerate-key', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const newSecretKey = crypto.randomBytes(16).toString('hex');

    await pool.query('UPDATE public.users SET secret_key = $1, updated_at = NOW() WHERE id = $2', [newSecretKey, req.user.id]);

    res.json({ secretKey: newSecretKey });
  } catch (error) {
    console.error('Regenerate key error:', error);
    res.status(500).json({ error: '重新生成密钥失败' });
  }
});

// 测试 SuperPay 配置
app.post('/api/settings/test-superpay', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { merchantOn, merchantKey, testAmount } = req.body;

    if (!merchantOn || !merchantKey) {
      return res.status(400).json({ error: '请提供商户号和密钥' });
    }

    const { createSuperPayOrder } = await import('./src/services/superPay.js');
    
    const projectDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:${config.port}`;
    const testOrderId = `TEST${Date.now()}`;

    const amountNumber = parseFloat(String(testAmount || config.superpayTestAmount || '100.00'));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ error: '测试金额不合法' });
    }
    const amount = amountNumber.toFixed(2);

    const payResult = await createSuperPayOrder({
      merchantOn,
      merchantKey,
      amount,
      orderSn: testOrderId,
      channelCode: '824',
      notifyUrl: `${projectDomain}/api/orders/callback`,
      returnUrl: `${projectDomain}/payment/result?orderId=${testOrderId}`,
      uid: 'test_uid'
    }, config.superpayBaseUrl);

    console.log('SuperPay test response:', JSON.stringify(payResult));

    if (payResult.success) {
      res.json({
        success: true,
        payUrl: payResult.jumpUrl
      });
    } else {
      res.json({
        success: false,
        error: payResult.error || '商户配置错误或未开通代收渠道'
      });
    }
  } catch (error) {
    console.error('Test SuperPay error:', error);
    res.status(500).json({ error: '测试失败，请检查商户配置' });
  }
});

// 测试九久支付配置
app.post('/api/settings/test-jiujiu', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { mchId, secretKey, testAmount, channelCode, apiUrl } = req.body;

    if (!mchId || !secretKey) {
      return res.status(400).json({ error: '请提供商户ID和密钥' });
    }

    const { createWechatOrder } = await import('./src/services/wechatPay.js');
    
    // 临时覆盖全局配置进行测试
    const originalMchId = config.jiujiuMchId;
    const originalSecret = config.jiujiuAppSecret;
    const originalApiUrl = config.jiujiuApiUrl;
    
    config.jiujiuMchId = mchId;
    config.jiujiuAppSecret = secretKey;
    if (apiUrl) config.jiujiuApiUrl = apiUrl;

    try {
      const orderId = `TEST${Date.now()}`;
      const projectDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:${config.port}`;

      const amountNumber = parseFloat(String(testAmount || config.jiujiuTestAmount || '1.00'));
      if (!Number.isFinite(amountNumber) || amountNumber < 1 || amountNumber > 20) {
        return res.status(400).json({ error: '测试金额需在 1.00 ~ 20.00 之间' });
      }
      
      const payResult = await createWechatOrder({
        orderId,
        amount: amountNumber,
        productName: '九久支付通道连通性测试',
        notifyUrl: `${projectDomain}/api/orders/wechat/callback`,
        callbackUrl: `${projectDomain}/payment/result?orderId=${orderId}`,
        channelCode: channelCode || '6007',
      });

      if (payResult.success) {
        res.json({
          success: true,
          payUrl: payResult.payUrl || '',
          formHtml: payResult.formHtml || ''
        });
      } else {
        res.json({
          success: false,
          error: payResult.error || '创建测试订单失败'
        });
      }
    } finally {
      // 恢复原配置
      config.jiujiuMchId = originalMchId;
      config.jiujiuAppSecret = originalSecret;
      config.jiujiuApiUrl = originalApiUrl;
    }
  } catch (error) {
    console.error('Test JiuJiu error:', error);
    res.status(500).json({ error: '测试失败，内部错误' });
  }
});

// 测试 PHPWC (易支付) 支付通道连通性
app.post('/api/settings/test-phpwc', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { pid, secretKey, apiUrl, testAmount, type } = req.body;

    if (!pid || !secretKey) {
      return res.status(400).json({ error: '请提供商户PID和密钥' });
    }

    const { createPhpwcOrder } = await import('./src/services/phpwcPay.js');

    const projectDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:${config.port}`;
    const testOrderId = `TEST${Date.now()}`;

    const money = pid === '199' ? '0.1' : String(testAmount || config.phpwcTestAmount || '1.00');
    const moneyNumber = parseFloat(money);
    if (!Number.isFinite(moneyNumber) || moneyNumber <= 0) {
      return res.status(400).json({ error: '测试金额不合法' });
    }

    const payType = typeof type === 'string' && type.trim() ? type.trim() : 'wxpay';

    const payResult = await createPhpwcOrder({
      pid,
      secretKey,
      apiUrl,
      type: payType,
      outTradeNo: testOrderId,
      notifyUrl: `${projectDomain}/api/orders/phpwc/callback`,
      returnUrl: `${projectDomain}/payment/result?orderId=${testOrderId}`,
      name: 'PHPWC易支付通道连通性测试',
      money: moneyNumber.toFixed(2)
    });

    console.log('PHPWC test response:', JSON.stringify(payResult));

    if (payResult.success) {
      res.json({
        success: true,
        pay_url: payResult.payUrl
      });
    } else {
      res.json({ success: false, error: payResult.error || '测试失败：请检查配置是否正确' });
    }

  } catch (error) {
    console.error('PHPWC test error:', error);
    res.status(500).json({ error: '测试请求异常，请查看服务器日志' });
  }
});

// 获取 SuperPay 渠道编码
app.get('/api/superpay/channels', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userResult = await pool.query('SELECT superpay_merchant_on, superpay_merchant_key FROM public.users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (!user?.superpay_merchant_on || !user?.superpay_merchant_key) {
      return res.status(400).json({ error: '请先配置 SuperPay 商户信息' });
    }

    const { generateSuperPaySign } = await import('./src/services/superPay.js');
    
    // 尝试两种方式查询渠道编码
    // 方式1: 不带参数查询（只传签名）
    const sign = generateSuperPaySign({}, user.superpay_merchant_key);
    
    // 方式2: 带 merchant_on 参数查询
    const signWithMerchant = generateSuperPaySign({ merchant_on: user.superpay_merchant_on }, user.superpay_merchant_key);

    // 先尝试方式2
    let response = await fetch(`${config.superpayBaseUrl}/api/collecting/channelCode?merchant_on=${user.superpay_merchant_on}&sign=${signWithMerchant}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'merchant_on': user.superpay_merchant_on,
      },
    });

    let result = await response.json();
    console.log('SuperPay channels (with merchant_on):', JSON.stringify(result));

    // 如果返回空，尝试方式1
    if (!result.success || !result.items || result.items.length === 0) {
      response = await fetch(`${config.superpayBaseUrl}/api/collecting/channelCode?sign=${sign}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': user.superpay_merchant_on,
        },
      });
      result = await response.json();
      console.log('SuperPay channels (without merchant_on):', JSON.stringify(result));
    }

    if (result.success && result.items) {
      res.json(result.items);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: '获取渠道编码失败' });
  }
});

// ==================== 海报生成 API ====================
// 生成商品分享海报
app.post('/api/poster/generate', async (req: Request, res: Response) => {
  try {
    const lang = req.query.lang as string || 'zh';
    const { productId, template, shareUid }: { productId: string; template?: PosterTemplate; shareUid?: string } = req.body;

    if (!productId) {
      return res.status(400).json({ error: '请提供商品 ID' });
    }

    // 查询商品信息
    const result = await pool.query(`
      SELECT id, name, price, original_price, description, image FROM public.products WHERE id = $1
    `, [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '商品不存在' });
    }

    const product = result.rows[0];
    const usedTemplate = template || 'default';

    // 生成商品页面 URL（使用项目域名，并带上模板参数和分享者ID）
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:${config.port}`;
    let productUrl = `${domain}/h5/${productId}?template=${usedTemplate}`;
    if (shareUid) {
      productUrl += `&uid=${shareUid}`;
    }

    // 生成二维码 base64 图片
    const qrBase64 = await QRCode.toDataURL(productUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    // 处理商品图片URL（如果是相对路径，转换为完整URL）
    let imageUrl = product.image;
    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = `${domain}${imageUrl}`;
    }

    // 调用海报生成服务
    const posterBuffer = await generatePoster(
      {
        name: product.name,
        price: Number(product.price),
        originalPrice: product.original_price ? Number(product.original_price) : undefined,
        description: product.description,
        image: imageUrl,
        qrUrl: qrBase64,  // 传递 base64 二维码图片
      },
      usedTemplate,
      lang
    );

    // 返回 PNG 图片
    res.set('Content-Type', 'image/png');
    res.send(posterBuffer);
  } catch (error) {
    console.error('Generate poster error:', error);
    res.status(500).json({ error: '生成海报失败：' + (error as Error).message });
  }
});

// ==================== 静态文件服务 ====================
// 提供前端静态文件
const distPath = path.join(__dirname, 'dist');

// 检查 dist/index.html 是否存在
if (!fs.existsSync(path.join(distPath, 'index.html'))) {
  console.warn('⚠️ WARNING: dist/index.html not found!');
  console.warn(`Expected at: ${path.join(distPath, 'index.html')}`);
  console.warn('Please run: pnpm build');
}

app.use(express.static(distPath, { 
  maxAge: config.nodeEnv === 'production' ? '1d' : '0',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// SPA 回退 (处理 /, /h5/*, /checkout/*, /payment/result 等前端路由)
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // 跳过 API 路由
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).json({
      error: 'Frontend build not found',
      message: 'Please run: pnpm build',
      path: indexPath
    });
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(indexPath);
});

// ==================== 错误处理 ====================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  if (err.name === 'MulterError') {
    const mErr = err as any;
    if (mErr.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '图片过大，请上传小于 20MB 的照片' });
    }
  }
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ==================== 启动服务 ====================
async function start() {
  try {
    console.log('Starting server...');
    console.log('Working directory:', __dirname);
    console.log('ENCRYPTION_KEY:', config.encryptionKey ? 'set' : 'not set');

    if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-key') {
      throw new Error('FATAL: JWT_SECRET is not set in production. Using default secret is extremely dangerous!');
    }

    // 初始化数据库
    await initDatabase();

    try {
      const result = await pool.query(`SELECT superpay_merchant_on, superpay_merchant_key, superpay_test_amount, jiujiu_api_url, jiujiu_mch_id, jiujiu_secret_key, jiujiu_test_amount, phpwc_pid, phpwc_secret_key, phpwc_api_url, phpwc_test_amount FROM public.users WHERE role = 'manager' LIMIT 1`);
      if (result.rows.length > 0) {
        config.superpayMerchantOn = result.rows[0].superpay_merchant_on || config.superpayMerchantOn;
        config.superpayMerchantKey = result.rows[0].superpay_merchant_key || config.superpayMerchantKey;
        config.superpayTestAmount = result.rows[0].superpay_test_amount || config.superpayTestAmount;
        config.jiujiuApiUrl = result.rows[0].jiujiu_api_url || config.jiujiuApiUrl;
        config.jiujiuMchId = result.rows[0].jiujiu_mch_id || config.jiujiuMchId;
        config.jiujiuAppSecret = result.rows[0].jiujiu_secret_key || config.jiujiuAppSecret;
        config.jiujiuTestAmount = result.rows[0].jiujiu_test_amount || config.jiujiuTestAmount;
        config.phpwcPid = result.rows[0].phpwc_pid || config.phpwcPid;
        config.phpwcSecretKey = result.rows[0].phpwc_secret_key || config.phpwcSecretKey;
        config.phpwcApiUrl = result.rows[0].phpwc_api_url || config.phpwcApiUrl;
        config.phpwcTestAmount = result.rows[0].phpwc_test_amount || config.phpwcTestAmount;
        (global as any).paymentConfig = config;
        console.log('Loaded payment config from database');
      } else {
        (global as any).paymentConfig = config;
      }
    } catch (e) {
      console.error('Failed to load payment config', e);
      (global as any).paymentConfig = config;
    }

    // 启动 HTTP 服务
    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`NODE_ENV: ${config.nodeEnv}`);
      console.log(`Database URL: ${config.databaseUrl ? 'configured' : 'not configured'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
