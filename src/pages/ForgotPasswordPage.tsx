/**
 * 忘记密码页面
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, KeyRound, Mail, Send } from 'lucide-react';
import { sendPasswordResetEmail } from '../services/authService';

interface ForgotPasswordPageProps {
  handleBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function ForgotPasswordPage({ handleBack, showToast }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('请输入邮箱地址', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await sendPasswordResetEmail(email.trim());
      if (error) {
        showToast(error, 'error');
      } else {
        setSent(true);
        showToast('重置邮件已发送，请查收邮箱');
      }
    } catch (err) {
      showToast('发送失败，请重试', 'error');
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
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            返回登录
          </button>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black">找回密码</h2>
                <p className="text-white/50 text-sm">输入邮箱获取重置链接</p>
              </div>
            </div>

            {sent ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white/70 mb-2">重置邮件已发送至</p>
                <p className="text-white font-bold mb-4">{email}</p>
                <p className="text-white/50 text-sm">请检查邮箱并点击重置链接</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 block">邮箱地址</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-5 text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      发送中...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      发送重置邮件
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
