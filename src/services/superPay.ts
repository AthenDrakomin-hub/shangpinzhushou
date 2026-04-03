import crypto from 'crypto';

/**
 * SuperPay 支付服务封装
 * 处理支付宝第三方代收通道签名及订单创建
 */

// MD5 哈希实现
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

// 生成 SuperPay 签名
export function generateSuperPaySign(data: Record<string, any>, key: string): string {
  const filteredData: Record<string, any> = {};
  for (const [field, value] of Object.entries(data)) {
    if (value !== '' && value !== null && value !== undefined && field !== 'sign') {
      filteredData[field] = value;
    }
  }
  const sortedKeys = Object.keys(filteredData).sort();
  const stringA = sortedKeys.map(k => `${k}=${filteredData[k]}`).join('&');
  const stringSignTemp = stringA + (stringA ? '&' : '') + `key=${key}`;
  return md5(stringSignTemp);
}

export interface SuperPayOrderParams {
  merchantOn: string;
  merchantKey: string;
  amount: string;
  orderSn: string;
  channelCode?: string;
  notifyUrl: string;
  returnUrl?: string;
  uid?: string;
}

export interface SuperPayOrderResult {
  success: boolean;
  jumpUrl?: string;
  error?: string;
}

// 调用 SuperPay 创建订单
export async function createSuperPayOrder(
  params: SuperPayOrderParams, 
  baseUrl: string
): Promise<SuperPayOrderResult> {
  const data: Record<string, any> = {
    merchant_on: params.merchantOn,
    amount: params.amount,
    order_sn: params.orderSn,
    notify_url: params.notifyUrl,
    uid: params.uid || `U${Date.now()}`, // 用户标识，必填
  };

  // 如果提供了 returnUrl，加入到参数中
  if (params.returnUrl) {
    data.return_url = params.returnUrl;
  }
  
  // 只有传了 channelCode 才添加
  if (params.channelCode) {
    data.channel_code = params.channelCode;
  }
  
  data.sign = generateSuperPaySign(data, params.merchantKey);
  
  console.log('SuperPay Request:', JSON.stringify(data));
  
  try {
    const response = await fetch(`${baseUrl}/api/collecting/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant_on': params.merchantOn,
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    console.log('SuperPay Response:', JSON.stringify(result));
    if (result.success && result.items?.jump_url) {
      return { success: true, jumpUrl: result.items.jump_url };
    }
    return { success: false, error: result.error_message || '创建支付订单失败' };
  } catch (error) {
    console.error('SuperPay API Error:', error);
    return { success: false, error: '支付服务暂不可用' };
  }
}
