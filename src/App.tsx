/**
 * 商品页助手 - 主应用组件
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  signInWithEmail, 
  signOut, 
  onAuthStateChanged, 
  isEmailVerified,
  resendVerificationEmail,
  setSession,
  type AuthUser 
} from './services/authService';
import { 
  syncUserProfile, 
  testConnection
} from './services/dataService';

// 导入独立页面组件
import LoginPage from './pages/LoginPage';
import StaffWallet from './pages/StaffWallet';
import UserManagePage from './pages/UserManagePage';
import WithdrawalManagePage from './pages/WithdrawalManagePage';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductCreatePage from './pages/ProductCreatePage';
import EarningsPage from './pages/EarningsPage';
import WithdrawPage from './pages/WithdrawPage';
import PaymentResultPage from './pages/PaymentResultPage';
import ProductCheckoutPage from './pages/ProductCheckoutPage';
import H5ProductPage from './pages/H5ProductPage';
import EmailVerificationBanner from './components/EmailVerificationBanner';
import AppLayout from './components/ui/AppLayout';

type View = 'landing' | 'dashboard' | 'products' | 'product_create' | 'orders' | 'product_checkout' | 'h5_product' | 'payment_result' | 'wallet' | 'earnings' | 'withdraw' | 'withdrawals' | 'forgot_password' | 'reset_password' | 'admin_pending_users' | 'merchant_employees' | 'merchant_withdrawals' | 'settings';

// ==================== Main App Component ====================
import ShareProductModal from './components/ShareProductModal';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);
  const [paymentResultOrderId, setPaymentResultOrderId] = useState<string | null>(null);
  const [sharingProduct, setSharingProduct] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle checkout route
  useEffect(() => {
    const path = window.location.pathname;
    
    // 匹配 H5 页面路由
    const h5Match = path.match(/^\/h5\/([a-zA-Z0-9_-]+)$/);
    if (h5Match) {
      setCheckoutProductId(h5Match[1]);
      setCurrentView('h5_product');
      return;
    }
    
    const checkoutMatch = path.match(/^\/checkout\/([a-zA-Z0-9_-]+)$/);
    if (checkoutMatch) {
      setCheckoutProductId(checkoutMatch[1]);
      setCurrentView('product_checkout');
      return;
    }
    
    // Handle payment result route
    const resultMatch = path.match(/^\/payment\/result$/);
    if (resultMatch) {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('orderId');
      if (orderId) {
        setPaymentResultOrderId(orderId);
        setCurrentView('payment_result');
      }
    }
  }, []);

  // Auth State
  useEffect(() => {
    // 测试连接（非阻塞）
    testConnection().then(result => {
      if (!result.success) {
        console.warn('Database connection test failed:', result.error);
      }
    });
    
    const unsubscribeAuth = onAuthStateChanged(async (authUser) => {
      console.log('[Auth] onAuthStateChanged triggered:', authUser?.email || 'null');
      if (authUser) {
        try {
          setUser(authUser);
          
          // 同步用户资料（非阻塞，捕获错误）
          try {
            await syncUserProfile(authUser);
            console.log('[Auth] syncUserProfile success');
          } catch (syncErr) {
            console.warn('[Auth] syncUserProfile failed (non-blocking):', syncErr);
          }
          
          setCurrentView(prev => prev === 'landing' ? 'dashboard' : prev);
          
          // 检查邮箱验证状态
          const verified = await isEmailVerified();
          setEmailVerified(verified);
        } catch (err) {
          console.error('[Auth] onAuthStateChanged error:', err);
          // 即使出错，也保持用户登录状态
        }
      } else {
        setUser(null);
        setCurrentView('landing');
        setEmailVerified(null);
      }
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Handle Auth Callback from URL (password reset, magic link, email verification)
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // 处理密码重置回调
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      if (accessToken && refreshToken) {
        // 设置 session
        const { session, error } = await setSession(accessToken, refreshToken);
        
        if (!error && session) {
          // 清理 URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          if (type === 'recovery') {
            // 密码重置回调，跳转到重置密码页面
            setCurrentView('reset_password');
          } else if (type === 'signup' || type === 'magiclink') {
            // 邮箱验证或 Magic Link 回调
            showToast('登录成功');
          }
        }
      }
    };
    
    handleAuthCallback();
  }, []);

  // Navigate event listener (for forgot password link)
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const view = e.detail as View;
      if (view === 'forgot_password') {
        setCurrentView('forgot_password');
      }
    };
    
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  // Resend verification email
  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setIsResendingVerification(true);
    try {
      const { error } = await resendVerificationEmail(user.email);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('验证邮件已发送，请查收邮箱');
      }
    } catch (err) {
      showToast('发送失败，请重试', 'error');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    setIsAuthLoading(true);
    console.log('[Auth] handleLogin called for:', email);
    try {
      const { user, error } = await signInWithEmail(email, password);
      console.log('[Auth] signInWithEmail result:', { user: user?.email, error, fullUser: user });
      if (error) {
        console.log('[Auth] Login error:', error);
        setAuthError(error);
        setIsAuthLoading(false);
      } else if (user) {
        console.log('[Auth] Login success, refreshing page');
        // 登录成功后刷新页面，让 onAuthStateChanged 重新加载用户状态
        window.location.reload();
      } else {
        console.log('[Auth] No user and no error - unexpected state');
        setAuthError('登录失败，请重试');
        setIsAuthLoading(false);
      }
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      setAuthError('登录失败，请重试');
      setIsAuthLoading(false);
    }
  };

  // 注册功能已移除 - 员工账号由管理员统一创建
  // const handleRegister = async (email: string, password: string, displayName: string) => { ... }

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      setCurrentView('landing');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBack = () => {
    if (currentView === 'dashboard') {
      setCurrentView('landing');
    } else if (currentView === 'products' || currentView === 'orders' || currentView === 'wallet') {
      setCurrentView('dashboard');
    } else if (currentView === 'product_create') {
      setCurrentView('products');
    } else if (currentView === 'earnings' || currentView === 'withdraw' || currentView === 'withdrawals') {
      setCurrentView('wallet');
    } else {
      setCurrentView('landing');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E29] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 判断是否是登录后的页面
  const isAuthenticatedPages: View[] = ['dashboard', 'products', 'product_create', 'orders', 'wallet', 'earnings', 'withdraw', 'withdrawals', 'admin_pending_users', 'merchant_employees', 'merchant_withdrawals', 'settings'];

  return (
    <div className="min-h-screen bg-[#F2F3F5] font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* 未登录页面 */}
      {currentView === 'landing' && <LoginPage key="landing" handleLogin={handleLogin} isAuthLoading={isAuthLoading} authError={authError} onForgotPassword={() => setCurrentView('forgot_password')} />}
      {currentView === 'forgot_password' && <ForgotPasswordPage key="forgot_password" handleBack={handleBack} showToast={showToast} />}
      {currentView === 'reset_password' && <ResetPasswordPage key="reset_password" handleBack={handleBack} showToast={showToast} onSuccess={() => setCurrentView('landing')} />}
      {currentView === 'product_checkout' && checkoutProductId && <ProductCheckoutPage key="product_checkout" productId={checkoutProductId} handleBack={() => window.history.back()} showToast={showToast} />}
      {currentView === 'h5_product' && checkoutProductId && <H5ProductPage key="h5_product" productId={checkoutProductId} onClose={() => window.history.back()} />}
      {currentView === 'payment_result' && paymentResultOrderId && <PaymentResultPage key="payment_result" orderId={paymentResultOrderId} />}

      {/* 登录后的页面 - 使用 AppLayout 包裹 */}
      {isAuthenticatedPages.includes(currentView) && (
        <AppLayout 
          user={user} 
          currentView={currentView} 
          onViewChange={(view) => setCurrentView(view as View)}
          onLogout={handleLogout}
        >
          {emailVerified === false && currentView === 'dashboard' && (
            <EmailVerificationBanner 
              email={user?.email ?? null} 
              onResend={handleResendVerification} 
              isResending={isResendingVerification} 
            />
          )}
          
          {currentView === 'dashboard' && <DashboardPage key="dashboard" user={user} onNavigate={(view) => setCurrentView(view as View)} />}
          {currentView === 'products' && <ProductsPage key="products" handleBack={handleBack} setCurrentView={(view) => setCurrentView(view as View)} showToast={showToast} user={user} />}
          {currentView === 'product_create' && <ProductCreatePage key="product_create" handleBack={handleBack} setCurrentView={(view) => setCurrentView(view as View)} showToast={showToast} user={user} setSharingProduct={setSharingProduct} />}
          {currentView === 'orders' && <OrdersPage key="orders" handleBack={handleBack} showToast={showToast} user={user} />}
          {currentView === 'wallet' && <StaffWallet key="wallet" handleBack={handleBack} setCurrentView={(view) => setCurrentView(view as View)} showToast={showToast} user={user} />}
          {currentView === 'earnings' && <EarningsPage key="earnings" handleBack={handleBack} setCurrentView={(view) => setCurrentView(view as View)} showToast={showToast} user={user} />}
          {currentView === 'withdraw' && <WithdrawPage key="withdraw" handleBack={handleBack} setCurrentView={(view) => setCurrentView(view as View)} showToast={showToast} user={user} />}
          {currentView === 'withdrawals' && <WithdrawalManagePage key="withdrawals" mode="user" user={user} onNavigate={setCurrentView as (view: string) => void} showToast={showToast} />}
          {currentView === 'admin_pending_users' && <UserManagePage key="admin_pending_users" mode="pending" showToast={showToast} />}
          {currentView === 'merchant_employees' && <UserManagePage key="merchant_employees" mode="employees" showToast={showToast} />}
          {currentView === 'merchant_withdrawals' && <WithdrawalManagePage key="merchant_withdrawals" mode="merchant" user={user} onNavigate={setCurrentView as (view: string) => void} showToast={showToast} />}
          {currentView === 'settings' && <SettingsPage key="settings" user={user} showToast={showToast} onLogout={handleLogout} />}
        </AppLayout>
      )}

      {/* 分享海报弹窗（全局可用） */}
      <ShareProductModal 
        product={sharingProduct} 
        user={user}
        onClose={() => setSharingProduct(null)} 
        showToast={showToast} 
      />

      {/* 已删除第二个 AnimatePresence 以解决 React 19 兼容性问题 */}
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${toast.type === 'success' ? 'bg-green-500/90 border-green-400/50 text-white' : 'bg-red-500/90 border-red-400/50 text-white'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
