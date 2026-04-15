import { fetchApi } from '../utils/apiClient';
/**
 * 订单管理页面
 * 使用新布局和UI组件
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingCart,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent, Button, Badge, StatCard, PageHeader, Modal } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface OrdersPageProps {
  user: AuthUser | null;
  handleBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface Order {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  pay_method?: string;
  buyer_name?: string;
  buyer_phone?: string;
  created_at: string;
  paid_at?: string;
}

interface OrderStats {
  total: number;
  paid: number;
  pending: number;
  totalAmount: number;
  todayCount: number;
  todayAmount: number;
}

const STATUS_CONFIG = {
  pending: { label: '待支付', color: 'warning', icon: Clock },
  paid: { label: '已支付', color: 'success', icon: CheckCircle },
  failed: { label: '已取消', color: 'danger', icon: XCircle },
  cancelled: { label: '已取消', color: 'danger', icon: XCircle },
};

const PAY_METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  wechat: { label: '微信', icon: <Smartphone className="w-4 h-4" />, color: 'text-green-600' },
  alipay: { label: '支付宝', icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-600' },
  alipay_superpay: { label: '支付宝', icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-600' },
  WXpay_SM: { label: '微信', icon: <Smartphone className="w-4 h-4" />, color: 'text-green-600' },
  bank: { label: '银行卡', icon: <CreditCard className="w-4 h-4" />, color: 'text-purple-600' },
};

export default function OrdersPage({ user, handleBack: _handleBack, showToast }: OrdersPageProps) {
  const getInitialStatusFilter = (): 'all' | 'pending' | 'paid' | 'failed' => {
    const hash = window.location.hash || '';
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const status = params.get('status');
    if (status === 'pending' || status === 'paid' || status === 'failed') {
      return status;
    }
    return 'all';
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    paid: 0,
    pending: 0,
    totalAmount: 0,
    todayCount: 0,
    todayAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'failed'>(() => getInitialStatusFilter());
  const [filterPayMethod, setFilterPayMethod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchOrders();
      fetchStats();
    }
  }, [user, filterStatus, filterPayMethod, dateRange.start, dateRange.end]);

  const fetchOrders = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterPayMethod !== 'all') params.append('payMethod', filterPayMethod);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (searchQuery) params.append('search', searchQuery);

      const token = localStorage.getItem('auth_token');
      const response = await fetchApi(`/api/orders?${params}`, {
        headers: { }
      });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      showToast('获取订单列表失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetchApi('/api/dashboard/stats', {
        headers: { }
      });
      const data = await response.json();
      setStats({
        total: data.totalOrders || 0,
        paid: data.paidOrders || 0,
        pending: data.pendingOrders || 0,
        totalAmount: data.totalRevenue || 0,
        todayCount: data.todayOrders || 0,
        todayAmount: data.todayRevenue || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('确定删除该订单？此操作不可恢复！')) return;
    
    try {
      const response = await fetchApi(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('订单已删除');
        setSelectedOrder(null);
        fetchOrders();
        fetchStats();
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleSearch = () => {
    fetchOrders();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return `¥${Number(amount).toFixed(2)}`;
  };

  // 过滤订单
  const filteredOrders = orders.filter(o => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        o.order_id?.toLowerCase().includes(query) ||
        o.product_name?.toLowerCase().includes(query) ||
        o.buyer_name?.toLowerCase().includes(query) ||
        o.buyer_phone?.includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="订单管理"
        subtitle="查看和管理所有订单"
        action={
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={() => showToast('导出功能开发中')}
          >
            导出
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="总订单"
          value={stats.total}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="已支付"
          value={stats.paid}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="待支付"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="总收入"
          value={`¥${stats.totalAmount.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* 今日统计 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">今日数据</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.todayCount} 笔订单 · ¥{stats.todayAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 搜索框 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索订单号、商品、买家..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <Button variant="primary" onClick={handleSearch}>
                搜索
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* 状态筛选 */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">全部状态</option>
                <option value="pending">待支付</option>
                <option value="paid">已支付</option>
                <option value="failed">已取消</option>
              </select>

              {/* 支付方式筛选 */}
              <select
                value={filterPayMethod}
                onChange={(e) => setFilterPayMethod(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">全部方式</option>
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
              </select>

              {/* 日期筛选 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">暂无订单</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr className="whitespace-nowrap">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">订单号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">商品</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">金额</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">买家</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">支付方式</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.map((order) => {
                    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const payMethodConfig = PAY_METHOD_CONFIG[order.pay_method || ''];
                    
                    return (
                      <motion.tr
                        key={order.id || order.order_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white whitespace-nowrap">
                          {order.order_id?.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px] truncate">
                          {order.product_name || '未知商品'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {formatAmount(order.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {order.buyer_name || '-'}
                          {order.buyer_phone && <span className="text-xs block">{order.buyer_phone}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <div className={`flex items-center gap-1 ${payMethodConfig?.color || 'text-gray-500'}`}>
                            {payMethodConfig?.icon}
                            <span>{payMethodConfig?.label || order.pay_method || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={statusConfig.color as 'success' | 'warning' | 'danger'}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 sm:gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Eye className="w-4 h-4" />}
                                onClick={() => setSelectedOrder(order)}
                                title="查看详情"
                              />
                              {isAdmin(user) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Trash2 className="w-4 h-4" />}
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  title="删除订单"
                                />
                              )}
                            </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 订单详情弹窗 */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}

// 订单详情弹窗
function OrderDetailModal({ 
  order, 
  onClose 
}: { 
  order: Order | null; 
  onClose: () => void;
}) {
  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <Modal isOpen={!!order} onClose={onClose} title="订单详情">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">订单号</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{order.order_id}</p>
          </div>
          <Badge variant={statusConfig.color as 'success' | 'warning' | 'danger'}>
            {statusConfig.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">商品</p>
            <p className="font-medium text-gray-900 dark:text-white">{order.product_name || '未知商品'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">金额</p>
            <p className="font-medium text-blue-600">¥{Number(order.amount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">买家</p>
            <p className="font-medium text-gray-900 dark:text-white">{order.buyer_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">联系电话</p>
            <p className="font-medium text-gray-900 dark:text-white">{order.buyer_phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">支付方式</p>
            <p className="font-medium text-gray-900 dark:text-white">{order.pay_method || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">创建时间</p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
            </p>
          </div>
        </div>

        {order.paid_at && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">
              支付时间: {new Date(order.paid_at).toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 检查是否为管理员
function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'manager' || user?.role === 'admin' || user?.role === 'supervisor';
}
