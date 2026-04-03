/**
 * 支付结果页面
 */

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface PaymentResultPageProps {
  orderId: string;
}

const PaymentResultPage: React.FC<PaymentResultPageProps> = ({ orderId }) => {
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
    loadOrderInfo();
  }, [orderId]);

  const loadOrderInfo = async () => {
    try {
      const response = await fetch(`/api/pay/order/status/${orderId}`);
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

  const isSuccess = orderInfo?.status === 'paid';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F2F3F5] pb-32">
      <div className={`px-6 pt-20 pb-10 rounded-b-[48px] text-white text-center ${isSuccess ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-orange-500 to-orange-600'}`}>
        <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
          {isSuccess ? (
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          ) : (
            <Clock className="w-10 h-10 text-orange-500" />
          )}
        </div>
        <h2 className="text-xl font-black mb-2">
          {isSuccess ? '下单成功' : '等待确认'}
        </h2>
        <p className="text-xs text-white/60">
          {isSuccess ? '您的订单已完成' : '订单等待确认中'}
        </p>
      </div>

      <div className="px-6 mt-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center">
          {orderInfo?.amount && (
            <div className="flex items-baseline justify-center gap-1 mb-4">
              <span className="text-2xl font-bold text-gray-300">¥</span>
              <span className="text-4xl font-black text-gray-900">{orderInfo.amount.toFixed(2)}</span>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mb-6">
            订单号: <span className="font-mono text-gray-600">{orderId}</span>
          </p>

          {isSuccess && orderInfo?.paidAt && (
            <p className="text-xs text-gray-400 mb-6">
              下单时间: <span className="text-gray-600">{new Date(orderInfo.paidAt).toLocaleString()}</span>
            </p>
          )}

          <button 
            onClick={() => window.location.href = '/'}
            className={`w-full py-4 text-white rounded-[24px] font-black text-sm ${isSuccess ? 'bg-green-600' : 'bg-orange-500'}`}
          >
            {isSuccess ? '完成' : '返回'}
          </button>
        </div>

        {!isSuccess && (
          <div className="bg-orange-50 rounded-3xl p-5 border border-orange-100 mt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-800 mb-1">下单提示</p>
                <ul className="text-xs text-orange-600 space-y-1">
                  <li>• 如您已完成下单，请稍后刷新页面</li>
                  <li>• 如下单遇到问题，请联系商户</li>
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
