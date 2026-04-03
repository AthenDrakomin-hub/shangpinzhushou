import { fetchApi } from '../utils/apiClient';
/**
 * 微信支付二维码页面
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, Clock, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
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

interface WechatPayQrCodeProps {
  codeUrl: string;
  orderId: string;
  amount: number;
  productName: string;
  handleBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const WechatPayQrCode: React.FC<WechatPayQrCodeProps> = ({
  codeUrl,
  orderId,
  amount,
  productName,
  handleBack,
  showToast
}) => {
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'expired'>('pending');
  const [countdown, setCountdown] = useState(300); // 5分钟倒计时
  const [isPolling, setIsPolling] = useState(true);
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  
  // 读取服务端注入的模板配置
  const [serverTemplate] = useState<BrandTemplate | null>(() => window.__TEMPLATE__ || null);

  // 轮询订单状态
  useEffect(() => {
    if (!isPolling || payStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetchApi(`/api/pay/order/status/${orderId}`);
        const data = await response.json();
        
        if (data.status === 'paid') {
          setPayStatus('paid');
          setIsPolling(false);
          showToast('下单成功！', 'success');
        }
      } catch (error) {
        console.error('Poll order status error:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [orderId, isPolling, payStatus]);

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

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 下单成功
  if (payStatus === 'paid') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F2F3F5] pb-32">
        <div className="bg-gradient-to-br from-green-600 to-green-700 px-6 pt-16 pb-10 rounded-b-[48px] text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-black mb-2">下单成功</h2>
          <p className="text-xs text-white/60">您的订单已完成</p>
        </div>

        <div className="px-6 mt-6">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center">
            <div className="flex items-baseline justify-center gap-1 mb-4">
              <span className="text-2xl font-bold text-gray-300">¥</span>
              <span className="text-4xl font-black text-gray-900">{amount.toFixed(2)}</span>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">{productName}</p>
            
            <p className="text-xs text-gray-400 mb-6">
              订单号: <span className="font-mono text-gray-600">{orderId}</span>
            </p>

            <button 
              onClick={handleBack}
              className="w-full py-4 bg-green-600 text-white rounded-[24px] font-black text-sm"
            >
              完成
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 二维码过期
  if (payStatus === 'expired') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F2F3F5] pb-32">
        <div className="bg-gradient-to-br from-gray-600 to-gray-700 px-6 pt-16 pb-10 rounded-b-[48px] text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-xl font-black mb-2">二维码已过期</h2>
          <p className="text-xs text-white/60">请重新发起下单</p>
        </div>

        <div className="px-6 mt-6">
          <button 
            onClick={handleBack}
            className="w-full py-4 bg-gray-900 text-white rounded-[24px] font-black text-sm"
          >
            返回重新下单
          </button>
        </div>
      </motion.div>
    );
  }

  // 待确认 - 显示二维码（支持品牌模板）
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F2F3F5] pb-32">
      <div 
        className="px-6 pt-16 pb-10 rounded-b-[48px] text-white text-center relative"
        style={serverTemplate ? {
          background: `linear-gradient(135deg, ${serverTemplate.gradientFrom} 0%, ${serverTemplate.gradientTo} 100%)`
        } : { background: 'linear-gradient(to bottom right, #16a34a, #15803d)' }}
      >
        <button onClick={handleBack} className="absolute top-16 left-6 p-2 bg-white/10 rounded-xl">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black mb-2">微信扫码下单</h2>
        <p className="text-xs text-white/60">请使用微信扫描下方二维码完成下单</p>
      </div>

      <div className="px-6 mt-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-64 h-64 mx-auto bg-white rounded-3xl flex items-center justify-center mb-6 border-4 border-green-100">
            {codeUrl ? (
              <QRCodeSVG 
                value={codeUrl} 
                size={240}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            ) : (
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-green-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">加载中...</p>
              </div>
            )}
          </div>
          
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-xl font-bold text-gray-300">¥</span>
            <span className="text-4xl font-black text-gray-900">{amount.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
            <Clock className="w-4 h-4" />
            <span>二维码有效期 {formatCountdown(countdown)}</span>
          </div>
          
          <p className="text-xs text-gray-400">
            订单号: <span className="font-mono text-gray-600">{orderId}</span>
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>等待确认中...</span>
          </div>
        </div>

        <div className="bg-green-50 rounded-3xl p-5 border border-green-100 mt-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-800 mb-1">下单说明</p>
              <ul className="text-xs text-green-600 space-y-1">
                <li>• 请使用微信扫描上方二维码</li>
                <li>• 下单成功后页面将自动跳转</li>
                <li>• 请在有效期内完成下单</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 px-6">
          <p className="text-[10px] text-gray-400">
            扫码即表示同意
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

export default WechatPayQrCode;
