import { fetchApi } from '../utils/apiClient';
/**
 * 商品下单页面
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  MessageSquare, 
  Smartphone, 
  CreditCard, 
  Lock 
} from 'lucide-react';
import { motion } from 'motion/react';
import WechatPayQrCode from './WechatPayQrCode';
import SuperPayWaitingPage from './SuperPayWaitingPage';

interface BrandTemplate {
  id: string;
  name: string;
  slogan: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
}

// 扩展 Window 接口
declare global {
  interface Window {
    __TEMPLATE__?: BrandTemplate | null;
    __PRODUCT__?: { name: string; price: number };
  }
}

// 检测是否在微信环境
const isWechatBrowser = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
};

// 支付渠道编码映射
const CHANNEL_CODE_MAP: Record<string, { code: string; typeCode?: string; label: string }> = {
  'wechat': { code: '1', label: '微信支付' },
  'alipay': { code: '1', label: '支付宝' },
  'usdt': { code: '1', typeCode: 'usdt', label: 'USDT' },
};

interface ProductCheckoutPageProps {
  productId: string;
  handleBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const ProductCheckoutPage: React.FC<ProductCheckoutPageProps> = ({
  productId,
  handleBack,
  showToast
}) => {
  const [product, setProduct] = useState<any>(null);
  const [merchantPaymentMethods, setMerchantPaymentMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState<any>(null);
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [showWechatOverlay, setShowWechatOverlay] = useState(false);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  
  // 动态获取的支付渠道
  const [payChannels, setPayChannels] = useState<{ code: string; name: string; minAmount?: number; maxAmount?: number }[]>([]);
  
  // 读取服务端注入的模板配置
  const [serverTemplate] = useState<BrandTemplate | null>(() => window.__TEMPLATE__ || null);

  useEffect(() => {
    loadProductAndPaymentMethods();
    loadPayChannels();
  }, [productId]);

  // 加载支付渠道列表
  const loadPayChannels = async () => {
    try {
      const res = await fetchApi('/api/pay/superpay/channels');
      const data = await res.json();
      if (data.channels && Array.isArray(data.channels)) {
        setPayChannels(data.channels.map((ch: any) => ({
          code: ch.code,
          name: ch.name,
          minAmount: ch.min_amount ? parseFloat(ch.min_amount) : undefined,
          maxAmount: ch.max_amount ? parseFloat(ch.max_amount) : undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to load pay channels:', error);
    }
  };

  const loadProductAndPaymentMethods = async () => {
    try {
      // 获取商品信息
      const productRes = await fetchApi(`/api/products/${productId}`);
      const productData = await productRes.json();
      
      if (!productData || productData.error) {
        showToast('商品不存在', 'error');
        handleBack();
        return;
      }
      
      setProduct(productData);

      // 获取商户可用的下单方式
      const methodsRes = await fetchApi(`/api/merchant/${productData.user_id}/payment-methods`);
      const methodsData = await methodsRes.json();
      
      setMerchantPaymentMethods(methodsData.methods || []);
      if (methodsData.methods?.length > 0) {
        setSelectedMethod(methodsData.methods[0]);
      }
    } catch (error) {
      console.error('Load product error:', error);
      showToast('加载商品失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新 OG 标签和页面标题
  useEffect(() => {
    if (product) {
      const title = serverTemplate 
        ? `${product.name} - ${serverTemplate.name}` 
        : `${product.name} - 商品页助手`;
      document.title = title;
      
      const pageUrl = window.location.href;
      
      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };
      
      const ogDescription = serverTemplate 
        ? `${serverTemplate.slogan} - ￥${product.price}` 
        : `￥${product.price} - ${product.description || '点击查看商品详情'}`;
        
      updateMetaTag('og:title', product.name);
      updateMetaTag('og:description', ogDescription);
      updateMetaTag('og:url', pageUrl);
      updateMetaTag('og:type', 'website');
      
      if (product.imageUrl) {
        let imageUrl = product.imageUrl;
        if (imageUrl.startsWith('/')) {
          imageUrl = `${window.location.origin}${imageUrl}`;
        }
        updateMetaTag('og:image', imageUrl);
      }
    }
    
    return () => {
      document.title = '商品页助手';
    };
  }, [product]);

  const handlePay = async () => {
    if (!selectedMethod) {
      showToast('请选择下单方式', 'error');
      return;
    }

    const isInWechat = isWechatBrowser();
    const isUsdtMethod = selectedMethod === 'usdt';

    if (isInWechat && selectedMethod !== 'bank') {
      setShowWechatOverlay(true);
      return;
    }

    setPaying(true);
    try {
      // 银行卡转账
      if (selectedMethod === 'bank') {
        const response = await fetchApi('/api/pay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            pay_method: 'bank',
          }),
        });

        const data = await response.json();
        
        if (!data.success) {
          showToast(data.error || '创建订单失败', 'error');
          return;
        }

        setPayResult({
          type: 'bank',
          bankInfo: data.bankInfo,
          amount: data.amount,
          orderId: data.orderId,
          note: data.note,
        });
        setShowBankInfo(true);
        return;
      }

      // SuperPay 支付
      let channelCode = CHANNEL_CODE_MAP[selectedMethod]?.code;
      const channelTypeCode = CHANNEL_CODE_MAP[selectedMethod]?.typeCode;
      
      if (payChannels.length > 0) {
        channelCode = payChannels[0].code;
        
        const amountYuan = product.price / 100;
        const channel = payChannels.find(ch => {
          if (ch.minAmount && amountYuan < ch.minAmount) return false;
          if (ch.maxAmount && amountYuan > ch.maxAmount) return false;
          return true;
        });
        
        if (channel) {
          channelCode = channel.code;
        }
      }
      
      if (!channelCode) {
        showToast('暂无可用支付渠道', 'error');
        return;
      }

      const response = await fetchApi('/api/pay/superpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          channel_code: channelCode,
          channel_type_code: channelTypeCode,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        showToast(data.error || '创建订单失败', 'error');
        return;
      }

      setPayResult({
        type: 'superpay',
        payUrl: data.payUrl,
        orderId: data.orderId,
        amount: data.amount,
        endTime: data.endTime,
        isUsdt: data.isUsdt,
        usdtAddress: data.usdtAddress,
        isInWechat,
      });
    } catch (error) {
      console.error('Pay error:', error);
      showToast('下单请求失败', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 银行卡转账信息页面
  if (showBankInfo && payResult?.type === 'bank') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F2F3F5] pb-32">
        <div 
          className="px-6 pt-16 pb-10 rounded-b-[48px] text-white"
          style={serverTemplate ? {
            background: `linear-gradient(135deg, ${serverTemplate.gradientFrom} 0%, ${serverTemplate.gradientTo} 100%)`
          } : { background: 'linear-gradient(to bottom right, #f97316, #ea580c)' }}
        >
          <div className="flex items-center gap-4 mb-6">
            <button onClick={handleBack} className="p-2 bg-white/10 rounded-xl"><ChevronLeft className="w-6 h-6" /></button>
            <div>
              <h2 className="text-xl font-black">银行卡转账</h2>
              <p className="text-xs text-white/60 mt-1">请按照以下信息转账</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl">
              {payResult.bankInfo.bankIcon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">{payResult.bankInfo.bankName}</p>
              <p className="text-xs text-white/60">{payResult.bankInfo.branch || '银行转账'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 mt-6 space-y-4">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 block">账户名</label>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{payResult.bankInfo.accountName}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(payResult.bankInfo.accountName);
                      showToast('已复制');
                    }}
                    className="text-blue-500 text-xs font-bold"
                  >
                    复制
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 block">银行卡号</label>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 font-mono">{payResult.bankInfo.accountNumber}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(payResult.bankInfo.accountNumber);
                      showToast('已复制');
                    }}
                    className="text-blue-500 text-xs font-bold"
                  >
                    复制
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 block">转账金额</label>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-orange-500">¥</span>
                  <span className="text-4xl font-black text-gray-900">{payResult.amount}</span>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 block">转账备注</label>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <span className="font-mono text-sm text-gray-600">{payResult.note}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(payResult.note);
                      showToast('已复制');
                    }}
                    className="text-blue-500 text-xs font-bold"
                  >
                    复制
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-800 mb-1">转账说明</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• 请在转账时备注订单号</li>
                  <li>• 商户确认到账后订单自动完成</li>
                  <li>• 如有问题请联系商户</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-4 border border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              订单号: <span className="font-mono text-gray-600">{payResult.orderId}</span>
            </p>
          </div>

          <div className="text-center mt-4">
            <p className="text-[10px] text-gray-400">
              <button onClick={() => setShowUserAgreement(true)} className="text-blue-500 hover:underline">《用户服务协议》</button>
              <span className="mx-1">|</span>
              <button onClick={() => setShowPrivacyPolicy(true)} className="text-blue-500 hover:underline">《隐私政策》</button>
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // 微信扫码二维码页面
  if (payResult?.type === 'wechat') {
    return (
      <WechatPayQrCode 
        codeUrl={payResult.codeUrl}
        orderId={payResult.orderId}
        amount={product?.price || 0}
        productName={product?.name || '商品'}
        handleBack={handleBack}
        showToast={showToast}
      />
    );
  }

  // SuperPay 支付等待页面
  if (payResult?.type === 'superpay') {
    return (
      <SuperPayWaitingPage 
        payUrl={payResult.payUrl}
        orderId={payResult.orderId}
        amount={payResult.amount}
        endTime={payResult.endTime}
        productName={product?.name || '商品'}
        isUsdt={payResult.isUsdt}
        usdtAddress={payResult.usdtAddress}
        isInWechat={payResult.isInWechat}
        handleBack={handleBack}
        showToast={showToast}
      />
    );
  }

  // 主下单页面
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-white">
      {/* 品牌模板头部 */}
      <div 
        className={`px-6 pt-16 pb-8 text-center ${serverTemplate ? 'brand-header' : 'border-b border-gray-50'}`}
        style={serverTemplate ? {
          background: `linear-gradient(135deg, ${serverTemplate.gradientFrom} 0%, ${serverTemplate.gradientTo} 100%)`
        } : {}}
      >
        {product?.imageUrl && (
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg bg-white/20 backdrop-blur-sm">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 
          className="text-2xl font-black mb-2"
          style={{ color: serverTemplate ? serverTemplate.textColor : '#111827' }}
        >
          {product?.name || '商品'}
        </h2>
        
        {serverTemplate && (
          <p 
            className="text-sm mb-3 opacity-80"
            style={{ color: serverTemplate.textColor }}
          >
            &quot;{serverTemplate.slogan}&quot;
          </p>
        )}
        
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" style={{ color: serverTemplate ? serverTemplate.textColor : '#22C55E', opacity: 0.8 }} />
          <span style={{ color: serverTemplate ? serverTemplate.textColor : '#9CA3AF', opacity: 0.7 }}>
            {serverTemplate ? `${serverTemplate.name} · 安全下单` : '安全下单'}
          </span>
        </div>
        <div className="mt-6 flex items-baseline justify-center gap-1">
          <span 
            className="text-2xl font-bold"
            style={{ color: serverTemplate ? serverTemplate.textColor : '#D1D5DB', opacity: 0.8 }}
          >
            ¥
          </span>
          <span 
            className="text-5xl font-black tracking-tighter"
            style={{ color: serverTemplate ? serverTemplate.textColor : '#111827' }}
          >
            {(product?.price || 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="px-6 py-8">
        {merchantPaymentMethods.length === 0 ? (
          <div className="bg-orange-50 rounded-3xl p-6 text-center border border-orange-100">
            <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <p className="text-orange-800 font-bold">商户暂未配置下单方式</p>
            <p className="text-xs text-orange-600 mt-2">请联系商户完成下单配置</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">选择下单方式</p>
            <div className="space-y-3">
              {merchantPaymentMethods.includes('wechat') && (
                <button 
                  onClick={() => setSelectedMethod('wechat')}
                  className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all ${selectedMethod === 'wechat' ? 'border-green-600 bg-green-50/30' : 'border-gray-50 bg-gray-50/50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-green-600">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-gray-900">微信扫码</h4>
                      <p className="text-[10px] text-gray-400 font-medium">扫码下单，即时到账</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'wechat' ? 'border-green-600' : 'border-gray-200'}`}>
                    {selectedMethod === 'wechat' && <div className="w-3 h-3 bg-green-600 rounded-full" />}
                  </div>
                </button>
              )}
              
              {merchantPaymentMethods.includes('alipay') && (
                <button 
                  onClick={() => setSelectedMethod('alipay')}
                  className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all ${selectedMethod === 'alipay' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-50 bg-gray-50/50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-blue-500">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-gray-900">扫码支付</h4>
                      <p className="text-[10px] text-gray-400 font-medium">网页下单，安全便捷</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'alipay' ? 'border-blue-500' : 'border-gray-200'}`}>
                    {selectedMethod === 'alipay' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                  </div>
                </button>
              )}
              
              {merchantPaymentMethods.includes('bank') && (
                <button 
                  onClick={() => setSelectedMethod('bank')}
                  className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all ${selectedMethod === 'bank' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-50 bg-gray-50/50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-orange-500">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-gray-900">银行卡转账</h4>
                      <p className="text-[10px] text-gray-400 font-medium">线下转账，商户确认</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'bank' ? 'border-orange-500' : 'border-gray-200'}`}>
                    {selectedMethod === 'bank' && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                  </div>
                </button>
              )}
            </div>

            <button 
              onClick={handlePay}
              disabled={paying || !selectedMethod}
              className="w-full mt-8 py-6 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-black/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 brand-button"
              style={serverTemplate ? {
                background: `linear-gradient(135deg, ${serverTemplate.gradientFrom} 0%, ${serverTemplate.gradientTo} 100%)`
              } : { background: '#111827' }}
            >
              {paying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  立即下单
                </>
              )}
            </button>
          </>
        )}
        
        <div className="text-center mt-8 px-8">
          <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
            订单由商户独立处理，平台仅提供展示服务
          </p>
          <p className="text-[10px] text-gray-400">
            下单即表示同意
            <button onClick={() => setShowUserAgreement(true)} className="text-blue-500 hover:underline ml-1">《用户服务协议》</button>
            <span className="mx-1">和</span>
            <button onClick={() => setShowPrivacyPolicy(true)} className="text-blue-500 hover:underline">《隐私政策》</button>
          </p>
        </div>
      </div>

      {/* 用户协议弹窗 */}
      {showUserAgreement && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowUserAgreement(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[32px] p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900">用户服务协议</h3>
            </div>

            <div className="space-y-4 text-gray-600 text-sm leading-relaxed mb-8">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-red-600 font-bold mb-2">
                  <AlertCircle className="w-5 h-5" />
                  重要提示
                </div>
                <p className="text-red-600/80">
                  请确保您的商品信息真实有效，不得发布违法违规商品。
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">一、服务说明</h4>
                <p>商品页助手是一个商品展示页生成工具，帮助用户快速创建商品分享页面。平台仅提供技术服务。</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">二、用户责任</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>用户需确保商品信息真实合法</li>
                  <li>用户需自行配置订单通知方式参数</li>
                  <li>用户不得利用平台进行违法活动</li>
                  <li>用户需遵守相关法律法规</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">三、使用规范</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>商品信息不得包含违规内容</li>
                  <li>建议有条件的用户自行部署服务</li>
                  <li>平台有权下架违规商品</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">四、免责声明</h4>
                <p>平台仅提供技术服务，不对以下情况承担责任：</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>因用户违规使用导致的账号限制</li>
                  <li>因第三方平台政策变更导致的服务中断</li>
                  <li>因不可抗力导致的服务中断</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowUserAgreement(false)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
            >
              我已了解
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* 隐私政策弹窗 */}
      {showPrivacyPolicy && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPrivacyPolicy(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[32px] p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900">隐私政策</h3>
            </div>

            <div className="space-y-4 text-gray-600 text-sm leading-relaxed mb-8">
              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">一、信息收集</h4>
                <p>我们收集以下信息以提供服务：</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>账号信息：邮箱、昵称</li>
                  <li>商品信息：商品名称、描述、图片</li>
                  <li>订单信息：订单号、下单时间</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">二、信息使用</h4>
                <p>您的信息仅用于：</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>提供商品展示服务</li>
                  <li>订单管理与通知</li>
                  <li>系统安全与风控</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">三、信息保护</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>敏感数据加密存储</li>
                  <li>访问权限严格控制</li>
                  <li>定期安全审计</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">四、信息共享</h4>
                <p>我们不会将您的个人信息出售或共享给第三方，除非：</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>获得您的明确同意</li>
                  <li>法律法规要求</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">五、用户权利</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>查询和更正个人信息</li>
                  <li>删除账号和相关数据</li>
                  <li>导出个人数据</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">六、联系我们</h4>
                <p>如有隐私相关问题，请通过系统内反馈功能联系我们。</p>
              </div>
            </div>

            <button
              onClick={() => setShowPrivacyPolicy(false)}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all"
            >
              我已了解
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* 微信内无法支付的提示遮罩 */}
      {showWechatOverlay && (
        <div 
          className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-end pr-6 pt-6"
          onClick={() => setShowWechatOverlay(false)}
        >
          <div className="text-white text-right animate-bounce">
            <svg className="w-12 h-12 inline-block mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <div className="text-white text-right mt-4">
            <p className="text-xl font-bold mb-2">微信内无法直接支付</p>
            <p className="text-gray-300">请点击右上角 <span className="inline-block px-2 py-1 bg-gray-800 rounded">···</span></p>
            <p className="text-gray-300 mt-2">选择 <span className="text-blue-400 font-bold">「在浏览器中打开」</span></p>
            <p className="text-sm text-gray-400 mt-6">点击任意处关闭此提示</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProductCheckoutPage;
