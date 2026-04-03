/**
 * 九久支付（微信收款）封装
 * 
 * 配置从环境变量读取：
 * - JIUJIU_MCH_ID: 商户号
 * - JIUJIU_APP_SECRET: 商户密钥 (APIKEY)
 * - JIUJIU_API_URL: 网关地址 (如 http://bayq.hanyin.9jiupay.com)
 */
import crypto from 'crypto';

export interface JiuJiuPayConfig {
  mchId: string;
  appSecret: string;
  apiUrl: string;
  notifyUrl?: string;
}

export interface CreateOrderParams {
  orderId: string;
  amount: number;
  productName: string;
  notifyUrl: string;
  callbackUrl: string;
}

export interface JiuJiuPayResult {
  success: boolean;
  payUrl?: string;
  formHtml?: string;  // 表单HTML，用于前端自动提交
  error?: string;
}

/**
 * 获取九久支付配置
 */
export function getJiujiuConfig(): JiuJiuPayConfig {
  // 如果 server.ts 中通过 import 或其他方式将 config 注入，可以通过 global 或传入参数的方式
  // 这里为了兼容并确保实时读取到最新的配置，可以动态去尝试获取 server.ts 里的 config
  let dynamicMchId = process.env.JIUJIU_MCH_ID || '';
  let dynamicAppSecret = process.env.JIUJIU_APP_SECRET || '';
  const apiUrl = process.env.JIUJIU_API_URL || 'http://bayq.hanyin.9jiupay.com';

  try {
    // 尝试读取全局可能注入的变量（在 server.ts 中可把 config 挂在 global 上）
    if ((global as any).paymentConfig) {
      const gConfig = (global as any).paymentConfig;
      if (gConfig.jiujiuMchId) dynamicMchId = gConfig.jiujiuMchId;
      if (gConfig.jiujiuAppSecret) dynamicAppSecret = gConfig.jiujiuAppSecret;
    }
  } catch (e) {
    // 忽略
  }

  return {
    mchId: dynamicMchId,
    appSecret: dynamicAppSecret,
    apiUrl: apiUrl
  };
}

/**
 * 生成签名
 * @param params - 要签名的参数对象
 * @param appSecret - 商户密钥
 */
function generateSign(params: Record<string, any>, appSecret: string): string {
  // 按字母排序
  const sortedKeys = Object.keys(params).sort();
  let signStr = '';
  
  for (const key of sortedKeys) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      signStr += `${key}=${params[key]}&`;
    }
  }
  
  signStr += `key=${appSecret}`;
  
  // MD5 加密并转大写
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
}

/**
 * 验证回调签名
 * @param params - 回调参数
 * @param sign - 签名值
 */
export function verifyCallbackSign(params: Record<string, any>, sign: string): boolean {
  const config = getJiujiuConfig();
  const generatedSign = generateSign(params, config.appSecret);
  return generatedSign === sign;
}

/**
 * 创建支付订单（微信扫码支付）
 * 使用表单提交方式跳转到支付网关
 * @param params - 订单参数
 */
export async function createWechatOrder(params: CreateOrderParams): Promise<JiuJiuPayResult> {
  try {
    const config = getJiujiuConfig();
    
    if (!config.mchId || !config.appSecret || !config.apiUrl) {
      return {
        success: false,
        error: '九久支付配置不完整，请检查环境变量 JIUJIU_MCH_ID、JIUJIU_APP_SECRET、JIUJIU_API_URL'
      };
    }

    // 构建请求参数（表单方式）
    const requestParams: Record<string, any> = {
      mchId: config.mchId,
      outTradeNo: params.orderId,
      totalAmount: (params.amount * 100).toFixed(0), // 单位：分
      body: params.productName,
      notifyUrl: params.notifyUrl,
      returnUrl: params.callbackUrl,
      payType: 'WX_NATIVE', // 微信扫码支付
      timestamp: Date.now().toString()
    };

    // 生成签名
    const sign = generateSign(requestParams, config.appSecret);
    
    // 完整的请求参数
    const fullParams = {
      ...requestParams,
      sign
    };

    console.log('Creating JiuJiu Pay order:', {
      ...fullParams,
      appSecret: '***'
    });

    // 构建支付网关URL和表单HTML
    const gatewayUrl = `${config.apiUrl}/Pay_Index.html`;
    
    // 生成自动提交的表单HTML，前端可以直接使用
    const formHtml = `
      <form id="jiujiu-pay-form" action="${gatewayUrl}" method="POST" style="display:none;">
        ${Object.entries(fullParams).map(([key, value]) => 
          `<input type="hidden" name="${key}" value="${value}">`
        ).join('\n        ')}
      </form>
      <script>document.getElementById('jiujiu-pay-form').submit();</script>
    `;

    return {
      success: true,
      payUrl: gatewayUrl,
      formHtml: formHtml
    };
  } catch (error: any) {
    console.error('Create JiuJiu Pay order error:', error.message);
    return {
      success: false,
      error: error.message || '创建支付订单失败'
    };
  }
}

/**
 * 查询订单状态
 * @param outTradeNo - 商户订单号
 */
export async function queryWechatOrder(outTradeNo: string): Promise<any> {
  try {
    const config = getJiujiuConfig();
    
    const requestParams = {
      mchId: config.mchId,
      outTradeNo,
      timestamp: Date.now().toString()
    };

    const sign = generateSign(requestParams, config.appSecret);

    const response = await fetch(`${config.apiUrl}/order/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...requestParams,
        sign
      })
    });

    return response.json();
  } catch (error) {
    console.error('Query JiuJiu Pay order error:', error);
    throw error;
  }
}
