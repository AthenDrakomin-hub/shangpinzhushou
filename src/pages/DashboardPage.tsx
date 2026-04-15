import { fetchApi } from '../utils/apiClient';
/**
 * 仪表盘页面
 * 数据概览、统计图表、快捷操作
 * 根据用户角色显示不同的功能入口
 * 从后端 API 获取真实数据
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Clock,
  MoreHorizontal,
  Plus,
  Users,
  Settings,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardContent, Button, Badge, StatCard, PageHeader, Table } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface DashboardPageProps {
  user: AuthUser | null;
  onNavigate: (view: string) => void;
}

// 角色类型
type UserRole = 'manager' | 'admin' | 'supervisor' | 'employee' | 'staff' | 'chief_engineer' | string;

// API 响应类型
interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  walletBalance: number;
  totalEarnings: number;
  totalUsers: number;
  salesChart: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  recentOrders: Array<{
    id: string;
    productName: string;
    amount: number;
    status: string;
    createdAt: string;
    buyerName: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
    sales: number;
  }>;
}

// 获取用户角色
const getUserRole = (user: AuthUser | null): UserRole => {
  if (!user) return 'employee';
  const role = user.role as UserRole;
  if (role === 'staff') return 'employee';
  return role || 'employee';
};

// 判断是否是管理员（经理或admin）
const isManager = (user: AuthUser | null): boolean => {
  const role = getUserRole(user);
  return role === 'manager' || role === 'admin' || role === 'chief_engineer';
};

// 判断是否是主管或以上
const isSupervisorOrAbove = (user: AuthUser | null): boolean => {
  const role = getUserRole(user);
  return role === 'manager' || role === 'admin' || role === 'supervisor' || role === 'chief_engineer';
};

// 快捷操作配置
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  roles: UserRole[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'products',
    label: '商品管理',
    icon: <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    roles: ['manager', 'admin', 'supervisor', 'employee', 'staff'],
  },
  {
    id: 'orders',
    label: '订单管理',
    icon: <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    roles: ['manager', 'admin', 'supervisor', 'employee', 'staff'],
  },
  {
      id: 'wallet',
      label: '我的钱包',
      icon: <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      roles: ['manager', 'admin', 'supervisor', 'employee', 'staff'],
    },
  {
    id: 'merchant_employees',
    label: '员工管理',
    icon: <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    roles: ['manager', 'admin', 'supervisor'],
  },
  {
    id: 'merchant_withdrawals',
    label: '提现审核',
    icon: <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    roles: ['manager', 'admin', 'supervisor'],
  },
  {
    id: 'admin_pending_users',
    label: '用户审核',
    icon: <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    roles: ['manager', 'admin'],
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />,
    iconBg: 'bg-gray-100 dark:bg-gray-900/30',
    roles: ['manager', 'admin'],
  },
  {
    id: 'withdraw',
    label: '申请提现',
    icon: <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    roles: ['employee', 'staff'],
  },
];

// 获取角色显示名称
const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'manager':
    case 'admin':
      return '经理';
    case 'supervisor':
      return '主管';
    case 'chief_engineer':
      return '首席工程师';
    case 'employee':
    case 'staff':
    default:
      return '员工';
  }
};

// 格式化日期显示
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[date.getDay()];
};

// 格式化时间显示
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

export default function DashboardPage({ user, onNavigate }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userRole = getUserRole(user);

  // 根据角色过滤快捷操作
  const availableActions = QUICK_ACTIONS.filter(action =>
    action.roles.includes(userRole)
  );

  // 获取仪表盘数据
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const response = await fetchApi('/api/dashboard/stats', {
          headers: {
            
          },
        });

        if (!response.ok) {
          throw new Error('获取数据失败');
        }

        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('获取仪表盘数据失败:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">已支付</Badge>;
      case 'pending':
        return <Badge variant="warning">待支付</Badge>;
      case 'failed':
        return <Badge variant="danger">已取消</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const orderColumns = [
    {
      key: 'orderId',
      title: '订单号',
      render: (value: string, row: any) => <span className="font-mono text-xs">{(value || row.id)?.slice(0, 12)}...</span>,
    },
    {
      key: 'productName',
      title: '商品',
    },
    {
      key: 'amount',
      title: '金额',
      align: 'right' as const,
      render: (value: number) => <span className="font-medium">¥{value.toFixed(2)}</span>,
    },
    {
      key: 'status',
      title: '状态',
      align: 'center' as const,
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'buyerName',
      title: '买家',
    },
    {
      key: 'createdAt',
      title: '时间',
      render: (value: string) => <span className="text-gray-500 text-xs">{formatTime(value)}</span>,
    },
  ];

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载数据中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </div>
    );
  }

  // 空状态
  if (!stats) {
    return null;
  }

  // 计算待处理订单数
  const pendingOrders = stats.totalOrders - stats.paidOrders;

  // 图表数据
  const chartData = stats.salesChart.map(item => ({
    name: formatDate(item.date),
    value: item.sales,
    orders: item.orders,
  }));

  // 热销商品数据
  const topProductsData = stats.topProducts.map(product => ({
    ...product,
    revenue: product.price * product.sales,
  }));

  const incomeTitle = isManager(user) ? '总销售额' : '总收益';
  const incomeValue = isManager(user) ? stats.totalRevenue : stats.totalEarnings;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title={`欢迎回来，${user?.displayName || '用户'}`}
        subtitle={`${getRoleDisplayName(userRole)} · 业务数据概览`}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => onNavigate('product_create')}>
            创建商品
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="商品总数"
          value={stats.totalProducts}
          icon={<Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="订单总数"
          value={stats.totalOrders}
          icon={<ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />}
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title={incomeTitle}
          value={`¥${incomeValue.toLocaleString()}`}
          icon={<Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard
          title="待处理订单"
          value={pendingOrders}
          icon={<Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
        />
      </div>

      {/* 管理员额外统计 */}
      {isManager(user) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="用户总数"
            value={stats.totalUsers}
            icon={<Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
            iconBgColor="bg-cyan-100 dark:bg-cyan-900/30"
          />
          <StatCard
            title="钱包余额"
            value={`¥${stats.walletBalance.toLocaleString()}`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            iconBgColor="bg-emerald-100 dark:bg-emerald-900/30"
          />
        </div>
      )}

      {/* 数据概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 销售趋势图 */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="销售趋势"
            subtitle="最近7天"
            action={
              <Button variant="ghost" size="sm" icon={<MoreHorizontal className="w-4 h-4" />}>
                更多
              </Button>
            }
          />
          <CardContent className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value) => [`¥${value}`, '销售额']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                暂无销售数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 收入概览 */}
        <Card>
          <CardHeader title="收入概览" />
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">已支付订单</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.paidOrders}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">累计收入</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ¥{stats.totalEarnings.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">支付成功率</span>
                <span className="font-medium text-green-600">
                  {stats.totalOrders > 0 ? Math.round((stats.paidOrders / stats.totalOrders) * 100) : 0}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.totalOrders > 0 ? (stats.paidOrders / stats.totalOrders) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-green-500 rounded-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近订单和热销商品 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近订单 */}
        <Card>
          <CardHeader
            title="最近订单"
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('orders')}>
                查看全部
              </Button>
            }
          />
          {stats.recentOrders.length > 0 ? (
            <Table
              columns={orderColumns}
              data={stats.recentOrders}
              rowKey="id"
            />
          ) : (
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                暂无订单
              </div>
            </CardContent>
          )}
        </Card>

        {/* 热销商品 */}
        <Card>
          <CardHeader
            title="热销商品"
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('products')}>
                查看全部
              </Button>
            }
          />
          <CardContent>
            {topProductsData.length > 0 ? (
              <div className="space-y-4">
                {topProductsData.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        销量 {product.sales}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ¥{product.revenue.toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                暂无商品数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 - 根据角色显示不同内容 */}
      <Card>
        <CardHeader
          title="快捷操作"
          subtitle={isManager(user) ? '管理员可访问所有功能' : isSupervisorOrAbove(user) ? '主管可管理员工和审核提现' : '员工可管理商品和查看订单'}
        />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableActions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(action.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className={`p-3 rounded-xl ${action.iconBg}`}>
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
