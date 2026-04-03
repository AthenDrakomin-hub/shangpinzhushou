/**
 * 九久支付（微信收款）封装
 *
 * 根据最新 API 文档重构
 */
import crypto from 'crypto';

export interface JiuJiuPayConfig {
  mchId: string;
  appSecret: string;
  apiUrl: string;
}

export interface CreateOrderParams {
  orderId: string;
  amount: number | string; // 单位：元
  productName: string;
  notifyUrl: string;
  callbackUrl: string;
  channelCode?: string;
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
  let dynamicMchId = process.env.JIUJIU_MCH_ID || '';
  let dynamicAppSecret = process.env.JIUJIU_APP_SECRET || '';
  const apiUrl = process.env.JIUJIU_API_URL || 'http://bayq.hanyin.9jiupay.com';

  try {
    if ((global as any).paymentConfig) {
      const gConfig = (global as any).paymentConfig;
      if (gConfig.jiujiuMchId) dynamicMchId = gConfig.jiujiuMchId;
      if (gConfig.jiujiuAppSecret) dynamicAppSecret = gConfig.jiujiuAppSecret;
    }
  } catch (e) {}

  return {
    mchId: dynamicMchId,
    appSecret: dynamicAppSecret,
    apiUrl: apiUrl
  };
}

/**
 * 格式化时间为 YYYY-MM-DD HH:mm:ss
 */
function formatApplyDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 生成签名 (MD5)
 * @param params - 参与签名的参数
 * @param appSecret - 商户密钥
 */
function generateSign(params: Record<string, any>, appSecret: string): string {
  // 只过滤非空的参数，并且排序
  const sortedKeys = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '').sort();
  let signStr = '';

  for (const key of sortedKeys) {
    signStr += `${key}=${params[key]}&`;
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
  // 参与回调签名的字段：memberid, orderid, amount, transaction_id, datetime, returncode
  const signParams: Record<string, any> = {};
  const signKeys = ['memberid', 'orderid', 'amount', 'transaction_id', 'datetime', 'returncode'];
  
  for (const key of signKeys) {
    if (params[key] !== undefined) {
      signParams[key] = params[key];
    }
  }
  
  const generatedSign = generateSign(signParams, config.appSecret);
  return generatedSign === sign;
}

/**
 * 创建支付订单
 * @param params - 订单参数
 */
export async function createWechatOrder(params: CreateOrderParams): Promise<JiuJiuPayResult> {
  try {
    const config = getJiujiuConfig();

    if (!config.mchId || !config.appSecret) {
      return {
        success: false,
        error: '九久支付配置不完整，请检查商户号和秘钥'
      };
    }

    // 构建参与签名的请求参数
    const signParams: Record<string, any> = {
      pay_memberid: config.mchId,
      pay_orderid: params.orderId,
      pay_applydate: formatApplyDate(new Date()),
      pay_bankcode: params.channelCode || '6007', // 默认微信小小额纯原生 (限额 1-50元)
      pay_notifyurl: params.notifyUrl,
      pay_callbackurl: params.callbackUrl,
      pay_amount: Number(params.amount).toFixed(2) // 单位元，保留两位小数
    };

    // 生成 MD5 签名
    const sign = generateSign(signParams, config.appSecret);

    // 完整的请求参数（包含不参与签名的参数）
    const fullParams = {
      ...signParams,
      pay_productname: params.productName,
      pay_md5sign: sign
    };

    console.log('Creating JiuJiu Pay order:', {
      ...fullParams,
      pay_md5sign: '***'
    });

    const gatewayUrl = `${config.apiUrl}/Pay_Index.html`;

    // 生成自动提交的表单HTML
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

    const signParams = {
      pay_memberid: config.mchId,
      pay_orderid: outTradeNo
    };

    const sign = generateSign(signParams, config.appSecret);

    const fullParams = {
      ...signParams,
      pay_md5sign: sign
    };

    const response = await fetch(`${config.apiUrl}/Pay_Trade_query.html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(fullParams).toString()
    });

    return response.json();
  } catch (error) {
    console.error('Query JiuJiu Pay order error:', error);
    throw error;
  }
}
