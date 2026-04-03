/**
 * SuperPay 支付等待页面
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CheckCircle2, XCircle, ExternalLink, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

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

interface SuperPayWaitingPageProps {
  payUrl: string;
  orderId: string;
  amount: string;
  endTime: string;
  productName: string;
  isUsdt?: boolean;
  usdtAddress?: string;
  isInWechat?: boolean;
  handleBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const SuperPayWaitingPage: React.FC<SuperPayWaitingPageProps> = ({
  payUrl,
  orderId,
  amount,
  endTime,
  productName,
  isUsdt,
  usdtAddress,
  isInWechat,
  handleBack,
  showToast
}) => {
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'expired' | 'failed'>('pending');
  const [countdown, setCountdown] = useState(300); // 5分钟倒计时
  const [isPolling, setIsPolling] = useState(true);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 读取服务端注入的模板配置
  const [serverTemplate] = useState<BrandTemplate | null>(() => window.__TEMPLATE__ || null);

  // 轮询订单状态
  useEffect(() => {
    if (!isPolling || payStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/pay/superpay/query/${orderId}`);
        const data = await response.json();
        
        if (data.status === 'paid') {
          setPayStatus('paid');
          setIsPolling(false);
          showToast('支付成功！', 'success');
        } else if (data.state === 1) {
          // 支付失败
          setPayStatus('failed');
          setIsPolling(false);
        } else if (data.state === 2) {
          // 支付超时
          setPayStatus('expired');
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Poll order status error:', error);
      }
    }, 3000); // 每3秒轮询一次

    return () => clearInterval(pollInterval);
  }, [isPolling, payStatus, orderId, showToast]);

  // 倒计时
  useEffect(() => {
    if (payStatus !== 'pending') return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setPayStatus('expired');
          setIsPolling(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [payStatus]);

  // 支付成功后自动跳转
  useEffect(() => {
    if (payStatus === 'paid') {
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [payStatus]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算剩余时间
  const getRemainingTime = () => {
    if (!endTime) return countdown;
    try {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      return remaining;
    } catch {
      return countdown;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F2F3F5] pb-32">
      <div 
        className="px-6 pt-16 pb-10 rounded-b-[48px] text-white"
        style={serverTemplate ? {
          background: `linear-gradient(135deg, ${serverTemplate.gradientFrom} 0%, ${serverTemplate.gradientTo} 100%)`
        } : { background: 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)' }}
      >
        <div className="flex items-center gap-4 mb-6">
          <button onClick={handleBack} className="p-2 bg-white/10 rounded-xl">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-black">
              {payStatus === 'paid' ? '支付成功' : payStatus === 'expired' ? '已过期' : payStatus === 'failed' ? '支付失败' : '等待支付'}
            </h2>
            <p className="text-xs text-white/60 mt-1">
              {payStatus === 'paid' ? '订单已完成' : payStatus === 'expired' ? '请重新下单' : payStatus === 'failed' ? '支付遇到问题' : '请在有效期内完成支付'}
            </p>
          </div>
        </div>

        {/* 金额显示 */}
        <div className="text-center py-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold text-white/80">¥</span>
            <span className="text-5xl font-black">{amount}</span>
          </div>
          <p className="text-sm text-white/60 mt-2">{productName}</p>
        </div>
      </div>

      <div className="px-6 mt-6">
        {/* 状态卡片 */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center">
          {payStatus === 'paid' ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">支付成功</h3>
              <p className="text-sm text-gray-500">页面即将自动跳转...</p>
            </>
          ) : payStatus === 'expired' ? (
            <>
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">订单已过期</h3>
              <p className="text-sm text-gray-500 mb-4">请重新下单</p>
              <button 
                onClick={handleBack}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold"
              >
                返回重新下单
              </button>
            </>
          ) : payStatus === 'failed' ? (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">支付失败</h3>
              <p className="text-sm text-gray-500 mb-4">请重试或联系客服</p>
              <button 
                onClick={handleBack}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold"
              >
                重新下单
              </button>
            </>
          ) : (
            <>
              {/* 倒计时 */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                <Clock className="w-4 h-4" />
                <span>支付剩余时间 {formatCountdown(getRemainingTime())}</span>
              </div>

              {/* USDT 支付特殊处理 */}
              {isUsdt && usdtAddress ? (
                <>
                  <div className="bg-yellow-50 rounded-2xl p-4 mb-4 border border-yellow-200">
                    <p className="text-xs text-yellow-700 font-bold mb-2">USDT 支付地址</p>
                    <div className="bg-white rounded-xl p-3 border border-yellow-100">
                      <p className="font-mono text-sm text-gray-700 break-all">{usdtAddress}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(usdtAddress);
                        setCopySuccess(true);
                        showToast('地址已复制', 'success');
                        setTimeout(() => setCopySuccess(false), 2000);
                      }}
                      className="mt-2 text-xs text-blue-600 font-bold"
                    >
                      {copySuccess ? '✓ 已复制' : '复制地址'}
                    </button>
                  </div>
                  
                  {isInWechat && (
                    <div className="bg-orange-50 rounded-2xl p-4 mb-4 border border-orange-200">
                      <p className="text-xs text-orange-700">
                        ⚠️ 微信内无法直接打开 USDT 支付链接，请复制链接在浏览器中打开
                      </p>
                    </div>
                  )}
                </>
              ) : null}

              {/* 支付按钮 */}
              <button 
                onClick={() => {
                  if (payUrl) {
                    if (isUsdt && isInWechat) {
                      // 微信环境下 USDT 支付，提示用户复制链接
                      navigator.clipboard.writeText(payUrl);
                      showToast('链接已复制，请在浏览器中打开', 'success');
                    } else {
                      window.open(payUrl, '_blank');
                    }
                  }
                }}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 mb-4"
              >
                <ExternalLink className="w-5 h-5" />
                {isUsdt && isInWechat ? '复制支付链接' : '点击前往支付'}
              </button>

              <p className="text-xs text-gray-400 mb-4">
                {isUsdt && isInWechat 
                  ? '链接已复制到剪贴板，请在浏览器中打开完成支付'
                  : '点击按钮将在新窗口打开支付页面'}
              </p>

              {/* 轮询提示 */}
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>正在等待支付确认...</span>
              </div>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              订单号: <span className="font-mono text-gray-600">{orderId}</span>
            </p>
          </div>
        </div>

        {/* 支付说明 */}
        {payStatus === 'pending' && (
          <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100 mt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-800 mb-1">支付说明</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• 点击上方按钮前往支付页面</li>
                  <li>• 完成支付后此页面将自动更新</li>
                  <li>• 请在有效期内完成支付</li>
                  {isUsdt && <li>• USDT 支付请确保转账金额准确</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-6 px-6">
          <p className="text-[10px] text-gray-400">
            <button onClick={() => setShowUserAgreement(true)} className="text-blue-500 hover:underline">《用户服务协议》</button>
            <span className="mx-1">|</span>
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
              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">一、服务说明</h4>
                <p>商品页助手是一个商品展示页生成工具，帮助用户快速创建商品分享页面。平台仅提供技术服务。</p>
              </div>
            </div>
            <button onClick={() => setShowUserAgreement(false)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">我已了解</button>
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
                <h4 className="font-bold text-gray-900 mb-2">信息保护</h4>
                <p>敏感数据加密存储，访问权限严格控制。</p>
              </div>
            </div>
            <button onClick={() => setShowPrivacyPolicy(false)} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all">我已了解</button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SuperPayWaitingPage;
