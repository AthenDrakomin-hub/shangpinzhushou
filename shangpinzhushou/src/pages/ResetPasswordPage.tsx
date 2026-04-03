/**
 * 重置密码页面
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, CheckCircle } from 'lucide-react';
import { updatePassword } from '../services/authService';

interface ResetPasswordPageProps {
  handleBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onSuccess: () => void;
}

export default function ResetPasswordPage({ handleBack, showToast, onSuccess }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      showToast('请输入新密码', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('密码至少需要6个字符', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        showToast(error, 'error');
      } else {
        setSuccess(true);
        showToast('密码重置成功');
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err) {
      showToast('重置失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-[#0A0E29] text-white overflow-hidden">
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black">设置新密码</h2>
                <p className="text-white/50 text-sm">请输入新的登录密码</p>
              </div>
            </div>

            {success ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white font-bold mb-2">密码重置成功！</p>
                <p className="text-white/50 text-sm">正在跳转到登录页面...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 block">新密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少6个字符"
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 block">确认密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      重置中...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      确认重置
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
