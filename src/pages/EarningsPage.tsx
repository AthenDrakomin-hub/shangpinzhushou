/**
 * 收益记录页面
 * 使用新布局和UI组件
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Coins,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, Button, PageHeader, EmptyState, Skeleton } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface EarningsPageProps {
  user: AuthUser | null;
  handleBack: () => void;
  setCurrentView: (view: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface Earning {
  id: string;
  product_name: string;
  amount: number;
  order_id: string;
  created_at: string;
  type: 'sale' | 'refund' | 'commission';
}

export default function EarningsPage({ user, handleBack, setCurrentView, showToast }: EarningsPageProps) {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (user?.uid) {
      fetchEarnings();
    }
  }, [user, page]);

  const fetchEarnings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/earnings?limit=${pageSize}&offset=${page * pageSize}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.items) {
        setEarnings(data.items);
        setTotal(data.total);
      } else if (data.error) {
        showToast(data.error, 'error');
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      showToast('获取收益记录失败', 'error');
    } finally {
      setIsLoading(false);
    }
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

  const formatAmount = (amount: number) => {
    return `¥${Math.abs(amount).toFixed(2)}`;
  };

  // 计算统计数据
  const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
  const todayEarnings = earnings
    .filter((e) => {
      const today = new Date();
      const earningDate = new Date(e.created_at);
      return (
        earningDate.getDate() === today.getDate() &&
        earningDate.getMonth() === today.getMonth() &&
        earningDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="收益明细"
        subtitle="查看您的所有收益记录"
        breadcrumbs={[
          { label: '钱包', href: '#/wallet' },
          { label: '收益明细' },
        ]}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">累计收益</p>
                <p className="text-3xl font-bold mt-1">¥{totalEarnings.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">今日收益</p>
                <p className="text-3xl font-bold mt-1">¥{todayEarnings.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 收益列表 */}
      <Card>
        <CardHeader
          title="收益记录"
          subtitle={`共 ${total} 条记录`}
        />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : earnings.length === 0 ? (
            <EmptyState
              icon={<Coins className="w-12 h-12" />}
              title="暂无收益记录"
              description="您的商品售出后，收益会显示在这里"
              action={
                <Button variant="primary" onClick={() => setCurrentView('products')}>
                  创建商品
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {earnings.map((earning) => (
                <motion.div
                  key={earning.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        earning.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}
                    >
                      {earning.amount > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {earning.product_name || '商品订单'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDate(earning.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        earning.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {earning.amount > 0 ? '+' : '-'}
                      {formatAmount(earning.amount)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                第 {page + 1} / {totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
