/**
 * 员工钱包页面
 * 包含：余额显示、申请提现、提现记录、收益记录
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft, ArrowUpRight, History, TrendingUp
} from 'lucide-react';

type View = 'landing' | 'dashboard' | 'products' | 'product_create' | 'orders' | 'product_checkout' | 'payment_result' | 'wallet' | 'earnings' | 'withdraw' | 'withdrawals' | 'forgot_password' | 'reset_password' | 'admin_pending_users' | 'merchant_employees' | 'merchant_withdrawals' | 'settings';

interface StaffWalletProps {
  handleBack: () => void;
  setCurrentView: (view: View) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  user: any;
}

export default function StaffWallet({ handleBack, setCurrentView, showToast, user }: StaffWalletProps) {
  const [wallet, setWallet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      fetchWallet();
    }
  }, [user]);

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.wallet) {
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      showToast('获取钱包数据失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="min-h-screen bg-[#F2F3F5] pb-32"
    >
      {/* 头部 */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-16 pb-12 rounded-b-[40px] shadow-lg">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={handleBack} className="p-2 bg-white/20 rounded-xl backdrop-blur">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-xl font-black text-white">我的钱包</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
          </div>
        ) : wallet ? (
          <div className="text-center">
            <p className="text-blue-100 text-sm mb-2">可提现余额</p>
            <p className="text-5xl font-black text-white mb-4">¥{parseFloat(wallet.balance || 0).toFixed(2)}</p>
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <p className="text-blue-200">累计收益</p>
                <p className="text-white font-bold">¥{parseFloat(wallet.total_earnings || 0).toFixed(2)}</p>
              </div>
              <div className="w-px bg-white/20"></div>
              <div>
                <p className="text-blue-200">已提现</p>
                <p className="text-white font-bold">¥{parseFloat(wallet.total_withdrawn || 0).toFixed(2)}</p>
              </div>
              <div className="w-px bg-white/20"></div>
              <div>
                <p className="text-blue-200">冻结中</p>
                <p className="text-white font-bold">¥{parseFloat(wallet.frozen_balance || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-white/80 py-8">
            <p>暂无钱包数据</p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCurrentView('withdraw')}
            className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">申请提现</p>
              <p className="text-xs text-gray-400">提现到微信/支付宝</p>
            </div>
          </button>
          <button
            onClick={() => setCurrentView('withdrawals')}
            className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">提现记录</p>
              <p className="text-xs text-gray-400">查看历史记录</p>
            </div>
          </button>
        </div>

        <button
          onClick={() => setCurrentView('earnings')}
          className="w-full bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">收益明细</p>
              <p className="text-xs text-gray-400">查看每笔收益来源</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180" />
        </button>
      </div>
    </motion.div>
  );
}
