/**
 * 微信环境检测与兼容工具
 */

/**
 * 检测是否在微信内置浏览器中
 */
export function isWechatBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
}

/**
 * 检测是否在QQ内置浏览器中
 */
export function isQQBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('qq/') && !ua.includes('qqbrowser');
}

/**
 * 检测是否在微博内置浏览器中
 */
export function isWeiboBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('weibo');
}

/**
 * 检测是否在任何内置浏览器中（微信/QQ/微博等）
 */
export function isBuiltInBrowser(): boolean {
  return isWechatBrowser() || isQQBrowser() || isWeiboBrowser();
}

/**
 * 获取浏览器类型名称
 */
export function getBrowserType(): string {
  if (isWechatBrowser()) return '微信';
  if (isQQBrowser()) return 'QQ';
  if (isWeiboBrowser()) return '微博';
  return '浏览器';
}

/**
 * 引导用户在外部浏览器打开
 * 显示遮罩层提示用户点击右上角菜单
 */
export function showOpenInBrowserGuide(): void {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.id = 'wechat-guide-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <!-- 右上角箭头提示 -->
      <div style="
        position: absolute;
        top: 10px;
        right: 20px;
        width: 60px;
        height: 50px;
      ">
        <svg viewBox="0 0 60 50" fill="none" style="width: 100%; height: 100%;">
          <path d="M30 0 L30 30 M30 30 L20 20 M30 30 L40 20" stroke="white" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      
      <!-- 提示文字 -->
      <div style="
        margin-top: 60px;
        text-align: center;
        max-width: 280px;
      ">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">
          请在浏览器中打开
        </div>
        <div style="font-size: 14px; opacity: 0.8; line-height: 1.6;">
          点击右上角 <span style="font-weight: 600;">···</span> 或 <span style="font-weight: 600;">⋮</span>
        </div>
        <div style="font-size: 14px; opacity: 0.8; line-height: 1.6; margin-top: 8px;">
          选择「在浏览器中打开」<br/>完成支付
        </div>
      </div>
      
      <!-- 示意图 -->
      <div style="
        margin-top: 30px;
        width: 200px;
        height: 120px;
        background: rgba(255,255,255,0.1);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 10px;
      ">
        <svg viewBox="0 0 24 24" fill="none" style="width: 40px; height: 40px; opacity: 0.8;">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>
          <path d="M3 9h18M9 21V9" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span style="font-size: 12px; opacity: 0.6;">选择「在浏览器中打开」</span>
      </div>
      
      <!-- 底部说明 -->
      <div style="
        position: absolute;
        bottom: 40px;
        text-align: center;
        font-size: 12px;
        opacity: 0.5;
      ">
        微信内无法直接调起外部支付
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  // 点击关闭
  overlay.addEventListener('click', () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = '';
  });
}

/**
 * 隐藏引导遮罩
 */
export function hideOpenInBrowserGuide(): void {
  const overlay = document.getElementById('wechat-guide-overlay');
  if (overlay) {
    document.body.removeChild(overlay);
    document.body.style.overflow = '';
  }
}

/**
 * 尝试跳转到支付页面
 * 如果在微信内，显示引导提示
 * @param payUrl 支付链接
 * @returns 是否成功跳转
 */
export function navigateToPayment(payUrl: string): boolean {
  if (isWechatBrowser()) {
    // 微信内显示引导
    showOpenInBrowserGuide();
    return false;
  }
  
  // 其他环境直接跳转
  if (payUrl) {
    window.location.href = payUrl;
    return true;
  }
  
  return false;
}

/**
 * 存储支付信息到本地，供外部浏览器恢复
 */
export function savePaymentInfo(paymentData: {
  payUrl: string;
  orderId: string;
  productId: string;
  amount: number;
}): void {
  try {
    sessionStorage.setItem('pending_payment', JSON.stringify({
      ...paymentData,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to save payment info:', e);
  }
}

/**
 * 获取存储的支付信息
 */
export function getStoredPaymentInfo(): {
  payUrl: string;
  orderId: string;
  productId: string;
  amount: number;
  timestamp: number;
} | null {
  try {
    const data = sessionStorage.getItem('pending_payment');
    if (data) {
      const parsed = JSON.parse(data);
      // 30分钟内有效
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get payment info:', e);
  }
  return null;
}

/**
 * 清除存储的支付信息
 */
export function clearStoredPaymentInfo(): void {
  sessionStorage.removeItem('pending_payment');
}

/**
 * 检查并恢复支付流程（用于外部浏览器打开时）
 */
export function checkAndResumePayment(): boolean {
  const paymentInfo = getStoredPaymentInfo();
  if (paymentInfo && paymentInfo.payUrl) {
    // 清除存储的信息
    clearStoredPaymentInfo();
    // 跳转到支付页面
    window.location.href = paymentInfo.payUrl;
    return true;
  }
  return false;
}
