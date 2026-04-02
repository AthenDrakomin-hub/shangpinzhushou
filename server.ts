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
  // 九久支付微信收款配置
  jiujiuApiUrl: process.env.JIUJIU_API_URL || 'http://bayq.hanyin.9jiupay.com',
  jiujiuMchId: process.env.JIUJIU_MCH_ID || '',
  jiujiuAppSecret: process.env.JIUJIU_APP_SECRET || '',
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
    // 生成唯一文件名：时间戳-随机数.扩展名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 只允许图片文件
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、GIF、WEBP 格式的图片'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制 5MB
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
          earnings_rate DECIMAL(5,4) DEFAULT 0.1,
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
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS earnings_rate DECIMAL(5,4) DEFAULT 0.1`);
        // 修复 created_by 的类型以兼容原本的 id 类型
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) REFERENCES public.users(id) ON DELETE SET NULL`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS superpay_merchant_on VARCHAR(100)`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS superpay_merchant_key VARCHAR(200)`);
      } catch (alterError) {
        console.log('添加列警告:', (alterError as Error).message);
      }
    }

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

// 管理员权限中间件（支持 admin 和 manager 角色）
const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'manager' && role !== 'admin') {
    return res.status(403).json({ error: '需要经理权限' });
  }
  next();
};

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

    if (result.rows[0].security_answer !== answer) {
      return res.status(400).json({ error: '密保问题答案错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE public.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, result.rows[0].id]);

    res.json({ message: '密码重置成功，请重新登录' });
  } catch (error) {
    res.status(500).json({ error: '密码重置失败' });
  }
});
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

    await pool.query(`
      UPDATE public.users 
      SET security_question = $1, security_answer = $2, updated_at = NOW() 
      WHERE id = $3
    `, [question, answer, req.user.id]);

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
    const result = await pool.query(`
      SELECT 
        id, user_id, name, image, price, original_price,
        description, category, template_id, is_shared,
        supported_pay_methods,
        views, stock, sales, status, created_at, updated_at
      FROM public.products 
      WHERE user_id = $1 OR is_shared = true OR $2 IN ('manager', 'admin', 'supervisor')
      ORDER BY created_at DESC
    `, [req.user.id, req.user.role]);

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
    const { name, price, original_price, description, image, stock, status, is_shared } = req.body;

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
        updated_at = NOW()
      WHERE id = $9
      RETURNING id, user_id, name, image, price, original_price,
        description, category, template_id, is_shared,
        supported_pay_methods,
        views, stock, sales, status, created_at, updated_at
    `, [name, price, original_price, description, image, stock, status, is_shared, req.params.id]);

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

    await pool.query('DELETE FROM public.products WHERE id = $1', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});

// ---------- 订单 API ----------
// 获取订单列表
app.get('/api/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 获取商品名称关联
    let query = `
      SELECT 
        o.id, o.user_id as "userId", o.product_id as "productId", 
        p.name as "productName",
        o.amount, o.payment_amount as "paymentAmount", o.status, 
        o.payer_info as "payerInfo",
        o.pay_method as "payMethod", o.channel_code as "channelCode",
        o.out_trade_no as "outTradeNo", o.order_id as "orderId",
        o.expires_at as "expiredAt",
        o.created_at as "createdAt", o.paid_at as "paidAt"
      FROM public.orders o
      LEFT JOIN public.products p ON o.product_id = p.id
      WHERE o.user_id = $1 OR $2 = 'manager'
    `;
    const params: any[] = [req.user.id, req.user.role];
    let paramIndex = 3;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // 获取总数
    let countQuery = `SELECT COUNT(*) FROM public.orders WHERE user_id = $1 OR $2 = 'manager'`;
    const countParams: any[] = [req.user.id, req.user.role];
    if (status) {
      countQuery += ` AND status = $3`;
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      orders: result.rows,
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
    const isManagerRole = ['manager', 'admin', 'super_admin'].includes(req.user.role);
    const userId = req.user.id;

    // 商品数量
    let productsQuery = 'SELECT COUNT(*) as count FROM public.products';
    if (!isManagerRole) {
      productsQuery += ' WHERE user_id = $1';
    }
    const productsResult = await pool.query(productsQuery, isManagerRole ? [] : [userId]);

    // 订单统计
    let ordersQuery = `
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'paid') as paid,
             COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as revenue
      FROM public.orders
    `;
    if (!isManagerRole) {
      ordersQuery += ' WHERE user_id = $1';
    }
    const ordersResult = await pool.query(ordersQuery, isManagerRole ? [] : [userId]);

    // 钱包余额
    const walletResult = await pool.query(`
      SELECT balance, total_earnings
      FROM public.wallets
      WHERE user_id = $1
    `, [userId]);

    // 最近7天销售数据
    let chartQuery = `
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as sales,
        COUNT(*) as orders
      FROM public.orders
      WHERE status = 'paid'
        AND created_at >= NOW() - INTERVAL '7 days'
    `;
    if (!isManagerRole) {
      chartQuery += ' AND user_id = $1';
    }
    chartQuery += ' GROUP BY DATE(created_at) ORDER BY date';
    const chartResult = await pool.query(chartQuery, isManagerRole ? [] : [userId]);

    // 最近订单
    let recentOrdersQuery = `
      SELECT o.id, p.name as product_name, o.amount, o.status, o.created_at, o.payer_info
      FROM public.orders o
      LEFT JOIN public.products p ON o.product_id = p.id
    `;
    if (!isManagerRole) {
      recentOrdersQuery += ' WHERE o.user_id = $1';
    }
    recentOrdersQuery += ' ORDER BY o.created_at DESC LIMIT 5';
    const recentOrdersResult = await pool.query(recentOrdersQuery, isManagerRole ? [] : [userId]);

    // 热销商品（通过订单数计算销量）
    let topProductsResult = { rows: [] };
    try {
      let topProductsQuery = `
        SELECT p.id, p.name, p.price, 
               COALESCE(p.image, '') as image,
               COALESCE(SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END), 0) as sales
        FROM public.products p
        LEFT JOIN public.orders o ON o.product_id = p.id
      `;
      
      const queryParams: any[] = [];
      if (!isManagerRole) {
        topProductsQuery += ' WHERE p.user_id = $1';
        queryParams.push(userId);
      }
      topProductsQuery += ' GROUP BY p.id, p.name, p.price, p.image ORDER BY sales DESC LIMIT 5';
      topProductsResult = await pool.query(topProductsQuery, queryParams);
    } catch (e) {
      console.error('Top products query error:', e);
    }

    // 用户总数（仅管理员可见）
    let usersCount = 0;
    if (isManagerRole) {
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM public.users');
      usersCount = parseInt(usersResult.rows[0].count);
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
    const { productId, payType, buyerName, buyerPhone, shareUid } = req.body;

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
    
    // 判断支付网关类型
    const isSuperPay = payType === 'alipay_superpay'; // 支付宝使用 SuperPay
    const isJiuJiu = payType === 'WXpay_SM'; // 微信使用九久支付
    
    let payUrl = '';
    const projectDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:${config.port}`;
    const notifyUrl = `${projectDomain}/api/orders/callback`;
    
    if (isSuperPay) {
      // ========== 使用 SuperPay（支付宝收款）==========
      const { createSuperPayOrder } = await import('./src/services/superPay.js');
      const merchantOn = config.superpayMerchantOn;
      const merchantKey = config.superpayMerchantKey;
      
      console.log('[订单创建] 使用 SuperPay 支付宝:', { merchantOn, hasKey: !!merchantKey });
      
      if (!merchantOn || !merchantKey) {
        return res.status(400).json({ error: 'SuperPay 支付配置未设置，请检查环境变量' });
      }
      
      // 检查金额是否在限额范围内 (渠道 824 限额 100-1000)
      const orderAmount = parseFloat(product.price);
      if (orderAmount < 100 || orderAmount > 1000) {
        return res.status(400).json({ error: '支付宝支付金额需在 100-1000 元之间' });
      }
      
      // 使用固定渠道编码 824 (正式通道)
      const channelCode = '824';
      console.log('[SuperPay] 使用渠道编码:', channelCode);
      
      const returnUrl = `${projectDomain}/payment/result?orderId=${orderId}`;
      
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
      
      const returnUrl = `${projectDomain}/payment/result?orderId=${orderId}`;
      const wechatNotifyUrl = `${projectDomain}/api/orders/wechat/callback`;
      
      const payResult = await createWechatOrder({
        orderId,
        amount: Number(product.price), // 确保传递数值类型
        productName: product.name,
        notifyUrl: wechatNotifyUrl,
        callbackUrl: returnUrl,
      });
      
      if (!payResult.success) {
        console.error('[九久支付] 创建订单失败:', payResult.error);
        return res.status(400).json({ error: payResult.error || '创建微信订单失败' });
      }
      
      payUrl = payResult.payUrl || '';
      console.log('[九久支付] 订单创建成功:', { orderId, payUrl: payUrl ? payUrl.substring(0, 50) + '...' : 'N/A' });
      
    } else {
      return res.status(400).json({ error: '不支持的支付方式' });
    }

    const finalBuyerName = buyerName || '匿名买家';
    const finalBuyerPhone = buyerPhone || '';

    // 创建本地订单记录（注意：服务器表有 order_id 字段）
    await pool.query(`
      INSERT INTO public.orders (id, order_id, user_id, product_id, product_name, amount, status, buyer_name, buyer_phone, pay_type, pay_url, expired_at)
      VALUES ($1, $1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, NOW())
    `, [orderId, orderUserId, productId, product.name, product.price, finalBuyerName, finalBuyerPhone, payType, payUrl]);

    res.status(201).json({
      orderId,
      payUrl: payUrl,
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
    
    // 根据 order_sn (商户单号) 查询订单
    const orderResult = await pool.query('SELECT * FROM public.orders WHERE id = $1', [order_sn]);
    
    if (orderResult.rows.length === 0) {
      console.error('Order not found:', order_sn);
      return res.status(404).send('fail');
    }

    const order = orderResult.rows[0];

    // 幂等性校验：如果订单已被处理，直接返回成功，防止重复加钱
    if (order.status === 'paid' || order.status === 'failed') {
      console.log('Order already processed:', order_sn, 'Current status:', order.status);
      return res.send('success');
    }

    // state: 0-待支付, 1-已失败, 2-已超时, 3-已支付
    if (state === 3) {
      await pool.query('BEGIN');
      
      // 支付成功
      await pool.query(`
        UPDATE public.orders SET 
          status = 'paid', 
          pay_url = NULL,
          paid_at = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [payment_date || new Date(), order_sn]);

      // 更新商品销量
      await pool.query(`
        UPDATE products SET sales = sales + 1 WHERE id = $1
      `, [order.product_id]);

      // 处理员工收益分成
      const employeeResult = await pool.query(`
        SELECT earnings_rate FROM public.users WHERE id = $1
      `, [order.user_id]);
      
      let rate = 0;
      if (employeeResult.rows.length > 0 && employeeResult.rows[0].earnings_rate) {
        rate = parseFloat(employeeResult.rows[0].earnings_rate);
      }
      
      // 如果员工有分成比例，并且大于 0
      if (rate > 0 && rate <= 100) {
        const profit = parseFloat(amount || order.amount) * (rate / 100);
        await pool.query(`
          UPDATE public.wallets SET 
            balance = balance + $1,
            total_earnings = total_earnings + $1,
            updated_at = NOW()
          WHERE user_id = $2
        `, [profit, order.user_id]);
        console.log(`[收益分成] 员工 ${order.user_id} 获得分成 ${profit} (比例: ${rate}%)`);
      } else {
        // 没有分成比例，全额入账
        await pool.query(`
          UPDATE public.wallets SET 
            balance = balance + $1,
            total_earnings = total_earnings + $1,
            updated_at = NOW()
          WHERE user_id = $2
        `, [amount || order.amount, order.user_id]);
      }

      await pool.query('COMMIT');
      console.log('Order paid successfully:', order_sn);
    } else if (state === 1 || state === 2) {
      // 失败或超时
      await pool.query(`UPDATE public.orders SET status = 'failed', updated_at = NOW() WHERE id = $1`, [order_sn]);
      console.log('Order failed:', order_sn, 'state:', state);
    }

    // 返回 success 表示处理成功
    res.send('success');
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

    // 获取订单号
    const orderId = params.outTradeNo || params.order_sn || params.out_trade_no;
    if (!orderId) {
      console.error('No order ID found in callback');
      return res.status(400).send('fail');
    }

    // 判断状态
    const status = params.status || params.tradeStatus || params.trade_status || params.state;
    // 九久支付通常回调就代表成功，如果有明确的状态字段，可以进一步判断
    const isSuccess = status ? (String(status).toUpperCase() === 'SUCCESS' || String(status) === '1' || String(status) === '3') : true;

    const orderResult = await pool.query('SELECT * FROM public.orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      console.error('Wechat Order not found:', orderId);
      return res.status(404).send('fail');
    }

    const order = orderResult.rows[0];

    // 幂等性校验
    if (order.status === 'paid' || order.status === 'failed') {
      console.log('Wechat Order already processed:', orderId, 'Current status:', order.status);
      return res.send('success');
    }

    if (isSuccess) {
      await pool.query(`
        UPDATE public.orders SET 
          status = 'paid', 
          pay_url = NULL,
          paid_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [orderId]);

      await pool.query(`
        UPDATE products SET sales = sales + 1 WHERE id = $1
      `, [order.product_id]);

      await pool.query(`
        UPDATE public.wallets SET 
          balance = balance + $1,
          total_earnings = total_earnings + $1,
          updated_at = NOW()
        WHERE user_id = $2
      `, [order.amount, order.user_id]);

      console.log('Wechat Order paid successfully:', orderId);
    } else {
      await pool.query(`UPDATE public.orders SET status = 'failed', updated_at = NOW() WHERE id = $1`, [orderId]);
      console.log('Wechat Order failed:', orderId);
    }

    res.send('success');
  } catch (error) {
    console.error('Wechat Order callback error:', error);
    res.status(500).send('fail');
  }
});

// 查询订单状态
app.get('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, status, amount, paid_at FROM public.orders WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    res.json(result.rows[0]);
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

// ---------- 用户管理 API (管理员) ----------
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
app.get('/api/merchant/employees', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 获取当前商户创建的所有员工
    const result = await pool.query(`
      SELECT id, email, display_name as name, role, status, created_at, updated_at, earnings_rate as profit_share_rate
      FROM public.users 
      WHERE created_by = $1 OR id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: '获取员工列表失败' });
  }
});

// 删除员工
app.delete('/api/merchant/employees/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.params.id;

    // 不能删除自己
    if (employeeId === req.user.id) {
      return res.status(400).json({ error: '不能删除自己' });
    }

    // 检查员工是否存在且是由当前商户创建的
    const existingResult = await pool.query(
      'SELECT * FROM public.users WHERE id = $1 AND created_by = $2',
      [employeeId, req.user.id]
    );
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

// ---------- 设置 API ----------
// 获取商户设置
app.get('/api/admin/payment-config', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT superpay_merchant_on, superpay_merchant_key FROM public.users WHERE role = 'manager' LIMIT 1
    `);

    res.json({
      superpayMerchantOn: result.rows[0]?.superpay_merchant_on || '',
      superpayMerchantKey: result.rows[0]?.superpay_merchant_key || '',
      jiujiuMchId: '', // 预留
      jiujiuSecretKey: '' // 预留
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({ error: '获取支付配置失败' });
  }
});

// 更新商户设置
app.put('/api/admin/payment-config', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { superpayMerchantOn, superpayMerchantKey } = req.body;

    // 将支付配置保存到经理账户上（全局配置）
    await pool.query(`
      UPDATE public.users SET 
        superpay_merchant_on = $1,
        superpay_merchant_key = $2,
        updated_at = NOW()
      WHERE role = 'manager'
    `, [superpayMerchantOn, superpayMerchantKey]);

    // 同步更新运行时配置，使其立即生效
    if (superpayMerchantOn) config.superpayMerchantOn = superpayMerchantOn;
    if (superpayMerchantKey) config.superpayMerchantKey = superpayMerchantKey;

    res.json({ message: '配置已更新并生效' });
  } catch (error) {
    console.error('Update payment config error:', error);
    res.status(500).json({ error: '更新支付配置失败' });
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
    const { merchantOn, merchantKey } = req.body;

    if (!merchantOn || !merchantKey) {
      return res.status(400).json({ error: '请提供商户号和密钥' });
    }

    const { generateSuperPaySign } = await import('./src/services/superPay.js');
    // 生成签名 - 需要包含 merchant_on 参数
    const sign = generateSuperPaySign({ merchant_on: merchantOn }, merchantKey);

    const response = await fetch(`${config.superpayBaseUrl}/api/collecting/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant_on': merchantOn,
      },
      body: JSON.stringify({
        merchant_on: merchantOn,
        amount: '1.00',
        order_sn: `TEST${Date.now()}`,
        notify_url: 'http://test.com/notify',
        uid: 'test_uid',
        sign
      }),
    });

    const result = await response.json();
    console.log('SuperPay test response:', JSON.stringify(result));

    if (result.success) {
      res.json({ 
        success: true, 
        balance: 0,
        channels: result.items || [],
        message: '商户配置正确' 
      });
    } else {
      res.json({ 
        success: false, 
        error: result.error_message || '商户配置错误或未开通代收渠道' 
      });
    }
  } catch (error) {
    console.error('Test SuperPay error:', error);
    res.status(500).json({ error: '测试失败，请检查商户配置' });
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
      usedTemplate
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

app.use(express.static(distPath, { maxAge: config.nodeEnv === 'production' ? '1d' : '0' }));

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

  res.sendFile(indexPath);
});

// ==================== 错误处理 ====================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: '服务器错误' });
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
