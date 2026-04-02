/**
 * 系统配置管理工具
 * 优先从数据库读取配置，降级到环境变量
 */

import { query } from '../db';

export interface PaymentConfig {
  pay_jiujiu_mchId?: string;
  pay_jiujiu_appSecret?: string;
  pay_jiujiu_apiUrl?: string;
  pay_superpay_baseUrl?: string;
}

// 内存缓存（避免频繁查库）
let cachedConfig: PaymentConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

/**
 * 获取支付配置（带缓存）
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const now = Date.now();
  
  // 使用缓存
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const result = await query(
      'SELECT key, value FROM system_config WHERE key LIKE $1',
      ['pay_%']
    );

    const config: PaymentConfig = {};
    result.rows.forEach(row => {
      if (row.value) {
        config[row.key as keyof PaymentConfig] = row.value;
      }
    });

    // 降级到环境变量
    cachedConfig = {
      pay_jiujiu_mchId: config.pay_jiujiu_mchId || process.env.JIUJIU_MCH_ID,
      pay_jiujiu_appSecret: config.pay_jiujiu_appSecret || process.env.JIUJIU_APP_SECRET,
      pay_jiujiu_apiUrl: config.pay_jiujiu_apiUrl || process.env.JIUJIU_API_URL,
      pay_superpay_baseUrl: config.pay_superpay_baseUrl || process.env.SUPERPAY_BASE_URL,
    };

    cacheTime = now;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load payment config from DB, using env:', error);
    
    // 降级到环境变量
    cachedConfig = {
      pay_jiujiu_mchId: process.env.JIUJIU_MCH_ID,
      pay_jiujiu_appSecret: process.env.JIUJIU_APP_SECRET,
      pay_jiujiu_apiUrl: process.env.JIUJIU_API_URL,
      pay_superpay_baseUrl: process.env.SUPERPAY_BASE_URL,
    };
    
    return cachedConfig;
  }
}

/**
 * 保存支付配置
 */
export async function savePaymentConfig(config: PaymentConfig): Promise<void> {
  const items = [
    { key: 'pay_jiujiu_mchId', value: config.pay_jiujiu_mchId },
    { key: 'pay_jiujiu_appSecret', value: config.pay_jiujiu_appSecret },
    { key: 'pay_jiujiu_apiUrl', value: config.pay_jiujiu_apiUrl },
    { key: 'pay_superpay_baseUrl', value: config.pay_superpay_baseUrl },
  ];

  for (const item of items) {
    if (item.value !== undefined) {
      await query(
        `INSERT INTO system_config (key, value, description, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [item.key, item.value, getConfigDescription(item.key)]
      );
    }
  }

  // 清除缓存
  cachedConfig = null;
  cacheTime = 0;
}

/**
 * 获取配置描述
 */
function getConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    pay_jiujiu_mchId: '九久支付商户号',
    pay_jiujiu_appSecret: '九久支付商户密钥',
    pay_jiujiu_apiUrl: '九久支付 API 地址',
    pay_superpay_baseUrl: 'SuperPay API 基础地址',
  };
  return descriptions[key] || '';
}

/**
 * 清除配置缓存（用于手动刷新）
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cacheTime = 0;
}
