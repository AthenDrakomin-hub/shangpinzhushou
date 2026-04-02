/**
 * 钱包页面 (新布局版本)
 * 包含：余额显示、申请提现、提现记录、收益记录
 */
import { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  History,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge, StatCard, PageHeader, Modal } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface WalletPageProps {
  user: AuthUser | null;
  onNavigate: (view: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface WalletData {
  balance: string;
  total_earnings: string;
  pending_balance?: string;
}

interface WithdrawalRecord {
  id: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  bank_name?: string;
  bank_account?: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'withdrawal';
  amount: string;
  status: string;
  created_at: string;
  description?: string;
}

export default function WalletPage({ user, onNavigate, showToast }: WalletPageProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchWallet();
      fetchWithdrawals();
      fetchTransactions();
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
      showToast('获取钱包数据失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/withdrawals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setWithdrawals(data.withdrawals || []);
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleWithdraw = async (amount: string, bankInfo: { bankName: string; bankAccount: string; accountName: string }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          bankName: bankInfo.bankName,
          bankAccount: bankInfo.bankAccount,
          accountName: bankInfo.accountName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('提现申请已提交');
        setShowWithdrawModal(false);
        fetchWallet();
        fetchWithdrawals();
      } else {
        showToast(data.error || '提现申请失败', 'error');
      }
    } catch (error) {
      showToast('提现申请失败', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">待审核</Badge>;
      case 'approved':
        return <Badge variant="success">已通过</Badge>;
      case 'rejected':
        return <Badge variant="danger">已拒绝</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="我的钱包"
        subtitle="查看余额和收益记录"
        action={
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchWallet}
          >
            刷新
          </Button>
        }
      />

      {/* 余额卡片 */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  <span className="text-blue-100">可提现余额</span>
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-bold text-blue-100">¥</span>
                <span className="text-5xl font-black">
                  {wallet ? Number(wallet.balance || 0).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-blue-200 text-sm">累计收益</p>
                  <p className="text-xl font-bold">¥{wallet ? Number(wallet.total_earnings || 0).toFixed(2) : '0.00'}</p>
                </div>
              </div>
            </>
          )}
        </div>
        <CardContent className="p-4">
          <Button
            variant="primary"
            className="w-full"
            icon={<ArrowUpRight className="w-4 h-4" />}
            onClick={() => setShowWithdrawModal(true)}
            disabled={!wallet || parseFloat(wallet.balance) <= 0}
          >
            申请提现
          </Button>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="本月收入"
          value="¥0.00"
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="本月提现"
          value="¥0.00"
          icon={<ArrowDownRight className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="待审核"
          value={withdrawals.filter(w => w.status === 'pending').length}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="已完成"
          value={withdrawals.filter(w => w.status === 'approved').length}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* 提现记录 */}
      <Card>
        <CardHeader 
          title="提现记录" 
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('withdrawals')}
            >
              查看全部
            </Button>
          }
          className="px-4 py-3 border-b border-gray-100 dark:border-gray-700"
        />
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">暂无提现记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {withdrawals.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.status === 'approved' ? 'bg-green-100 text-green-600' :
                      item.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {item.status === 'approved' ? <CheckCircle className="w-5 h-5" /> :
                       item.status === 'rejected' ? <XCircle className="w-5 h-5" /> :
                       <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ¥{parseFloat(item.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatTime(item.created_at)}</p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 收益记录 */}
      <Card>
        <CardHeader title="收益记录" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">暂无收益记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {item.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.description || (item.type === 'income' ? '订单收益' : '提现')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatTime(item.created_at)}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${item.type === 'income' ? 'text-green-600' : 'text-blue-600'}`}>
                    {item.type === 'income' ? '+' : '-'}¥{parseFloat(item.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提现弹窗 */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSubmit={handleWithdraw}
        maxAmount={wallet?.balance || '0'}
        showToast={showToast}
      />
    </div>
  );
}

// 提现弹窗
function WithdrawModal({
  isOpen,
  onClose,
  onSubmit,
  maxAmount,
  showToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: string, bankInfo: { bankName: string; bankAccount: string; accountName: string }) => void;
  maxAmount: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast('请输入有效金额', 'error');
      return;
    }
    if (parseFloat(amount) > parseFloat(maxAmount)) {
      showToast('提现金额超过可提现余额', 'error');
      return;
    }
    if (!bankName || !bankAccount || !accountName) {
      showToast('请填写完整的银行信息', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(amount, { bankName, bankAccount, accountName });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="申请提现">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-sm text-blue-700 dark:text-blue-400">可提现余额</p>
          <p className="text-2xl font-bold text-blue-600">¥{parseFloat(maxAmount).toFixed(2)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">提现金额</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">开户银行</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="如：中国工商银行"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">银行卡号</label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="请输入银行卡号"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">持卡人姓名</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="请输入持卡人姓名"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" loading={isLoading} onClick={handleSubmit}>
            提交申请
          </Button>
        </div>
      </div>
    </Modal>
  );
}
