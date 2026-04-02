/**
 * 设置页面
 * 使用新布局和UI组件
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Bell,
  Palette,
  Globe,
  Lock,
  HelpCircle,
  Info,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge, PageHeader, Modal } from '../components/ui';
import type { AuthUser } from '../services/authService';

interface SettingsPageProps {
  user: AuthUser | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onLogout: () => void;
}

interface SettingItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

export default function SettingsPage({ user, showToast, onLogout }: SettingsPageProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // 获取当前主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(savedTheme === 'dark' || (!savedTheme && prefersDark));
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

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'manager':
      case 'admin':
        return '经理';
      case 'supervisor':
      case 'director':
        return '主管';
      case 'employee':
      case 'staff':
        return '员工';
      default:
        return '未知角色';
    }
  };

  const accountSettings: SettingItem[] = [
    {
      id: 'profile',
      icon: <User className="w-5 h-5" />,
      title: '个人资料',
      description: '修改头像、昵称等个人信息',
      onClick: () => showToast('个人资料功能开发中'),
    },
    {
      id: 'password',
      icon: <Lock className="w-5 h-5" />,
      title: '修改密码',
      description: '更新登录密码',
      onClick: () => setShowPasswordModal(true),
    },
    {
      id: 'notifications',
      icon: <Bell className="w-5 h-5" />,
      title: '消息通知',
      description: '管理推送通知设置',
      action: (
        <button
          onClick={() => setNotifications(!notifications)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <motion.div
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
            animate={{ x: notifications ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      ),
    },
  ];

  const appSettings: SettingItem[] = [
    {
      id: 'theme',
      icon: <Palette className="w-5 h-5" />,
      title: '深色模式',
      description: '切换明暗主题',
      action: (
        <button
          onClick={toggleTheme}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isDark ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <motion.div
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center"
            animate={{ x: isDark ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {isDark ? (
              <Moon className="w-3 h-3 text-blue-600" />
            ) : (
              <Sun className="w-3 h-3 text-yellow-500" />
            )}
          </motion.div>
        </button>
      ),
    },
    {
      id: 'language',
      icon: <Globe className="w-5 h-5" />,
      title: '语言设置',
      description: '当前: 简体中文',
      onClick: () => showToast('语言设置功能开发中'),
    },
  ];

  const supportSettings: SettingItem[] = [
    {
      id: 'help',
      icon: <HelpCircle className="w-5 h-5" />,
      title: '帮助中心',
      description: '常见问题和使用指南',
      onClick: () => showToast('帮助中心开发中'),
    },
    {
      id: 'about',
      icon: <Info className="w-5 h-5" />,
      title: '关于我们',
      description: '版本 v2.2.0',
      onClick: () => setShowAboutModal(true),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="设置"
        subtitle="管理您的账户和应用设置"
      />

      {/* 用户信息卡片 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user?.displayName || '用户'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="primary">{getRoleName(user?.role)}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 账户设置 */}
      <Card>
        <CardHeader title="账户设置" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
        <CardContent className="p-0">
          {accountSettings.map((item, index) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                index !== accountSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
              {item.action || <ChevronRight className="w-5 h-5 text-gray-400" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 应用设置 */}
      <Card>
        <CardHeader title="应用设置" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
        <CardContent className="p-0">
          {appSettings.map((item, index) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                item.action ? '' : 'cursor-pointer'
              } ${
                index !== appSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
              {item.action || <ChevronRight className="w-5 h-5 text-gray-400" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 支持与帮助 */}
      <Card>
        <CardHeader title="支持与帮助" className="px-4 py-3 border-b border-gray-100 dark:border-gray-700" />
        <CardContent className="p-0">
          {supportSettings.map((item, index) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                index !== supportSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 退出登录 */}
      <Card>
        <CardContent className="p-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">退出登录</span>
          </button>
        </CardContent>
      </Card>

      {/* 修改密码弹窗 */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        showToast={showToast}
      />

      {/* 关于弹窗 */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
    </div>
  );
}

// 修改密码弹窗
function PasswordModal({ 
  isOpen, 
  onClose,
  showToast 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('请填写所有字段', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('密码至少需要6个字符', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('密码修改成功');
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || '修改失败', 'error');
      }
    } catch (error) {
      showToast('修改失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="修改密码">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前密码</label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" loading={isLoading} onClick={handleSubmit}>
            确认修改
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 关于弹窗
function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="关于我们">
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl font-bold">G</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">商品页助手</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">版本 2.2.0</p>
        
        <div className="text-left space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>商品页助手是一个面向个人商户/小微商家的商品展示页生成工具，帮助用户快速创建商品分享页面。</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © 2024 GoodsPage. All rights reserved.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
}
