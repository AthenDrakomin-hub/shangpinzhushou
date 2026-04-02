/**
 * 登录页面
 * 商品页助手 - 简洁现代风格
 * 与后台管理界面风格统一
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, Button } from '../components/ui';
import { version } from '../../package.json';

interface LoginPageProps {
  handleLogin: (email: string, password: string) => void;
  isAuthLoading: boolean;
  authError: string | null;
  onForgotPassword?: () => void;
}

export default function LoginPage({ handleLogin, isAuthLoading, authError, onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    console.log('[LoginPage] handleSubmit called, email:', email.trim());

    if (!email.trim()) {
      setLocalError('请输入邮箱地址');
      return;
    }

    if (!password.trim()) {
      setLocalError('请输入密码');
    } else if (password.length < 6) {
      setLocalError('密码至少需要6个字符');
    } else {
      console.log('[LoginPage] calling handleLogin');
      handleLogin(email.trim(), password);
    }
  };

  const error = localError || authError;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">商品页助手</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">登录您的账户继续使用</p>
        </div>

        {/* 登录卡片 */}
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 错误提示 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* 邮箱输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* 密码输入 */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">密码</label>
                  {onForgotPassword && (
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      忘记密码？
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* 提交按钮 */}
              <Button
                type="submit"
                variant="primary"
                loading={isAuthLoading}
                disabled={isAuthLoading}
                className="w-full py-3"
              >
                {isAuthLoading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            注：企业内容商品分享管理系统，请遵守合法合规的前提下使用
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            v{version}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
