/**
 * 申请提现页面
 * 使用新布局和UI组件
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Wallet,
  Send,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, Button, Input, PageHeader } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface WithdrawPageProps {
  user: AuthUser | null;
  handleBack: () => void;
  setCurrentView: (view: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface WalletData {
  balance: string;
  frozen_balance?: string;
  total_earnings?: string;
}

const PAYMENT_METHODS = [
  { id: 'wechat', name: '微信', icon: '💚', placeholder: '请输入微信账号' },
  { id: 'alipay', name: '支付宝', icon: '💙', placeholder: '请输入支付宝账号' },
  { id: 'bank', name: '银行卡', icon: '🏦', placeholder: '请输入银行卡号' },
];

export default function WithdrawPage({ user, handleBack, setCurrentView, showToast }: WithdrawPageProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'wechat' as 'wechat' | 'alipay' | 'bank',
    paymentAccount: '',
    paymentName: '',
    bankCode: '',
    bankName: '',
  });

  useEffect(() => {
    if (user?.uid) {
      fetchWallet();
    }
  }, [user]);

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
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
      showToast('获取钱包信息失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) < 10) {
      showToast('最低提现金额为 10 元', 'error');
      return;
    }
    if (!formData.paymentAccount) {
      showToast('请填写收款账号', 'error');
      return;
    }
    if (!formData.paymentName) {
      showToast('请填写收款人姓名', 'error');
      return;
    }
    if (wallet && parseFloat(formData.amount) > parseFloat(wallet.balance)) {
      showToast('余额不足', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        showToast('提现申请已提交');
        setCurrentView('withdrawals');
      } else {
        showToast(data.error || '提现失败', 'error');
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      showToast('提现失败，请重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const balance = wallet ? parseFloat(wallet.balance || '0') : 0;
  const frozenBalance = wallet ? parseFloat(wallet.frozen_balance || '0') : 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="申请提现"
        subtitle="将您的收益提现到银行账户"
        breadcrumbs={[
          { label: '钱包', href: '#/wallet' },
          { label: '申请提现' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：钱包信息 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 余额卡片 */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-blue-100 text-sm">可提现余额</span>
              </div>
              <p className="text-4xl font-bold">¥{balance.toFixed(2)}</p>
              {frozenBalance > 0 && (
                <p className="text-blue-100 text-sm mt-2">
                  冻结金额: ¥{frozenBalance.toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 提现说明 */}
          <Card>
            <CardHeader title="提现说明" />
            <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>最低提现金额为 10 元</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>提现申请提交后，需等待审核</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>审核通过后将在 1-3 个工作日内到账</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <span>请确保收款信息准确无误</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：提现表单 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="填写提现信息" />
            <CardContent className="space-y-6">
              {/* 提现金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  提现金额
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">¥</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 text-3xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                {wallet && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      可提现: ¥{balance.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setFormData({ ...formData, amount: String(wallet?.balance || 0) })}
                      className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      全部提现
                    </button>
                  </div>
                )}
              </div>

              {/* 收款方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  收款方式
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <motion.button
                      key={method.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id as 'wechat' | 'alipay' | 'bank' })}
                      className={`py-3 px-4 rounded-xl font-medium text-sm border-2 transition-all ${
                        formData.paymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="mr-1">{method.icon}</span>
                      {method.name}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* 收款信息 */}
              <div className="space-y-4">
                <Input
                  label={formData.paymentMethod === 'bank' ? '银行卡号' : '收款账号'}
                  value={formData.paymentAccount}
                  onChange={(e) => setFormData({ ...formData, paymentAccount: e.target.value })}
                  placeholder={PAYMENT_METHODS.find((m) => m.id === formData.paymentMethod)?.placeholder}
                />

                <Input
                  label="收款人姓名"
                  value={formData.paymentName}
                  onChange={(e) => setFormData({ ...formData, paymentName: e.target.value })}
                  placeholder="请输入真实姓名"
                />

                {formData.paymentMethod === 'bank' && (
                  <Input
                    label="开户银行"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="如：中国工商银行"
                  />
                )}
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setCurrentView('wallet')}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting || isLoading}
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleSubmit}
                >
                  提交申请
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
