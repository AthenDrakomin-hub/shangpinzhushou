/**
 * SuperPay 支付网关工具类
 * API 文档: assets/SuperPay对接文档.md
 * 
 * 环境变量配置：
 * - SUPERPAY_BASE_URL: SuperPay API 基础地址（必需）
 */

import crypto from 'crypto';

// SuperPay 配置
export interface SuperPayConfig {
  merchantOn: string;      // 商户号
  merchantKey: string;     // 商户密钥
  baseUrl: string;         // API 基础 URL（从环境变量读取）
  timeout?: number;        // 请求超时时间（毫秒）
}

// 日志级别
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志记录函数
const log = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[SuperPay][${timestamp}][${level.toUpperCase()}]`;
  
  if (data !== undefined) {
    console.log(prefix, message, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
};

// ==================== 代收相关类型 ====================

// 发起支付请求参数
export interface CollectingPayRequest {
  amount: string;          // 订单金额(元)
  order_sn: string;        // 商户单号，唯一
  notify_url?: string;     // 异步通知地址
  return_url?: string;     // 同步跳转地址
  extend?: string;         // 商户扩展参数
  channel_code: string;    // 渠道编码
  channel_type_code?: string; // 渠道类型编码
  uid: string;             // 用户标识
  remark?: string;         // 备注
}

// 发起支付响应
export interface CollectingPayResponse {
  success: boolean;
  code: number;
  error_message: string;
  items?: {
    amount: string;
    address?: string;      // 收款地址(USDT)
    created_at: string;
    end_time: string;
    jump_url: string;      // 支付地址
    uid: string;
    order_sn: string;
  };
}

// 查单响应
export interface CollectingQueryResponse {
  success: boolean;
  code: number;
  error_message: string;
  items?: {
    uid: string;
    order_sn: string;
    state: number;         // 0-待支付,1-已失败,2-已超时,3-已支付
    amount: string;
    rate: string;
    payment_amount: number;
    payment_date: string | null;
    created_at: string;
  };
}

// 代收回调通知数据
export interface CollectingCallbackData {
  uid: string;
  order_sn: string;
  state: number;          // 0-待支付,1-已失败,2-已超时,3-已支付
  amount: string;
  payment_amount: string;
  rate: string;
  created_at: string;
  payment_date: string | null;
  sign: string;
}

// 渠道编码
export interface ChannelCode {
  code: string;
  name: string;
  min_amount: string | null;
  max_amount: string | null;
  point_amount: string | null;
  remark: string | null;
}

// 渠道类型编码
export interface ChannelTypeCode {
  id: number;
  parent_id: number;
  name: string;
  code: string;
  children?: ChannelTypeCode[];
}

// ==================== 代付相关类型 ====================

// 代付提交订单请求
export interface ReceiptCreateRequest {
  amount: number;          // 代付金额(元)
  order_sn: string;        // 商户订单号
  channel_code: string;    // 渠道编码
  bank_code?: string;      // 银行编码
  bank_name?: string;      // 银行名称(支付宝/微信填对应名称)
  bank_card: string;       // 银行卡号/支付宝账号/微信账号
  bank_owner: string;      // 持卡人姓名/账号实名姓名
  bank_addr?: string;      // 银行支行
  client_ip: string;       // 客户端下单IP
  notify_url?: string;     // 异步通知地址
  extend?: string;         // 商户扩展参数
  remark?: string;         // 备注
  scan_payment?: string;   // 收款码图片地址(扫码收款时必须)
}

// 代付提交响应
export interface ReceiptCreateResponse {
  success: boolean;
  code: number;
  error_message: string;
  items?: {
    amount: string;
    order_sn: string;
  };
}

// 代付查单响应
export interface ReceiptQueryResponse {
  success: boolean;
  code: number;
  error_message: string;
  items?: {
    order_sn: string;
    state: number;         // 0-待支付,1-已失败,2-已超时,3-已支付
    amount: number;
    rate: number;
    item_amount: number;
    payment_amount: number;
    payment_date: string | null;
    created_at: string;
  };
}

// 代付回调通知数据
export interface ReceiptCallbackData {
  order_sn: string;
  state: number;
  amount: number;
  payment_amount: number;
  rate: number;
  item_amount: number;
  created_at: string;
  payment_date: string | null;
  sign: string;
}

// 银行编码
export interface BankCode {
  label: string;           // 银行名称
  value: string;           // 银行编码
}

/**
 * SuperPay 支付网关类
 */
export class SuperPay {
  private config: SuperPayConfig;
  private timeout: number;

  constructor(config: SuperPayConfig) {
    this.config = config;
    this.timeout = config.timeout || 30000; // 默认 30 秒超时
  }

  /**
   * 生成签名
   * 签名规则：
   * 1. 将非空参数按 ASCII 码从小到大排序（字典序）
   * 2. 拼接成 key1=value1&key2=value2 格式
   * 3. 最后拼接 key=商户密钥
   * 4. MD5 加密并转大写
   */
  generateSign(data: Record<string, any>): string {
    // 过滤空值和 sign 字段
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== '' && value !== null && value !== undefined && key !== 'sign' && key !== 'SIGN') {
        filteredData[key] = value;
      }
    }

    // 按 key 排序（字典序）
    const sortedKeys = Object.keys(filteredData).sort();

    // 拼接字符串
    const stringA = sortedKeys.map(key => `${key}=${filteredData[key]}`).join('&');
    const stringSignTemp = `${stringA}&key=${this.config.merchantKey}`;

    // MD5 加密并转大写
    const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
    
    log('debug', 'Sign generated', { stringA: stringA.substring(0, 100) + '...', sign });
    
    return sign;
  }

  /**
   * 验证签名
   */
  verifySign(data: Record<string, any>, signString: string): boolean {
    const expectedSign = this.generateSign(data);
    const isValid = expectedSign === signString;
    
    if (!isValid) {
      log('warn', 'Signature verification failed', { expected: expectedSign, received: signString });
    } else {
      log('debug', 'Signature verified successfully');
    }
    
    return isValid;
  }

  /**
   * 生成订单号（最大32位）
   */
  generateOrderSn(prefix: string = 'SP'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${timestamp}${random}${seq}`.substring(0, 32);
  }

  /**
   * 带超时的 fetch 请求
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== 代收接口 ====================

  /**
   * 代收提交订单
   * POST /api/collecting/pay
   */
  async createCollectingOrder(params: CollectingPayRequest): Promise<CollectingPayResponse> {
    const startTime = Date.now();
    const data: Record<string, any> = {
      merchant_on: this.config.merchantOn,
      ...params,
    };

    // 生成签名
    data.sign = this.generateSign(data);

    log('info', 'Creating collecting order', { 
      order_sn: data.order_sn, 
      amount: data.amount,
      channel_code: data.channel_code 
    });

    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/collecting/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json() as CollectingPayResponse;
      
      const duration = Date.now() - startTime;
      if (result.success) {
        log('info', `Order created successfully in ${duration}ms`, { 
          order_sn: result.items?.order_sn,
          jump_url: result.items?.jump_url,
          end_time: result.items?.end_time
        });
      } else {
        log('error', `Order creation failed in ${duration}ms`, { 
          code: result.code, 
          error: result.error_message 
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      log('error', `Order creation error after ${duration}ms`, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        code: -1,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  /**
   * 代收查单
   * GET /api/collecting/pay
   */
  async queryCollectingOrder(orderSn: string): Promise<CollectingQueryResponse> {
    const startTime = Date.now();
    const data: Record<string, any> = {
      merchant_on: this.config.merchantOn,
      order_sn: orderSn,
    };

    // 生成签名
    data.sign = this.generateSign(data);

    log('debug', 'Querying order', { order_sn: orderSn });

    try {
      const queryParams = new URLSearchParams({
        order_sn: orderSn,
        sign: data.sign,
      }).toString();

      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/collecting/pay?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
      });

      const result = await response.json() as CollectingQueryResponse;
      
      const duration = Date.now() - startTime;
      log('debug', `Order query completed in ${duration}ms`, { 
        order_sn: orderSn,
        state: result.items?.state 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      log('error', `Order query error after ${duration}ms`, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        code: -1,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  /**
   * 获取代收渠道编码列表
   * GET /api/collecting/channelCode
   */
  async getChannelCodes(typeId?: string): Promise<{ success: boolean; items?: ChannelCode[]; error_message?: string }> {
    const startTime = Date.now();
    const data: Record<string, any> = {
      merchant_on: this.config.merchantOn,
    };
    
    if (typeId) {
      data.type_id = typeId;
    }

    // 生成签名
    data.sign = this.generateSign(data);

    log('info', 'Fetching channel codes');

    try {
      const queryParams = new URLSearchParams({
        merchant_on: data.merchant_on,
        sign: data.sign,
      }).toString();

      const response = await fetch(`${this.config.baseUrl}/api/collecting/channelCode?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
      });

      const result = await response.json();
      
      const duration = Date.now() - startTime;
      log('info', `Channel codes fetched in ${duration}ms`, { count: result.items?.length });
      
      return result;
    } catch (error) {
      log('error', 'Get channel codes error', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  /**
   * 获取代收渠道类型编码列表
   * GET /api/collecting/channelTypeCode
   */
  async getChannelTypeCodes(): Promise<{ success: boolean; items?: ChannelTypeCode[]; error_message?: string }> {
    const data: Record<string, any> = {
      merchant_on: this.config.merchantOn,
    };
    
    // 生成签名
    data.sign = this.generateSign(data);
    
    try {
      const queryParams = new URLSearchParams({
        merchant_on: data.merchant_on,
        sign: data.sign,
      }).toString();
      
      const response = await fetch(`${this.config.baseUrl}/api/collecting/channelTypeCode?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      log('error', 'Get channel type codes error', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  // ==================== 代付接口 ====================

  /**
   * 代付提交订单
   * POST /api/receipt/create
   */
  async createReceiptOrder(params: ReceiptCreateRequest): Promise<ReceiptCreateResponse> {
    const startTime = Date.now();
    const data: Record<string, any> = {
      merchant_on: this.config.merchantOn,
      ...params,
    };

    // 生成签名
    data.sign = this.generateSign(data);

    log('info', 'Creating receipt order', { 
      order_sn: data.order_sn, 
      amount: data.amount,
      channel_code: data.channel_code 
    });

    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/receipt/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json() as ReceiptCreateResponse;
      
      const duration = Date.now() - startTime;
      if (result.success) {
        log('info', `Receipt order created in ${duration}ms`, { 
          order_sn: result.items?.order_sn,
          amount: result.items?.amount
        });
      } else {
        log('error', `Receipt order failed in ${duration}ms`, { 
          code: result.code, 
          error: result.error_message 
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      log('error', `Receipt order error after ${duration}ms`, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        code: -1,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  /**
   * 代付查单
   * GET /api/receipt/query
   */
  async queryReceiptOrder(orderSn: string): Promise<ReceiptQueryResponse> {
    const startTime = Date.now();
    const data: Record<string, any> = {
      merchant_on: this.config.merchantOn,
      order_sn: orderSn,
    };

    // 生成签名
    data.sign = this.generateSign(data);

    log('debug', 'Querying receipt order', { order_sn: orderSn });

    try {
      const queryParams = new URLSearchParams({
        order_sn: orderSn,
        sign: data.sign,
      }).toString();

      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/receipt/query?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
      });

      const result = await response.json() as ReceiptQueryResponse;
      
      const duration = Date.now() - startTime;
      log('debug', `Receipt query completed in ${duration}ms`, { 
        order_sn: orderSn,
        state: result.items?.state 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      log('error', `Receipt query error after ${duration}ms`, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        code: -1,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  /**
   * 获取银行编码列表
   * GET /api/receipt/bank
   */
  async getBankCodes(): Promise<{ success: boolean; items?: BankCode[]; error_message?: string }> {
    const data: Record<string, any> = {};

    // 生成签名
    data.sign = this.generateSign(data);

    log('info', 'Fetching bank codes');

    try {
      const queryParams = new URLSearchParams({
        sign: data.sign,
      }).toString();

      const response = await fetch(`${this.config.baseUrl}/api/receipt/bank?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      log('error', 'Get bank codes error', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  // ==================== 商户接口 ====================

  /**
   * 查询商户余额
   * GET /api/balance
   */
  async getBalance(): Promise<{ success: boolean; items?: { balance: number; receipt: number }; error_message?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'merchant_on': this.config.merchantOn,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      log('error', 'Get balance error', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        error_message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }
}

