import { fetchApi } from '../utils/apiClient';
/**
 * 支付结果页面
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface PaymentResultPageProps {
  orderId: string;
}

const TEMPLATES: Record<string, any> = {
  default: {
    theme: 'blue',
    successBg: 'from-green-600 to-green-700',
    pendingBg: 'from-orange-500 to-orange-600',
    successTitle: '下单成功',
    pendingTitle: '等待确认',
    successSubtitle: '您的订单已完成',
    pendingSubtitle: '订单等待确认中',
    btnSuccess: '完成',
    btnPending: '刷新',
    btnSuccessBg: 'bg-green-600',
    btnPendingBg: 'bg-orange-500',
    tipsTitle: '下单提示',
    tips: [
      '如您已完成下单，请稍后刷新页面',
      '如下单遇到问题，请联系商户'
    ]
  },
  daifu: {
    theme: 'orange',
    successBg: 'from-orange-500 to-orange-600',
    pendingBg: 'from-orange-400 to-orange-500',
    successTitle: '代付成功',
    pendingTitle: '等待代付确认',
    successSubtitle: '代付订单已完成',
    pendingSubtitle: '代付结果确认中',
    btnSuccess: '我知道了',
    btnPending: '刷新',
    btnSuccessBg: 'bg-orange-500',
    btnPendingBg: 'bg-orange-400',
    tipsTitle: '代付说明',
    tips: [
      '代付成功后，系统将自动通知原下单人',
      '代付金额将直接结算给商家'
    ]
  },
  meituan: {
    theme: 'yellow',
    successBg: 'from-yellow-400 to-yellow-500',
    pendingBg: 'from-orange-400 to-orange-500',
    successTitle: '支付成功',
    pendingTitle: '等待确认',
    successSubtitle: '美团订单已支付',
    pendingSubtitle: '订单状态确认中',
    btnSuccess: '返回美团',
    btnPending: '刷新',
    btnSuccessBg: 'bg-yellow-500 text-gray-900',
    btnPendingBg: 'bg-orange-500',
    tipsTitle: '下单提示',
    tips: [
      '订单支付成功后，请在美团App查看详情',
      '如未到账，请联系美团客服'
    ]
  },
  eleme: {
    theme: 'blue',
    successBg: 'from-blue-500 to-blue-600',
    pendingBg: 'from-orange-400 to-orange-500',
    successTitle: '支付成功',
    pendingTitle: '等待确认',
    successSubtitle: '饿了么订单已支付',
    pendingSubtitle: '订单状态确认中',
    btnSuccess: '返回饿了么',
    btnPending: '刷新',
    btnSuccessBg: 'bg-blue-500',
    btnPendingBg: 'bg-orange-500',
    tipsTitle: '下单提示',
    tips: [
      '订单支付成功后，请在饿了么App查看详情',
      '如未到账，请联系饿了么客服'
    ]
  },
  jd: {
    theme: 'red',
    successBg: 'from-red-600 to-red-700',
    pendingBg: 'from-orange-500 to-orange-600',
    successTitle: '支付成功',
    pendingTitle: '等待确认',
    successSubtitle: '京东订单已支付',
    pendingSubtitle: '订单状态确认中',
    btnSuccess: '返回京东',
    btnPending: '刷新',
    btnSuccessBg: 'bg-red-600',
    btnPendingBg: 'bg-orange-500',
    tipsTitle: '下单提示',
    tips: [
      '订单支付成功后，请在京东App查看详情',
      '如未到账，请联系京东客服'
    ]
  },
  ctrip: {
    theme: 'blue',
    successBg: 'from-blue-600 to-blue-800',
    pendingBg: 'from-orange-500 to-orange-600',
    successTitle: '支付成功',
    pendingTitle: '等待确认',
    successSubtitle: '携程订单已支付',
    pendingSubtitle: '订单状态确认中',
    btnSuccess: '返回携程',
    btnPending: '刷新',
    btnSuccessBg: 'bg-blue-600',
    btnPendingBg: 'bg-orange-500',
    tipsTitle: '下单提示',
    tips: [
      '订单支付成功后，请在携程App查看详情',
      '如未到账，请联系携程客服'
    ]
  },
  douyin: {
    theme: 'black',
    successBg: 'from-gray-800 to-black',
    pendingBg: 'from-orange-500 to-orange-600',
    successTitle: '支付成功',
    pendingTitle: '等待确认',
    successSubtitle: '抖音订单已支付',
    pendingSubtitle: '订单状态确认中',
    btnSuccess: '返回抖音',
    btnPending: '刷新',
    btnSuccessBg: 'bg-black',
    btnPendingBg: 'bg-orange-500',
    tipsTitle: '下单提示',
    tips: [
      '订单支付成功后，请在抖音App查看详情',
      '如未到账，请联系抖音客服'
    ]
  },
  kuaishou: {
    theme: 'orange',
    successBg: 'from-orange-500 to-red-500',
    pendingBg: 'from-orange-400 to-orange-500',
    successTitle: '支付成功',
    pendingTitle: '等待确认',
    successSubtitle: '快手订单已支付',
    pendingSubtitle: '订单状态确认中',
    btnSuccess: '返回快手',
    btnPending: '刷新',
    btnSuccessBg: 'bg-orange-500',
    btnPendingBg: 'bg-orange-400',
    tipsTitle: '下单提示',
    tips: [
      '订单支付成功后，请在快手App查看详情',
      '如未到账，请联系快手客服'
    ]
  }
};

const PaymentResultPage: React.FC<PaymentResultPageProps> = ({ orderId }) => {
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
    loadOrderInfo();
    let interval: NodeJS.Timeout;
    // 如果还没支付成功，每隔 3 秒轮询一次
    if (orderInfo?.status !== 'paid' && orderInfo?.status !== 'completed') {
      interval = setInterval(() => {
        loadOrderInfo();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderId, orderInfo?.status]);

  const loadOrderInfo = async () => {
    try {
      const response = await fetchApi(`/api/orders/${orderId}/status`);
      const data = await response.json();
      setOrderInfo(data);
    } catch (error) {
      console.error('Load order info error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2F3F5] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSuccess = orderInfo?.status === 'paid' || orderInfo?.status === 'completed';

  const templateId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('template') || orderInfo?.template || 'default';
  }, [orderInfo?.template]);

  const template = TEMPLATES[templateId] || TEMPLATES.default;
  const themeBg = isSuccess ? template.successBg : template.pendingBg;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F2F3F5] pb-32">
      <div className={`px-6 pt-20 pb-24 rounded-b-[48px] text-white text-center bg-gradient-to-br ${themeBg}`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          {isSuccess ? (
            <CheckCircle2 className="w-8 h-8 text-white" />
          ) : (
            <Clock className="w-8 h-8 text-white" />
          )}
          <h2 className="text-xl font-black">
            {isSuccess ? template.successTitle : template.pendingTitle}
          </h2>
        </div>
        <p className="text-sm text-white/80 mb-6">
          {isSuccess ? template.successSubtitle : template.pendingSubtitle}
        </p>

        {orderInfo?.amount && (
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold">¥</span>
            <span className="text-5xl font-black">{orderInfo.amount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="px-6 -mt-16">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-50 pb-4">交易信息</h3>
          <div className="space-y-4">
            {(orderInfo?.product_name || orderInfo?.productName) && (
              <div className="flex justify-between items-start gap-4">
                <span className="text-xs text-gray-500 shrink-0">商品名称</span>
                <span className="text-xs text-gray-900 text-right">{orderInfo.product_name || orderInfo.productName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">订单编号</span>
              <span className="text-xs font-mono text-gray-900">{orderId}</span>
            </div>
            {(orderInfo?.pay_type || orderInfo?.payType) && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">支付方式</span>
                <span className="text-xs text-gray-900">{orderInfo.pay_type || orderInfo.payType}</span>
              </div>
            )}
            {(orderInfo?.buyer_name || orderInfo?.buyerName) && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">下单人</span>
                <span className="text-xs text-gray-900">{orderInfo.buyer_name || orderInfo.buyerName}</span>
              </div>
            )}
            {isSuccess && (orderInfo?.paid_at || orderInfo?.paidAt) && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">支付时间</span>
                <span className="text-xs text-gray-900">{new Date(orderInfo.paid_at || orderInfo.paidAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isSuccess ? 'text-blue-500' : 'text-orange-500'}`} />
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">{template.tipsTitle}</p>
              <ul className="text-xs text-gray-500 space-y-1.5">
                {template.tips.map((tip: string, index: number) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            if (!isSuccess) {
              window.location.reload();
            } else {
              window.location.href = '/';
            }
          }}
          className={`w-full py-4 text-white rounded-[24px] font-black text-sm shadow-lg shadow-black/5 ${isSuccess ? template.btnSuccessBg : template.btnPendingBg}`}
        >
          {isSuccess ? template.btnSuccess : template.btnPending}
        </button>

        <div className="text-center mt-6">
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
              <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="font-bold text-gray-900 mb-2">二、用户责任</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>用户需确保商品信息真实合法</li>
                  <li>用户不得利用平台进行违法活动</li>
                </ul>
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
                <h4 className="font-bold text-gray-900 mb-2">信息收集</h4>
                <p>我们收集账号信息、商品信息、订单信息以提供服务。</p>
              </div>
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

export default PaymentResultPage;
