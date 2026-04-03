// 数据库表结构类型定义

// ==================== 用户角色体系 ====================

/**
 * 用户角色
 * - manager: 经理，最高权限，管理所有用户和数据
 * - supervisor: 主管，管理商品和订单
 * - employee: 员工，有佣金分配
 */
export type UserRole = 'manager' | 'supervisor' | 'employee';

/**
 * 用户状态
 * - pending: 待审核（新注册商户）
 * - approved: 已通过
 * - disabled: 已禁用
 */
export type UserStatus = 'pending' | 'approved' | 'disabled';

/**
 * 用户表
 */
export interface User {
  id: string;
  email: string;
  encrypted_password: string | null;
  display_name: string | null;
  avatar_url: string | null;
  
  // 角色体系
  role: UserRole;
  merchant_id: string | null;  // 员工所属商户ID
  status: UserStatus;
  
  // 微信支付配置
  wechat_appid: string | null;
  wechat_mchid: string | null;
  wechat_key: string | null;        // 加密存储（API密钥）
  wechat_notify_url: string | null;
  
  // 支付宝配置
  alipay_appid: string | null;
  alipay_private_key: string | null;  // 加密存储
  alipay_public_key: string | null;
  alipay_notify_url: string | null;
  
  // 银行卡配置
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;  // 加密存储
  bank_branch: string | null;
  
  // SuperPay 配置
  superpay_merchant_on: string | null;
  superpay_merchant_key: string | null; // 加密存储
  
  // 其他
  default_pay_method: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * 用户创建参数（注册）
 */
export interface UserRegisterInput {
  email: string;
  password: string;
  display_name?: string;
  send_notification?: boolean;  // 是否发送邮件提醒系统管理员
}

/**
 * 员工创建参数（商户创建）
 */
export interface EmployeeCreateInput {
  email: string;
  password: string;
  display_name?: string;
}

// ==================== 其他表 ====================

export interface Order {
  id: string;
  order_id: string;
  creator_uid: string;
  amount: string;
  template_id: string;
  status: string;
  payer_info: string | null;
  created_at: string;
  paid_at: string | null;
  updated_at: string | null;
  
  // 商品关联
  user_id: string | null;      // 商品所属用户
  product_id: string | null;   // 商品ID
  
  // 支付信息
  pay_method: string | null;   // 支付方式：wechat, alipay, bank, superpay, usdt
  channel_code: string | null; // SuperPay 渠道编码
  
  // 订单过期
  expires_at: Date | null;     // 订单过期时间
  time_left: number | null;    // 剩余时间（秒），兼容旧字段
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  image_url: string | null;
  price: number;
  description: string | null;
  category: string | null;
  template_id: string | null;
  supported_pay_methods: string | null;
  views: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  updated_at: string;
}

export interface SecurityLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
