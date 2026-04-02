/**
 * 提现管理页面
 * 支持两种模式：
 * - user: 用户查看自己的提现记录
 * - merchant: 商户审核提现申请
 * 使用新布局和UI组件
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  CheckCircle,
  Loader2,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Badge,
  PageHeader,
  EmptyState,
  StatCard,
} from '../components/ui';
import type { AuthUser } from '../services/authService';

interface WithdrawalManagePageProps {
  mode: 'user' | 'merchant';
  user: AuthUser | null;
  onNavigate: (view: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface Withdrawal {
  id: string;
  user_id?: string;
  user_name?: string;
  amount: number;
  status: 'pending' | 'approved' | 'success' | 'failed' | 'rejected' | 'processing';
  payment_method: string;
  payment_account: string;
  payment_name: string;
  reject_reason?: string;
  created_at: string;
}

interface Stats {
  pendingCount: number;
  processingCount: number;
  successCount: number;
  todayAmount: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'primary' | 'success' | 'danger' | 'default' }> = {
  pending: { label: '待审核', variant: 'warning' },
  approved: { label: '待打款', variant: 'primary' },
  processing: { label: '处理中', variant: 'primary' },
  success: { label: '已到账', variant: 'success' },
  failed: { label: '失败', variant: 'danger' },
  rejected: { label: '已拒绝', variant: 'danger' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wechat: '微信',
  alipay: '支付宝',
  bank: '银行卡',
};

export default function WithdrawalManagePage({ mode, user, onNavigate: _onNavigate, showToast }: WithdrawalManagePageProps) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchData();
    }
  }, [user, activeTab, mode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');

      if (mode === 'merchant') {
        const [withdrawalsRes, statsRes] = await Promise.all([
          fetch(activeTab === 'pending' ? '/api/merchant/withdrawals/pending' : '/api/merchant/withdrawals', {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch('/api/merchant/withdrawals/stats', {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        const withdrawalsData = await withdrawalsRes.json();
        const statsData = await statsRes.json();

        if (activeTab === 'pending') {
          setWithdrawals(withdrawalsData.withdrawals || []);
        } else {
          setWithdrawals(withdrawalsData.items || []);
        }
        setStats(statsData.stats);
      } else {
        const response = await fetch('/api/withdrawals', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        setWithdrawals(data.items || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('确定通过该提现申请吗？')) return;

    setProcessingId(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/merchant/withdraw/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        showToast('已通过审核');
        fetchData();
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;

    setProcessingId(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/merchant/withdraw/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (data.success) {
        showToast('已拒绝申请');
        fetchData();
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePay = async (id: string) => {
    if (!confirm('确定立即代付吗？将调用支付接口进行转账。')) return;

    setProcessingId(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/merchant/withdraw/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        showToast('代付已发起，请等待到账');
        fetchData();
      } else {
        showToast(data.error || '代付失败', 'error');
      }
    } catch (error) {
      showToast('代付失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const title = mode === 'merchant' ? '提现管理' : '提现记录';
  const subtitle = mode === 'merchant' ? '审核和处理提现申请' : '查看您的提现记录';

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[
          { label: '钱包', href: '#/wallet' },
          { label: title },
        ]}
      />

      {/* 商户模式显示统计 */}
      {mode === 'merchant' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="待审核"
            value={stats.pendingCount}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            title="处理中"
            value={stats.processingCount}
            icon={<Loader2 className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            title="已完成"
            value={stats.successCount}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            title="今日金额"
            value={`¥${stats.todayAmount}`}
            icon={<ArrowUpRight className="w-5 h-5" />}
            color="blue"
          />
        </div>
      )}

      {/* 商户模式 Tab 切换 */}
      {mode === 'merchant' && (
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'pending' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('pending')}
          >
            待审核
          </Button>
          <Button
            variant={activeTab === 'all' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            全部记录
          </Button>
        </div>
      )}

      {/* 列表 */}
      <Card>
        <CardHeader
          title={mode === 'merchant' ? (activeTab === 'pending' ? '待审核申请' : '全部记录') : '提现记录'}
          subtitle={`共 ${withdrawals.length} 条记录`}
        />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : withdrawals.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-12 h-12" />}
              title="暂无提现记录"
              description={mode === 'merchant' ? '暂无待处理的提现申请' : '您的提现记录将显示在这里'}
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {withdrawals.map((w) => {
                const status = getStatusConfig(w.status);
                return (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          ¥{w.amount.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{PAYMENT_METHOD_LABELS[w.payment_method] || w.payment_method}</span>
                          <span>·</span>
                          <span>{w.payment_account}</span>
                        </div>
                        {w.user_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            申请人: {w.user_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatDate(w.created_at)}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    {/* 拒绝原因 */}
                    {w.reject_reason && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm mb-3">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>拒绝原因: {w.reject_reason}</span>
                      </div>
                    )}

                    {/* 商户操作按钮 */}
                    {mode === 'merchant' && w.status === 'pending' && (
                      <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Button
                          variant="success"
                          size="sm"
                          loading={processingId === w.id}
                          disabled={processingId === w.id}
                          onClick={() => handleApprove(w.id)}
                          className="flex-1"
                        >
                          通过
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={processingId === w.id}
                          onClick={() => handleReject(w.id)}
                          className="flex-1"
                        >
                          拒绝
                        </Button>
                      </div>
                    )}

                    {mode === 'merchant' && w.status === 'approved' && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Button
                          variant="primary"
                          size="sm"
                          loading={processingId === w.id}
                          disabled={processingId === w.id}
                          icon={<ArrowUpRight className="w-4 h-4" />}
                          onClick={() => handlePay(w.id)}
                          className="w-full"
                        >
                          立即代付
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
