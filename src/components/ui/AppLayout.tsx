/**
 * 应用布局组件
 * 电商后台标准布局：侧边栏 + 顶部栏 + 内容区
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  X,
  Sun,
  Moon,
  Home,
  Package,
  ShoppingCart,
  Wallet,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  ChevronDown,
  Database,
  Shield,
  Briefcase,
  Crown,
  User
} from 'lucide-react';
import type { AuthUser } from '../../services/authService';

import { useTranslation } from 'react-i18next';

// 主题上下文
export const ThemeContext = React.createContext<{
  isDark: boolean;
  toggleTheme: () => void;
}>({
  isDark: false,
  toggleTheme: () => {},
});

// 导航菜单项
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chief_dashboard', label: '系统监控', icon: <Home className="w-5 h-5" /> },
  { id: 'db_admin', label: '数据库管理', icon: <Database className="w-5 h-5" /> },
  { id: 'dashboard', label: '仪表盘', icon: <Home className="w-5 h-5" /> },
  { id: 'products', label: '商品管理', icon: <Package className="w-5 h-5" /> },
  { id: 'orders', label: '订单管理', icon: <ShoppingCart className="w-5 h-5" /> },
  { id: 'wallet', label: '我的钱包', icon: <Wallet className="w-5 h-5" /> },
  { id: 'merchant_employees', label: '员工管理', icon: <Users className="w-5 h-5" /> },
  { id: 'merchant_withdrawals', label: '提现管理', icon: <Wallet className="w-5 h-5" /> },
  { id: 'settings', label: '系统管理', icon: <Settings className="w-5 h-5" /> },
];

interface AppLayoutProps {
  children: React.ReactNode;
  user: AuthUser | null;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  unreadNotifications?: number;
}

export default function AppLayout({
  children,
  user,
  currentView,
  onViewChange,
  onLogout,
  unreadNotifications = 0,
}: AppLayoutProps) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 根据角色过滤菜单
  const filteredNavItems = NAV_ITEMS.filter((item) => {
    const role = user?.role || 'employee';

    if (role === 'chief_engineer') {
      // 首席工程师只能看系统监控、数据库管理、员工管理、系统设置
      return ['chief_dashboard', 'db_admin', 'merchant_employees', 'settings'].includes(item.id);
    } else {
      // 其他角色不能看系统监控和数据库
      if (item.id === 'chief_dashboard' || item.id === 'db_admin') return false;

      // 经理、主管可以看提现管理和员工管理
      if ((item.id === 'merchant_employees' || item.id === 'merchant_withdrawals') &&
          role !== 'manager' && role !== 'admin' && role !== 'supervisor') {
        return false;
      }

      return true;
    }
  });

  // 角色显示名称
    const getRoleName = (role: string) => {
      switch (role) {
        case 'chief_engineer':
          return '首席工程师';
        case 'manager':
        case 'admin':
          return '经理';
        case 'supervisor':
          return '主管';
        case 'employee':
        case 'staff':
        default:
          return '员工';
      }
    };

    const getRoleIcon = (role: string | undefined, className = "w-5 h-5") => {
      switch (role) {
        case 'chief_engineer': return <Crown className={className} />;
        case 'admin':
        case 'manager': return <Briefcase className={className} />;
        case 'supervisor': return <Shield className={className} />;
        case 'employee':
        default: return <User className={className} />;
      }
    };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className="flex h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* 移动端遮罩 */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* 侧边栏 */}
        <motion.aside
          initial={false}
          animate={{
            width: sidebarCollapsed ? 72 : 260,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`
            fixed lg:static top-0 left-0 z-30 h-full
            bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
            flex flex-col shadow-sm lg:shadow-none transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo 区域 */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-gray-900 dark:text-white">商品页助手</span>
              </motion.div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-3">
              {filteredNavItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onViewChange(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <span className={isActive ? 'text-blue-600 dark:text-blue-400' : ''}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {t(`nav.${item.id}`, item.label)}
                        </motion.span>
                      )}
                      {item.badge && !sidebarCollapsed && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 底部用户信息 */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                  {getRoleIcon(user?.role, "w-4 h-4")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.displayName || '用户'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getRoleName(user?.role || 'employee')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 mx-auto bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                {getRoleIcon(user?.role, "w-4 h-4")}
              </div>
            )}
          </div>
        </motion.aside>

        {/* 右侧主区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 顶部栏 */}
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 flex items-center justify-between flex-shrink-0 z-10">
            <div className="flex items-center gap-4">
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors -ml-2"
                title="打开菜单"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>

              {/* 搜索框 */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400 w-40 lg:w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 主题切换 */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* 通知 */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* 用户下拉菜单 */}
              <div className="relative">
                <button
                  onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getRoleIcon(user?.role, "w-4 h-4")}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.displayName || '用户'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <AnimatePresence>
                  {themeMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-inner">
                            {getRoleIcon(user?.role, "w-5 h-5")}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {user?.displayName || '用户'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                              {user?.email}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onViewChange('settings');
                          setThemeMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="w-4 h-4" />
                        {t('settings', '设置')}
                      </button>
                      <button
                        onClick={() => {
                          onLogout();
                          setThemeMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('logout', '退出登录')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* 内容区 */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 lg:p-6 bg-gray-50 dark:bg-gray-900">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
