/**
 * SuperPay API 工具函数
 * 包含签名生成、API调用等功能
 */

// SuperPay API 基础URL
export const BASE_URL = 'https://hixrs.ibpee.com:13758';

/**
 * MD5 哈希实现（纯JavaScript）
 * 用于生成SuperPay签名
 */
function md5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md51(s: string) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++)
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');

  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++)
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f];
    return s;
  }

  function hex(x: number[]): string {
    const result: string[] = [];
    for (let i = 0; i < x.length; i++) result[i] = rhex(x[i]);
    return result.join('');
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }

  return hex(md51(string));
}

/**
 * 生成 SuperPay API 签名
 * @param data - 要签名的数据对象
 * @param key - 商户密钥
 * @returns 大写的MD5签名字符串
 */
export function generateSignature(data: Record<string, any>, key: string): string {
  const filteredData: Record<string, any> = {};
  
  // 过滤空值和sign字段
  for (const [field, value] of Object.entries(data)) {
    if (value !== '' && value !== null && value !== undefined && field !== 'sign' && field !== 'SIGN') {
      filteredData[field] = value;
    }
  }
  
  // 按key升序排序
  const sortedKeys = Object.keys(filteredData).sort();
  
  // 拼接字符串
  const stringA = sortedKeys
    .map(k => `${k}=${filteredData[k]}`)
    .join('&');
  
  // 追加密钥
  const stringSignTemp = stringA + (stringA ? '&' : '') + `key=${key}`;
  
  // MD5并转大写
  return md5(stringSignTemp).toUpperCase();
}

/**
 * 验证签名
 * @param data - 接收到的数据
 * @param sign - 签名字符串
 * @param key - 商户密钥
 */
export function verifySignature(data: Record<string, any>, sign: string, key: string): boolean {
  const expectedSign = generateSignature(data, key);
  return expectedSign === sign;
}

/**
 * 生成订单号
 * @param prefix - 订单前缀
 */
export function generateOrderSn(prefix: string = 'SP'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 32);
}

/**
 * SuperPay API 请求配置
 */
export interface SuperPayConfig {
  merchantOn: string;  // 商户号
  merchantKey: string; // 商户密钥
  baseUrl?: string;    // API地址
}

/**
 * 创建 SuperPay 收单订单
 */
export async function createCollectingOrder(
  config: SuperPayConfig,
  params: {
    amount: string;          // 金额（元）
    order_sn: string;        // 订单号
    channel_code: string;    // 渠道编码
    channel_type_code: string; // 渠道类型编码
    notify_url: string;      // 回调地址
    return_url?: string;     // 跳转地址
    uid?: string;            // 用户标识
    remark?: string;         // 备注
  }
): Promise<{
  success: boolean;
  code: number;
  error_message: string;
  items?: {
    amount: string;
    address?: string;
    created_at: string;
    end_time: string;
    jump_url: string;
    uid: string;
    order_sn: string;
  };
}> {
  const baseUrl = config.baseUrl || BASE_URL;
  
  const data: Record<string, any> = {
    merchant_on: config.merchantOn,
    ...params,
  };
  
  // 生成签名
  data.sign = generateSignature(data, config.merchantKey);
  
  try {
    const response = await fetch(`${baseUrl}/api/collecting/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant_on': config.merchantOn,
      },
      body: JSON.stringify(data),
    });
    
    return await response.json();
  } catch (error) {
    console.error('SuperPay API Error:', error);
    return {
      success: false,
      code: -1,
      error_message: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

/**
 * 查询订单状态
 */
export async function queryOrder(
  config: SuperPayConfig,
  orderSn: string
): Promise<{
  success: boolean;
  code: number;
  error_message: string;
  items?: {
    uid: string;
    order_sn: string;
    state: number; // 0-待支付,1-已失败,2-已超时,3-已支付
    amount: string;
    rate: string;
    payment_amount: number;
    payment_date: string | null;
    created_at: string;
  };
}> {
  const baseUrl = config.baseUrl || BASE_URL;
  
  const data: Record<string, any> = {
    merchant_on: config.merchantOn,
    order_sn: orderSn,
  };
  
  data.sign = generateSignature(data, config.merchantKey);
  
  try {
    const queryParams = new URLSearchParams({
      merchant_on: data.merchant_on,
      order_sn: data.order_sn,
      sign: data.sign,
    }).toString();
    
    const response = await fetch(`${baseUrl}/api/collecting/pay?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'merchant_on': config.merchantOn,
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('SuperPay Query Error:', error);
    return {
      success: false,
      code: -1,
      error_message: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

/**
 * 获取支付渠道列表
 */
export async function getChannelCodes(
  config: SuperPayConfig
): Promise<{
  success: boolean;
  code: number;
  error_message: string;
  items?: Array<{
    code: string;
    name: string;
    min_amount: string | null;
    max_amount: string | null;
  }>;
}> {
  const baseUrl = config.baseUrl || BASE_URL;
  
  const data: Record<string, any> = {
    merchant_on: config.merchantOn,
  };
  
  data.sign = generateSignature(data, config.merchantKey);
  
  try {
    const queryParams = new URLSearchParams({
      merchant_on: data.merchant_on,
      sign: data.sign,
    }).toString();
    
    const response = await fetch(`${baseUrl}/api/collecting/channelCode?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'merchant_on': config.merchantOn,
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('SuperPay Channel Error:', error);
    return {
      success: false,
      code: -1,
      error_message: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

/**
 * 查询商户余额
 */
export async function getBalance(
  config: SuperPayConfig
): Promise<{
  success: boolean;
  code: number;
  error_message: string;
  items?: {
    balance: number;
    receipt: number;
  };
}> {
  const baseUrl = config.baseUrl || BASE_URL;
  
  try {
    const response = await fetch(`${baseUrl}/api/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'merchant_on': config.merchantOn,
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('SuperPay Balance Error:', error);
    return {
      success: false,
      code: -1,
      error_message: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

/**
 * 订单状态映射
 */
export const ORDER_STATE_MAP: Record<number, { status: string; text: string }> = {
  0: { status: 'pending', text: '待支付' },
  1: { status: 'failed', text: '支付失败' },
  2: { status: 'expired', text: '已超时' },
  3: { status: 'paid', text: '支付成功' },
};

/**
 * 获取订单状态文本
 */
export function getOrderStateText(state: number): string {
  return ORDER_STATE_MAP[state]?.text || '未知状态';
}

/**
 * 获取订单状态
 */
export function getOrderStatus(state: number): string {
  return ORDER_STATE_MAP[state]?.status || 'unknown';
}
