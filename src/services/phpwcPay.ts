import crypto from 'crypto';

export interface PhpwcOrderParams {
  pid: string;
  type: string;
  outTradeNo: string;
  notifyUrl: string;
  returnUrl: string;
  name: string;
  money: string;
  secretKey: string;
  apiUrl?: string; // 可选的网关地址
}

/**
 * 生成 PHPWC (易支付标准) 的 MD5 签名
 */
export function generatePhpwcSign(params: Record<string, any>, secretKey: string): string {
  // 过滤空值、sign、sign_type，并按字母排序
  const filteredParams: Record<string, any> = {};
  for (const key of Object.keys(params).sort()) {
    if (
      params[key] !== '' &&
      params[key] !== null &&
      params[key] !== undefined &&
      key !== 'sign' &&
      key !== 'sign_type'
    ) {
      filteredParams[key] = params[key];
    }
  }

  // 拼接字符串
  const signString = Object.entries(filteredParams)
    .map(([k, v]) => `${k}=${v}`)
    .join('&') + secretKey;

  // MD5
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex');
}

/**
 * 创建 PHPWC 支付订单链接
 */
export async function createPhpwcOrder(params: PhpwcOrderParams): Promise<{ success: boolean; payUrl?: string; error?: string }> {
  try {
    const data: Record<string, any> = {
      pid: params.pid,
      type: params.type,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      name: params.name,
      money: params.money,
    };

    data.sign = generatePhpwcSign(data, params.secretKey);
    data.sign_type = 'MD5';

    // 默认网关地址处理
    let baseUrl = params.apiUrl || 'https://pay.phpwc.com/';
    if (!baseUrl.endsWith('/submit.php') && !baseUrl.includes('submit.php')) {
      baseUrl = baseUrl.endsWith('/') ? `${baseUrl}submit.php` : `${baseUrl}/submit.php`;
    }

    const queryString = new URLSearchParams(data).toString();
    const payUrl = `${baseUrl}?${queryString}`;

    return { success: true, payUrl };
  } catch (error) {
    console.error('PHPWC create order error:', error);
    return { success: false, error: '生成 PHPWC 支付链接失败' };
  }
}

/**
 * 验证 PHPWC 回调签名
 */
export function verifyPhpwcCallbackSign(params: Record<string, any>, secretKey: string): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const calculatedSign = generatePhpwcSign(params, secretKey);
  return calculatedSign === sign;
}
